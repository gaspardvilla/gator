from typing import Callable
from src.gpipeline.gatector import Gatector


class AppGatector:
    def __init__(self):
        self.gatector = Gatector(device = "cpu",
                                 batch_size = 24,
                                 num_workers = 4,
                                 window_stride = 1,
                                 gaze_training_mode = "GazeFollow360")

    def detect_sync(self, input_file_path: str,
                    output_dir: str,
                    modality: str = "image",
                    progress_callback: Callable[[str], None] | None = None,) -> dict | None:
        """Run the pipeline synchronously (for use in a background thread). 
        Returns error dict on failure, None on success."""
        return self.gatector.run(input_file_path = input_file_path,
                                 output_dir = output_dir,
                                 modality = modality,
                                 progress_callback = progress_callback,)

    async def detect(self, input_file_path: str,
                     output_dir: str,
                     modality: str = 'image') -> dict | None:
        """Legacy async entrypoint; runs sync pipeline. Prefer detect_sync from 
        a thread for async API."""
        return self.gatector.run(input_file_path = input_file_path,
                                 output_dir = output_dir,
                                 modality = modality,
                                 progress_callback = None)
