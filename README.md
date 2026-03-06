# Gator

## Prerequisites

Install the following on your machine:

- **[uv](https://github.com/astral-sh/uv)** — Python environment and backend dependencies
- **[Node.js](https://nodejs.org/)** (LTS) — Frontend (npm)
- **[ffmpeg](https://ffmpeg.org/)** — Video processing

## Quick start

From the project root, run:

```bash
./run_app.sh
```

This will install backend dependencies, download model weights and checkpoints, install frontend dependencies, then start the backend (port 8000) and frontend (port 3000) together. Use Ctrl+C to stop both.

## API (backend)

- `GET http://localhost:8000/health`
- `GET http://localhost:8000/detect`
