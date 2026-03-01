import logging
from typing import Callable
from src.gpipeline.gatector import Gatector

logger = logging.getLogger(__name__)


class AppGatector:
    def __init__(self):
        self.gatector = Gatector(device = "cpu",
                                 batch_size = 24,
                                 num_workers = 4,
                                 window_stride = 1,
                                 gaze_training_mode = "GazeFollow360")


    def initialize(self, progress_callback: Callable[[str], None] | None = None) -> dict:
        return self.gatector.initialize(progress_callback=progress_callback)


    def detect_sync(self, input_file_path: str,
                    output_dir: str,
                    modality: str = "image",
                    progress_callback: Callable[[str], None] | None = None,) -> dict:
        """Run the pipeline synchronously (for use in a background thread).
        Returns {'success': bool, 'data': {}}; on success data may include e.g. output_dir."""
        return self.gatector.run(input_file_path = input_file_path,
                                 output_dir = output_dir,
                                 modality = modality,
                                 progress_callback = progress_callback,)


    async def detect(self, input_file_path: str,
                     output_dir: str,
                     modality: str = 'image') -> dict:
        """Legacy async entrypoint; runs sync pipeline. Prefer detect_sync from
        a thread for async API."""
        return self.gatector.run(input_file_path = input_file_path,
                                 output_dir = output_dir,
                                 modality = modality,
                                 progress_callback = None)
