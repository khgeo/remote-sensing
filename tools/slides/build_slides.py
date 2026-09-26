"""Build a full teaching deck (~60 slides, one 3-hour lesson) per lesson from docs/lessons/lesson-XX.md.

    python tools/slides/build_slides.py      # -> docs/slides/lesson-01.html … + docs/slides/index.md

The live simulators, before/after comparisons and self-check quizzes of the lesson run
INSIDE the slides (same scripts as the website, bundled data, works offline).
Keys: → / Space next · ← back · Home/End · F fullscreen · N teacher notes · O overview · P print/PDF.
Edit the lesson markdown, never the decks; the deploy workflow rebuilds them.
"""
import os, re, html, io, json

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DOCS = os.path.join(ROOT, "docs")
OUT = os.path.join(DOCS, "slides")

# ---- book settings ---------------------------------------------------------
BOOK, BOOK_EN, BOOK_NO = "មូលដ្ឋានគ្រឹះនៃការយកព័ត៌មានពីចម្ងាយ", "Fundamentals of Remote Sensing", "សៀវភៅទី៣"
AUTHOR = "យាំ សារដ្ឋ · YAM Sarath"
ONLINE = "https://khgeo.github.io/remote-sensing/"
PAGE_EXT = "/"
C1, C2, C3, BG = "#5d4037", "#e64a19", "#3e2723", "#faf6f4"
CSS_FILES = ["assets/css/lesson-sims.css"]
JS_FILES = ["assets/js/rs-sims.js", "assets/js/lesson-sims.js"]
VISUALS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "visuals.json")
# -----------------------------------------------------------------------------

KM = "០១២៣៤៥៦៧៨៩"
kh = lambda n: "".join(KM[int(c)] if c.isdigit() else c for c in str(n))

def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"(?<![\w*])\*(?!\s)(.+?)\*(?!\w)", r"<i>\1</i>", t)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", t)
    t = re.sub(r"\{[^}]*\}", "", t)
    t = re.sub(r"&lt;/?b&gt;", "", t)
    return t

def split_sent(par):
    return [s.strip() for s in re.findall(r"[^។?!]+[។?!]?", par.strip()) if s.strip()]

def clip(t, n):
    return t if len(t) <= n else t[:n].rsplit(" ", 1)[0] + " …"

def table_rows(rows):
    rows = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows]
    return [r for r in rows if not all(re.fullmatch(r":?-{2,}:?", c) for c in r)]

def table_html(head, body):
    return ("<table><thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr></thead><tbody>" +
            "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in body) + "</tbody></table>")

def svg_inline(rel):
    p = os.path.join(DOCS, rel)
    if not os.path.exists(p): return ""
    s = re.sub(r"<\?xml[^>]*\?>", "", open(p, encoding="utf-8").read())
    return re.sub(r"<svg\b", '<svg preserveAspectRatio="xMidYMid meet"', s, count=1)

def art(src):
    return svg_inline(src) if src.endswith(".svg") else f'<img src="../{src.lstrip("./")}" alt="">'

def qr_svg(url):
    try:
        import qrcode, qrcode.image.svg
        b = io.BytesIO(); qrcode.make(url, image_factory=qrcode.image.svg.SvgPathImage, border=1).save(b)
        return re.sub(r"<\?xml[^>]*\?>", "", b.getvalue().decode())
    except Exception:
        return ""

# ---- markdown → blocks --------------------------------------------------------
def blocks(md):
    lines = md.replace("\r", "").split("\n"); i = 0
    while i < len(lines):
        l = lines[i]
        if l.startswith("# "): i += 1; continue
        if l.startswith("## "): yield ("h2", l[3:].strip()); i += 1; continue
        if l.startswith("### "): yield ("h3", l[4:].strip()); i += 1; continue
        if l.startswith("#### "): yield ("h4", l[5:].strip()); i += 1; continue
        if l.startswith('<div class="rich-comparison"'):
            figs, j = [], i + 1
            while j < len(lines) and not lines[j].startswith("</div>"):
                m = re.search(r'--8<-- "([^"]+)"', lines[j]); c = re.search(r"<figcaption>(.*?)</figcaption>", lines[j])
                if m: figs.append([m.group(1), ""])
                if c and figs: figs[-1][1] = re.sub("<[^>]+>", "", c.group(1))
                j += 1
            yield ("comparison", figs); i = j + 1; continue
        m = re.match(r'<div class="rich-quiz" data-lesson="(\d+)"', l)
        if m:
            j = i
            while j < len(lines) and "</div>" not in lines[j]: j += 1
            # the quiz markup is copied verbatim (rich-lessons.js makes it interactive)
            depth, k, buf = 0, i, []
            while k < len(lines):
                buf.append(lines[k]); depth += lines[k].count("<div") - lines[k].count("</div>")
                if depth <= 0: break
                k += 1
            yield ("quiz", "\n".join(buf)); i = k + 1; continue
        if l.startswith("<figure"):
            src, cap, j = None, "", i
            while j < len(lines) and "</figure>" not in lines[j]:
                m = re.search(r'--8<-- "([^"]+)"', lines[j]) or re.search(r'!\[[^\]]*\]\(([^)]+)\)', lines[j])
                if m: src = m.group(1).replace("../", "")
                c = re.search(r"<figcaption>(.*?)</figcaption>", lines[j])
                if c: cap = re.sub("<[^>]+>", "", c.group(1))
                j += 1
            if src: yield ("figure", (src, cap))
            i = j + 1; continue
        m = re.match(r'<div class="sim" data-sim="([^"]+)"', l)
        if m: yield ("sim", m.group(1)); i += 1; continue
        m = re.match(r'!!!\s+(\w+)\s+"([^"]*)"', l)
        if m:
            body, j = [], i + 1
            while j < len(lines) and (lines[j].startswith("    ") or not lines[j].strip()):
                if lines[j].strip(): body.append(lines[j].strip())
                j += 1
            yield ("adm", (m.group(1), m.group(2), " ".join(body))); i = j; continue
        if l.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"): rows.append(lines[i]); i += 1
            yield ("table", table_rows(rows)); continue
        if l.startswith(">"):
            q = []
            while i < len(lines) and lines[i].startswith(">"): q.append(lines[i].lstrip("> ").strip()); i += 1
            yield ("quote", " ".join(q)); continue
        if re.match(r"\s*(\d+\.|-|\*)\s+", l):
            items = []
            while i < len(lines) and (re.match(r"\s*(\d+\.|-|\*)\s+", lines[i]) or (lines[i].startswith("   ") and lines[i].strip())):
                if re.match(r"\s*(\d+\.|-|\*)\s+", lines[i]): items.append(re.sub(r"^\s*(\d+\.|-|\*)\s+", "", lines[i]))
                else: items[-1] += " " + lines[i].strip()
                i += 1
            yield ("list", items); continue
        if l.strip() and not l.startswith(("<", "---", "|", "⬅")):
            par = [l.strip()]; i += 1
            while i < len(lines) and lines[i].strip() and not re.match(r"(#|<|\||!!!|>|\s*(\d+\.|-|\*)\s)", lines[i]):
                par.append(lines[i].strip()); i += 1
            yield ("par", " ".join(par)); continue
        i += 1

# ---- slide model ---------------------------------------------------------------
def S(kind, title, body="", notes="", cls=""):
    return dict(kind=kind, title=title, body=body, notes=notes, cls=cls)

def ul(items, cls=""):
    return f'<ul class="{cls}">' + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ul>"

def idea(par):
    """One paragraph → headline sentence + supporting sentences."""
    ss = split_sent(par)
    if not ss: return ""
    head, rest = ss[0], ss[1:6]
    body = ""
    if len(rest) >= 3:
        body = '<ul class="pts">' + "".join(f"<li>{inline(clip(x, 200))}</li>" for x in rest) + "</ul>"
    elif rest:
        body = f'<p class="support">{inline(clip(" ".join(rest), 620))}</p>'
    return f'<p class="headline">{inline(clip(head, 220))}</p>' + body

ADM = {"note": ("ចំណាំ", "#1565c0"), "tip": ("គន្លឹះ", "#2e7d32"), "warning": ("ប្រុងប្រយ័ត្ន", "#e65100"),
       "info": ("ព័ត៌មាន", "#00838f"), "abstract": ("គំនិតស្នូល", C1), "example": ("ឧទាហរណ៍", "#6a1b9a"), "quote": ("", C1)}

ALLVIS = json.load(open(VISUALS, encoding="utf-8")) if os.path.exists(VISUALS) else []
BYFILE = {v["file"]: v for v in ALLVIS if "file" in v}
def deck(n, md):
    title = re.search(r"^# (.+)$", md, re.M).group(1).strip()
    short = title.split("៖", 1)[-1].strip()
    lesson_url = f"../lessons/lesson-{n:02d}{PAGE_EXT}"
    slides, sec, sub = [], "", ""
    first_fig = []
    data = dict(obj=[], prior=[], scen=[], scen_q=[], steps=[], mis=[], summ=[], core="", terms=[], qc=[], qa=[], task=[],
                timing=[], nexttxt=[], nextq="", ex_intro=[], ex_concl=[], warn_ex="")
    pending_sim = None
    STD = ("គោលបំណង", "ស្ថានភាពបើក", "ឧទាហរណ៍", "សកម្មភាពអនុវត្ត", "ការយល់ច្រឡំ", "សេចក្ដីសង្ខេប", "ពាក្យគន្លឹះ", "សំណួររំលឹក", "គ្រូបង្រៀន")
    theory_like = lambda s: ("ទ្រឹស្ដី" in s) or ("សិក្ខាសាលា" in s) or not any(k in s for k in STD)
    seen_theory = [False]; skip_note = [False]
    MERGE = 900 if len(md) > 16000 else 520
    MAXIDEA = 1 if len(md) > 16000 else 99

    for kind, p in blocks(md):
        if kind == "h2":
            sec, sub = p, ""
            if theory_like(p):
                if "សិក្ខាសាលា" in p:
                    slides.append(S("divider", re.sub(r"^[\d០-៩.]+\s*", "", p), "", cls="workshop"))
                else:
                    if not seen_theory[0]:
                        slides.append(S("divider", "ទ្រឹស្ដីស្នូល", "", cls="theory")); seen_theory[0] = True
                    if "ទ្រឹស្ដី" not in p:
                        sub = re.sub(r"^[\d០-៩.]+\s*", "", p); slides.append(S("mark", sub))
            continue
        if kind == "h4":
            if theory_like(sec): sub = re.sub(r"^[\d០-៩.]+\s*", "", p); slides.append(S("mark", sub))
            continue
        if kind == "h3":
            sub = re.sub(r"^[\d០-៩.]+\s*", "", p)
            if "ឧទាហរណ៍" in sec and p.startswith("ជំហាន"): data["steps"].append([p.split("៖", 1)[-1].strip(), []])
            if theory_like(sec): slides.append(S("mark", sub))
            continue
        where = ("obj" if "គោលបំណង" in sec else "scen" if "ស្ថានភាពបើក" in sec else "th" if theory_like(sec) else
                 "ex" if "ឧទាហរណ៍" in sec else "mis" if "ការយល់ច្រឡំ" in sec else "sum" if "សេចក្ដីសង្ខេប" in sec else
                 "terms" if "ពាក្យគន្លឹះ" in sec else "q" if "សំណួររំលឹក" in sec else "teach" if "គ្រូបង្រៀន" in sec else "other")
        if kind == "list":
            if where == "obj": (data["prior"] if sub else data["obj"]).extend(p)
            elif where == "scen": data["scen_q"].extend(p)
            elif where == "th":
                for k in range(0, len(p), 4): slides.append(S("content", sub, ul([clip(x, 190) for x in p[k:k + 4]], "big")))
            elif where == "q":
                (data["qc"] if "យល់ដឹង" in sub else data["qa"] if "អនុវត្ត" in sub else data["task"]).extend(p)
        elif kind == "par":
            if where == "scen": data["scen"].append(p)
            elif where == "th":
                last = slides[-1] if slides else None
                if last and last["kind"] == "idea" and last["title"] == sub and len(last["notes"]) + len(p) < MERGE and last["notes"].count("\n") < (2 if MERGE > 600 else 1):
                    last["body"] += f'<p class="support">{inline(clip(p, 300))}</p>'; last["notes"] += "\n" + p
                elif last and last["kind"] == "idea" and last["title"] == sub and sum(1 for x in slides if x["kind"] == "idea" and x["title"] == sub) >= MAXIDEA:
                    last["body"] += f'<p class="support">{inline(clip(split_sent(p)[0] if split_sent(p) else p, 240))}</p>'; last["notes"] += "\n" + p
                else:
                    slides.append(S("idea", sub, idea(p), p))
            elif where == "ex":
                if data["steps"]: data["steps"][-1][1].append(p)
                elif sub: data["ex_concl"].append(p)
                else: data["ex_intro"].append(p)
            elif where == "mis": data["mis"].append(p)
            elif where == "sum": data["summ"].append(p)
            elif where == "q": data["task"].append(p)
            elif where == "teach" and "បន្ទាប់" in sub: data["nexttxt"].append(p)
        elif kind == "quote":
            if where == "teach": data["nextq"] = p
            elif where == "th": slides.append(S("callout", sub, f'<blockquote>{inline(p)}</blockquote>', cls="quote"))
        elif kind == "table":
            if not p: continue
            head, body = p[0], p[1:]
            if where == "th":
                for k in range(0, len(body), 7):
                    slides.append(S("table", sub + (" (ត)" if k else ""), table_html(head, body[k:k + 7])))
            elif where == "terms": data["terms"] = (head, body)
            elif where == "mis": data["mis_table"] = (head, body)
            elif where == "teach" and "ពេលវេលា" in sub: data["timing"] = body
            elif where == "ex": data["ex_table"] = (head, body)
        elif kind == "adm" and p[1] == "អានរូបនេះ":
            continue
        elif kind == "adm":
            typ, t, body = p
            if typ == "abstract" and where == "sum": data["core"] = body
            elif typ == "example" and t.startswith("ពិសោធន៍"): pending_sim = (t.split("៖", 1)[-1].strip(), body)
            elif typ == "warning" and where == "ex": data["warn_ex"] = body
            elif where == "th" and body and typ in ADM:
                lab, col = ADM[typ]
                slides.append(S("callout", t or lab, f'<div class="callout" style="--c:{col}"><div class="clab">{lab}</div><p>{inline(clip(body, 520))}</p></div>', body))
        elif kind == "figure" and p[0] in BYFILE and where in ("th", "ex"):
            v = BYFILE[p[0]]
            slides.append(S("visual", v["title"], f'<div class="viswrap"><div class="vfig">{svg_inline(v["file"])}</div><div class="vnotes"><div class="vlab">សង្កេត</div>{ul(v["bullets"])}</div></div>', " ".join(v["bullets"])))
            skip_note[0] = True
        elif kind == "figure":
            src, cap = p
            if not first_fig and src.endswith(".svg"): first_fig.append(src)
            if where in ("th", "ex"):
                last = slides[-1] if slides else None
                if last and last["kind"] == "idea" and last["title"] == sub and len(last["notes"]) < 420:
                    last.update(kind="split", body=f'<div class="splitwrap"><div class="txt">{last["body"]}</div><div class="fig"><div class="art">{art(src)}</div><p class="cap">{inline(clip(cap, 170))}</p></div></div>', notes=last["notes"] + " " + cap)
                else:
                    slides.append(S("figure", sub or sec, f'<div class="art">{art(src)}</div><p class="cap">{inline(clip(cap, 260))}</p>', cap))
        elif kind == "comparison" and len(p) >= 2:
            cols = "".join(f'<div class="cmp {"bad" if i == 0 else "good"}"><div class="tag">{"មុន · ខ្សោយ" if i == 0 else "ក្រោយ · ល្អ"}</div><div class="art">{svg_inline(src)}</div><p class="cap">{inline(clip(cap, 150))}</p></div>' for i, (src, cap) in enumerate(p[:2]))
            slides.append(S("compare", "មើល → ប្រៀបធៀប → ពន្យល់", f'<div class="cmpwrap">{cols}</div>'))
            slides.append(S("prompt", "ពិភាក្សា ២ នាទី", '<p class="big-q">តើភាពខុសគ្នាពីរចំណុចណា ដែលប៉ះពាល់ដល់ការបកស្រាយរបស់អ្នកអានផែនទី?</p><p class="hint">សរសេរចម្លើយមុន រួចប្រៀបធៀបជាមួយដៃគូ។</p>', cls="prompt"))
        elif kind == "sim":
            t, instr = pending_sim or ("ពិសោធន៍អន្តរកម្ម", "")
            slides.append(S("sim", "ពិសោធន៍៖ " + t,
                            (f'<p class="instr">{inline(clip(instr, 260))}</p>' if instr else "") + f'<div class="simfit"><div class="sim" data-sim="{p}"></div></div>', instr))
            pending_sim = None
        elif kind == "quiz":
            slides.append(S("quiz", "សាកល្បងចំណេះដឹង", f'<div class="quizfit">{p}</div>'))

    # ---------------- assemble in teaching order ----------------
    out = [S("title", short, f'<div class="tart">{svg_inline(first_fig[0])}</div>' if first_fig else "", cls=title.split("៖")[0])]
    if data["timing"]:
        rows = [r for r in data["timing"] if "សរុប" not in r[0]]
        out.append(S("content", "ផែនការមេរៀន ៣ ម៉ោង", '<ol class="agenda">' + "".join(f"<li><span>{inline(a)}</span><b>{inline(b)}</b></li>" for a, b in (r[:2] for r in rows)) + "</ol>"))
    if data["obj"]: out.append(S("content", "គោលបំណងសិក្សា", "<p class='lead'>បន្ទាប់ពីបញ្ចប់មេរៀន និស្សិតអាច៖</p>" + ul(data["obj"], "num")))
    if data["prior"]: out.append(S("content", "ចំណេះដឹងមុនត្រូវមាន", ul(data["prior"], "big")))
    if data["scen"]:
        out.append(S("divider", "ស្ថានភាពបើកមេរៀន", "", cls="scen"))
        for par in data["scen"][:2]:
            out.append(S("story", "ស្ថានភាពបើកមេរៀន", f'<p class="story">{inline(clip(par, 520))}</p>', par))
        if data["scen_q"]:
            out.append(S("content", "សំណួរដែលមេរៀននេះឆ្លើយ", ul(data["scen_q"], "q")))
            out.append(S("prompt", "គិត · ចែករំលែក", f'<p class="big-q">{inline(data["scen_q"][0])}</p><p class="hint">គិតម្នាក់ឯង ១ នាទី · ពិភាក្សាជាគូ ២ នាទី · ចែករំលែកជាមួយថ្នាក់។</p>', cls="prompt"))
    # theory + workshop slides with quick checks after every few content slides
    checks = list(data["qc"])
    body, since = [], 0
    for s in slides:
        if s["kind"] == "mark":
            if since >= 6 and checks:
                body.append(S("prompt", "សំណួររហ័ស", f'<p class="big-q">{inline(checks.pop(0))}</p><p class="hint">ឆ្លើយក្នុង ១ នាទី មុនបន្តទៅផ្នែកបន្ទាប់។</p>', cls="prompt")); since = 0
            continue
        body.append(s); since += 1
    # workshop comes after the worked example in teaching order, so split
    ws_at = next((i for i, s in enumerate(body) if s["kind"] == "divider" and s["cls"] == "workshop"), len(body))
    vis = [v for v in ALLVIS if v.get("lesson") == n and v.get("slides_only")]
    region = body[:ws_at]; start = 1 if region and region[0]["kind"] == "divider" else 0
    for v in sorted(vis, key=lambda v: -v["where"]):
        pos = start + int(round(v["where"] * (len(region) - start)))
        if "sim" in v:
            sl = S("sim", v["title"], f'<p class="instr">{inline(v["bullets"][0])}</p><div class="simfit"><div class="sim" data-sim="{v["sim"]}"></div></div>', v["bullets"][0])
        else:
            sl = S("visual", v["title"], f'<div class="viswrap"><div class="vfig">{svg_inline(v["file"])}</div><div class="vnotes"><div class="vlab">សង្កេត</div>{ul(v["bullets"])}</div></div>', " ".join(v["bullets"]))
        region.insert(pos, sl)
    body = region + body[ws_at:]; ws_at = len(region)
    out += body[:ws_at]
    if data["steps"]:
        out.append(S("divider", "ឧទាហរណ៍ដែលបានដោះស្រាយ", "", cls="ex"))
        if data["ex_intro"]: out.append(S("story", "ឧទាហរណ៍៖ ស្ថានភាព", f'<p class="story">{inline(clip(" ".join(data["ex_intro"]), 520))}</p>'))
        for k, (h, pars) in enumerate(data["steps"], 1):
            txt = " ".join(pars)
            out.append(S("step", f"ជំហានទី{kh(k)}៖ {h}", f'<div class="stepno">{kh(k)}</div><div class="steptxt">{idea(txt) if txt else ""}</div>', txt))
        if data.get("ex_table"): out.append(S("table", "ឧទាហរណ៍៖ តារាង", table_html(*data["ex_table"])))
        if data["ex_concl"]: out.append(S("content", "សេចក្ដីសន្និដ្ឋាន", f'<p class="story">{inline(clip(" ".join(data["ex_concl"]), 520))}</p>'))
        if data["warn_ex"]: out.append(S("callout", "អ្វីដែលយើងមិនអាចសន្និដ្ឋាន", f'<div class="callout" style="--c:#e65100"><div class="clab">ប្រុងប្រយ័ត្ន</div><p>{inline(clip(data["warn_ex"], 520))}</p></div>'))
    out += body[ws_at:]
    lab = next((v for v in ALLVIS if v.get("lab") == n), None)
    if lab:
        out.append(S("visual", f"លំហាត់ទី{kh(n)} ក្នុង QGIS", f'<div class="labflow">{svg_inline(lab["file"])}</div><p class="support">លំហាត់ប្រើទិន្នន័យវគ្គ RS_Data (Landsat 8 ភ្នំពេញ · Sentinel-2 ក្រុងព្រះសីហនុ) ហើយមានរូបលទ្ធផលគំរូ តារាងកំហុសទូទៅ និងប្រអប់ពិនិត្យលទ្ធផលដោយខ្លួនឯង។</p>'))
    else:
        out.append(S("content", "សកម្មភាពអនុវត្ត", f'<p class="lead">ធ្វើ <b>លំហាត់ទី{kh(n)}</b> ក្នុង QGIS នៅសៀវភៅអនុវត្ត។</p>'))
    # misconceptions: one per slide
    pairs = re.findall(r"\*\*[^*]*?«(.+?)»\*\*\s*(.*)", "\n".join(data["mis"]))
    if pairs or data.get("mis_table"):
        out.append(S("divider", "ការយល់ច្រឡំដែលត្រូវប្រុងប្រយ័ត្ន", "", cls="mis"))
        if data.get("mis_table"):
            head, rows = data["mis_table"]; pairs = [(r[0], r[1] if len(r) > 1 else "") for r in rows]
        for k, (a, b) in enumerate(pairs[:6], 1):
            out.append(S("myth", f"ការយល់ច្រឡំទី{kh(k)}", f'<div class="myth"><div class="x">✗ «{inline(a)}»</div><div class="arrow">↓</div><div class="v">✓ {inline(clip(b, 300))}</div></div>'))
    if data["summ"]:
        out.append(S("content", "សេចក្ដីសង្ខេប", "".join(f'<p class="support">{inline(clip(x, 420))}</p>' for x in data["summ"][:3])))
    if data["core"]: out.append(S("core", "គំនិតស្នូលនៃមេរៀន", f'<p>{inline(data["core"])}</p>'))
    if data["terms"]:
        head, rows = data["terms"]
        for k in range(0, len(rows), 8):
            out.append(S("table", "ពាក្យគន្លឹះខ្មែរ–អង់គ្លេស" + (" (ត)" if k else ""), table_html(head, rows[k:k + 8])))
    rest = checks + data["qa"]
    for k in range(0, len(rest), 3):
        out.append(S("content", "សំណួររំលឹក", ul(rest[k:k + 3], "q")))
    if data["task"]: out.append(S("content", "កិច្ចការខ្លី", "".join(f'<p class="support">{inline(clip(x, 460))}</p>' for x in data["task"][:2])))
    if data["nextq"] or data["nexttxt"]:
        out.append(S("next", "មេរៀនបន្ទាប់", (f'<p class="support">{inline(clip(data["nexttxt"][0], 360))}</p>' if data["nexttxt"] else "") +
                     (f'<p class="big-q">{inline(data["nextq"])}</p>' if data["nextq"] else "")))
    out.append(S("end", "អរគុណ", f'<p class="lead">អានមេរៀនពេញ និងធ្វើលំហាត់ទី{kh(n)}</p><div class="endqr">{qr_svg(ONLINE + f"lessons/lesson-{n:02d}{PAGE_EXT}")}</div><p class="small">{ONLINE}lessons/lesson-{n:02d}{PAGE_EXT}</p>'))
    return title, out

# ---- HTML ---------------------------------------------------------------------
CSS = """
@font-face{font-family:Siemreap;src:url(../assets/fonts/Siemreap.ttf)} @font-face{font-family:Battambang;src:url(../assets/fonts/Battambang-Regular.ttf)}
@font-face{font-family:Battambang;font-weight:700;src:url(../assets/fonts/Battambang-Bold.ttf)} @font-face{font-family:Moul;src:url(../assets/fonts/Moul-Regular.ttf)}
*{box-sizing:border-box} html,body{margin:0;height:100%;background:#1c1c24;font-family:Battambang,Siemreap,sans-serif;overflow:hidden}
#stage{position:absolute;left:50%;top:50%;width:1280px;height:720px;transform-origin:0 0}
.slide{position:absolute;inset:0;background:#fff;visibility:hidden;padding:52px 72px 58px;color:#222;overflow:hidden}
.slide.on{visibility:visible}
.slide h2{font-family:Battambang;font-weight:700;color:C1;font-size:36px;margin:0 0 24px;padding-bottom:12px;border-bottom:4px solid C2;line-height:1.5}
.slide ul,.slide ol{font-size:27px;line-height:1.75;margin:0;padding-left:1.1em} .slide li{margin:.3em 0} .slide li::marker{color:C2}
ul.big{font-size:28px} ul.num{list-style:none;counter-reset:n;padding-left:0} ul.num li{counter-increment:n;padding-left:2.1em;position:relative}
ul.num li::before{content:counter(n);position:absolute;left:0;top:.18em;width:1.45em;height:1.45em;border-radius:50%;background:C1;color:#fff;font-size:.72em;display:flex;align-items:center;justify-content:center}
ul.q li{color:C3;font-weight:700;margin-bottom:.8em}
.lead{font-size:28px;line-height:1.8;margin:0 0 16px} .small{font-size:18px;color:#666}
.headline{font-size:34px;line-height:1.7;font-weight:700;color:C3;margin:10px 0 22px;border-left:10px solid C2;padding-left:22px}
.support{font-size:26px;line-height:1.85;color:#333;margin:0 0 14px}
.story{font-size:30px;line-height:1.9;color:#222;background:BG;border-radius:14px;padding:26px 34px;margin:0}
table{border-collapse:collapse;font-size:22px;line-height:1.55;width:100%} th{background:C1;color:#fff;text-align:left;padding:9px 14px;font-weight:700}
td{padding:9px 14px;border-bottom:1px solid #e3e3ea;vertical-align:top} tr:nth-child(even) td{background:BG}
code{font-family:monospace;background:#eef;padding:0 .25em;border-radius:3px;font-size:.9em}
.art{height:520px;display:flex;align-items:center;justify-content:center} .art svg,.art img{max-width:100%;max-height:100%;width:auto;height:100%}
.figure .art{height:480px} .cap{font-size:19px;color:#555;text-align:center;margin:8px 40px 0;line-height:1.55}
.cmpwrap{display:flex;gap:28px} .cmp{flex:1;border:3px solid #ddd;border-radius:10px;padding:10px 12px 6px} .cmp .art{height:380px}
.cmp.bad{border-color:#e57373} .cmp.good{border-color:#66bb6a} .tag{font-weight:700;font-size:20px} .bad .tag{color:#c62828} .good .tag{color:#2e7d32} .cmp .cap{margin:6px 0 0;font-size:17px}
.callout{border-left:12px solid var(--c);background:BG;border-radius:10px;padding:26px 32px;font-size:28px;line-height:1.8} .clab{color:var(--c);font-weight:700;font-size:22px;margin-bottom:8px}
blockquote{font-size:34px;line-height:1.7;color:C3;border-left:10px solid C2;margin:40px 0;padding:10px 30px;font-weight:700}
.divider{background:linear-gradient(135deg,C3,C1);color:#fff;display:flex;flex-direction:column;justify-content:center;padding-left:110px}
.divider h2{color:#fff;border:0;font-family:Moul;font-weight:400;font-size:56px;margin:0} .divider .kick{color:C2;font-size:24px;margin-bottom:10px}
.subhead{display:flex;flex-direction:column;justify-content:center;padding-left:110px;background:BG} .subhead h2{font-size:46px;border:0;border-left:14px solid C2;padding-left:28px}
.prompt{background:#fff8e1;display:flex;flex-direction:column;justify-content:center} .prompt h2{border-color:C1} .big-q{font-size:38px;line-height:1.7;color:C3;font-weight:700;margin:0 0 30px} .hint{font-size:24px;color:#6d4c41}
.step .stepno{position:absolute;right:72px;top:40px;font-family:Moul;font-size:110px;color:C2;opacity:.35} .steptxt{margin-top:10px}
.myth{margin-top:30px} .myth .x{font-size:32px;color:#c62828;background:#ffebee;border-radius:10px;padding:22px 30px;line-height:1.6}
.myth .arrow{text-align:center;font-size:40px;color:#999;margin:10px 0} .myth .v{font-size:28px;color:#1b5e20;background:#e8f5e9;border-radius:10px;padding:22px 30px;line-height:1.7}
.core{background:linear-gradient(135deg,C3,C1);color:#fff;display:flex;flex-direction:column;justify-content:center;padding:80px 110px} .core h2{color:C2;border:0;font-size:30px}
.core p{font-size:38px;line-height:1.75;margin:0}
.agenda{list-style:none;padding:0;counter-reset:a} .agenda li{display:flex;justify-content:space-between;border-bottom:1px dashed #ccd;padding:6px 0;font-size:24px;counter-increment:a}
.agenda li span::before{content:counter(a) ". ";color:C2;font-weight:700} .agenda li b{color:C1;white-space:nowrap;margin-left:20px}
.splitwrap{display:flex;gap:34px;align-items:flex-start} .splitwrap .txt{flex:1 1 44%} .splitwrap .fig{flex:1 1 56%} .splitwrap .art{height:440px} .splitwrap .headline{font-size:28px} .splitwrap .support{font-size:22px}
 .viswrap{display:flex;gap:26px;align-items:stretch;height:535px} .vfig{flex:1 1 68%;display:flex;align-items:center;justify-content:center;background:#fff}
.vfig svg{width:100%;height:auto;max-height:535px} .vfig .ftitle{display:none} .vfig .fsub{font-size:18px} .vnotes{flex:0 0 30%;background:BG;border-radius:12px;padding:18px 20px;border-top:6px solid C2}
.vlab{font-weight:700;color:C1;font-size:22px;margin-bottom:6px} .vnotes ul{font-size:21px;line-height:1.65;padding-left:1em} .vnotes li{margin:.45em 0}
.visual h2{margin-bottom:14px;font-size:32px} ul.pts{font-size:24px;line-height:1.7} ul.pts li{margin:.35em 0}
.labflow svg{width:100%;height:auto} .labflow .ftitle{display:none} .vfig .fsub{font-size:18px}
.instr{font-size:21px;line-height:1.6;color:#444;margin:-8px 0 10px} .simfit{width:860px;margin:0 auto;transform-origin:top center} .quizfit{transform-origin:top center}
.simfit .sim{margin:0;border-width:1px} .quizfit .rich-quiz{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;font-size:21px;line-height:1.6;border:0;padding:0;margin:0;background:none}
.quizfit fieldset{border:2px solid #dde;border-radius:10px;padding:14px 16px;margin:0} .quizfit legend{font-weight:700;color:C3;font-size:22px;padding:0 6px}
.quizfit label{display:block;margin:6px 0;cursor:pointer} .quizfit input{transform:scale(1.4);margin-right:10px}
.quizfit details{margin-top:8px;font-size:18px} .quizfit .quiz-score,.quizfit .rich-quiz>p,.quizfit .rich-quiz>button,.quizfit .rich-quiz>div:not(fieldset){grid-column:1/-1;font-size:20px}
.sim .slide h2{font-size:20px}
.title{background:linear-gradient(135deg,C3,C1);color:#fff;padding:80px 90px} .title .kick{color:C2;font-size:26px}
.title h1{font-family:Moul;font-weight:400;font-size:56px;line-height:1.55;margin:26px 0 30px;max-width:640px}
.title .rule{width:280px;height:6px;background:C2;margin-bottom:34px} .title .meta{font-size:24px;opacity:.9;line-height:1.8}
.tart{position:absolute;right:60px;bottom:70px;width:520px;height:340px;background:#fff;border-radius:14px;padding:14px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,.25)}
.tart svg{max-width:100%;max-height:100%;width:auto;height:100%}
.end,.next{text-align:center;padding-top:60px} .end h2,.next h2{border:0;font-family:Moul;font-weight:400;font-size:50px} .endqr svg{width:220px;height:220px}
.foot{position:absolute;left:72px;right:72px;bottom:16px;display:flex;justify-content:space-between;font-size:15px;color:#9a9aa8}
.title .foot,.divider .foot,.core .foot{color:rgba(255,255,255,.6)}
#bar{position:fixed;left:0;bottom:0;height:5px;background:C2;transition:width .2s;z-index:5}
#ui{position:fixed;right:14px;bottom:12px;display:flex;gap:6px;font-size:14px;color:#eee;align-items:center;font-family:sans-serif;background:rgba(20,20,30,.6);padding:4px 6px;border-radius:7px;z-index:6}
#ui button{background:#333;color:#eee;border:0;border-radius:5px;padding:6px 10px;cursor:pointer;font-size:14px}
#notes{position:fixed;left:0;right:0;bottom:0;max-height:32%;overflow:auto;background:#fffde7;color:#333;font-size:17px;line-height:1.7;padding:14px 24px;display:none;border-top:3px solid C2;font-family:Battambang;z-index:4}
body.shownotes #notes{display:block}
body.overview{overflow:auto} body.overview #stage{position:static;transform:none!important;width:auto;height:auto;display:grid;grid-template-columns:repeat(4,320px);gap:14px;padding:20px;justify-content:center}
body.overview .slide{position:relative;visibility:visible;width:1280px;height:720px;transform:scale(.25);transform-origin:0 0;margin:0 -960px -540px 0;cursor:pointer;outline:4px solid transparent}
body.overview .slide.on{outline-color:C2}
@media print{@page{size:1280px 720px;margin:0} html,body{height:auto;overflow:visible;background:#fff}
 #stage{position:static;transform:none!important;width:auto;height:auto} .slide{visibility:visible!important;position:relative;width:1280px;height:720px;page-break-after:always}
 #ui,#bar,#notes{display:none!important}}
"""

JS = """
const S=[...document.querySelectorAll('.slide')],st=document.getElementById('stage'),bar=document.getElementById('bar'),no=document.getElementById('no'),nt=document.getElementById('notes');
let i=Math.max(0,Math.min(S.length-1,(parseInt(location.hash.slice(1))||1)-1));
function fit(){if(document.body.classList.contains('overview'))return;const k=Math.min(innerWidth/1280,innerHeight/720);st.style.transform=`translate(${-640*k}px,${-360*k}px) scale(${k})`;}
const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
async function fitInner(s){await frame();const k=(st.getBoundingClientRect().width/1280)||1;
 for(const w of s.querySelectorAll('.simfit')){w.style.transform='';dispatchEvent(new Event('resize'));await frame();
   const top=(w.getBoundingClientRect().top-s.getBoundingClientRect().top)/k,avail=620-top,h=w.offsetHeight;
   const sc=Math.min(1136/w.offsetWidth,avail/h);w.style.transform=`scale(${sc})`;}
 s.querySelectorAll('.quizfit').forEach(w=>{w.style.transform='';const top=(w.getBoundingClientRect().top-s.getBoundingClientRect().top)/k,avail=650-top,h=w.offsetHeight;
   w.style.transform=h>avail?`scale(${avail/h})`:'';});}
function fitText(s){const b=s.querySelector('.sbody');if(!b||b.querySelector('.simfit,.quizfit'))return;b.style.transform='';b.style.width='';
 const k=(st.getBoundingClientRect().width/1280)||1,sr=s.getBoundingClientRect(),top=(b.getBoundingClientRect().top-sr.top)/k,h=b.scrollHeight;
 if(top+h>650){const sc=Math.max(.55,(650-top)/h);b.style.transformOrigin='top left';b.style.width=(100/sc)+'%';b.style.transform=`scale(${sc})`;
  const h2=b.scrollHeight;if(top+h2*sc>650){const sc2=Math.max(.5,(650-top)/h2);b.style.width=(100/sc2)+'%';b.style.transform=`scale(${sc2})`;}}}
function go(n){i=Math.max(0,Math.min(S.length-1,n));S.forEach((s,j)=>s.classList.toggle('on',j===i));bar.style.width=((i+1)/S.length*100)+'%';
 no.textContent=(i+1)+' / '+S.length;history.replaceState(null,'','#'+(i+1));const a=S[i].querySelector('aside');nt.textContent=a?a.textContent:'';
 setTimeout(()=>{fitInner(S[i]);fitText(S[i]);},30);}
function interactive(e){return e.target.closest('a,button,input,select,textarea,label,canvas,.sim,.rich-quiz,summary,details')}
addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea'))return;
 if(['ArrowRight','PageDown',' '].includes(e.key)){go(i+1);e.preventDefault()} else if(['ArrowLeft','PageUp'].includes(e.key)){go(i-1);e.preventDefault()}
 else if(e.key==='Home')go(0); else if(e.key==='End')go(S.length-1);
 else if(e.key==='f'||e.key==='F'){document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()}
 else if(e.key==='n'||e.key==='N')document.body.classList.toggle('shownotes'); else if(e.key==='p'||e.key==='P')print();
 else if(e.key==='o'||e.key==='O'||e.key==='Escape')toggleOverview();});
function toggleOverview(){document.body.classList.toggle('overview');if(!document.body.classList.contains('overview'))fit();else S[i].scrollIntoView({block:'center'});}
S.forEach((s,j)=>s.addEventListener('click',e=>{if(document.body.classList.contains('overview')){toggleOverview();go(j);}}));
st.addEventListener('click',e=>{if(document.body.classList.contains('overview')||interactive(e))return;const r=st.getBoundingClientRect();go(e.clientX>r.left+r.width/3?i+1:i-1)});
let tx=null;addEventListener('touchstart',e=>{tx=interactive(e)?null:e.touches[0].clientX});addEventListener('touchend',e=>{if(tx===null)return;const d=e.changedTouches[0].clientX-tx;if(Math.abs(d)>60)go(d<0?i+1:i-1);tx=null});
document.getElementById('prev').onclick=()=>go(i-1);document.getElementById('next').onclick=()=>go(i+1);
document.getElementById('fs').onclick=()=>document.documentElement.requestFullscreen();document.getElementById('pn').onclick=()=>document.body.classList.toggle('shownotes');
document.getElementById('ov').onclick=toggleOverview;document.getElementById('pr').onclick=()=>print();
addEventListener('resize',fit);fit();go(i);addEventListener('load',()=>{dispatchEvent(new Event('resize'));setTimeout(()=>fitInner(S[i]),200)});
"""

def render(n, title, slides):
    css = CSS.replace("C1", C1).replace("C2", C2).replace("C3", C3).replace("BG", BG)
    parts = []
    for k, s in enumerate(slides, 1):
        foot = f'<div class="foot"><span>{BOOK_NO} · {BOOK} · មេរៀនទី{kh(n)}</span><span>{kh(k)}</span></div>'
        notes = f"<aside hidden>{html.escape(s['notes'])}</aside>" if s["notes"] else ""
        if s["kind"] == "title":
            parts.append(f'<section class="slide title"><div class="kick">{BOOK_NO} · {BOOK} ({BOOK_EN})</div><h1>{inline(s["title"])}</h1><div class="rule"></div>'
                         f'<div class="meta">{inline(s["cls"])} នៃ ១៥ · ៣ ម៉ោង<br>{AUTHOR}</div>{s["body"]}{foot}</section>')
        elif s["kind"] == "divider":
            parts.append(f'<section class="slide divider"><div class="kick">មេរៀនទី{kh(n)}</div><h2>{inline(s["title"])}</h2>{foot}</section>')
        else:
            parts.append(f'<section class="slide {s["kind"]} {s["cls"]}"><h2>{inline(s["title"])}</h2><div class="sbody">{s["body"]}</div>{notes}{foot}</section>')
    head = "".join(f'<link rel="stylesheet" href="../{c}">' for c in CSS_FILES)
    scripts = "".join(f'<script src="../{j}"></script>' for j in JS_FILES)
    return (f'<!doctype html><html lang="km"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>ស្លាយ · {html.escape(title)}</title>{head}<style>{css}</style></head><body><div id="stage">{"".join(parts)}</div>'
            f'<div id="bar"></div><div id="notes"></div><div id="ui"><button id="prev" title="ថយក្រោយ (←)">◀</button><span id="no"></span>'
            f'<button id="next" title="បន្ទាប់ (→)">▶</button><button id="ov" title="ទិដ្ឋភាពរួម (O)">▦</button><button id="pn" title="កំណត់ចំណាំគ្រូ (N)">N</button>'
            f'<button id="fs" title="ពេញអេក្រង់ (F)">⛶</button><button id="pr" title="បោះពុម្ព / PDF (P)">PDF</button></div>'
            f'{scripts}<script>{JS}</script></body></html>')

def main():
    os.makedirs(OUT, exist_ok=True)
    rows = []
    for n in range(1, 16):
        p = os.path.join(DOCS, "lessons", f"lesson-{n:02d}.md")
        if not os.path.exists(p): continue
        title, slides = deck(n, open(p, encoding="utf-8").read())
        open(os.path.join(OUT, f"lesson-{n:02d}.html"), "w", encoding="utf-8").write(render(n, title, slides))
        sims = sum(1 for s in slides if s["kind"] == "sim")
        rows.append((n, title, len(slides), sims))
        print(f"lesson {n:02d}: {len(slides)} slides · {sims} live simulators")
    idx = ["# ស្លាយបង្រៀន", "",
           "ស្លាយពេញលេញសម្រាប់បង្រៀនមេរៀននីមួយៗ (៣ ម៉ោង)។ ពិសោធន៍អន្តរកម្ម ការប្រៀបធៀបរូបភាព និងសំណួរពិនិត្យខ្លួនឯង ដំណើរការ **ផ្ទាល់ក្នុងស្លាយ** ដោយមិនចាំបាច់បើកគេហទំព័រ ហើយប្រើបានដោយគ្មានអ៊ីនធឺណិត។", "",
           '!!! tip "របៀបប្រើ"',
           "    **→ / Space** ស្លាយបន្ទាប់ · **←** ថយក្រោយ · **O** ទិដ្ឋភាពរួម (ចុចស្លាយណាមួយដើម្បីលោតទៅ) · **F** ពេញអេក្រង់ · **N** កំណត់ចំណាំគ្រូ (អត្ថបទពេញនៃមេរៀន) · **P** បោះពុម្ព ឬរក្សាទុកជា PDF។ ពេលកំពុងប្រើពិសោធន៍ ចុចលើផ្ទៃទទេនៃស្លាយ ឬប៊ូតុង ▶ ដើម្បីបន្ត។", "",
           "| មេរៀន | ចំណងជើង | ស្លាយ | ពិសោធន៍ផ្ទាល់ |", "|---|---|---|---|"]
    for n, t, k, s in rows:
        idx.append(f'| {kh(n)} | <a href="lesson-{n:02d}.html" target="_blank">{t.split("៖", 1)[-1].strip()}</a> | {kh(k)} | {kh(s)} |')
    open(os.path.join(OUT, "index.md"), "w", encoding="utf-8").write("\n".join(idx) + "\n")

if __name__ == "__main__":
    main()
