import logging
from typing import Callable
from src.gpipeline.gatector import Gatector

logger = logging.getLogger(__name__)


class AppGatector:
    def __init__(self):
        self.gatector = Gatector(batch_size = 24,
                                 num_workers = 4,
                                 window_stride = 1)


    def load_models(self, device: str, 
                    gaze_training_mode: str,
                    progress_callback: Callable[[str], None] | None = None) -> dict:
        return self.gatector.load_models(device = device,
                                         gaze_training_mode = gaze_training_mode,
                                         progress_callback = progress_callback)


    def detect_sync(self, input_file_path: str,
                    modality: str = "image",
                    progress_callback: Callable[[str], None] | None = None,) -> dict:
        """Run the pipeline synchronously (for use in a background thread).
        Returns {'success': bool, 'data': {}}; on success data may include e.g. output_dir."""
        return self.gatector.run(input_file_path = input_file_path,
                                 modality = modality,
                                 progress_callback = progress_callback,)


    async def detect(self, input_file_path: str,
                     modality: str = 'image') -> dict:
        """Legacy async entrypoint; runs sync pipeline. Prefer detect_sync from
        a thread for async API."""
        return self.gatector.run(input_file_path = input_file_path,
                                 modality = modality,
                                 progress_callback = None)
