"""
Build a print-ready PDF of the whole book.

    pip install -r tools/pdf/requirements.txt && playwright install chromium
    mkdocs build
    python tools/pdf/build_book.py            # -> book/fundamentals-of-remote-sensing.pdf

Needs the Khmer fonts Battambang, Siemreap and Moul installed on the machine
(Google Fonts, SIL OFL). Interactive parts are printed in their initial state
with a QR code to the online page.
"""
import os, re, sys, json, threading, functools, http.server, socketserver, asyncio, io, html, shutil, copy
from urllib.parse import urljoin, urlparse
import yaml, qrcode
from bs4 import BeautifulSoup
from pypdf import PdfReader, PdfWriter
import pymupdf
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
SITE = os.path.join(ROOT, "site")
OUT = os.path.join(ROOT, "book")
ONLINE = "https://khgeo.github.io/remote-sensing/"
TITLE = "មូលដ្ឋានគ្រឹះនៃការយកព័ត៌មានពីចម្ងាយ"
PORT = 8765
KM = "០១២៣៤៥៦៧៨៩"
kh = lambda s: "".join(KM[int(c)] if c.isdigit() else c for c in str(s))
sys.path.insert(0, HERE)
import cover

# ---------------------------------------------------------------- nav
class L(yaml.SafeLoader): pass
L.add_multi_constructor("", lambda l, s, n: None)
NAV = yaml.load(open(os.path.join(ROOT, "mkdocs.yml"), encoding="utf-8"), Loader=L)["nav"]

def flatten():
    """[(kind, title, md_path, part_title)] in reading order; index.md skipped."""
    items = []
    for entry in NAV:
        (t, v), = entry.items()
        if isinstance(v, str):
            if v != "index.md": items.append(("page", t, v, None))
        else:
            items.append(("divider", t, None, None))
            for sub in v:
                (st, sv), = sub.items(); items.append(("page", st, sv, t))
    return items

def url_of(md): return "/" + (md[:-3] + "/" if not md.endswith("index.md") else md[:-8])
def slug_of(md): return re.sub(r"[^a-z0-9]+", "-", md[:-3].lower()).strip("-")

# ---------------------------------------------------------------- qr
def qr_svg(url, size=78):
    q = qrcode.QRCode(border=1); q.add_data(url); q.make(fit=True); m = q.get_matrix(); n = len(m); c = size / n
    r = "".join(f'<rect x="{j*c:.2f}" y="{i*c:.2f}" width="{c+.15:.2f}" height="{c+.15:.2f}"/>' for i in range(n) for j in range(n) if m[i][j])
    return f'<svg class="qr" viewBox="0 0 {size} {size}" width="{size}" height="{size}"><rect width="{size}" height="{size}" fill="#fff"/><g fill="#000">{r}</g></svg>'

# ---------------------------------------------------------------- page extraction
def extract(md, pages_in_book):
    path = os.path.join(SITE, url_of(md).strip("/"), "index.html")
    soup = BeautifulSoup(open(path, encoding="utf-8").read(), "html.parser")
    art = soup.select_one("article.md-content__inner")
    for sel in ["a.md-content__button", "a.headerlink", "aside.md-source-file", ".md-source-file", "form.md-feedback"]:
        for e in art.select(sel): e.decompose()
    slug, base = slug_of(md), url_of(md)
    for e in art.select("[id]"): e["id"] = f"{slug}--{e['id']}"
    for a in art.select("a[href]"):
        h = a["href"]
        if h.startswith("#"): a["href"] = f"#{slug}--{h[1:]}"; continue
        u = urlparse(urljoin("http://x" + base, h))
        if u.netloc != "x": continue
        target = next((m for m in pages_in_book if url_of(m) == u.path), None)
        if target: a["href"] = f"#{slug_of(target)}" + (f"--{u.fragment}" if u.fragment else "")
        else: a["href"] = ONLINE.rstrip("/") + u.path
    for tag, attr in (("img", "src"), ("source", "src")):
        for e in art.select(f"{tag}[{attr}]"):
            u = urlparse(urljoin("http://x" + base, e[attr]))
            if u.netloc == "x": e[attr] = u.path
    online = ONLINE.rstrip("/") + base
    for e in art.select(".sim, .raster-sim, .lab-map, .match-quiz"):
        kind = "ផែនទីអន្តរកម្ម" if "lab-map" in e.get("class", []) else "ល្បែងផ្គូផ្គង" if "match-quiz" in e.get("class", []) else "ពិសោធន៍អន្តរកម្ម"
        note = BeautifulSoup(f'<div class="print-qr">{qr_svg(online)}<div><b>{kind}</b><br>ក្នុងសៀវភៅបោះពុម្ព បង្ហាញតែស្ថានភាពដំបូង។ ស្កេន QR ដើម្បីប្រើកំណែអន្តរកម្ម៖<br><span class="u">{online}</span></div></div>', "html.parser")
        e.insert_after(note)
    for e in art.select(".self-check"):
        e.append(BeautifulSoup('<div class="print-answer">ចម្លើយ៖ ..........................................................</div>', "html.parser"))
    return str(art)

# ---------------------------------------------------------------- fonts
def khmer_digit_font():
    """Battambang copy whose ASCII digits draw Khmer digits (for page numbers)."""
    import glob
    cands = [p for d in ("/usr/share/fonts", os.path.expanduser("~/.fonts"), os.path.expanduser("~/.local/share/fonts"), "C:/Windows/Fonts", "/Library/Fonts") for p in glob.glob(os.path.join(d, "**", "Battambang-Bold.ttf"), recursive=True)]
    if not cands: return None
    f = TTFont(cands[0]); cmap = f.getBestCmap()
    for t in f["cmap"].tables:
        if t.isUnicode():
            for i in range(10): t.cmap[0x30 + i] = cmap[0x17E0 + i]
    for rec in f["name"].names:
        if rec.nameID in (1, 4, 16): rec.string = "KhmerDigits"
    out = os.path.join(OUT, "KhmerDigits.ttf"); f.save(out); return out

# ---------------------------------------------------------------- html assembly
PRINT_CSS = """
@page { size: A4; margin: 22mm 18mm 20mm 20mm; }
html, body { background: #fff !important; }
body { font-size: 10.5pt; }
.md-typeset { font-size: 10.5pt !important; line-height: 1.75; }
.book-section { break-before: page; }
.book-section > article > h1:first-of-type { font-size: 21pt; color: #5d4037; border-bottom: 3px solid #ff7043; padding-bottom: 6pt; margin-top: 0; }
.md-typeset h2 { font-size: 15pt; color: #5d4037; break-after: avoid; margin-top: 1.4em; }
.md-typeset h3 { font-size: 12.5pt; break-after: avoid; }
.md-typeset h4 { break-after: avoid; }
.md-typeset figure, .md-typeset table, .admonition, .lab-chart, .sim, .lab-map, .match-quiz, .raster-sim, .print-qr, .self-check, pre { break-inside: avoid; }
.md-typeset table:not([class]) { font-size: 9pt; display: table; width: 100%; }
.md-typeset figure { margin: 1em 0; } .md-typeset figcaption { font-size: 9pt; color: #555; }
.md-typeset a { color: #5d4037; text-decoration: none; }
.divider { break-before: page; height: 245mm; display: flex; flex-direction: column; justify-content: center; }
.divider .kicker { font-family: 'Battambang'; color: #ff7043; font-size: 14pt; letter-spacing: .05em; }
.divider h1 { font-family: 'Moul', 'Battambang'; font-weight: 400; font-size: 26pt; color: #3e2723; line-height: 1.6; margin: .3em 0; border: 0; }
.divider .rule { width: 60mm; height: 4px; background: #ff7043; }
.divider ul { font-family: 'Battambang'; color: #333; font-size: 12pt; margin-top: 2em; list-style: none; padding: 0; }
.divider li { margin: .4em 0; }
.print-qr { display: flex; gap: 10pt; align-items: center; border: 1px dashed #bcaaa4; border-radius: 6px; padding: 6pt 10pt; font-size: 8.5pt; color: #444; margin: -.4em 0 1em; background: #faf6f4; }
.print-qr .u { font-family: monospace; font-size: 8pt; color: #5d4037; }
.print-answer { margin-top: .4em; color: #777; }
.self-check .sc-row, .map-tasks, .attr-table, .leaflet-control-zoom, .leaflet-control-layers, .leaflet-control-attribution, .mq-score, .mq-hint, .mt-restart, .sim-btn, .md-button { display: none !important; }
.ch-bar { transition: none !important; width: var(--w) !important; }
.lab-map { height: 380px !important; }
.md-typeset canvas, .md-typeset img, .md-typeset svg:not(.qr) { max-width: 100% !important; }
.md-typeset .sim-canvas-wrap canvas { height: auto !important; }
.ls-stage { height: 320px !important; overflow: hidden !important; contain: paint; }
.lab-map, .sim, .book-section { overflow: hidden !important; contain: paint; }
.ls-stack { width: 420px !important; }
.vd-list, .gr-tab { max-height: none !important; }
.mark { font-size: 1px; color: #fff; line-height: 0; }
.md-typeset .grid.cards > ul > li { break-inside: avoid; }
"""

def front_matter(toc):
    rows = []
    for kind, title, page, depth in toc:
        cls = "t-part" if kind == "divider" else "t-page"
        rows.append(f'<div class="{cls}"><span class="t">{html.escape(title)}</span><span class="dots"></span><span class="n">{kh(page) if page else ""}</span></div>')
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@page {{ size: A4; margin: 24mm 22mm; }}
body {{ font-family: 'Siemreap','Battambang',sans-serif; font-size: 10.5pt; color: #222; }}
.pg {{ break-after: page; height: 246mm; position: relative; overflow: hidden; }}
.toc {{ break-before: page; }}
.title h1 {{ font-family: 'Moul'; font-weight: 400; font-size: 30pt; color: #3e2723; line-height: 1.7; margin: 45mm 0 4mm; }}
.title .en {{ font-family: Georgia, serif; font-style: italic; font-size: 16pt; color: #5d4037; }}
.title .rule {{ width: 50mm; height: 4px; background: #ff7043; margin: 8mm 0; }}
.title .au {{ font-family: Georgia, serif; font-size: 16pt; font-weight: 700; margin-top: 30mm; }}
.title .meta {{ font-family: 'Battambang'; color: #555; margin-top: 3mm; }}
.copy {{ font-size: 9.5pt; color: #444; position: absolute; bottom: 0; line-height: 1.9; }}
.copy b {{ font-family: 'Battambang'; }}
h2 {{ font-family: 'Battambang'; color: #5d4037; font-size: 18pt; border-bottom: 3px solid #ff7043; padding-bottom: 4pt; }}
.t-part, .t-page {{ display: flex; align-items: baseline; gap: 6pt; }}
.t-part {{ font-family: 'Battambang'; font-weight: 700; color: #5d4037; margin-top: 9pt; font-size: 11pt; }}
.t-page {{ padding-left: 12pt; font-size: 10pt; line-height: 1.8; }}
.dots {{ flex: 1; border-bottom: 1px dotted #aaa; transform: translateY(-3pt); }}
.n {{ font-family: 'Battambang'; min-width: 18pt; text-align: right; }}
.pref p {{ line-height: 1.9; text-align: justify; }}
</style></head><body>
<div class="pg title"><h1>មូលដ្ឋានគ្រឹះ<br>នៃការយកព័ត៌មានពីចម្ងាយ</h1><div class="en">Fundamentals of Remote Sensing</div><div class="rule"></div>
<div class="meta">សៀវភៅទី៣ នៃស៊េរីសៀវភៅ GIS និងការយកព័ត៌មានពីចម្ងាយ</div><div class="meta">សម្រាប់ថ្នាក់បរិញ្ញាបត្រ ឆ្នាំទី៣ ឆមាសទី១ · ដេប៉ាតឺម៉ង់ភូមិវិទ្យា និងរៀបចំដែនដី</div>
<div class="au" style="font-family:Battambang">យាំ សារដ្ឋ</div><div class="meta" style="font-family:Georgia">YAM Sarath</div><div class="meta">បោះពុម្ពលើកទី១ · ២០២៦</div></div>
<div class="pg"><div class="copy"><b>មូលដ្ឋានគ្រឹះនៃការយកព័ត៌មានពីចម្ងាយ</b><br>Fundamentals of Remote Sensing: A Khmer-language textbook<br>
© ២០២៦ យាំ សារដ្ឋ (YAM Sarath) · បោះពុម្ពលើកទី១<br><br>
ចេញផ្សាយក្រោមអាជ្ញាបណ្ណ <b>Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)</b>។ អ្នកអាចចម្លង ចែកចាយ និងកែសម្រួល ដោយត្រូវដកស្រង់អ្នកនិពន្ធ និងចែករំលែកក្រោមអាជ្ញាបណ្ណដដែល។<br><br>
រូបភាពផ្កាយរណប៖ Landsat 8 ដោយ U.S. Geological Survey · មានទិន្នន័យ Copernicus Sentinel ដែលបានកែសម្រួល (ESA)។ ទិន្នន័យទាំងនេះមិនស្ថិតក្រោមអាជ្ញាបណ្ណសៀវភៅនេះទេ (មើលឧបសម្ព័ន្ធ ខ)។<br><br>
កំណែអនឡាញអន្តរកម្ម៖ {ONLINE}<br>ប្រភពកូដ និងទិន្នន័យ៖ https://github.com/khgeo/remote-sensing<br><br>
ពុម្ពអក្សរ៖ Siemreap Battambang Moul (Danh Hong · SIL Open Font License)<br>
ការដកស្រង់៖ YAM Sarath [យាំ សារដ្ឋ] (2026). មូលដ្ឋានគ្រឹះនៃការយកព័ត៌មានពីចម្ងាយ [Fundamentals of Remote Sensing: A Khmer-language textbook]. CC BY-SA 4.0.</div></div>
<div class="pg pref" style="height:auto;overflow:visible"><h2>អំពីសៀវភៅនេះ</h2>
<p>សៀវភៅនេះជាឯកសារបង្រៀនសម្រាប់មុខវិជ្ជា មូលដ្ឋានគ្រឹះនៃការយកព័ត៌មានពីចម្ងាយ ៣ ក្រេឌីត ៤៥ ម៉ោង។ វាមាន <b>មេរៀនទ្រឹស្ដី ១៥</b> (៣ ម៉ោងក្នុងមួយមេរៀន) និង <b>សៀវភៅអនុវត្ត ១៥ លំហាត់</b> លើកម្មវិធី QGIS 3.34 LTR ជាមួយរូបភាព Landsat 8 និង Sentinel-2 ពិតលើកម្ពុជា។</p>
<p>សៀវភៅនេះចាប់ផ្ដើមពីរូបវិទ្យានៃរលកអេឡិចត្រូម៉ាញេទិច ឆ្លងកាត់ឧបករណ៍ចាប់សញ្ញា គន្លង និងគុណភាពបង្ហាញ ការកែតម្រូវរ៉ាដ្យូម៉ែត្រ និងធរណីមាត្រ ការបកស្រាយ និងសន្ទស្សន៍ ការចាត់ថ្នាក់ និងការវាយតម្លៃភាពត្រឹមត្រូវ រហូតដល់ការរកការផ្លាស់ប្ដូរ និងរ៉ាដា SAR។ Google Earth Engine និងការអនុវត្តទ្រង់ទ្រាយធំ ជាខ្លឹមសារសៀវភៅទី៤។</p>
<p><b>ពិសោធន៍អន្តរកម្ម</b>៖ កំណែអនឡាញមានពិសោធន៍ ២៩ និងប្រអប់ពិនិត្យលទ្ធផលដោយខ្លួនឯង។ ក្នុងសៀវភៅបោះពុម្ពនេះ ពួកវាបង្ហាញតែស្ថានភាពដំបូង ជាមួយកូដ QR ដែលនាំទៅទំព័រអនឡាញ។ ទិន្នន័យវគ្គ <b>RS_Data.zip</b> ទាញយកបានពីទំព័រ Releases របស់ GitHub។</p></div>
<div class="toc"><h2>មាតិកា</h2>{''.join(rows)}</div>
</body></html>"""

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    handler = functools.partial(Quiet, directory=SITE)
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    global PORT; PORT = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start(); return httpd

async def render(chrome_path=None):
    from playwright.async_api import async_playwright
    os.makedirs(OUT, exist_ok=True)
    items = flatten(); pages = [p for k, _, p, _ in items if k == "page"]
    dfont = khmer_digit_font()
    css_links = [f"/assets/stylesheets/{f}" for f in sorted(os.listdir(os.path.join(SITE, "assets", "stylesheets"))) if f.endswith(".css")]
    extra = ["/assets/css/khmer.css", "/assets/css/workbook.css", "/assets/css/lesson-sims.css"]
    leaflet_css = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; leaflet_js = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"
    if os.path.exists(os.path.join(SITE, "vendor", "leaflet.js")): leaflet_css, leaflet_js = "/vendor/leaflet.css", "/vendor/leaflet.js"
    body = []
    for idx, (kind, title, md, part) in enumerate(items):
        if kind == "divider":
            members = [t for k, t, p, pt in items if pt == title]
            body.append(f'<section class="divider"><span class="mark">ZZ|div{idx}|ZZ</span><div class="kicker">ផ្នែក</div><h1>{html.escape(title)}</h1><div class="rule"></div><ul>{"".join(f"<li>{html.escape(m)}</li>" for m in members)}</ul></section>')
        else:
            body.append(f'<section class="book-section md-typeset" id="{slug_of(md)}"><span class="mark">ZZ|{slug_of(md)}|ZZ</span>{extract(md, pages)}</section>')
    book_dir = os.path.join(SITE, "print", "book"); os.makedirs(book_dir, exist_ok=True)
    head = "".join(f'<link rel="stylesheet" href="{h}">' for h in css_links + extra + [leaflet_css])
    doc = f'<!doctype html><html lang="km"><head><meta charset="utf-8">{head}<style>{PRINT_CSS}</style></head><body data-md-color-scheme="default" data-md-color-primary="brown" data-md-color-accent="deep-orange"><div class="md-typeset">{"".join(body)}</div><script src="{leaflet_js}"></script><script src="/assets/js/rs-sims.js"></script><script src="/assets/js/lesson-sims.js"></script><script src="/assets/js/workbook.js"></script></body></html>'
    open(os.path.join(book_dir, "index.html"), "w", encoding="utf-8").write(doc)
    cover.write(OUT)
    httpd = serve()
    digit_css = f"@font-face{{font-family:KhmerDigits;src:url(data:font/ttf;base64,{__import__('base64').b64encode(open(dfont,'rb').read()).decode()})}}" if dfont else ""
    header = f'<div style="width:100%;font-family:Battambang;font-size:7.5pt;color:#888;padding:0 18mm 0 20mm;display:flex;justify-content:space-between"><span>{TITLE}</span><span>សៀវភៅទី៣</span></div>'
    footer = f'<style>{digit_css}</style><div style="width:100%;text-align:center;font-family:KhmerDigits,Battambang;font-size:9pt;color:#555"><span class="pageNumber"></span></div>'
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=chrome_path) if chrome_path else await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 640, "height": 900})  # = printable width, so JS sizes canvases to the page
        await pg.goto(f"http://127.0.0.1:{PORT}/print/book/", wait_until="networkidle", timeout=180000)
        await pg.evaluate("document.fonts.ready"); await pg.wait_for_timeout(8000)
        body_pdf = os.path.join(OUT, "_body.pdf")
        await pg.pdf(path=body_pdf, format="A4", print_background=True, display_header_footer=True, header_template=header, footer_template=footer, prefer_css_page_size=True,
                     margin={"top": "22mm", "bottom": "20mm", "left": "20mm", "right": "18mm"})
        # ---- page numbers of sections from markers
        where = {}
        with pymupdf.open(body_pdf) as d:
            for i, page in enumerate(d):
                for key in re.findall(r"ZZ\|([a-z0-9-]+)\|ZZ", page.get_text().replace("\n", "")):
                    where.setdefault(key, i + 1)
        toc = []
        for idx, (kind, title, md, part) in enumerate(items):
            key = f"div{idx}" if kind == "divider" else slug_of(md)
            toc.append((kind, title, where.get(key), part))
        await pg.set_viewport_size({"width": 794, "height": 1123})
        open(os.path.join(OUT, "front.html"), "w", encoding="utf-8").write(front_matter(toc))
        await pg.goto("file://" + os.path.join(OUT, "front.html")); await pg.wait_for_timeout(1500)
        await pg.pdf(path=os.path.join(OUT, "_front.pdf"), format="A4", print_background=True)
        for n in ("cover", "backcover"):
            await pg.goto("file://" + os.path.join(OUT, n + ".html")); await pg.wait_for_timeout(1000)
            await pg.pdf(path=os.path.join(OUT, n + ".pdf"), format="A4", print_background=True, margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
        await b.close()
    httpd.shutdown()
    # ---- merge with bookmarks
    w = PdfWriter()
    for part in ("cover.pdf", "_front.pdf"):
        for pgx in PdfReader(os.path.join(OUT, part)).pages: w.add_page(pgx)
    offset = len(w.pages)
    for pgx in PdfReader(body_pdf).pages: w.add_page(pgx)
    parent = None
    for kind, title, page, _ in toc:
        if not page: continue
        if kind == "divider": parent = w.add_outline_item(title, offset + page - 1)
        else: w.add_outline_item(title, offset + page - 1, parent=parent if _ else None)
    for pgx in PdfReader(os.path.join(OUT, "backcover.pdf")).pages: w.add_page(pgx)
    w.add_metadata({"/Title": TITLE + " (Fundamentals of Remote Sensing)", "/Author": "YAM Sarath (យាំ សារដ្ឋ)", "/Subject": "Khmer-language remote sensing textbook", "/Keywords": "Remote sensing, Landsat, Sentinel-2, QGIS, Cambodia, Khmer"})
    final = os.path.join(OUT, "fundamentals-of-remote-sensing.pdf")
    with open(final, "wb") as f: w.write(f)
    # ---- wraparound cover for a print shop (spine from page count)
    html_wrap, wmm, hmm, spine = cover.wrap(len(w.pages))
    open(os.path.join(OUT, "cover-wrap.html"), "w", encoding="utf-8").write(html_wrap)
    async def _wrap():
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=os.environ.get("CHROME_PATH")) if os.environ.get("CHROME_PATH") else await p.chromium.launch()
            pg = await b.new_page(); await pg.goto("file://" + os.path.join(OUT, "cover-wrap.html")); await pg.wait_for_timeout(1000)
            await pg.pdf(path=os.path.join(OUT, "cover-wrap-print.pdf"), width=f"{wmm}mm", height=f"{hmm}mm", print_background=True, margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
            await b.close()
    await _wrap()
    print(f"Print cover: {os.path.join(OUT, 'cover-wrap-print.pdf')} · {wmm} × {hmm} mm · spine {spine} mm (80 gsm, 3 mm bleed)")
    missing = [t for k, t, pnum, _ in toc if not pnum]
    print(f"PDF: {final} · {len(w.pages)} pages" + (f" · no page number for: {missing}" if missing else ""))

if __name__ == "__main__":
    asyncio.run(render(os.environ.get("CHROME_PATH")))
