import cv2
import torch
import numpy as np
from torch.nn import functional as F


def draw_gaze(image,
              head_bbox,
              head_pid,
              gaze,
              cmap,
              colors,
              thickness = 10,
              thickness_gaze = 10,
              fs = 0.8,):
    img_h, img_w = image.shape[0], image.shape[1]
    scale = max(img_h, img_w) / 1920
    fs *= scale
    thickness = int(scale * thickness)
    thickness_gaze = int(scale * thickness_gaze)

    # =============== Draw Prediction =============== #

    xmin, ymin, xmax, ymax = head_bbox[0], head_bbox[1], head_bbox[2], head_bbox[3]
    xmin, ymin, xmax, ymax = int(xmin), int(ymin), int(xmax), int(ymax)

    # Compute Head Center
    head_center = np.array([(xmin + xmax) // 2, (ymin + ymax) // 2])
    head_radius = max(xmax - xmin, ymax - ymin) // 2
    head_radius = int(head_radius * 1.2)  # enlarge the head circle
    color = colors[head_pid % len(colors)]
    cv2.circle(image, head_center, head_radius + 1, color, thickness)  # head circle

    # Draw header
    header_text = f"P{int(head_pid)}"
    (w_text, h_text), _ = cv2.getTextSize(header_text, cv2.FONT_HERSHEY_SIMPLEX, fs, 1)
    header_ul = (
        int(head_center[0] - w_text / 2),
        int(head_center[1] - head_radius - 1 - thickness / 2),
    )
    header_br = (
        int(head_center[0] + w_text / 2),
        int(head_center[1] - head_radius - 1 + h_text + 5),
    )
    cv2.rectangle(image, header_ul, header_br, color, -1)  # header bbox
    cv2.putText(
        image,
        header_text,
        (header_ul[0], int(head_center[1] - head_radius - 1 + h_text)),
        cv2.FONT_HERSHEY_SIMPLEX,
        fs,
        (255, 255, 255),
        1,
        cv2.LINE_AA,
    )  # header text

    # Draw 3D gaze vector
    # color of the gaze vector based on the angle between
    # the gaze and the direction of the camera
    gaze = gaze / np.linalg.norm(gaze)
    gaze = torch.tensor(gaze)[None]
    target = torch.tensor([[0.0, 0.0, -1.0]])
    sim = F.cosine_similarity(gaze, target, dim=1, eps=1e-10)
    sim = F.hardtanh_(sim, min_val=-1.0, max_val=1.0)
    angle_gaze = torch.acos(sim)[0] * 180 / np.pi
    angle_gaze /= 180
    color = np.array(cmap(angle_gaze)[:3]) * 255
    image = draw_arrow2D(
        image=image,
        gaze=gaze[0],
        position=head_center,
        head_size=head_radius,
        d=0.05,
        color=color,
        thickness=thickness_gaze,)
    return image


def draw_arrow2D(image,
                 gaze,
                 position = None,
                 head_size = None,
                 d = 0.1,
                 color = (255, 0, 0),
                 thickness = 10,):
    w, h = image.shape[1], image.shape[0]

    if position is None:
        position = [w // 2, h // 2]

    if head_size:
        length = head_size
    else:
        length = w * d

    gaze_dir = gaze / np.linalg.norm(gaze)
    dx = -length * gaze_dir[0]
    dy = -length * gaze_dir[1]

    cv2.arrowedLine(
        image,
        tuple(np.round(position).astype(np.int32)),
        tuple(np.round([position[0] + dx, position[1] + dy]).astype(int)),
        color,
        thickness,
        cv2.LINE_AA,
        tipLength=0.2,
    )
    return image