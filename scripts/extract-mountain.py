#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
# استخراج کوه واقعی مرجع — نسخه ۲ با هم‌ترازی افقی:
#   drift کوه بین فریم‌ها با phaseCorrelate اندازه‌گیری و جبران می‌شود
#   → median-stacking ابرها را حذف می‌کند، کوه + مه ثابت می‌ماند
# ─────────────────────────────────────────────────────────────────────────────
import numpy as np
import cv2
from PIL import Image

OUT = "/home/z/my-project/public/images/webgl"
TIMES = [100]
REF_T = 100
TOP = 72  # زیر هدر

def load(t):
    return np.asarray(Image.open(f"/tmp/scan/s_{t}.png").convert("RGB"))[TOP:, :, :]

ref = load(REF_T)
gref = cv2.cvtColor(ref, cv2.COLOR_RGB2GRAY).astype(np.float32)
strip_ref = gref[48:248, 700:1250]  # نواری از پهنه کوه، بدون متن

aligned = []
for t in TIMES:
    im = load(t)
    g = cv2.cvtColor(im, cv2.COLOR_RGB2GRAY).astype(np.float32)
    shift, _ = cv2.phaseCorrelate(strip_ref, g[48:248, 700:1250])
    dx, dy = -round(shift[0]), -round(shift[1])
    if abs(dx) > 6 or abs(dy) > 6:
        print(f"t={t}: SKIP (state changed, dx={dx} dy={dy})")
        continue
    M = np.float32([[1, 0, dx], [0, 1, dy]])
    shifted = cv2.warpAffine(im, M, (im.shape[1], im.shape[0]), flags=cv2.INTER_LINEAR,
                             borderMode=cv2.BORDER_REPLICATE)
    aligned.append(shifted)
    print(f"t={t}: dx={dx} dy={dy}")

stack = np.stack(aligned)
med = np.median(stack, axis=0).astype(np.uint8)
Image.fromarray(med).save("/tmp/mountain-median.png")

# ── inpaint متن ──
gray = cv2.cvtColor(med, cv2.COLOR_RGB2GRAY)
text_mask = (gray < 95).astype(np.uint8) * 255
text_mask = cv2.dilate(text_mask, np.ones((11, 11), np.uint8), iterations=2)
print("text px:", (text_mask > 0).sum())
clean = cv2.inpaint(med, text_mask, 9, cv2.INPAINT_TELEA)
g2 = cv2.cvtColor(clean, cv2.COLOR_RGB2GRAY)
tm2 = cv2.dilate((g2 < 112).astype(np.uint8) * 255, np.ones((5, 5), np.uint8), iterations=1)
clean = cv2.inpaint(clean, tm2, 6, cv2.INPAINT_TELEA)

# ── denoise: bilateral (حذف grain ویدئو، حفظ لبه‌ها) ──
clean = cv2.bilateralFilter(clean, 7, 35, 35)

# ── کوچک‌سازی کوه در بوم بزرگ‌تر (رفع «کوه خیلی مسلط») ──
TH, TW = 578, 1440
rw, rh = 1240, 517
resized = cv2.resize(clean, (rw, rh), interpolation=cv2.INTER_AREA)
sky_tone = clean[8:40, 200:1200].reshape(-1, 3).mean(axis=0)
canvas = np.zeros((TH, TW, 3), np.float32)
yy, xx = np.mgrid[0:TH, 0:TW].astype(np.float32)
for c in range(3):
    canvas[:, :, c] = sky_tone[c] + (yy / TH) * 4.0   # گرادیان ملایم آسمان
x0, y0 = (TW - rw) // 2, TH - rh
# ماسک feather برای ادغام لبه‌های pasted
pm = np.ones((rh, rw), np.float32)
fx = np.clip(np.arange(rw) / 60.0, 0, 1) * np.clip((rw - 1 - np.arange(rw)) / 60.0, 0, 1)
fy = np.clip(np.arange(rh) / 50.0, 0, 1)
pm *= fx[None, :]
pm *= fy[:, None]
region = canvas[y0:y0 + rh, x0:x0 + rw, :]
canvas[y0:y0 + rh, x0:x0 + rw, :] = region * (1 - pm[:, :, None]) + resized * pm[:, :, None]
clean = np.clip(canvas, 0, 255).astype(np.uint8)

# ── آلفا: آستانه سراسری نسبت به آسمان (≈246) + بافت ریز ──
g3 = cv2.cvtColor(clean, cv2.COLOR_RGB2GRAY).astype(np.float32)
alpha = np.clip((246.0 - g3) / 20.0, 0, 1)
blur = cv2.GaussianBlur(g3, (0, 0), 3)
tex_mag = np.clip(np.abs(g3 - blur) / 5.0, 0, 1)
alpha = np.clip(alpha + tex_mag * 0.45, 0, 1)
alpha_u8 = (alpha * 255).astype(np.uint8)
alpha_u8 = cv2.morphologyEx(alpha_u8, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
alpha_u8 = cv2.GaussianBlur(alpha_u8, (0, 0), 1.0)
ch = clean.shape[0]
fade = np.clip((np.arange(ch) - ch * 0.90) / (ch * 0.08), 0, 1)
alpha_u8 = (alpha_u8 * (1 - fade[:, None])).astype(np.uint8)

# ── bump ──
bump = cv2.GaussianBlur(g3, (0, 0), 1.0)
bump = ((bump - bump.min()) / max(1, bump.max() - bump.min()) * 255).astype(np.uint8)

Image.fromarray(clean).save(f"{OUT}/peaks_FRONT.jpg", quality=92)
Image.fromarray(cv2.cvtColor(alpha_u8, cv2.COLOR_GRAY2RGB)).save(f"{OUT}/peaks_FRONT_alpha.jpg", quality=90)
Image.fromarray(cv2.cvtColor(bump, cv2.COLOR_GRAY2RGB)).save(f"{OUT}/peaks_FRONT_bump.jpg", quality=90)

a = alpha_u8.astype(float)
print("alpha mean:", round(a.mean(), 1), "| >128:", round((a > 128).mean() * 100, 1), "%")
print("done — texture", clean.shape[1], "x", clean.shape[0])
