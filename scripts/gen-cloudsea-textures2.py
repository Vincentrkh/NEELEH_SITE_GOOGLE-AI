#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
# تولید تکسچرهای صحنه cloudsea — نسخه ۲، کالیبره‌شده روی ویدئوی مرجع
# ─────────────────────────────────────────────────────────────────────────────
# مبنا: سیلوئت کوه استخراج‌شده از فریم مرجع (t=0، موس مرکز، 1920×842):
#   پلن‌ها 1.23·REF.w×REF.h با zoom3D=1.1 → روی صفحه:
#     x_screen = -339 + u·2598      y_screen = -100 + v_top·1042
#   ↔  u = (x+339)/2598             v_top = (y+100)/1042
# تقسیم لایه‌ها:
#   peaks_MIDDLE  : خط‌الرأس نرمِ چپ (u 0→0.50) — مه‌آلود، روشن
#   peaks_FRONT   : زینِ وسط + قلهٔ اصلی تیز + شیب راست (u 0.42→1.0)
#   background    : آسمان مبهم + خط‌الرأس خیلی محو افق
#   cloud.png     : پف سفید متراکم (دریای ابر پایین)
# خروجی: public/images/webgl/  (باید ?v=7 در tm-hero-scene.tsx شود)
# ─────────────────────────────────────────────────────────────────────────────
import numpy as np
from PIL import Image, ImageFilter
import os

OUT = "/home/z/my-project/public/images/webgl"
os.makedirs(OUT, exist_ok=True)

TW, TH = 2362, 947          # ابعاد تکسچر = ابعاد پلن در world
CW = 640                    # ابعاد اسپرایت ابر (نسبت 2.5)
CH = 256

# نقاط سیلوئت از ویدئو (x_screen, y_screen)
SIL = [
    (-80, 258), (0, 248), (120, 238), (200, 268), (300, 186), (360, 181),
    (440, 182), (520, 196), (600, 278), (680, 349), (760, 184), (840, 179),
    (920, 411), (1000, 380), (1080, 340), (1160, 300), (1240, 242),
    (1320, 227), (1400, 239), (1480, 304), (1560, 353), (1640, 381),
    (1720, 400), (1800, 414), (1880, 435), (2000, 470), (2159, 500),
]

def u_of(x):  return (x + 339.0) / 2598.0
def v_of(y):  return (y + 100.0) / 1042.0          # v از بالای پلن
def vy_of(y): return 1.0 - v_of(y)                  # v از پایین (GL uv)

def silhouette_u(u_pts, w=TW):
    """تبدیل نقاط (u,v_top) به آرایه v_top به طول w با درون‌یابی"""
    us = np.array([p[0] for p in u_pts])
    vs = np.array([p[1] for p in u_pts])
    x = np.linspace(0, 1, w)
    return np.interp(x, us, vs)

def fbm_1d(w, cells, seed):
    """نویز ۱D چنداکتاوی — برای خرده‌ریز سیلوئت"""
    rng = np.random.default_rng(seed)
    total = np.zeros(w)
    amp, norm = 1.0, 0.0
    for cell in cells:
        g = rng.random(cell + 2)
        x = np.linspace(0, cell, w)
        i0 = np.floor(x).astype(int)
        f = x - i0
        f = f * f * (3 - 2 * f)
        val = g[i0] * (1 - f) + g[i0 + 1] * f
        total += amp * val
        norm += amp
        amp *= 0.5
    return total / norm

def value_noise_2d(w, h, cell, seed):
    rng = np.random.default_rng(seed)
    gw, gh = int(w / cell) + 2, int(h / cell) + 2
    g = rng.random((gh, gw))
    ys = (np.arange(h) / cell) % 1
    xs = (np.arange(w) / cell) % 1
    yi = (np.arange(h) // cell).astype(int)
    xi = (np.arange(w) // cell).astype(int)
    sy = ys * ys * (3 - 2 * ys); sx = xs * xs * (3 - 2 * xs)
    g00 = g[np.ix_(yi, xi)]; g10 = g[np.ix_(yi, xi + 1)]
    g01 = g[np.ix_(yi + 1, xi)]; g11 = g[np.ix_(yi + 1, xi + 1)]
    return ((g00 * (1 - sx) + g10 * sx) * (1 - sy[:, None]) +
            (g01 * (1 - sx) + g11 * sx) * sy[:, None])

def fbm_2d(w, h, base_cell, octaves, seed, gain=0.5):
    total = np.zeros((h, w)); amp, cell, norm = 1.0, base_cell, 0.0
    for o in range(octaves):
        total += amp * value_noise_2d(w, h, cell, seed + o * 131)
        norm += amp; amp *= gain; cell /= 2.0
    return total / norm

def blur(a, k):
    img = Image.fromarray(a)
    return np.array(img.filter(ImageFilter.GaussianBlur(k)))

# ─────────────────────────────────────────────────────────────────────────────
# ۱) background.jpg — آسمان + خط‌الرأس بسیار محو افق
# ─────────────────────────────────────────────────────────────────────────────
bg = np.ones((TH, TW), dtype=np.float32) * 246.0
yy = np.linspace(0, 1, TH)[:, None]
bg += (yy * 8 - 4)                       # گرادیان عمودی ملایم 242→250
# خط‌الرأس محو افق (دوردست) — از ویدئو: ناحیهٔ محو پشت قلهٔ اصلی
hor = silhouette_u([
    (u_of(-80),  v_of(300)), (u_of(200), v_of(280)), (u_of(600), v_of(330)),
    (u_of(1000), v_of(360)), (u_of(1400), v_of(330)), (u_of(1800), v_of(390)),
    (u_of(2159), v_of(420)),
])
hline = (np.arange(TW)[None, :] / TW)
vv = (np.arange(TH) / TH)[:, None]                     # v_top هر ردیف (0 بالا → 1 پایین)
ridge_mask = np.clip((vv - hor[None, :]) * 12, 0, 1) * np.clip((0.62 - vv) * 8, 0, 1)
bg = bg - ridge_mask * 8 - fbm_2d(TW, TH, 220, 4, 11) * ridge_mask * 6
bg = np.clip(bg, 236, 252)
Image.fromarray(bg.astype(np.uint8)).save(f"{OUT}/background.jpg", quality=92)
print("background.jpg", bg.shape)

# ─────────────────────────────────────────────────────────────────────────────
# ۲) peaks_MIDDLE.png — خط‌الرأس نرم چپ (u 0→0.50) با آلفا
# ─────────────────────────────────────────────────────────────────────────────
mid_sil = silhouette_u([
    (u_of(-80), v_of(258)), (u_of(0), v_of(248)), (u_of(120), v_of(238)),
    (u_of(200), v_of(268)), (u_of(300), v_of(186)), (u_of(360), v_of(181)),
    (u_of(440), v_of(182)), (u_of(520), v_of(196)), (u_of(600), v_of(278)),
    (u_of(680), v_of(349)), (u_of(760), v_of(184)), (u_of(840), v_of(179)),
    (u_of(920), v_of(300)), (u_of(1000), v_of(430)), (u_of(1060), v_of(600)),
])
# خرده‌ریز سیلوئت
mid_sil = mid_sil + (fbm_1d(TW, [90, 45, 23], 21) - 0.5) * 26 / TH
xs = np.arange(TW)[None, :]
# ماسک 2D درست: مقایسهٔ v هر ردیف با سیلوئت هر ستون
body = np.clip((vv - mid_sil[None, :]) * TH, -2000, 2000)
mid_mask = np.clip(body / 6.0, 0, 1)                    # 0 بالای سیلوئت → 1 داخل
# محو تدریجی لبهٔ راست (u>0.44) تا صفر در 0.50
right_fade = np.clip((0.500 - xs / TW) / 0.06, 0, 1)
left_in = np.clip((xs / TW - 0.0) / 0.02 + 1, 0, 1)
mid_mask = mid_mask * right_fade * left_in
# تون: روشن و مه‌آلود — دامنه 208→235 (بالا روشن‌تر)
depth_in = np.clip(body / 500.0, 0, 1)
base = 235 - depth_in * 24
tex = base - fbm_2d(TW, TH, 110, 5, 31) * 14 * depth_in
tex = tex + (1 - depth_in) * 6
alpha = mid_mask * 255
rgba = np.zeros((TH, TW, 4), dtype=np.uint8)
rgba[..., 0] = np.clip(tex, 190, 245)
rgba[..., 1] = rgba[..., 0]
rgba[..., 2] = rgba[..., 0] + 2
rgba[..., 3] = blur(alpha.astype(np.uint8), 1.2)
Image.fromarray(rgba, "RGBA").save(f"{OUT}/peaks_MIDDLE.png")
print("peaks_MIDDLE.png", rgba.shape)

# ─────────────────────────────────────────────────────────────────────────────
# ۳) peaks_FRONT.jpg + bump + alpha — زین + قلهٔ اصلی + شیب راست (u 0.42→1)
# ─────────────────────────────────────────────────────────────────────────────
fr_sil = silhouette_u([
    (u_of(700), v_of(560)), (u_of(840), v_of(179)), (u_of(870), v_of(260)),
    (u_of(920), v_of(411)), (u_of(1000), v_of(380)), (u_of(1080), v_of(340)),
    (u_of(1160), v_of(300)), (u_of(1240), v_of(242)), (u_of(1320), v_of(227)),
    (u_of(1400), v_of(239)), (u_of(1480), v_of(304)), (u_of(1560), v_of(353)),
    (u_of(1640), v_of(381)), (u_of(1720), v_of(400)), (u_of(1800), v_of(414)),
    (u_of(1880), v_of(435)), (u_of(2000), v_of(470)), (u_of(2159), v_of(500)),
])
fr_sil = fr_sil + (fbm_1d(TW, [120, 60, 30, 15], 41) - 0.5) * 20 / TH
body_f = np.clip((vv - fr_sil[None, :]) * TH, -2000, 2000)
fr_mask = np.clip(body_f / 6.0, 0, 1)
# لبهٔ چپ: از u=0.42 شروع، پر شدن تا 0.455 — و بالای چپ (پشت زین) محو
left_fade = np.clip((xs / TW - 0.420) / 0.035, 0, 1)
fr_mask = fr_mask * left_fade
# مه در پایین (غرق در دریای ابر)
sea_y = v_of(640)
low_haze = np.clip((yy - sea_y) / 0.16, 0, 1) * 0.9
fr_mask = fr_mask * (1 - low_haze)
# ── تون کوه: پایه روشن خاکستری + برف + جزئیات صخره‌ای
depth_f = np.clip(body_f / 420.0, 0, 1)
rock = fbm_2d(TW, TH, 90, 6, 51)
stria = fbm_2d(TW, TH, 26, 5, 61)                      # خط‌های صخره ریز
tone = 232 - depth_f * 26                              # پایه 206→232
tone = tone - rock * 24 * (0.35 + 0.65 * depth_f)
tone = tone - stria * 14 * depth_f
# خط‌های صخرهٔ جهت‌دار (کشیدهٔ افقی) — مثل شیارهای مرجع
stria_h = fbm_2d(TW, TH // 4, 18, 4, 63)
stria_h = np.repeat(stria_h, 4, axis=0)
stria_h = np.vstack([stria_h, np.repeat(stria_h[-1:, :], TH - stria_h.shape[0], axis=0)])[:TH]
tone = tone - (stria_h - 0.5) * 12 * depth_f
# وصله‌های برف سفید — نویز درشت نزدیک قله (u 0.55..0.75)
snow_n = fbm_2d(TW, TH, 150, 4, 71)
crest_band = np.exp(-((xs / TW - 0.635) ** 2) / (2 * 0.10 ** 2))
snow = np.clip((snow_n - 0.62) * 4, 0, 1) * crest_band * np.clip(depth_f * 4, 0, 1)
tone = tone + snow * 24
tone = np.clip(tone, 196, 252)
rgb = np.zeros((TH, TW, 3), dtype=np.uint8)
rgb[..., 0] = tone; rgb[..., 1] = tone - 1; rgb[..., 2] = tone - 3
Image.fromarray(rgb).save(f"{OUT}/peaks_FRONT.jpg", quality=92)

# ── bump: آسمان/پایه 0.5 → قله ≈0.54 (کالیبره از دو نقطهٔ همگرای ویدئوی مرجع:
#    dx REF در norm≈0.87 → bump قله ≈ 0.52–0.54؛ fake3d بسیار ملایم)
bump = np.full((TH, TW), 0.5, dtype=np.float32)
bump += np.clip(depth_f * 0.045, 0, 0.045) * fr_mask
bump += (rock - 0.5) * 0.018 * fr_mask
bump = np.clip(bump * 255, 0, 255)
Image.fromarray(bump.astype(np.uint8)).save(f"{OUT}/peaks_FRONT_bump.jpg", quality=92)

# ── alpha: سیلوئت سفید روی سیاه
al = np.clip(fr_mask * 255, 0, 255)
al = blur(al.astype(np.uint8), 1.5)
Image.fromarray(al).save(f"{OUT}/peaks_FRONT_alpha.jpg", quality=92)
print("peaks_FRONT set", rgb.shape)

# ─────────────────────────────────────────────────────────────────────────────
# ۴) cloud.png — پف سفید متراکم (دریای ابر)
# ─────────────────────────────────────────────────────────────────────────────
cx, cy = CW * 0.5, CH * 0.62
xx2, yy2 = np.meshgrid(np.arange(CW), np.arange(CH))
field = np.zeros((CH, CW), dtype=np.float32)
rng = np.random.default_rng(91)
# خوشه‌های کروی — پف مرکزی بزرگ + لوب‌های اطراف
lobes = [(0.50, 0.58, 0.30, 0.24), (0.30, 0.66, 0.20, 0.17), (0.70, 0.66, 0.20, 0.17),
         (0.42, 0.50, 0.16, 0.13), (0.60, 0.50, 0.16, 0.13), (0.18, 0.72, 0.13, 0.11),
         (0.82, 0.72, 0.13, 0.11), (0.50, 0.72, 0.24, 0.16)]
for lx, ly, rx, ry in lobes:
    lx += (rng.random() - 0.5) * 0.04
    d2 = ((xx2 / CW - lx) / rx) ** 2 + ((yy2 / CH - ly) / ry) ** 2
    field = np.maximum(field, np.clip(1.2 - d2 * 1.6, 0, 1))
field = np.clip(field, 0, 1)
# نرم‌سازی و آلفا — هستهٔ متراکم، لبهٔ نرم
alpha_c = np.clip((field - 0.18) / 0.82, 0, 1) ** 0.85
alpha_c = blur((alpha_c * 255).astype(np.uint8), 6) / 255.0
# سایهٔ خیلی ملایم زیر لوب‌ها برای حجم
shade = 1 - 0.10 * np.clip((yy2 / CH - 0.55) * 2.4, 0, 1) * alpha_c
cloud_rgb = np.clip(255 * shade, 0, 255)
rgba_c = np.zeros((CH, CW, 4), dtype=np.uint8)
rgba_c[..., 0] = cloud_rgb; rgba_c[..., 1] = cloud_rgb; rgba_c[..., 2] = cloud_rgb
rgba_c[..., 3] = np.clip(alpha_c * 255, 0, 255)
Image.fromarray(rgba_c, "RGBA").save(f"{OUT}/cloud.png")
print("cloud.png", rgba_c.shape)
print("DONE")
