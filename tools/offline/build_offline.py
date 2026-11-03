"""Build a ZIP of the book that opens without internet or a web server.

    python tools/offline/build_offline.py [--out site/downloads]

Result: <out>/<repo>-offline.zip containing START_HERE.html and site/ (pages,
slides, simulators, fonts). Uses mkdocs.yml unchanged, plus: .html links,
Material's offline search, and the file:// data loader from offline_hook.py.
"""
import argparse, html, os, re, shutil, subprocess, sys, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--out", default="book"); a = ap.parse_args()
    cfg = (ROOT / "mkdocs.yml").read_text(encoding="utf-8")
    name = re.search(r"^site_url:\s*\S+/([^/\s]+)/?\s*$", cfg, re.M).group(1)
    title = re.search(r"^site_name:\s*(.+)$", cfg, re.M).group(1).strip().strip("'\"")
    hooks = re.findall(r"^\s+-\s+(tools/\S+\.py)\s*$", cfg.split("\nhooks:", 1)[1], re.M) if "\nhooks:" in cfg else []
    if "tools/offline/offline_hook.py" not in hooks: hooks.append("tools/offline/offline_hook.py")
    # instant navigation needs sitemap.xml over http, so it is switched off for file://
    fm = re.search(r"^  features:\n((?:    - .*\n)+)", cfg, re.M)
    feats = [f.strip()[2:].strip() for f in fm.group(1).splitlines()] if fm else []
    feats = [f for f in feats if not f.startswith("navigation.instant")]
    theme = "theme:\n  features:\n" + "".join(f"    - {f}\n" for f in feats) if fm else ""
    work = ROOT / "build" / "offline"; shutil.rmtree(work, ignore_errors=True); work.mkdir(parents=True)
    tmp = ROOT / "mkdocs.offline.tmp.yml"
    tmp.write_text("INHERIT: mkdocs.yml\nuse_directory_urls: false\nsite_dir: build/offline/site\n" + theme +
                   "extra:\n  polyfills:\n    - assets/js/iframe-worker-shim.js\n"
                   "plugins:\n  - search\n  - offline\nhooks:\n" + "".join(f"  - {h}\n" for h in hooks), encoding="utf-8")
    try:
        subprocess.run([sys.executable, "-m", "mkdocs", "build", "-q", "-f", str(tmp)], cwd=ROOT, check=True,
                       env=dict(os.environ, OFFLINE_BUILD="1"))
    finally:
        tmp.unlink(missing_ok=True)
    site = work / "site"
    for junk in ("offline-manifest.json", "sw.js"):
        (site / junk).unlink(missing_ok=True)
    has_slides = (site / "slides" / "index.html").exists()
    t = html.escape(title)
    (work / "START_HERE.html").write_text(f"""<!doctype html><html lang="km"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{t} · offline</title>
<link rel="stylesheet" href="site/assets/css/local-fonts.css"><style>
body{{margin:0;background:#f3efe9;color:#2b2420;font:18px/1.9 Siemreap,Battambang,Arial,sans-serif}}
main{{max-width:780px;margin:6vh auto;padding:32px;background:#fff;border-radius:16px;border-top:7px solid #795548}}
h1,strong,.open{{font-family:Battambang,Arial,sans-serif}}h1{{font-size:30px;margin:0 0 8px}}
.open{{display:inline-block;margin:6px 8px 6px 0;background:#795548;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none}}
.open.alt{{background:#fff;color:#5d4037;border:2px solid #795548}}.note{{font-size:15px;color:#6d5f57}}
@media(max-width:600px){{main{{margin:0;border-radius:0;padding:22px}}h1{{font-size:25px}}}}</style></head><body><main>
<p class="note">OFFLINE EDITION · អានដោយគ្មានអ៊ីនធឺណិត</p><h1>{t}</h1>
<p><a class="open" href="site/index.html">បើកសៀវភៅ →</a>{'<a class="open alt" href="site/slides/index.html">ស្លាយបង្រៀន →</a>' if has_slides else ''}</p>
<p>មេរៀន លំហាត់ ស្លាយ រូបភាព ពុម្ពអក្សរ ការស្វែងរក និងពិសោធន៍ ដំណើរការដោយគ្មានអ៊ីនធឺណិត។ ផែនទីផ្ទៃក្រោយ (OpenStreetMap) តំណទៅគេហទំព័រខាងក្រៅ និង Earth Engine ត្រូវការអ៊ីនធឺណិត។</p>
<p class="note">ពន្លា (Extract) ZIP ទាំងមូលជាមុន រួចបើកឯកសារនេះក្នុង Chrome, Edge ឬ Firefox។ កុំបើកពីខាងក្នុង ZIP ដោយផ្ទាល់។ មិនចាំបាច់ដំឡើងកម្មវិធី ឬ web server ទេ។ ចម្លងថតនេះទៅ USB ដើម្បីចែកដល់កុំព្យូទ័របន្ទប់ពិសោធន៍បាន។</p>
<p class="note">Extract the whole ZIP, then open this file in Chrome, Edge or Firefox. Online version: <a href="https://khgeo.github.io/{name}/">khgeo.github.io/{name}</a> · YAM Sarath (យាំ សារដ្ឋ)</p>
</main></body></html>""", encoding="utf-8")
    out = Path(a.out); out = out if out.is_absolute() else ROOT / out; out.mkdir(parents=True, exist_ok=True)
    z = out / f"{name}-offline.zip"; z.unlink(missing_ok=True)
    with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for p in sorted(work.rglob("*")):
            if p.is_file(): zf.write(p, f"{name}-offline/{p.relative_to(work).as_posix()}")
    print(f"Offline ZIP: {z} · {z.stat().st_size / 1e6:.1f} MB")

if __name__ == "__main__":
    main()
