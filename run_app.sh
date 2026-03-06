#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PID=""

cleanup() {
  if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "==> Backend: setup (deps + models)..."
cd "$ROOT/backend" && ./setup.sh

echo "==> Frontend: install dependencies..."
cd "$ROOT/frontend" && npm install

echo "==> Starting backend (http://localhost:8000)..."
cd "$ROOT/backend" && uv run uvicorn server:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "==> Starting frontend (http://localhost:3000)..."
cd "$ROOT/frontend" && npm run dev
