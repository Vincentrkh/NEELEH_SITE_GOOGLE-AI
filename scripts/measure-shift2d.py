#!/usr/bin/env python3
"""Measure (dx, dy) rigid shift between two frames via coarse-to-fine correlation."""
import sys
import numpy as np
from PIL import Image

def sse_at(a, b, dx, dy):
    h, w = a.shape
    ys = slice(max(0, dy), min(h, h + dy))
    yb = slice(max(0, -dy), min(h, h - dy))
    xs = slice(max(0, dx), min(w, w + dx))
    xb = slice(max(0, -dx), min(w, w - dx))
    aa = a[ys, xs]
    bb = b[yb, xb]
    n = aa.size
    if n == 0:
        return 1e18
    return float(((aa - bb) ** 2).sum() / n)

def best_shift(a, b, rng=60):
    best, bd = 1e18, (0, 0)
    for dy in range(-rng, rng + 1, 2):
        for dx in range(-rng, rng + 1, 2):
            s = sse_at(a, b, dx, dy)
            if s < best:
                best, bd = s, (dx, dy)
    dx0, dy0 = bd
    for dy in range(dy0 - 2, dy0 + 3):
        for dx in range(dx0 - 2, dx0 + 3):
            s = sse_at(a, b, dx, dy)
            if s < best:
                best, bd = s, (dx, dy)
    return bd, best

a = np.array(Image.open(sys.argv[1]).convert("L"), dtype=np.float32)
b = np.array(Image.open(sys.argv[2]).convert("L"), dtype=np.float32)
h, w = a.shape
# ridge region
y0, y1 = int(h * 0.20), int(h * 0.60)
x0, x1 = int(w * 0.45), int(w * 0.95)
ra, rb = a[y0:y1, x0:x1], b[y0:y1, x0:x1]
(dx, dy), s = best_shift(ra, rb, 40)
print(f"ridge rigid shift: dx={dx}px dy={dy}px  (sse={s:.1f})  base_sse={sse_at(ra, rb, 0, 0):.1f}")
