#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
# تولید تکسچرهای صحنه cloudsea — بازسازی از فریم‌های ویدئوی مرجع
# خروجی: public/images/webgl/
#   cloud.png            اسپرایت ابر نرم (RGBA)
#   peaks_FRONT.jpg      کوه اصلی عکاسی (RGB)
#   peaks_FRONT_bump.jpg نقشه ارتفاع برای fake-3D
#   peaks_FRONT_alpha.jpg ماسک آلفا سیلوئت
#   peaks_MIDDLE.png     خط‌الرأس دور (RGBA با آلفا)
#   background.jpg       آسمان روشن (RGB)
# ─────────────────────────────────────────────────────────────────────────────
import numpy as np
from PIL import Image, ImageFilter
import os

OUT = "/home/z/my-project/public/images/webgl"
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(20260214)


def value_noise(w, h, cell, seed):
    """نویز مقداری دوبعدی با درون‌یابی smoothstep"""
    r = np.random.default_rng(seed)
    gw, gh = int(w / cell) + 2, int(h / cell) + 2
    g = r.random((gh, gw))
    ys = (np.arange(h) / cell) % 1
    xs = (np.arange(w) / cell) % 1
    ys_idx = (np.arange(h) // cell).astype(int)
    xs_idx = (np.arange(w) // cell).astype(int)
    sx = xs * xs * (3 - 2 * xs)
    sy = ys * ys * (3 - 2 * ys)
    sx = sx[None, :]
    sy = sy[:, None]
    g00 = g[np.ix_(ys_idx, xs_idx)]
    g10 = g[np.ix_(ys_idx, xs_idx + 1)]
    g01 = g[np.ix_(ys_idx + 1, xs_idx)]
    g11 = g[np.ix_(ys_idx + 1, xs_idx + 1)]
    top = g00 * (1 - sx) + g10 * sx
    bot = g01 * (1 - sx) + g11 * sx
    return top * (1 - sy) + bot * sy


def fbm(w, h, base_cell=128, octaves=6, seed=1, gain=0.5):
    total = np.zeros((h, w))
    amp, cell, norm = 1.0, base_cell, 0.0
    for o in range(octaves):
        total += amp * value_noise(w, h, cell, seed + o * 97)
        norm += amp
        amp *= gain
        cell /= 2.0
    return total / norm


def ridge_profile(w, seed, peaks_x, base_h, amp):
    """پروفایل ۱D کوه — قله‌های تیز با نویز fBm یک‌بعدی"""
    r = np.random.default_rng(seed)
    x = np.linspace(0, 1, w)
    y = np.zeros(w)
    # چند قله اصلی (لوکیشن/ارتفاع/پهنا)
    for px, ph, pw in peaks_x:
        d = np.exp(-((x - px) ** 2) / (2 * pw * pw))
        # شکل قله تیز: توان منفی از دو طرف
        y += ph * np.power(np.maximum(d, 1e-9), 0.55)
    # جزئیات fBm
    detail = fbm(w, 1, base_cell=int(w / 24), octaves=7, seed=seed + 11)[0]
    y += (detail - 0.5) * amp
    # دره‌های میان قله‌ها به سمت خط پایه
    return y


def make_cloud():
    """اسپرایت ابر حجمی — خوشه پف‌های گرد با سایه‌پردازی داخلی
    (رفع ایراد VLM: نوار افقی مسطح نباشد؛ بیلوهای متمایز)"""
    W, H = 640, 280
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    alpha = np.zeros((H, W), np.float32)
    light = np.zeros((H, W), np.float32)  # 0..1 روشنایی هر پف
    r = np.random.default_rng(101)
    # خوشه پف‌ها — مرکز بالا، شانه‌ها پایین‌تر؛ هر پف گرد و مشخص
    puffs = []
    cluster = [
        (0.50, 0.44, 0.19, 1.00), (0.36, 0.52, 0.15, 0.98),
        (0.64, 0.50, 0.16, 0.98), (0.28, 0.62, 0.12, 0.90),
        (0.74, 0.60, 0.13, 0.92), (0.43, 0.36, 0.13, 0.95),
        (0.58, 0.35, 0.12, 0.94), (0.50, 0.28, 0.10, 0.90),
        (0.22, 0.66, 0.07, 0.70), (0.78, 0.65, 0.08, 0.72),
        (0.35, 0.40, 0.08, 0.85), (0.66, 0.38, 0.08, 0.85),
    ]
    for fx, fy, fr, fa in cluster:
        jx, jy = r.uniform(-0.015, 0.015), r.uniform(-0.01, 0.01)
        px, py = fx * W + jx * W, fy * H + jy * H
        prx, pry = fr * W, fr * W * 0.72
        d = np.sqrt(((xx - px) / prx) ** 2 + ((yy - py) / pry) ** 2)
        blob = np.clip(1 - d, 0, 1) ** 1.05 * fa
        alpha = np.maximum(alpha, blob)
        # سایه‌پردازی هر پف: بالا-چپ روشن، پایین-راست سایه
        lx = np.clip(0.5 - (xx - px) / prx * 0.9, 0, 1)
        ly = np.clip(0.5 - (yy - py) / pry * 1.1, 0, 1)
        shade = np.clip(lx * ly * 1.6 + 0.25, 0, 1)
        light = np.where(blob > light, shade * blob, light)
    # پایه ابر: نوار خیلی نرم (بدون لبه تخت — رفع درز افقی)
    base = np.clip(1 - ((yy - H * 0.68) / (H * 0.22)) ** 2, 0, 1)
    base *= np.clip(1 - ((xx - W * 0.5) / (W * 0.38)) ** 2, 0, 1) * 0.42
    alpha = np.maximum(alpha, base)
    light = np.where(base > light, 0.45 * base, light)
    # رنگ: سفید بالا، خاکستری سایه (دوپه 214..255)
    color = 214 + 41 * np.clip(light / np.maximum(alpha, 0.2), 0, 1)
    n = fbm(W, H, base_cell=48, octaves=4, seed=77)
    color = np.clip(color + (n - 0.5) * 6, 205, 255)
    alpha = np.clip(alpha, 0, 1) ** 1.1
    img = np.dstack([
        np.repeat(color[:, :, None], 3, axis=2),
        alpha[:, :, None] * 255,
    ]).astype(np.uint8)
    im = Image.fromarray(img).filter(ImageFilter.GaussianBlur(2.5))
    im.save(f"{OUT}/cloud.png")
    print("cloud.png", im.size)


def ridged(w, h, base_cell=128, octaves=5, seed=1):
    """نویز ridged — برای تیغه و شیارهای صخره"""
    total = np.zeros((h, w))
    amp, cell, norm = 1.0, base_cell, 0.0
    for o in range(octaves):
        n = value_noise(w, h, cell, seed + o * 131)
        total += amp * (1 - np.abs(n * 2 - 1))
        norm += amp
        amp *= 0.55
        cell /= 2.0
    return total / norm


def make_peaks_front():
    """کوه اصلی — عکاسی‌گونه، مه‌آلود، با bump و alpha"""
    W, H = 2048, 820
    # خط‌الرأس: قله اصلی راست-مرکز + شانه‌ها؛ لبه دندانه‌دار با نویز ریز
    prof = ridge_profile(
        W, seed=31,
        peaks_x=[(0.55, 1.0, 0.115), (0.65, 0.60, 0.075), (0.46, 0.58, 0.08),
                 (0.36, 0.40, 0.09), (0.74, 0.44, 0.075), (0.27, 0.30, 0.09),
                 (0.84, 0.30, 0.08), (0.18, 0.24, 0.10), (0.10, 0.15, 0.10),
                 (0.50, 0.42, 0.045), (0.60, 0.52, 0.04), (0.70, 0.38, 0.04)],
        base_h=0, amp=0.10,
    )
    jag = fbm(W, 1, base_cell=int(W / 60), octaves=6, seed=64)[0]
    prof = prof / prof.max() + (jag - 0.5) * 0.10
    prof = np.clip(prof, 0, 1.05)
    base_y = H * 0.96
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    ridge_y = base_y - prof * (H * 0.80)

    inside = (yy >= ridge_y[None, :]).astype(np.float32)
    depth_in = np.clip((yy - ridge_y[None, :]) / (H * 0.80), 0, 1)

    # بافت صخره/برف
    h2d = fbm(W, H, base_cell=150, octaves=7, seed=51)
    h2d_fine = fbm(W, H, base_cell=30, octaves=6, seed=87)
    rg = ridged(W, H, base_cell=90, octaves=5, seed=99)
    rg_fine = ridged(W, H, base_cell=24, octaves=5, seed=113)
    rg_crest = ridged(W, H, base_cell=44, octaves=5, seed=151)
    terrain = np.clip(prof[None, :] * 0.70 + h2d * 0.16 + h2d_fine * 0.06 + (rg - 0.5) * 0.10, 0, 1)

    grad_y, grad_x = np.gradient(terrain)
    # نور جهت‌دار از چپ-بالا
    light = np.clip(0.58 + grad_y * 6.5 - grad_x * 5.5, 0, 1)
    tex = np.clip(0.55 + 0.45 * rg_fine, 0, 1)
    # تیغه‌های میانی: شیارهای تیره در طول دامنه
    crest = np.clip((rg_crest - 0.58) * 3.0, 0, 1) * 0.22
    shade = np.clip(light * tex - crest * (1 - light * 0.4), 0, 1)
    snow_m = np.clip((terrain - 0.50) * 3.2, 0, 1) ** 1.1 * np.clip(light * 0.6 + 0.4, 0, 1)
    # واریانس برف: پچ‌های برف با نویز
    snow_var = np.clip(snow_m * (0.55 + rg_fine * 0.6), 0, 1)
    g = 104 + 104 * shade
    g = g * (1 - snow_var) + 248 * snow_var
    # مه اتمسفری — فقط پایین کوه؛ بالای کوه شفاف با کنتراست کامل
    haze = np.clip(0.04 + np.power(depth_in, 2.2) * 0.92, 0, 0.92)
    edge_dist = np.minimum(xx / W, 1 - xx / W) * 2
    haze += np.clip(1 - edge_dist * 2.5, 0, 1) * 0.12
    g = g * (1 - np.clip(haze, 0, 0.92)) + 252 * np.clip(haze, 0, 0.92)

    rgb = np.repeat(np.clip(g, 0, 255)[:, :, None], 3, axis=2)

    alpha = inside.copy()
    bottom_fade = np.clip((yy - (H * 0.68)) / (H * 0.26), 0, 1)
    alpha = alpha * (1 - bottom_fade * 0.85)
    alpha *= np.clip(0.90 + h2d_fine * 0.10, 0, 1)
    alpha = np.clip(alpha, 0, 1)
    horiz = np.clip((xx - W * 0.01) / (W * 0.08), 0, 1) * np.clip((W * 0.99 - xx) / (W * 0.08), 0, 1)
    alpha *= np.clip(horiz, 0, 1)

    bump = np.clip(terrain * 0.8 + depth_in * 0.2, 0, 1)

    Image.fromarray(rgb.astype(np.uint8), "RGB").filter(
        ImageFilter.GaussianBlur(0.5)).save(f"{OUT}/peaks_FRONT.jpg", quality=92)
    Image.fromarray(np.repeat((bump * 255)[:, :, None], 3, axis=2).astype(np.uint8), "RGB")\
        .save(f"{OUT}/peaks_FRONT_bump.jpg", quality=90)
    Image.fromarray(np.repeat((alpha * 255)[:, :, None], 3, axis=2).astype(np.uint8), "RGB")\
        .filter(ImageFilter.GaussianBlur(2)).save(f"{OUT}/peaks_FRONT_alpha.jpg", quality=90)
    print("peaks_FRONT trio", (W, H))


def make_peaks_middle():
    """خط‌الرأس دور — با عمق بیشتر (رفع ایراد VLM: نبود لایه پس‌زمینه)"""
    W, H = 1600, 560
    prof = ridge_profile(
        W, seed=53,
        peaks_x=[(0.30, 0.55, 0.14), (0.48, 0.75, 0.12), (0.66, 0.5, 0.13),
                 (0.85, 0.38, 0.12), (0.12, 0.3, 0.12)],
        base_h=0, amp=0.20,
    )
    jag = fbm(W, 1, base_cell=int(W / 60), octaves=5, seed=71)[0]
    prof = prof / prof.max() + (jag - 0.5) * 0.09
    prof = np.clip(prof, 0, 1.05)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    ridge_y = H * 0.9 - prof * (H * 0.72)
    inside = (yy >= ridge_y[None, :]).astype(np.float32)
    h2d = fbm(W, H, base_cell=90, octaves=6, seed=61)
    h2d_fine = fbm(W, H, base_cell=22, octaves=5, seed=67)
    shade = 0.78 + 0.16 * h2d - 0.10 * np.clip((yy - ridge_y[None, :]) / H, 0, 1)
    shade += (h2d_fine - 0.5) * 0.10
    # قابل دیدن ولی مه‌آلود — خاکستری 196..232
    g = np.clip(shade * 216 + 8, 196, 235)
    alpha = inside * np.clip(0.85 + h2d * 0.14, 0, 1)
    bottom_fade = np.clip((yy - H * 0.55) / (H * 0.4), 0, 1)
    alpha *= 1 - bottom_fade * 0.45
    horiz = np.clip((xx - W * 0.01) / (W * 0.08), 0, 1) * np.clip((W * 0.99 - xx) / (W * 0.08), 0, 1)
    alpha *= np.clip(horiz, 0, 1)
    img = np.dstack([
        np.repeat(g[:, :, None], 3, axis=2),
        np.clip(alpha, 0, 1)[:, :, None] * 255,
    ]).astype(np.uint8)
    Image.fromarray(img).filter(ImageFilter.GaussianBlur(1.5)).save(f"{OUT}/peaks_MIDDLE.png")
    print("peaks_MIDDLE.png", (W, H))


def make_background():
    """آسمان + ریدج بسیار دور در پس‌زمینه (عمق فضا)"""
    W, H = 1600, 790
    yy = np.mgrid[0:H, 0:W][0].astype(np.float32) / H
    # بالا کمی تیره‌تر، پایین سفید
    g = 242 - 10 * np.clip(1 - yy * 2.2, 0, 1) + 8 * np.clip(yy - 0.55, 0, 1) * 2
    n = fbm(W, H, base_cell=220, octaves=3, seed=91)
    g = np.clip(g + (n - 0.5) * 5, 0, 255)
    # ریدج بسیار دور — سمت راست، تقریباً در مه
    prof = ridge_profile(
        W, seed=88,
        peaks_x=[(0.88, 0.28, 0.10), (0.72, 0.16, 0.12), (0.30, 0.12, 0.14)],
        base_h=0, amp=0.05,
    )
    prof /= max(prof.max(), 1e-6)
    ridge_y = H * 0.98 - prof * (H * 0.30)
    yy2 = np.mgrid[0:H, 0:W][0].astype(np.float32)
    inside = (yy2 >= ridge_y[None, :]).astype(np.float32)
    ridge_g = 226 + 8 * fbm(W, H, base_cell=120, octaves=4, seed=93)
    g = g * (1 - inside * 0.85) + ridge_g * inside * 0.85
    img = np.repeat(np.clip(g, 0, 255)[:, :, None], 3, axis=2).astype(np.uint8)
    Image.fromarray(img, "RGB").save(f"{OUT}/background.jpg", quality=90)
    print("background.jpg", (W, H))


if __name__ == "__main__":
    make_cloud()
    make_peaks_front()
    make_peaks_middle()
    make_background()
    print("done")
