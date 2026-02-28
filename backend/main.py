import asyncio
from src.gpipeline.gatector import Gatector

if __name__ == "__main__":
    gatector = Gatector(device = "cpu",
                        batch_size = 24,
                        num_workers = 4,
                        window_stride = 1,
                        gaze_training_mode = "GazeFollow360")
    asyncio.run(gatector.run(input_file_path = "data/test_1/gaspard-finger.mp4",
                 output_dir = "data/test_1",
                 modality = "frame"))
