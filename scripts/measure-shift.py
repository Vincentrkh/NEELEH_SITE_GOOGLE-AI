#!/usr/bin/env python3
"""Measure horizontal shift between two frames' ridge region via brute-force correlation."""
import sys
import numpy as np
from PIL import Image

def best_offset(a, b, max_shift=90):
    # a, b: grayscale arrays; find dx minimizing SSE when b shifted by dx
    best, best_dx = 1e18, 0
    for dx in range(-max_shift, max_shift + 1):
        if dx >= 0:
            aa = a[:, dx:]
            bb = b[:, :a.shape[1] - dx]
        else:
            aa = a[:, :dx]
            bb = b[:, -dx:]
        sse = float(((aa - bb) ** 2).mean())
        if sse < best:
            best, best_dx = sse, dx
    return best_dx, best

a = np.array(Image.open(sys.argv[1]).convert("L"), dtype=np.float32)
b = np.array(Image.open(sys.argv[2]).convert("L"), dtype=np.float32)
# ridge region (peak area, avoids text)
y0, y1 = int(a.shape[0] * 0.20), int(a.shape[0] * 0.62)
x0, x1 = int(a.shape[1] * 0.45), int(a.shape[1] * 0.95)
ra, rb = a[y0:y1, x0:x1], b[y0:y1, x0:x1]
dx, sse = best_offset(ra, rb)
print(f"ridge x-shift: {dx}px  (sse={sse:.1f})")
# full-frame bottom cloud band shift
y0b, y1b = int(a.shape[0] * 0.65), a.shape[0]
cb, db = a[y0b:y1b, :], b[y0b:y1b, :]
dx2, sse2 = best_offset(cb, db, 40)
print(f"cloud-band x-shift: {dx2}px (sse={sse2:.1f})")
