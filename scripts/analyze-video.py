#!/usr/bin/env python3
"""تحلیل ویدئوی مرجع: مسیر کرسر قرمز + جابه‌جایی پارالاکس کوه بین فریم‌ها."""
import numpy as np
from PIL import Image
import glob, sys

files = sorted(glob.glob("/tmp/vid/f-*.png"))
W = 960  # عرض فریم‌های استخراج‌شده

def red_dot(img):
    """مرکز نقطه قرمز (کرسر سفارشی مرجع)"""
    a = np.asarray(img, dtype=np.int32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mask = (r > 150) & (r - g > 60) & (r - b > 60)
    if mask.sum() < 3:
        return None
    ys, xs = np.nonzero(mask)
    return float(xs.mean()), float(ys.mean()), int(mask.sum())

def best_shift(a, b, rng=25):
    """جابه‌جالی (dx,dy) با برازش SSE — روی ناحیه کوه"""
    h, w = a.shape
    best, bd = 1e18, (0, 0)
    for dy in range(-rng, rng + 1, 1):
        for dx in range(-rng, rng + 1, 1):
            ys = slice(max(0, dy), min(h, h + dy))
            yb = slice(max(0, -dy), min(h, h - dy))
            xs = slice(max(0, dx), min(w, w + dx))
            xb = slice(max(0, -dx), min(w, w - dx))
            aa = a[ys, xs]; bb = b[yb, xb]
            s = float(((aa - bb) ** 2).mean())
            if s < best:
                best, bd = s, (dx, dy)
    return bd, best

# ناحیه کوه راست — بدون متن و بدون ابرهای خیلی محو
RY0, RY1 = int(421 * 0.10), int(421 * 0.55)
RX0, RX1 = int(960 * 0.52), int(960 * 0.97)

print("frame | red_dot(x,y)      | ridge dx,dy vs prev | ridge dx,dy vs f-001")
first = None
prev = None
for i, f in enumerate(files):
    im = Image.open(f).convert("RGB")
    g = np.asarray(im.convert("L"), dtype=np.float32)
    ridge = g[RY0:RY1, RX0:RX1]
    if first is None:
        first = ridge
    dot = red_dot(im)
    d_dot = f"({dot[0]:6.1f},{dot[1]:6.1f})" if dot else "  ( —,— )"
    if prev is not None:
        (dxp, dyp), sp = best_shift(prev, ridge)
        (dxf, dyf), sf = best_shift(first, ridge)
        print(f"{i:3d}  | {d_dot} | {dxp:+3d},{dyp:+3d} sse={sp:5.1f} | {dxf:+3d},{dyf:+3d} sse={sf:5.1f}")
    else:
        print(f"{i:3d}  | {d_dot} |   —            |   —")
    prev = ridge
