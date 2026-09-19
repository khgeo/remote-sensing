"""Front and back cover for the Cartography book (A4, full bleed).
Artwork uses simplified real layers from the Cambodia dataset (coverdata.json)."""
import json, qrcode, qrcode.image.svg, io, html
import os
D=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),"coverdata.json")))
W,H=794,1123
SITE="https://khgeo.github.io/cartography/"
def proj(u,v,ox,oy,w,h,sk):  # oblique projection of normalised coords
    return (ox+u*w+(1-v)*sk, oy+(1-v)*h)
def paths(parts,ox,oy,w,h,sk,close=True):
    d=[]
    for poly in parts:
        for ring in poly:
            pts=[proj(u,v,ox,oy,w,h,sk) for u,v in ring]
            d.append("M"+" L".join(f"{x:.1f} {y:.1f}" for x,y in pts)+("Z" if close else ""))
    return " ".join(d)
def plate(ox,oy,w,h,sk,pad=18):
    a=proj(-0.06,1.08,ox,oy,w,h,sk); b=proj(1.06,1.08,ox,oy,w,h,sk); c=proj(1.06,-0.08,ox,oy,w,h,sk); d=proj(-0.06,-0.08,ox,oy,w,h,sk)
    return f"M{a[0]:.1f} {a[1]:.1f} L{b[0]:.1f} {b[1]:.1f} L{c[0]:.1f} {c[1]:.1f} L{d[0]:.1f} {d[1]:.1f}Z"
def art(ox,oy,w,h,sk,gap):
    """Cambodia on a curved graticule with a compass rose: a cartographic cover."""
    import math
    cx, cy, R = 397, 640, 520
    L=[]
    for i in range(-6,7):   # meridians as arcs
        x0 = cx + i*62
        L.append(f'<path d="M{x0} 380 Q{cx + i*48} {cy} {x0} 900" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1"/>')
    for j in range(0,9):    # parallels as gentle curves
        y0 = 400 + j*58
        L.append(f'<path d="M40 {y0+18} Q{cx} {y0-18} 754 {y0+18}" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1"/>')
    PAL=["#e8eaf6","#c5cae9","#9fa8da","#ffd54f","#ffb300"]
    import random; random.seed(7)
    def paths(parts, fx, fy, k):
        d=[]
        for poly in parts:
            for ring in poly:
                d.append("M"+" L".join(f"{fx+u*k:.1f} {fy+(1-v)*k*D['aspect']:.1f}" for u,v in ring)+"Z")
        return " ".join(d)
    k=560; fx=120; fy=440
    for idx,poly in enumerate(D["prov"]):
        col = PAL[(idx*7)%5]
        L.append(f'<path d="{paths([poly],fx,fy,k)}" fill="{col}" stroke="#1a237e" stroke-width="1" opacity=".92"/>')
    L.append(f'<path d="{paths(D["lake"],fx,fy,k)}" fill="#4fc3f7" stroke="none" opacity=".9"/>')
    # compass rose
    rx, ry = 690, 835
    L.append(f'<g transform="translate({rx} {ry})"><circle r="46" fill="none" stroke="rgba(255,255,255,.5)"/><circle r="30" fill="none" stroke="rgba(255,255,255,.3)"/>'
             '<path d="M0 -58 L9 0 L0 58 L-9 0Z" fill="#ffd54f"/><path d="M-58 0 L0 9 L58 0 L0 -9Z" fill="rgba(255,255,255,.7)"/>'
             '<text x="0" y="-64" text-anchor="middle" font-size="14" font-weight="700">ជ</text></g>')
    # scale bar
    L.append('<g transform="translate(120 880)">' + "".join(f'<rect x="{i*48.85:.1f}" y="0" width="48.85" height="7" fill="{"#fff" if i%2 else "#ffd54f"}"/>' for i in range(4)) + '<text x="0" y="24" font-size="12">០</text><text x="195" y="24" font-size="12" text-anchor="middle">២០០ គម</text></g>')
    return "".join(L)
def qr_svg(url, size):
    q=qrcode.QRCode(border=1, box_size=10); q.add_data(url); q.make(fit=True); m=q.get_matrix(); n=len(m); c=size/n
    rects="".join(f'<rect x="{j*c:.2f}" y="{i*c:.2f}" width="{c+0.2:.2f}" height="{c+0.2:.2f}"/>' for i in range(n) for j in range(n) if m[i][j])
    return f'<g fill="#121858">{rects}</g>', n
CSS="""<style>
@page{size:A4;margin:0} html,body{margin:0;padding:0}
.page{width:210mm;height:297mm;position:relative;overflow:hidden;page-break-after:always}
svg{display:block;width:210mm;height:297mm}
text{font-family:'Battambang',sans-serif;fill:#fff}
.moul{font-family:'Moul',serif}
.lab{font-size:13px;fill:rgba(255,255,255,.85)}
.en{font-family:'Georgia','DejaVu Serif',serif}
</style>"""
def front():
    grad='<defs><linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="#0d1033"/><stop offset=".55" stop-color="#1a237e"/><stop offset="1" stop-color="#283593"/></linearGradient><pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="rgba(255,255,255,.05)"/></pattern></defs>'
    s=[f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">{grad}<rect width="{W}" height="{H}" fill="url(#bg)"/><rect width="{W}" height="{H}" fill="url(#grid)"/>']
    s.append(f'<rect x="0" y="0" width="{W}" height="8" fill="#ffc107"/>')
    s.append('<text x="60" y="70" font-size="15" fill="rgba(255,255,255,.8)">ស៊េរីសៀវភៅ GIS និងការយកព័ត៌មានពីចម្ងាយ</text>')
    s.append(f'<text x="{W-60}" y="70" font-size="15" text-anchor="end" fill="#ffd54f" font-weight="700">សៀវភៅទី ១</text>')
    s.append('<line x1="60" y1="88" x2="734" y2="88" stroke="rgba(255,255,255,.25)"/>')
    s.append('<text x="60" y="210" class="moul" font-size="60">ផែនទីវិទ្យា</text>')
    s.append('')
    s.append('<rect x="60" y="258" width="90" height="4" fill="#ffc107"/>')
    s.append('<text x="60" y="300" class="en" font-size="23" fill="#e8eaf6" font-style="italic">Cartography: Maps, Projections and Thematic Design</text>')
    s.append('<text x="60" y="338" font-size="17" fill="#c5cae9">ទ្រឹស្ដី · ការរចនាផែនទីក្នុង QGIS · ឧទាហរណ៍ពីកម្ពុជា</text>')
    s.append(art(110,640,430,262,95,78))
    s.append(f'<rect x="0" y="{H-190}" width="{W}" height="190" fill="rgba(0,0,0,.28)"/>')
    s.append(f'<text x="60" y="{H-128}" font-size="26" font-weight="700">យាំ សារដ្ឋ</text><text x="190" y="{H-128}" font-size="20" class="en" fill="#c5cae9">YAM Sarath</text>')
    s.append(f'<text x="60" y="{H-96}" font-size="15" fill="#c5cae9">ថ្នាក់បរិញ្ញាបត្រ ឆ្នាំទី២ ឆមាសទី១ · ដេប៉ាតឺម៉ង់ភូមិវិទ្យា និងរៀបចំដែនដី</text>')
    s.append(f'<text x="60" y="{H-58}" font-size="14" fill="rgba(255,255,255,.75)">១៥ មេរៀន · ១៥ លំហាត់ QGIS · បោះពុម្ពលើកទី១ · ២០២៦</text>')
    s.append(f'<text x="{W-60}" y="{H-58}" font-size="13" text-anchor="end" fill="rgba(255,255,255,.75)" class="en">CC BY-SA 4.0</text>')
    s.append('</svg>')
    return "".join(s)
def back():
    q,n=qr_svg(SITE,120)
    items=["១៥ មេរៀនទ្រឹស្ដី ពីរាងផែនដី និងចំណោល ដល់ប្លង់ផែនទី","១៥ លំហាត់ QGIS ដែលធ្វើផែនទីពិតប្រាកដពីទិន្នន័យកម្ពុជា","ឧទាហរណ៍ដែលបានដោះស្រាយ ជាមួយ «អ្វីដែលមិនអាចសន្និដ្ឋាន»","ពិសោធន៍អន្តរកម្ម ល្បែង និងប្រអប់ពិនិត្យខ្លួនឯង នៅក្នុងកំណែអនឡាញ","វាក្យសព្ទខ្មែរ–អង់គ្លេស សម្រាប់ស៊េរីសៀវភៅទាំងបួន"]
    s=[f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg"><rect width="{W}" height="{H}" fill="#1a237e"/><rect x="0" y="{H-8}" width="{W}" height="8" fill="#ffc107"/>']
    s.append('<text x="60" y="120" class="moul" font-size="22">អំពីសៀវភៅនេះ</text>')
    para=["សៀវភៅនេះណែនាំវិទ្យាសាស្ត្រ និងសិល្បៈនៃការធ្វើផែនទី ជាភាសាខ្មែរ។","និស្សិតរៀនពីរបៀបដែលផែនទីតំណាងផែនដី តាមរយៈកូអរដោនេ ចំណោល","និងមាត្រដ្ឋាន ហើយរចនាផែនទីប្រធានបទដែលច្បាស់ ស្មោះត្រង់ និងមិនបំភាន់","ដោយប្រើ QGIS និងទិន្នន័យពិតរបស់កម្ពុជា។"]
    for i,t in enumerate(para): s.append(f'<text x="60" y="{175+i*32}" font-size="16.5" fill="#e8eaf6">{html.escape(t)}</text>')
    s.append('<text x="60" y="340" font-size="18" font-weight="700" fill="#ffd54f">អ្វីដែលមាននៅក្នុងសៀវភៅ</text>')
    for i,t in enumerate(items):
        y=385+i*40; s.append(f'<rect x="60" y="{y-13}" width="10" height="10" fill="#ffc107"/><text x="84" y="{y-3}" font-size="15.5" fill="#fff">{html.escape(t)}</text>')
    s.append('<text x="60" y="640" font-size="18" font-weight="700" fill="#ffd54f">ស៊េរីសៀវភៅ</text>')
    series=[("១","ផែនទីវិទ្យា","ឆ្នាំទី២ ឆមាសទី១",True),("២","មូលដ្ឋានគ្រឹះនៃ GIS","ឆ្នាំទី២ ឆមាសទី២",False),("៣","មូលដ្ឋានគ្រឹះនៃការយកព័ត៌មានពីចម្ងាយ","ឆ្នាំទី៣ ឆមាសទី១",False),("៤","GIS និងការយកព័ត៌មានពីចម្ងាយអនុវត្តន៍","ឆ្នាំទី៣ ឆមាសទី២",False)]
    for i,(n_,t,y_,cur) in enumerate(series):
        y=680+i*44
        s.append(f'<rect x="60" y="{y-26}" width="674" height="36" rx="4" fill="{"rgba(255,112,67,.25)" if cur else "rgba(255,255,255,.06)"}"/>')
        s.append(f'<text x="78" y="{y-2}" font-size="15" font-weight="700" fill="#ffd54f">សៀវភៅទី{n_}</text><text x="185" y="{y-2}" font-size="15">{html.escape(t)}</text><text x="716" y="{y-2}" font-size="13" text-anchor="end" fill="#c5cae9">{y_}</text>')
    s.append(f'<g transform="translate(60 {H-230})"><rect x="-8" y="-8" width="136" height="136" fill="#fff" rx="6"/>{q}</g>')
    s.append(f'<text x="215" y="{H-190}" font-size="16" font-weight="700">អានកំណែអនឡាញអន្តរកម្ម</text><text x="215" y="{H-162}" font-size="14" class="en" fill="#c5cae9">{SITE}</text>')
    s.append(f'<text x="215" y="{H-132}" font-size="14" fill="#e8eaf6">ប្រភព៖ github.com/khgeo/cartography</text>')
    s.append(f'<text x="215" y="{H-104}" font-size="13" fill="rgba(255,255,255,.75)">ចេញផ្សាយក្រោមអាជ្ញាបណ្ណ CC BY-SA 4.0 · ចែកចាយដោយឥតគិតថ្លៃ</text>')
    s.append('</svg>')
    return "".join(s)
def wrap(pages, paper_mm=0.1, bleed=3):
    """Print-shop wraparound cover: bleed + back + spine + front + bleed (A4 trim)."""
    spine = round(pages / 2 * paper_mm, 1)
    wmm, hmm = 2 * 210 + spine + 2 * bleed, 297 + 2 * bleed
    sp = f'''<div style="position:absolute;left:{bleed+210}mm;top:0;width:{spine}mm;height:{hmm}mm;background:#121858;display:flex;align-items:center;justify-content:center">
<div style="transform:rotate(90deg);white-space:nowrap;color:#fff;font-family:Battambang;font-size:{min(11, spine*0.9):.1f}pt;display:flex;gap:10mm;align-items:center">
<span style="font-family:Moul">ផែនទីវិទ្យា</span><span style="font-family:Battambang;font-weight:700">យាំ សារដ្ឋ</span><span style="color:#ffd54f">សៀវភៅទី ១</span></div></div>'''
    page = lambda x, svg: f'<div style="position:absolute;left:{x}mm;top:{bleed}mm;width:210mm;height:297mm">{svg}</div>'
    return (f"<!doctype html><html><head><meta charset='utf-8'><style>@page{{size:{wmm}mm {hmm}mm;margin:0}}html,body{{margin:0}}"
            f"body{{width:{wmm}mm;height:{hmm}mm;position:relative;background:#1a237e;overflow:hidden}}svg{{display:block;width:210mm;height:297mm}}"
            f"text{{font-family:'Battambang',sans-serif;fill:#fff}}.moul{{font-family:'Moul',serif}}.lab{{font-size:13px;fill:rgba(255,255,255,.85)}}.en{{font-family:Georgia,serif}}</style></head><body>"
            f"<div style='position:absolute;inset:0;background:#1a237e'></div>{page(bleed, back())}{sp}{page(bleed+210+spine, front())}</body></html>"), wmm, hmm, spine

def write(outdir):
    for name, fn in (("cover", front), ("backcover", back)):
        with open(os.path.join(outdir, name + ".html"), "w", encoding="utf-8") as f:
            f.write(f"<!doctype html><html><head><meta charset='utf-8'>{CSS}</head><body><div class='page'>{fn()}</div></body></html>")

if __name__ == "__main__":
    write(".")
