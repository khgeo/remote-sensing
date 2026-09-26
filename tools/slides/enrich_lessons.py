"""Insert the real-data figures (visuals.json) into lessons, distributed across the theory subsections,
then renumber all figures of the lesson. Idempotent: figures already inserted are skipped."""
import json, os, re
H = os.path.dirname(os.path.abspath(__file__)); DOCS = os.path.join(os.path.dirname(os.path.dirname(H)), "docs")
KM = "០១២៣៤៥៦៧៨៩"; kh = lambda n: "".join(KM[int(c)] for c in str(n))
V = json.load(open(os.path.join(H, "visuals.json"), encoding="utf-8"))
def block(v):
    name = os.path.basename(v["file"])[:-4]
    b = "\n".join(f"    - {x}" for x in v["bullets"])
    return (f'<!-- rsv:{name} -->\n<figure markdown>\n--8<-- "{v["file"]}"\n<figcaption>រូបទី០.០៖ {v["title"]}។</figcaption>\n</figure>\n\n'
            f'!!! note "អានរូបនេះ"\n{b}\n\n')
for n in range(1, 16):
    p = os.path.join(DOCS, "lessons", f"lesson-{n:02d}.md"); s = open(p, encoding="utf-8").read(); crlf = "\r\n" in s; s = s.replace("\r\n", "\n")
    figs = [v for v in V if v.get("lesson") == n and not v.get("slides_only") and f"rsv:{os.path.basename(v['file'])[:-4]}" not in s]
    if figs:
        lines = s.split("\n")
        th = next(i for i, l in enumerate(lines) if re.match(rf"^## {kh(n)}\.៣\.", l))
        end = next(i for i in range(th + 1, len(lines)) if lines[i].startswith("## "))
        subs = [i for i in range(th, end) if lines[i].startswith("### ")] or [th]
        bounds = [(subs[k], subs[k + 1] if k + 1 < len(subs) else end) for k in range(len(subs))]
        inserts = {}
        for v in figs:
            k = min(len(bounds) - 1, int(v["where"] * len(bounds)))
            inserts.setdefault(bounds[k][1], []).append(block(v))
        for at in sorted(inserts, reverse=True):
            lines[at:at] = ("\n" + "".join(inserts[at])).split("\n")
        s = "\n".join(lines)
    # renumber every figure in reading order; keep in-text references consistent
    caps = list(re.finditer(r"<figcaption>រូបទី([០-៩]+\.[០-៩]+)៖", s)); mapping = {}
    for i, m in enumerate(caps, 1):
        old = m.group(1); new = f"{kh(n)}.{kh(i)}"
        if old != "០.០" and old not in mapping: mapping[old] = new
    out, i = [], 0
    def cap(m):
        global_i[0] += 1; return f"<figcaption>រូបទី{kh(n)}.{kh(global_i[0])}៖"
    global_i = [0]
    s2 = re.sub(r"<figcaption>រូបទី[០-៩]+\.[០-៩]+៖", cap, s)
    for old, new in mapping.items():
        s2 = re.sub(rf"(?<!<figcaption>)រូបទី{re.escape(old)}(?![០-៩])", f"រូបទី{new}", s2)
    open(p, "w", encoding="utf-8").write(s2.replace("\n", "\r\n") if crlf else s2)
    print(f"lesson {n:02d}: +{len(figs)} figures · {global_i[0]} figures total")
