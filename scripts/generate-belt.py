"""Render the validation diagram's breathing belt from the original Polar artwork."""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import map_coordinates


ART = Path(__file__).resolve().parents[1] / "assets/illustrations"
FRAME_SIZE = (688, 248)
INHALE_STEPS = 48


def belt_frame(pixels, step):
    expansion = (1 - np.cos(np.pi * step / INHALE_STEPS)) / 2
    y, x = np.indices(FRAME_SIZE[::-1], dtype=float)
    # The fabric stretches between the rigid pod, snap fasteners and strap ends.
    anchors = np.array([0, 18, 58, 102, 110, 376, 389, 439, 534, 559])
    travel = np.array([-52, -51, -7, -7, 0, 0, 6, 6, 51, 52])
    source_x = np.interp(x - 64, anchors + travel * expansion, anchors,
                         left=-1, right=560)
    # Open the loop in depth, leaving the face of the sensor undistorted.
    rear = .07 * source_x - 2
    rear_shift = -16 * expansion
    front_shift = 2 * expansion
    depth = np.clip((y - 22 - rear - rear_shift) / (47 + front_shift - rear_shift), 0, 1)
    source_y = y - 22 - (rear_shift + depth * (front_shift - rear_shift))
    channels = [map_coordinates(channel, (source_y, source_x), order=1,
                                mode="grid-constant") for channel in pixels.transpose(2, 0, 1)]
    return Image.frombytes("RGBa", FRAME_SIZE, np.stack(channels, axis=-1).tobytes()).convert("RGBA")


def main():
    with Image.open(ART / "polar-h10.webp") as artwork:
        pixels = np.asarray(artwork.convert("RGBa"))
    tile = (FRAME_SIZE[0] // 2, FRAME_SIZE[1] // 2)
    atlas = Image.new("RGBA", (tile[0], tile[1] * (INHALE_STEPS + 1)))
    poses = []
    for step in range(INHALE_STEPS + 1):
        pose = belt_frame(pixels, step)
        poses.append(pose)
        atlas.paste(pose.resize(tile, Image.Resampling.LANCZOS), (0, step * tile[1]))
    atlas.save(ART / "polar-h10-breathing.webp", quality=88, method=6)

    # The standalone loop includes the phase cue supplied by the diagram on the site.
    frames = []
    font = ImageFont.load_default(size=26)
    for i, pose in enumerate(poses + poses[-2:0:-1]):
        inhale = i < INHALE_STEPS
        frame = Image.new("RGB", (752, 328), "#1c2421")
        frame.paste(pose, (32, 15), pose.getchannel("A"))
        ImageDraw.Draw(frame).text((376, 286), "Inhale" if inhale else "Exhale",
                                   font=font, anchor="mm", fill="#9cd8f0" if inhale else "#f0b86a")
        frames.append(frame)
    # Use one palette across both phases to keep the fabric texture stable.
    colors = Image.new("RGB", (752, 656))
    colors.paste(frames[0])
    colors.paste(frames[INHALE_STEPS], (0, 328))
    palette = colors.quantize(256)
    frames = [f.quantize(palette=palette, dither=Image.Dither.NONE) for f in frames]
    ticks = [round(i * 200 / INHALE_STEPS) for i in range(len(frames) + 1)]
    durations = [(b - a) * 10 for a, b in zip(ticks, ticks[1:])]
    frames[0].save(ART / "polar-h10-breathing.gif", save_all=True, append_images=frames[1:],
                   duration=durations, loop=0, optimize=True)


if __name__ == "__main__":
    main()
