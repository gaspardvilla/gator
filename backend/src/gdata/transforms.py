# SPDX-FileCopyrightText: 2025 Idiap Research Institute <contact@idiap.ch>
#
# SPDX-FileContributor: Pierre Vuillecard  <pierre.vuillecard@idiap.ch>
#
# SPDX-License-Identifier: CC-BY-NC-4.0

import torch
import numpy as np
import torchvision.transforms.v2 as tf
from torchvision.ops import box_convert



class BboxReshape(object):
    """
    Reshape the bounding box of the head from yolo.
    We want to make sure to extend the bbox such that it contains as much as possible
    of the body and head.
    """
    def __init__(self, square: bool = True, ratio: float = 0.0, adjust_top=True):
        self.square = square
        self.ratio = ratio
        self.adjust_top = adjust_top

    def __call__(self, sample):
        bbox = sample["head_bbox"]

        if not isinstance(bbox, torch.Tensor):
            bbox = torch.tensor(np.array(bbox))

        if self.adjust_top:
            sample["head_bbox"] = reshape_bbox_adjust_top(
                bbox, ratio=self.ratio, square=self.square)
        else:
            sample["head_bbox"] = reshape_bbox_adjust_center(
                bbox, ratio=self.ratio, square=self.square)
        return sample



class Crop(object):
    """Crop according to the bbox in the sample

    Args:
        output_size (tuple or int): Desired output size. If int, square crop
            is made.
    """
    def __init__(self, output_size):
        assert isinstance(output_size, (int, tuple))
        if isinstance(output_size, int):
            self.output_size = (output_size, output_size)
        else:
            assert len(output_size) == 2
            self.output_size = output_size

    def __call__(self, sample):
        head_bbox = sample["head_bbox"]
        head_bbox = box_convert(head_bbox, in_fmt="xyxy", out_fmt="xywh")
        head_bbox = head_bbox.type(torch.int16)
        # crop and resize functions
        sample["images"] = [
            tf.functional.resized_crop(
                img,
                head_bbox[i, 1],
                head_bbox[i, 0],
                head_bbox[i, 3],
                head_bbox[i, 2],
                self.output_size,
                antialias=True,)
            for i, img in enumerate(sample["images"])]
        return sample



class ToImage(object):
    """Convert PIL image to Tensor.
    ref: https://pytorch.org/vision/main/transforms.html#range-and-dtype"""
    def __call__(self, sample):
        sample["images"] = [
            tf.functional.to_dtype(tf.functional.to_image(img), dtype=torch.uint8, scale=True)
            for img in sample["images"]]
        return sample


class Concatenate(object):
    """Concatenate the images in the sample"""
    def __call__(self, sample):
        # stack the images along the first dimension
        sample["images"] = torch.stack(sample["images"], 0)
        return sample



class ToTensor(object):
    """Convert tensor image to float"""
    def __call__(self, sample):
        sample["images"] = tf.functional.to_dtype(
            sample["images"], dtype=torch.float32, scale=True
        )
        return sample



class Normalize(object):
    """Normalize the images in the sample"""
    def __init__(self, mean, std):
        self.mean = mean
        self.std = std

    def __call__(self, sample):
        # B, C, H, W
        sample["images"] = tf.functional.normalize(sample["images"], self.mean, self.std)
        return sample



def reshape_bbox_adjust_top(bbox, ratio=0.0, square=True):
    """
    Reshape the head bounding box to include more of the
    body and head.
    """
    bbox_x_middle = (bbox[:, 0:1] + bbox[:, 2:3]) / 2
    bbox_xymin = bbox[:, :2]
    bbox_xywh = box_convert(bbox, in_fmt="xyxy", out_fmt="xywh")

    if square:
        sizes = torch.max(bbox_xywh[:, 2:], 1)[0]
        sizes = torch.stack([sizes, sizes], 1)
    else:
        sizes = bbox_xywh[:, 2:]

    sizes = sizes * (1 + ratio)
    bbox_xmin = bbox_x_middle - (sizes[:, 0:1] / 2)

    if ratio > 0.0:
        # 7% of the height to make sure the top of the head is included
        bbox_ymin = bbox_xymin[:, 1:2] - ((sizes[:, 1:2] * ratio) * 0.07)
    else:
        bbox_ymin = bbox_xymin[:, 1:2] - ((sizes[:, 1:2] * ratio))

    bbox_new = torch.cat([bbox_xmin, bbox_ymin, sizes], 1)
    return box_convert(bbox_new, in_fmt="xywh", out_fmt="xyxy")



def reshape_bbox_adjust_center(bbox, ratio=0.0, square=True):
    bbox_cxcywh = box_convert(bbox, in_fmt="xyxy", out_fmt="cxcywh")

    if square:
        sizes = torch.max(bbox_cxcywh[:, 2:], 1)[0]
        sizes = torch.stack([sizes, sizes], 1)
    else:
        sizes = bbox_cxcywh[:, 2:]

    bbox_cxcywh[:, 2:] = sizes + (sizes * ratio)
    return box_convert(bbox_cxcywh, in_fmt="cxcywh", out_fmt="xyxy")
