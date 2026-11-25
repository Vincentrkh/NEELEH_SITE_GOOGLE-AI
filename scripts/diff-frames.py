#!/usr/bin/env python3
"""Diff two screenshot frames to visualize cloud motion on the reference canvas."""
import sys
from PIL import Image, ImageChops

a_path, b_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
a = Image.open(a_path).convert("L")
b = Image.open(b_path).convert("L")

# amplified difference
diff = ImageChops.difference(a, b)
# amplify x8, clamp
diff = diff.point(lambda p: min(255, p * 8))

# side-by-side: a, b, diff
w, h = a.size
canvas = Image.new("RGB", (w * 3 // 2, h // 2), "white")
for i, im in enumerate([a, b, diff]):
    im2 = im.crop((0, 0, w, h)).resize((w // 2, h // 2))
    canvas.paste(im2.convert("RGB"), (i * (w // 2), 0))
canvas.save(out_path)
print("saved", out_path, "mean_diff:", sum(diff.getdata()) / (w * h))
