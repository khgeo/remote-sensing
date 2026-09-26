"""Shared helpers for the slide visuals (Book 2 · teal/deep orange) (SVG writer, projections, Cambodia/world data)."""
import json, math, os, html
from shapely.geometry import shape, box, mapping

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
DOCS = os.path.join(ROOT, "docs")
SVGDIR = os.path.join(DOCS, "assets", "svg", "rsv")
IMGDIR = os.path.join(DOCS, "assets", "img", "slides")
os.makedirs(SVGDIR, exist_ok=True); os.makedirs(IMGDIR, exist_ok=True)
KM = "០១២៣៤៥៦៧៨៩"
kh = lambda n: "".join(KM[int(c)] if c.isdigit() else c for c in str(n))
khn = lambda n: kh(f"{n:,}".replace(",", " "))
IND, AMB, INK = "#5d4037", "#e64a19", "#263238"
BG = "#faf6f4"
SEQ = ["#fef0d9", "#fdcc8a", "#fc8d59", "#e34a33", "#b30000"]
BLU = ["#eff3ff", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"]
DIV = ["#b2182b", "#ef8a62", "#fddbc7", "#f7f7f7", "#d1e5f0", "#67a9cf", "#2166ac"]
QUAL = ["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02", "#a6761d", "#666666"]
VIR = ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"]

def load(rel):
    p = os.path.join(HERE, "data", rel)
    if not os.path.exists(p): p = os.path.join(DOCS, "assets", "data", rel)
    return json.load(open(p, encoding="utf-8"))
def load_ne(fn):
    return json.load(open(os.path.join(HERE, "data", fn), encoding="utf-8"))

PROV = load("cambodia_provinces_svg.json")
TERRAIN = load("terrain_sample.json")
GEN = load("generalise_levels.json")
KC = load("kc_communes_svg.json")
WORLD = load_ne("ne_110m_admin_0_countries.geojson")
ASIA = load_ne("ne_50m_admin_0_countries.geojson")
RIVERS = load_ne("ne_50m_rivers_lake_centerlines.geojson")
PLACES = load_ne("ne_110m_populated_places_simple.geojson")

class Fig:
    def __init__(self, w=1000, h=560, bg="#ffffff"):
        self.w, self.h, self.o, self.defs = w, h, [], set()
        if bg: self.o.append(f'<rect width="{w}" height="{h}" fill="{bg}"/>')
    def add(self, s): self.o.append(s); return self
    def path(self, d, fill="none", stroke="#333", sw=1, op=1, extra=""):
        return self.add(f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" opacity="{op}" {extra}/>')
    def rect(self, x, y, w, h, fill="none", stroke="none", sw=1, rx=0, extra=""):
        return self.add(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>')
    def circle(self, x, y, r, fill="#333", stroke="none", sw=1, op=1):
        return self.add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.2f}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" opacity="{op}"/>')
    def line(self, x1, y1, x2, y2, stroke="#333", sw=1, dash="", arrow=False):
        if arrow: self.defs.add("arrow")
        return self.add(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{stroke}" stroke-width="{sw}"'
                        + (f' stroke-dasharray="{dash}"' if dash else "") + (' marker-end="url(#arrow)"' if arrow else "") + "/>")
    def text(self, x, y, t, size=18, fill=INK, anchor="start", weight="normal", extra=""):
        return self.add(f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{fill}" text-anchor="{anchor}" font-weight="{weight}" {extra}>{html.escape(str(t))}</text>')
    def title(self, t, sub=""):
        self.text(24, 38, t, 24, IND, weight="bold", extra='class="ftitle"')
        if sub: self.text(24, 64, sub, 15, "#607d8b", extra='class="fsub"')
        return self
    def source(self, t):
        return self.text(self.w - 16, self.h - 12, t, 12, "#90a4ae", anchor="end")
    def legend_boxes(self, x, y, cols, labels, title="", size=18, gap=6, horizontal=False):
        if title: self.text(x, y - 10, title, 15, INK, weight="bold")
        for i, (c, l) in enumerate(zip(cols, labels)):
            if horizontal:
                xx = x + i * 110; self.rect(xx, y, 26, size, c, "#999", .6); self.text(xx + 32, y + size - 4, l, 13)
            else:
                yy = y + i * (size + gap); self.rect(x, yy, 26, size, c, "#999", .6); self.text(x + 34, yy + size - 4, l, 14)
        return self
    def img(self, im, x, y, w, h, fmt="JPEG", q=84, extra=""):
        """Embed a PIL image as a data URI (works inline in lessons and in slides)."""
        import io, base64
        from PIL import Image
        im = im.convert("RGB") if fmt == "JPEG" else im
        pw, ph = int(w * 1.6), int(h * 1.6)
        if im.size[0] > pw * 1.3: im = im.resize((pw, int(pw * im.size[1] / im.size[0])), Image.LANCZOS)
        b = io.BytesIO(); im.save(b, fmt, quality=q) if fmt == "JPEG" else im.save(b, fmt, optimize=True)
        uri = f"data:image/{fmt.lower()};base64," + base64.b64encode(b.getvalue()).decode()
        return self.add(f'<image xlink:href="{uri}" x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" preserveAspectRatio="none" {extra}/>')
    def svg(self):
        defs = ""
        if "arrow" in self.defs:
            defs = '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>'
        return (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {self.w} {self.h}" font-family="Battambang, Siemreap, sans-serif">'
                + defs + "".join(self.o) + "</svg>")
    def save(self, name):
        open(os.path.join(SVGDIR, name + ".svg"), "w", encoding="utf-8").write(self.svg())
        return f"assets/svg/rsv/{name}.svg"

# ---------- Cambodia provinces (pre-projected, UTM 48N space 300 × 251.5) ----------
def pd(rings, ox, oy, k):
    return " ".join("M" + " L".join(f"{ox + x * k:.1f} {oy + y * k:.1f}" for x, y in r) + "Z" for r in rings)
def prov_map(f, ox, oy, k, fill=lambda p: "#eceff1", stroke="#fff", sw=.8, lake=True, roads=False, labels=False, lsize=10):
    for p in PROV["prov"]:
        f.path(pd(p["r"], ox, oy, k), fill(p), stroke, sw)
    if lake: f.path(pd(PROV["lake"], ox, oy, k), "#9ecae1", "#6baed6", .6)
    if roads:
        for r in PROV["roads"]: f.path("M" + " L".join(f"{ox + x * k:.1f} {oy + y * k:.1f}" for x, y in r), "none", "#c62828", .8)
    if labels:
        for c in PROV["ctr"]: f.text(ox + c["xy"][0] * k, oy + c["xy"][1] * k, c["name"], lsize, INK, "middle")
def pcentre(name_en):
    p = next(p for p in PROV["prov"] if p["en"] == name_en)
    c = next((c for c in PROV["ctr"] if c["name"] == p["name"]), None)
    if c: return c["xy"]
    xs = [x for r in p["r"] for x, y in r]; ys = [y for r in p["r"] for x, y in r]
    return [sum(xs) / len(xs), sum(ys) / len(ys)]
def classify(values, breaks, pal):
    return lambda v: pal[max(0, min(len(pal) - 1, sum(1 for b in breaks if v >= b) - 1))]

# ---------- projections ----------
ROB = [(0, 1, 0), (5, .9986, .062), (10, .9954, .124), (15, .99, .186), (20, .9822, .248), (25, .973, .31), (30, .96, .372), (35, .9427, .434),
       (40, .9216, .4958), (45, .8962, .5571), (50, .8679, .6176), (55, .835, .6769), (60, .7986, .7346), (65, .7597, .7903), (70, .7186, .8435),
       (75, .6732, .8936), (80, .6213, .9394), (85, .5722, .9761), (90, .5322, 1)]
def proj(lon, lat, kind, lon0=0.0, lat0=0.0):
    l = math.radians(((lon - lon0 + 180) % 360) - 180); p = math.radians(max(-89.5, min(89.5, lat)))
    if kind == "plate": return l, -p
    if kind == "merc": return l, -math.log(math.tan(math.pi / 4 + max(-1.45, min(1.45, p)) / 2))
    if kind == "sin": return l * math.cos(p), -p
    if kind == "moll":
        t = p
        for _ in range(12):
            d = (2 * t + math.sin(2 * t) - math.pi * math.sin(p)) / (2 + 2 * math.cos(2 * t) + 1e-12); t -= d
        return 2 * math.sqrt(2) / math.pi * l * math.cos(t), -math.sqrt(2) * math.sin(t)
    if kind == "robin":
        a = abs(math.degrees(p)); i = min(17, int(a // 5)); f = (a - ROB[i][0]) / 5
        X = ROB[i][1] + f * (ROB[i + 1][1] - ROB[i][1]); Y = ROB[i][2] + f * (ROB[i + 1][2] - ROB[i][2])
        return .8487 * X * l, -1.3523 * Y * (1 if p >= 0 else -1)
    if kind == "ortho":
        p0 = math.radians(lat0)
        cosc = math.sin(p0) * math.sin(p) + math.cos(p0) * math.cos(p) * math.cos(l)
        if cosc < 0: return None
        return math.cos(p) * math.sin(l), -(math.cos(p0) * math.sin(p) - math.sin(p0) * math.cos(p) * math.cos(l))
    if kind == "laea":
        p0 = math.radians(lat0)
        k = math.sqrt(2 / (1 + math.sin(p0) * math.sin(p) + math.cos(p0) * math.cos(p) * math.cos(l)))
        return k * math.cos(p) * math.sin(l), -k * (math.cos(p0) * math.sin(p) - math.sin(p0) * math.cos(p) * math.cos(l))
    raise ValueError(kind)

def rings_of(geom):
    g = geom if isinstance(geom, dict) else geom
    t, c = g["type"], g["coordinates"]
    if t == "Polygon": return c
    if t == "MultiPolygon": return [r for poly in c for r in poly]
    if t == "LineString": return [c]
    if t == "MultiLineString": return c
    return []

_CLIP = 0
def world_paths(kind, box_xywh, lon0=0, lat0=0, feats=None, fill=lambda f: "#e0e0e0", stroke="#fff", sw=.5, densify=True, extent=None):
    """Project world features into the box. Returns (svg_paths, to_xy)."""
    x0, y0, W, H = box_xywh
    feats = feats if feats is not None else WORLD["features"]
    pts_all = []
    if extent:
        e0, e2 = max(-179.9, extent[0]), min(179.9, extent[2])
        lo = [proj(a, b, kind, lon0, lat0) for a in (e0, (e0 + e2) / 2, e2) for b in (extent[1], (extent[1] + extent[3]) / 2, extent[3])]
    else:
        lo = [proj(a, b, kind, lon0, lat0) for a in range(-180, 181, 10) for b in range(-89, 90, 10)]
    lo = [q for q in lo if q]
    minx, maxx = min(q[0] for q in lo), max(q[0] for q in lo); miny, maxy = min(q[1] for q in lo), max(q[1] for q in lo)
    s = min(W / (maxx - minx), H / (maxy - miny)); ox = x0 + (W - s * (maxx - minx)) / 2; oy = y0 + (H - s * (maxy - miny)) / 2
    to = lambda lon, lat: (lambda q: None if q is None else (ox + (q[0] - minx) * s, oy + (q[1] - miny) * s))(proj(lon, lat, kind, lon0, lat0))
    out = []
    for f in feats:
        d = []
        for r in rings_of(f["geometry"]):
            seg = []; prev = None
            for lon, lat in r:
                if prev and abs(lon - prev) > 180: seg.append(None)
                prev = lon; q = to(lon, lat); seg.append(q)
            cmds, pen = [], False
            for q in seg:
                if q is None: pen = False; continue
                cmds.append(("L" if pen else "M") + f"{q[0]:.1f} {q[1]:.1f}"); pen = True
            if cmds: d.append(" ".join(cmds))
        if d: out.append(f'<path d="{" ".join(d)}" fill="{fill(f)}" stroke="{stroke}" stroke-width="{sw}"/>')
    global _CLIP; _CLIP += 1; cid = f"cp{_CLIP}"
    return (f'<clipPath id="{cid}"><rect x="{x0}" y="{y0}" width="{W}" height="{H}"/></clipPath><g clip-path="url(#{cid})">' + "".join(out) + "</g>"), to

def graticule(to, step=30, lon_range=(-180, 180), lat_range=(-90, 90), color="#cfd8dc", sw=.6):
    out = []
    for lon in range(lon_range[0], lon_range[1] + 1, step):
        pts = [to(lon, lat) for lat in range(max(-89, lat_range[0]), min(89, lat_range[1]) + 1, 2)]
        out.append(_pl(pts, color, sw))
    for lat in range(lat_range[0], lat_range[1] + 1, step):
        if abs(lat) > 89: continue
        pts = [to(lon, lat) for lon in range(lon_range[0], lon_range[1] + 1, 2)]
        out.append(_pl(pts, color, sw))
    return "".join(out)
def _pl(pts, color, sw):
    cmds, pen = [], False
    for q in pts:
        if q is None: pen = False; continue
        cmds.append(("L" if pen else "M") + f"{q[0]:.1f} {q[1]:.1f}"); pen = True
    return f'<path d="{" ".join(cmds)}" fill="none" stroke="{color}" stroke-width="{sw}"/>' if cmds else ""

KHM = lambda f: f["properties"].get("ADM0_A3") == "KHM"
PPH = (104.92, 11.55)  # Phnom Penh

MANIFEST = []
def entry(lesson, file, title, bullets, where=0.5):
    """where ∈ [0,1]: relative position inside the lesson's theory section."""
    MANIFEST.append(dict(lesson=lesson, file=file, title=title, bullets=bullets, where=where))

def gj(rel):
    return json.load(open(os.path.join(DOCS, "assets", "data", rel), encoding="utf-8"))
def geo_frame(features, box_xywh, pad=0.02):
    """Local equirectangular frame (x scaled by cos lat) fitted into the box. Returns T(lon, lat)."""
    xs, ys = [], []
    for f in features:
        g = f["geometry"]; t = g["type"]; c = g["coordinates"]
        pts = [c] if t == "Point" else (c if t in ("LineString", "MultiPoint") else [q for r in rings_of(g) for q in r])
        for q in pts: xs.append(q[0]); ys.append(q[1])
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    k = math.cos(math.radians((miny + maxy) / 2)); x0, y0, W, H = box_xywh
    dx, dy = (maxx - minx) * k, (maxy - miny); s = min(W / dx, H / dy) * (1 - pad)
    ox = x0 + (W - dx * s) / 2; oy = y0 + (H - dy * s) / 2
    T = lambda lon, lat: (ox + (lon - minx) * k * s, oy + (maxy - lat) * s)
    T.scale_km = s / 111.32  # pixels per km
    return T
def draw_gj(f, feats, T, fill=lambda ft: "#e0e0e0", stroke=lambda ft: "#9e9e9e", sw=.8, r=3, op=1):
    for ft in feats:
        g = ft["geometry"]; t = g["type"]
        if t == "Point":
            x, y = T(*g["coordinates"]); f.circle(x, y, r, fill(ft), stroke(ft), sw, op)
        elif t in ("LineString", "MultiLineString"):
            for ln in rings_of(g): f.path("M" + " L".join("%.1f %.1f" % T(*q) for q in ln), "none", stroke(ft), sw, op)
        else:
            d = " ".join("M" + " L".join("%.1f %.1f" % T(*q) for q in r) + "Z" for r in rings_of(g))
            f.path(d, fill(ft), stroke(ft), sw, op, extra='fill-rule="evenodd"')
