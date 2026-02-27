import sys
from pathlib import Path

# So gaze3d's internal absolute imports (e.g. utils_demo, src) resolve without modifying the repo
_gaze3d_root = Path(__file__).resolve().parent / "gaze3d"
if str(_gaze3d_root) not in sys.path:
    sys.path.insert(0, str(_gaze3d_root))

from gaze3d.demo import Gaze3DDemo


if __name__ == "__main__":
    demo = Gaze3DDemo(
        input_filename = "gaze3d/data/yolo.mp4",
        output_dir = "gaze3d/output",
        ckpt_path = "gaze3d/checkpoints/gat_stwsge_gaze360_gf.ckpt",
        inference_modality = "image",
        window_stride = 1,
        device = "cpu",
        batch_size = 24,
        num_workers = 4,)
    demo.run()
