from src.gpipeline.gatector import Gatector


class AppGatector:
    def __init__(self):
        self.gatector = Gatector(device = "cpu",
                                 batch_size = 24,
                                 num_workers = 4,
                                 window_stride = 1,
                                 gaze_training_mode = "GazeFollow360")


    async def detect(self, input_file_path: str, 
                     output_dir: str, 
                     modality: str = 'image') -> None:
        return await self.gatector.run(input_file_path = input_file_path,
                                       output_dir = output_dir,
                                       modality = modality)
