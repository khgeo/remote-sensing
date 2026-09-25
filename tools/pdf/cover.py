"""Front and back cover for Book 3 (A4, full bleed).

The design lives in cover_template.html (two A4 pages: .pg.front and .pg.back,
artwork embedded as data URIs so the file is self-contained). Edit that file to
change the cover; this module only splits it and builds the print wraparound.
"""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = open(os.path.join(HERE, "cover_template.html"), encoding="utf-8").read()
STYLE = re.search(r"<style>(.*?)</style>", SRC, re.S).group(1)
BODY = re.search(r"<body>(.*)</body>", SRC, re.S).group(1)
_i = BODY.index('<div class="pg back">')
FRONT, BACK = BODY[:_i].strip(), BODY[_i:].strip()

def _doc(inner, extra_css=""):
    return f"<!doctype html><html><head><meta charset='utf-8'><style>{STYLE}{extra_css}</style></head><body>{inner}</body></html>"

def write(outdir):
    for name, inner in (("cover", FRONT), ("backcover", BACK)):
        with open(os.path.join(outdir, name + ".html"), "w", encoding="utf-8") as f:
            f.write(_doc(inner))

def wrap(pages, paper_mm=0.1, bleed=3):
    """Print-shop wraparound cover: bleed + back + spine + front + bleed (A4 trim)."""
    spine = round(pages / 2 * paper_mm, 1)
    wmm, hmm = 2 * 210 + spine + 2 * bleed, 297 + 2 * bleed
    fs = min(11, spine * 0.9)
    sp = (f'<div style="position:absolute;left:{bleed+210}mm;top:0;width:{spine}mm;height:{hmm}mm;background:#281812;display:flex;align-items:center;justify-content:center">'
          f'<div style="transform:rotate(90deg);white-space:nowrap;color:#fff;font-size:{fs:.1f}pt;display:flex;gap:10mm;align-items:center">'
          f'<span style="font-family:Moul">មូលដ្ឋានគ្រឹះនៃការយកព័ត៌មានពីចម្ងាយ</span><span style="font-family:Batt;font-weight:bold">យាំ សារដ្ឋ</span>'
          f'<span style="color:#ff8a65;font-family:Batt">សៀវភៅទី៣</span></div></div>')
    place = lambda x, inner: f'<div style="position:absolute;left:{x}mm;top:{bleed}mm;width:210mm;height:297mm">{inner}</div>'
    css = (f"@page{{size:{wmm}mm {hmm}mm;margin:0}} html,body{{margin:0}} "
           f"body{{width:{wmm}mm;height:{hmm}mm;position:relative;background:#281812;overflow:hidden}} .pg{{page-break-after:auto}}")
    inner = place(bleed, BACK) + sp + place(bleed + 210 + spine, FRONT)
    return _doc(inner, css), wmm, hmm, spine

if __name__ == "__main__":
    write(".")
