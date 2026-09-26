"""Real imagery used by the Book 3 figures (Landsat 8 Phnom Penh 2019, Sentinel-2 Sihanoukville 2015/2021)."""
import os, math, json, numpy as np
from PIL import Image
RD = os.environ.get("RS_REALDATA", "/home/claude/realdata")
MULT, ADD, SUN = 2e-5, -0.1, 51.56434261
L8 = os.path.join(RD, "L8_Zone48n", "L8_Zone48n")
_c = {}
def dn(b):
    import rasterio
    if ("dn", b) not in _c: _c[("dn", b)] = rasterio.open(os.path.join(L8, f"L8_B{b}.tif")).read(1)[:1206, :1361]
    return _c[("dn", b)]
def toa(b, sun=True):
    r = dn(b).astype(float) * MULT + ADD
    return r / math.sin(math.radians(SUN)) if sun else r
def stretch(a, lo=2, hi=98, gamma=1.0):
    v = a[np.isfinite(a)]; l, h = np.percentile(v, lo), np.percentile(v, hi)
    return (np.clip((a - l) / (h - l + 1e-12), 0, 1) ** gamma * 255).astype(np.uint8)
def rgb(r, g, b, **k): return Image.fromarray(np.dstack([stretch(r, **k), stretch(g, **k), stretch(b, **k)]))
CROP = (slice(520, 900), slice(620, 1060))   # confluence area 380 × 440 px
def crop(a): return a[CROP]
# 300 × 300 teaching scene: bands B2..B7 TOA + reference classes (0 water, 1 trees, 2 crops/grass, 3 built, 4 bare)
SC = np.load(os.path.join(RD, "l8crop.npy")); CLS = np.load(os.path.join(RD, "l8cls.npy"))
SCB = {2: SC[0], 3: SC[1], 4: SC[2], 5: SC[3], 6: SC[4], 7: SC[5]}
CLASS_KH = ["ទឹក", "ដើមឈើ", "ដំណាំ/ស្មៅ", "តំបន់សាងសង់", "ដីទទេ"]
CLASS_COL = ["#1e88e5", "#1b5e20", "#9ccc65", "#e53935", "#d7ccc8"]
def shv(year):
    import rasterio
    k = ("shv", year)
    if k not in _c: _c[k] = rasterio.open(os.path.join(RD, f"SHV_{year}.tif")).read()[:7].astype(float) / 10000.0   # B1 B2 B3 B4 B8 B11 B12
    return _c[k]
def nd(a, b): return (a - b) / (a + b + 1e-9)
def pal_img(idx, cols):
    P = np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for c in cols], np.uint8); return Image.fromarray(P[idx])
def ramp_img(a, cols, vmin, vmax):
    t = np.clip((a - vmin) / (vmax - vmin), 0, 1) * (len(cols) - 1); lo = np.floor(t).astype(int).clip(0, len(cols) - 2); f = (t - lo)[..., None]
    P = np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for c in cols], float)
    return Image.fromarray((P[lo] * (1 - f) + P[lo + 1] * f).astype(np.uint8))
