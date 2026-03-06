import os
import sys
import json
import uuid
import queue
import logging
import asyncio
import threading
from typing import Any
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

from src.gapp import AppGator
from src.gdata.upload_utils import ALLOWED_EXTENSIONS, get_next_capture_dir

# Configure logging so gator (and other src) logs appear in the terminal
logging.basicConfig(
    level = logging.DEBUG,
    format = "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt = "%Y-%m-%d %H:%M:%S",
    stream = sys.stdout,
    force = True)


# In-memory job store: job_id -> { "queue": queue.Queue, "status": str }
jobs: dict[str, dict] = {}


def run_pipeline_job(app_gator: AppGator,
                     job_id: str,
                     job_queue: queue.Queue,
                     method_name: str,
                     method_kwargs: dict[str, Any] | None = None) -> None:
    """Run an AppGator method in a thread. Each method must return {'success': bool, 'data': dict}.
    On success the done event is {checkpoint: 'done', **data}; on failure {checkpoint: 'error', message: data['message']}."""
    method_kwargs = method_kwargs or {}

    def progress_callback(checkpoint: str) -> None:
        job_queue.put({"checkpoint": checkpoint})

    try:
        method = getattr(app_gator, method_name)
        result = method(progress_callback=progress_callback, **method_kwargs)
        if result.get("success"):
            data = result.get("data", {})
            job_queue.put({"checkpoint": "done", **data})
            jobs[job_id]["status"] = "done"
            jobs[job_id]["output_dir"] = data.get("output_dir")
            jobs[job_id]["output_type"] = data.get("output_type", "image")
        else:
            err_msg = result.get("message") or result.get("data", {}).get("message", "Unknown error")
            job_queue.put({"checkpoint": "error", "message": err_msg})
            jobs[job_id]["status"] = "error"
    except Exception as e:
        job_queue.put({"checkpoint": "error", "message": str(e)})
        jobs[job_id]["status"] = "error"


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.app_gator = AppGator()
    yield
    app.state.app_gator = None


app = FastAPI(lifespan = lifespan)
app.add_middleware(CORSMiddleware,
                   allow_origins = ["http://localhost:3000"],
                   allow_credentials = True,
                   allow_methods = ["*"],
                   allow_headers = ["*"],)


@app.get("/health")
async def health():
    app_gator = getattr(app.state, "app_gator", None)
    if app_gator is None:
        return JSONResponse(
            content = {"status": "error", "message": "AppGator not initialized"},
            status_code = 503,)
    return {"status": "ok", "gator": "ready"}


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    # Check if the file is valid
    if not file.filename:
        raise HTTPException(status_code = 400, detail = "Missing filename")

    # Check if the file extension is allowed
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code = 400,
            detail = f"Format not allowed. Only {', '.join(sorted(ALLOWED_EXTENSIONS))} are accepted.",)
    
    # Get the next capture directory and save the file
    dir_path = get_next_capture_dir()
    os.makedirs(dir_path, exist_ok=True)
    file_path = os.path.join(dir_path, f"input{ext}")
    with open(file_path, "wb") as f:
        while chunk := await file.read(8192):
            f.write(chunk)
    return {"path": file_path}


@app.post("/detect")
async def detect(body: dict | None = None):
    app_gator = getattr(app.state, "app_gator", None)
    if app_gator is None:
        return JSONResponse(content = {"status": "error", "message": "AppGator not initialized"},
                            status_code = 503)
    job_id = uuid.uuid4().hex
    job_queue: queue.Queue = queue.Queue()
    jobs[job_id] = {"queue": job_queue, "status": "running"}
    thread = threading.Thread(target = run_pipeline_job,
                              args = (app_gator, job_id, job_queue),
                              kwargs = {"method_name": "detect_sync",
                                        "method_kwargs": {"input_file_path": body["input_path"],
                                                          "modality": body["modality"],
                                                          "batch_size": body["batch_size"],
                                                          "window_stride": body["window_stride"],
                                                          "num_workers": body["num_workers" ]}},
                              daemon = True)
    thread.start()
    return JSONResponse(content = {"job_id": job_id}, status_code = 201)


@app.post("/load_models")
async def load_models(body : dict):
    app_gator = getattr(app.state, "app_gator", None)
    if app_gator is None:
        return JSONResponse(content = {"status": "error", "message": "AppGator not initialized"},
                            status_code = 503)
    job_id = uuid.uuid4().hex
    job_queue: queue.Queue = queue.Queue()
    jobs[job_id] = {"queue": job_queue, "status": "running"}
    thread = threading.Thread(target = run_pipeline_job,
                              args = (app_gator, job_id, job_queue),
                              kwargs = {"method_name": "load_models",
                                        "method_kwargs": body},
                              daemon = True)
    thread.start()
    return JSONResponse(content = {"job_id": job_id}, status_code = 201)


@app.get("/jobs/{job_id}/stream")
async def job_stream(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code = 404, detail = "Job not found")
    job = jobs[job_id]
    job_queue: queue.Queue = job["queue"]


    def format_sse(event: dict) -> str:
        return f"data: {json.dumps(event)}\n\n"


    async def event_generator():
        while True:
            try:
                event = await asyncio.to_thread(lambda: job_queue.get(timeout=30))
            except queue.Empty:
                yield format_sse({"checkpoint": "ping"})
                continue
            yield format_sse(event)
            if event.get("checkpoint") in ("done", "error"):
                break

    return StreamingResponse(event_generator(),
                             media_type = "text/event-stream",
                             headers = {"Cache-Control": "no-store",
                                        "Connection": "keep-alive",
                                        "X-Accel-Buffering": "no"})


@app.get("/jobs/{job_id}/output")
async def job_output(job_id: str):
    """Serve the detection output file (video or image) for in-browser playback."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    job = jobs[job_id]
    if job.get("status") != "done":
        raise HTTPException(status_code=404, detail="Job not complete")
    output_dir = job.get("output_dir")
    output_type = job.get("output_type", "image")
    if not output_dir or not os.path.isdir(output_dir):
        raise HTTPException(status_code=404, detail="Output not found")
    if output_type == "video":
        path = os.path.join(output_dir, "predicted_gaze.mp4")
        if not os.path.isfile(path):
            raise HTTPException(status_code=404, detail="Output video not found")
        return FileResponse(path, media_type="video/mp4")
    path = os.path.join(output_dir, "predicted_gaze.png")
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Output image not found")
    return FileResponse(path, media_type="image/png")
