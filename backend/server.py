from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from src.gapp import AppGatector

# Hardcoded paths for /detect (run server from backend/ so these resolve)
INPUT_PATH = "data/test_1/gaspard-finger.mp4"
OUTPUT_DIR = "data/test_1"
MODALITY = "video"


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.app_gatector = AppGatector()
    yield
    app.state.app_gatector = None


app = FastAPI(lifespan = lifespan)


@app.get("/health")
async def health():
    app_gatector = getattr(app.state, "app_gatector", None)
    if app_gatector is None:
        return JSONResponse(
            content = {"status": "error", "message": "AppGatector not initialized"},
            status_code = 503,)
    return {"status": "ok", "gatector": "ready"}


@app.post("/detect")
async def detect():
    app_gatector = getattr(app.state, "app_gatector", None)
    if app_gatector is None:
        return JSONResponse(
            content = {"status": "error", "message": "AppGatector not initialized"},
            status_code = 503,)
    result = await app_gatector.detect(
        input_file_path = INPUT_PATH,
        output_dir = OUTPUT_DIR,
        modality = MODALITY,)
    if result is not None:
        return JSONResponse(content = result, status_code = 500)
    return {"status": "ok", "message": "detect completed"}
