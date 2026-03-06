import logging
from typing import Callable
from src.gpipeline.gator import Gator

logger = logging.getLogger(__name__)


class AppGator:
    def __init__(self):
        self.gator = Gator()


    def load_models(self, device: str, 
                    gaze_training_mode: str,
                    progress_callback: Callable[[str], None] | None = None) -> dict:
        return self.gator.load_models(device = device,
                                         gaze_training_mode = gaze_training_mode,
                                         progress_callback = progress_callback)


    def detect_sync(self, input_file_path: str,
                    modality: str,
                    batch_size: int,
                    window_stride: int,
                    num_workers: int,
                    progress_callback: Callable[[str], None]) -> dict:
        """Run the pipeline synchronously (for use in a background thread).
        Returns {'success': bool, 'data': {}}; on success data may include e.g. output_dir."""
        return self.gator.run(input_file_path = input_file_path,
                                 modality = modality,
                                 batch_size = batch_size,
                                 window_stride = window_stride,
                                 num_workers = num_workers,
                                 progress_callback = progress_callback)


    async def detect(self, input_file_path: str,
                     modality: str,
                     batch_size: int,
                     window_stride: int,
                     num_workers: int,
                     progress_callback: Callable[[str], None]) -> dict:
        """Legacy async entrypoint; runs sync pipeline. Prefer detect_sync from
        a thread for async API."""
        return self.detect_sync(input_file_path = input_file_path,
                                modality = modality,
                                batch_size = batch_size,
                                window_stride = window_stride,
                                num_workers = num_workers,
                                progress_callback = progress_callback)