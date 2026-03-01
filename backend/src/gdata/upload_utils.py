import os
import re

ALLOWED_EXTENSIONS = {".png", ".mp4"}


def get_upload_base() -> str:
    return os.environ.get("UPLOAD_BASE", "data")


def get_next_capture_dir() -> str:
    base = get_upload_base()
    if not os.path.isdir(base):
        os.makedirs(base, exist_ok=True)
        return os.path.join(base, "capture_1")
    capture_pattern = re.compile(r"^capture_(\d+)$")
    indices = []
    for name in os.listdir(base):
        m = capture_pattern.match(name)
        if m and os.path.isdir(os.path.join(base, name)):
            indices.append(int(m.group(1)))
    next_index = max(indices, default=0) + 1
    return os.path.join(base, f"capture_{next_index}")
