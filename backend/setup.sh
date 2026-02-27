#!/bin/bash
set -e

# Setup the environment (we're in backend/)
uv sync

# Download model weights and checkpoints
cd src
if [ ! -d "checkpoints" ] || [ ! -d "weights" ]; then
    echo "Downloading model weights..."
    if [ ! -d "checkpoints" ]; then
        mkdir checkpoints
    fi
    if [ ! -d "weights" ]; then
        mkdir weights
    fi
fi

if [ ! -f "weights/crowdhuman_yolov5m.pt" ]; then
    uv run -- gdown --fuzzy https://drive.google.com/file/d/1xg_MIqC3R1DTT3fOWFefv7g7ecVI92F6/view?usp=share_link -O weights/crowdhuman_yolov5m.pt
fi
if [ ! -f "checkpoints/gat_gaze360.ckpt" ]; then
    uv run -- gdown --fuzzy https://drive.google.com/file/d/1YUMhFYKoSXetfd9yFnFXUtl3LlJZDOsL/view?usp=share_link -O checkpoints/gat_gaze360.ckpt
fi
if [ ! -f "checkpoints/gat_stwsge_gaze360_gf.ckpt" ]; then
    uv run -- gdown --fuzzy https://drive.google.com/file/d/1EhcU6hkPbNzMRsP-JBT2xaIlylRZDZgr/view?usp=share_link -O checkpoints/gat_stwsge_gaze360_gf.ckpt
fi
