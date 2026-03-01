import os
import cv2
import shlex
import torch
import logging
import numpy as np
import pandas as pd
from PIL import Image
import subprocess as sp
from boxmot import OCSORT
from typing import Callable
from functools import partial
from matplotlib import colormaps
from torch.utils.data import DataLoader
from src.gpipeline.drawings import draw_gaze
from src.gmodels import GaT, HeadDict, MLPHead, Swin3D
from src.gdata.datasets import (DemoVideoData, 
                                DemoImageData, 
                                identify_modality)

logger = logging.getLogger(__name__)

ckpts_paths = {
    "Gaze360": "src/checkpoints/gat_gaze360.ckpt",
    "GazeFollow360": "src/checkpoints/gat_stwsge_gaze360_gf.ckpt",
    "HeadDetection": "src/weights/crowdhuman_yolov5m.pt",}
DET_THR = 0.4
CMAP = colormaps.get_cmap("brg")
COLORS = [
    (199, 21, 133),
    (0, 128, 0),
    (30, 144, 255),
    (220, 20, 60),
    (218, 165, 32),
    (47, 79, 79),
    (139, 69, 19),
    (128, 0, 128),
    (0, 128, 128),]


class Gatector():
    def __init__(self, device: str,
                 batch_size: int,
                 num_workers: int,
                 window_stride: int = 1,
                 gaze_training_mode : str = "GazeFollow360",):
        self.device = device
        self.batch_size = batch_size
        self.window_stride = window_stride
        self.num_workers = num_workers
        self.gaze_training_mode = gaze_training_mode
        self._progress_callback = None


    def initialize(self, progress_callback: Callable[[str], None] | None = None):
        self.progress_callback = progress_callback
        self._load_models()


    def run(self, input_file_path: str,
            output_dir: str,
            modality: str = "image",
            progress_callback: Callable[[str], None] | None = None,) -> dict | None:
        # Set the progress callback
        self.progress_callback = progress_callback

        # 1. Load the input file
        logger.info(f"Loading input file: {input_file_path}")
        if not self._load_input_file(input_file_path, output_dir, modality):
            message = f"Failed to load input file: {input_file_path}"
            logger.error(message)
            return self._create_response(success = False, message = message)
        self._send_progress("input_loaded")

        # 2. Detect and track heads
        logger.info(f"Detecting and tracking heads")
        self._detect_and_track_heads()
        self._send_progress("heads_detected")

        # 3. Predict gaze
        logger.info(f"Predicting gaze")
        self._predict_gaze()
        self._send_progress("gaze_predicted")

        # 4. Draw the predicted gaze on the input video/image
        logger.info(f"Drawing predicted gaze on the input file")
        self._send_progress("drawing")
        self._draw_predicted_gaze()
        return None


    def _draw_predicted_gaze(self):
        if self.file_modality == 'video':
            self._draw_predicted_gaze_video()
        else:
            self._draw_predicted_gaze_image()


    def _draw_predicted_gaze_video(self):
        # Read the video
        cap = cv2.VideoCapture(self.input_file_path)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = int(round(cap.get(cv2.CAP_PROP_FPS)))
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        output_file_path = os.path.join(self.output_dir, "predicted_gaze.mp4")

        # Initialize ffmpeg writer
        command = f"ffmpeg -loglevel error -y -s {width}x{height} -pixel_format rgb24 -f rawvideo -r {fps} -i pipe: -vcodec libx264 -pix_fmt yuv420p -crf 24 {output_file_path}"
        command = shlex.split(command)
        process = sp.Popen(command, stdin = sp.PIPE)

        # Iterate over frames and process
        for frame_idx in range(frame_count):
            
            # Read the frame
            ret, frame = cap.read()
            if not ret: break
            frame_rgb = frame[..., ::-1].copy().astype(np.uint8)

            # Loop on the gazes and draw them on the frame
            for _, row in self.detected_heads[self.detected_heads["frame_id"] == frame_idx + 1].iterrows():
                head_box = [row["xmin"], row["ymin"], row["xmax"], row["ymax"]]
                head_pid = int(row["pid"])
                gaze = np.array([row["gaze_x"], row["gaze_y"], row["gaze_z"]])
                frame_rgb = draw_gaze(frame_rgb,
                                      head_box,
                                      head_pid,
                                      gaze,
                                      CMAP,
                                      COLORS,
                                      thickness = 10,
                                      thickness_gaze = 10,
                                      fs = 0.8)
            process.stdin.write(frame_rgb.tobytes())

        # Release Capture Device
        cap.release()
        process.stdin.close()
        process.wait()
        process.terminate()


    def _draw_predicted_gaze_image(self):
        # Read the image
        image = cv2.imread(self.input_file_path)
        image_rgb = image[..., ::-1].copy().astype(np.uint8)

        # Draw the predicted gaze on the image
        for _, row in self.detected_heads.iterrows():
            head_box = [row["xmin"], row["ymin"], row["xmax"], row["ymax"]]
            head_pid = int(row["pid"])
            gaze = np.array([row["gaze_x"], row["gaze_y"], row["gaze_z"]])
            image_rgb = draw_gaze(image_rgb,
                                  head_box,
                                  head_pid,
                                  gaze,
                                  CMAP,
                                  COLORS,
                                  thickness=10,
                                  thickness_gaze=10,
                                  fs=0.8)

        # Save the image
        output_file_path = os.path.join(self.output_dir, "predicted_gaze.png")
        cv2.imwrite(output_file_path, image_rgb[..., ::-1])


    def _predict_gaze(self):
        # Exract the dataloader
        dataloader = self._get_dataloader()

        # Iterate over the dataloader and predict gaze
        gaze_stack = []
        for sample in dataloader:

            # Prediction of the gaze
            with torch.no_grad():
                pred = self.gaze_model(sample["images"].to(self.device))
                gaze = torch.nn.functional.normalize(pred["gaze"], p=2, dim=2, eps=1e-8)
                t = gaze.size(1)
                t = ((t // 2) if t == 1 or t % 2 != 0 else (t // 2) - 1)
                gaze_stack.append(gaze[:, t, :].cpu().numpy())
        
        # Add gaze predictions to the detected heads
        gaze_stack = np.vstack(gaze_stack)
        self.detected_heads = pd.read_csv(self.detected_head_file)
        self.detected_heads["gaze_x"] = gaze_stack[:, 0]
        self.detected_heads["gaze_y"] = gaze_stack[:, 1]
        self.detected_heads["gaze_z"] = gaze_stack[:, 2]
        self.detected_heads.to_csv(self.detected_head_file, index = False)

    
    def _get_dataloader(self):
        if self.file_modality == 'video':
            dataset = DemoVideoData(detected_head_file = self.detected_head_file,
                                    input_file_path = self.input_file_path,
                                    window_stride = self.window_stride)
            dataloader = DataLoader(dataset,
                                        batch_size = self.batch_size,
                                        num_workers = self.num_workers,
                                        shuffle = False)
            return dataloader
        else:
            dataset = DemoImageData(detected_head_file = self.detected_head_file,
                                    input_file_path = self.input_file_path)
            dataloader = DataLoader(dataset,
                                         batch_size = self.batch_size,
                                         num_workers = self.num_workers,
                                         shuffle = False)
            return dataloader


    def _detect_and_track_heads(self):
        self.detected_heads = []
        if self.file_modality == 'video':
            self._detect_and_track_heads_video()
        else:
            self._detect_and_track_heads_image()


    def _detect_and_track_heads_video(self):
        # Iterate over frames and process
        for frame_idx in range(self.frame_count):
            _, frame = self.raw_dataset.read()
            image_rgb = Image.fromarray(frame[..., ::-1])
            self._detect_and_track_heads_frame(image_rgb, frame_idx + 1)

        # Release Capture Device and save the detected heads
        self.raw_dataset.release()
        self._save_detected_heads()


    def _detect_and_track_heads_image(self):
        self._detect_and_track_heads_frame(self.raw_dataset, self.frame_count)
        self._save_detected_heads()


    def _detect_and_track_heads_frame(self, image, frame_id: int) -> bool:
        # Detect raw heads
        image_np = np.array(image)
        raw_detections = self.head_detection_model(image_np, 
                                                   size = 640).pred[0].cpu().numpy()[:, :-1]
        
        # Filter raw detections by confidence threshold
        detections = []
        for raw_detection in raw_detections:
            bbox, conf = raw_detection[:4], raw_detection[4]
            if conf > DET_THR:
                cls_ = np.array([0.0])
                detection = np.concatenate([bbox, conf[None], cls_])
                detections.append(detection)

        # Stack detections
        detections = np.stack(detections)
        tracks = self.tracker.update(detections, image_np)
        if len(tracks) > 0:
            tracks = tracks[:, :5]
            tracks = np.hstack([tracks, np.ones((len(tracks), 1)) * frame_id])
            self.detected_heads.extend(tracks.tolist())

    
    def _save_detected_heads(self) -> bool:
        df = pd.DataFrame(self.detected_heads, 
                          columns = ["xmin", "ymin", "xmax", "ymax", "pid", "frame_id"])
        self.detected_head_file = os.path.join(self.output_dir, "detected_heads.csv")
        df.to_csv(self.detected_head_file, index = False)


    def _load_input_file(self, input_file_path: str, 
                         output_dir: str,
                         modality: str = 'image') -> bool:
        # Check the file path
        if not os.path.exists(input_file_path):
            message = f"Input file path does not exist: {input_file_path}"
            logger.error(message)
            return False
        self.input_file_path = input_file_path

        # Check the output directory
        if not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok = True)
        self.output_dir = output_dir

        # Check the modality of the input file and the modality requested by the user
        self.file_modality = identify_modality(input_file_path)
        if modality == 'video' and self.file_modality == 'image':
            message = f"Input modality is image but you ask for video model prediction."
            logger.error(message)
            return False
        self.prediction_modality = modality

        # Load the input file
        if self.file_modality == 'video':
            self.raw_dataset = cv2.VideoCapture(input_file_path)
            if not self.raw_dataset.isOpened():
                message = f"Failed to open input video file: {input_file_path}"
                logger.error(message)
                return False
            self.frame_count = int(self.raw_dataset.get(cv2.CAP_PROP_FRAME_COUNT))
        else:
            self.raw_dataset = Image.open(input_file_path)
            self.frame_count = 1
        return True


    def _load_models(self):
        self._send_progress("loading_models")
        self._load_gaze_model()
        self._load_head_detection_model()
        self._load_tracker()
        self._send_progress("models_loaded")


    def _load_head_detection_model(self) -> None:
        """Load the pre-trained head detection model"""
        self._send_progress("loading_head_detection_model")
        model = torch.hub.load("ultralytics/yolov5", 
                               "custom", 
                               path = ckpts_paths["HeadDetection"], 
                               verbose = False)
        model.conf = 0.25  # NMS confidence threshold
        model.iou = 0.45  # NMS IoU threshold
        model.classes = [1]  # filter by class, i.e. = [1] for heads
        model.amp = False  # Automatic Mixed Precision (AMP) inference
        model = model.to(self.device)
        model.eval()
        self.head_detection_model = model
        self._send_progress("head_detection_model_loaded")
    
    def _load_gaze_model(self) -> None:
        """Load the pre-trained Gaze-At-Target model"""
        self._send_progress("loading_gaze_model")
        model = GaT(encoder = Swin3D(pretrained=False),
                    head_dict = HeadDict(names = ["gaze"],
                                         modules = [partial(MLPHead,
                                                          hidden_dim=256,
                                                          num_layers=1,
                                                          out_features=3)]))
        ckpts = torch.load(ckpts_paths[self.gaze_training_mode], 
                           map_location = "cpu")
        model.load_state_dict(ckpts["state_dict"], strict = True)
        model.to(self.device)
        model.eval()
        self.gaze_model = model
        self._send_progress("gaze_model_loaded")


    def _load_tracker(self) -> None:
        """Load the pre-trained tracker"""
        self._send_progress("loading_tracker")
        self.tracker = OCSORT()
        self._send_progress("tracker_loaded")


    def _create_response(self, success: bool, 
                         message: str, 
                         data: dict = None) -> dict:
        if not isinstance(data, dict):
            message = f"Data must be a dictionary but got {type(data)}"
            logger.error(message)
            data = {}
        return {"success": success,
                "message": message,
                "data": data}


    def _send_progress(self, name: str) -> None:
        if self._progress_callback is not None:
            self._progress_callback(name)


    @property
    def progress_callback(self) -> Callable[[str], None] | None:
        return self._progress_callback

    @progress_callback.setter
    def progress_callback(self, value: Callable[[str], None] | None) -> None:
        self._progress_callback = value
