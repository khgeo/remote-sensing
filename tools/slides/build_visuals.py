"""Generate Book 3 figures (docs/assets/svg/rsv) and tools/slides/visuals.json. Used by lessons, labs and slides."""
import json, os, sys, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vis_core
mods = [("vis_rs_a", ["L01", "L02", "L03", "L04", "L05"]), ("vis_rs_b", ["L06", "L07", "L08", "L09", "L10"]), ("vis_rs_c", ["L11", "L12", "L13", "L14", "L15"]), ("vis_rs_d", ["EXTRA", "LABS"])]
for m, fns in mods:
    try: mod = importlib.import_module(m)
    except ModuleNotFoundError: continue
    for fn in fns:
        if hasattr(mod, fn): getattr(mod, fn)()
SLIDES_ONLY = ("r06-landsat-grid", "r06-s2-grid", "r06-timeline")   # the lesson already shows these
for v in vis_core.MANIFEST:
    if any(v.get("file", "").endswith(k + ".svg") for k in SLIDES_ONLY): v["slides_only"] = True
json.dump(vis_core.MANIFEST, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "visuals.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(vis_core.MANIFEST), "figures")
