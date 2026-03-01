import os
import sys
import json
import uuid
import queue
import logging
import asyncio
import threading
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse

from src.gapp import AppGatector
from src.gdata.upload_utils import ALLOWED_EXTENSIONS, get_next_capture_dir

# Configure logging so gatector (and other src) logs appear in the terminal
logging.basicConfig(
    level = logging.DEBUG,
    format = "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt = "%Y-%m-%d %H:%M:%S",
    stream = sys.stdout,
    force = True)

# Hardcoded paths for /detect (run server from backend/ so these resolve)
INPUT_PATH = "data/test_2/yolo.png"
OUTPUT_DIR = "data/test_2"
MODALITY = "image"

# In-memory job store: job_id -> { "queue": queue.Queue, "status": str }
jobs: dict[str, dict] = {}


def run_pipeline(app_gatector: AppGatector, job_id: str, job_queue: queue.Queue) -> None:
    # Callback function to send progress updates to the client
    def progress_callback(checkpoint: str) -> None:
        job_queue.put({"checkpoint": checkpoint})

    # Run the pipeline
    try:
        result = app_gatector.detect_sync(input_file_path = INPUT_PATH,
                                          output_dir = OUTPUT_DIR,
                                          modality = MODALITY,
                                          progress_callback = progress_callback)
        # If the pipeline failed, send an error event to the client
        if result is not None:
            job_queue.put({"checkpoint": "error", "message": result.get("message", "Unknown error")})
            jobs[job_id]["status"] = "error"
        # If the pipeline ran successfully, send a done event to the client
        else:
            job_queue.put({"checkpoint": "done", "output_dir": OUTPUT_DIR})
            jobs[job_id]["status"] = "done"
    # Handle any errors that occur during the pipeline
    except Exception as e:
        job_queue.put({"checkpoint": "error", "message": str(e)})
        jobs[job_id]["status"] = "error"


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.app_gatector = AppGatector()
    yield
    app.state.app_gatector = None


app = FastAPI(lifespan = lifespan)
app.add_middleware(CORSMiddleware,
                   allow_origins = ["http://localhost:3000"],
                   allow_credentials = True,
                   allow_methods = ["*"],
                   allow_headers = ["*"],)


@app.get("/health")
async def health():
    app_gatector = getattr(app.state, "app_gatector", None)
    if app_gatector is None:
        return JSONResponse(
            content = {"status": "error", "message": "AppGatector not initialized"},
            status_code = 503,)
    return {"status": "ok", "gatector": "ready"}


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    # Check if the file is valid
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

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
async def detect():
    app_gatector = getattr(app.state, "app_gatector", None)
    if app_gatector is None:
        return JSONResponse(content = {"status": "error", "message": "AppGatector not initialized"},
                            status_code = 503)
    job_id = uuid.uuid4().hex
    job_queue: queue.Queue = queue.Queue()
    jobs[job_id] = {"queue": job_queue, "status": "running"}
    thread = threading.Thread(target = run_pipeline,
                              args = (app_gatector, job_id, job_queue),
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
