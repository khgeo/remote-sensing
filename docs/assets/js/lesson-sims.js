/* ============================================================
   Lesson simulators · Fundamentals of GIS (khgeo/gis-fundamentals)
   Usage in a lesson page:  <div class="sim" data-sim="buffer"></div>
   Optional data-src for simulators that load data.
   Canvas-based, no libraries. Works with Material instant navigation.
   ============================================================ */
(function () {
  "use strict";
  const KM = "០១២៣៤៥៦៧៨៩";
  const kh = (n) => String(n).replace(/[0-9]/g, (d) => KM[d]);
  const fmt = (n, d = 0) => kh(Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/,/g, " ").replace(".", ","));
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const SIMS = {};

  /* ---------- shared UI ---------- */
  function shell(el, title, controls, extra = "") {
    el.innerHTML = `<div class="sim-title">${title}</div><div class="sim-controls">${controls}</div>
      <div class="sim-body"><div class="sim-canvas-wrap"><canvas></canvas></div>${extra}</div><div class="sim-out" role="status"></div>`;
    return { q: (s) => el.querySelector(s), qa: (s) => el.querySelectorAll(s), out: el.querySelector(".sim-out") };
  }
  /* Logical W×H canvas scaled to its container; returns ctx and pointer mapper */
  function stage(el, W, H, draw) {
    const cv = el.querySelector("canvas"), ctx = cv.getContext("2d");
    const fit = () => {
      const wrap = cv.parentElement, w = wrap.clientWidth || W, s = w / W, dpr = window.devicePixelRatio || 1;
      cv.style.width = w + "px"; cv.style.height = H * s + "px"; cv.width = w * dpr; cv.height = H * s * dpr;
      ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0); draw();
    };
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
    let t; window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => cv.isConnected && fit(), 120); });
    return { cv, ctx, fit, pt, W, H };
  }
  const bg = (ctx, W, H, c = "#fafafa") => { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); };
  const grid = (ctx, W, H, step, c = "#e6e6e6") => { ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x <= W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } for (let y = 0; y <= H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke(); };
  const dot = (ctx, x, y, r, fill, stroke = "#fff") => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = stroke; ctx.stroke(); };
  const label = (ctx, t, x, y, c = "#212121", size = 13, align = "left") => { ctx.fillStyle = c; ctx.font = `${size}px ${getComputedStyle(document.body).fontFamily}`; ctx.textAlign = align; ctx.fillText(t, x, y); };
  const segInt = (a, b, c, d) => { const o = (p, q, r) => (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
    const o1 = o(a, b, c), o2 = o(a, b, d), o3 = o(c, d, a), o4 = o(c, d, b); return o1 * o2 < 0 && o3 * o4 < 0; };
  const ramp = (t, stops) => { t = clamp(t, 0, 1); const n = stops.length - 1, i = Math.min(n - 1, Math.floor(t * n)), f = t * n - i;
    const a = stops[i], b = stops[i + 1]; return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(",")})`; };
  const VIRIDIS = [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];
  const RDYLGN = [[215, 48, 39], [252, 141, 89], [254, 224, 139], [145, 207, 96], [26, 152, 80]];
  const BLUES = [[247, 251, 255], [198, 219, 239], [107, 174, 214], [33, 113, 181], [8, 48, 107]];

  /* ============ L1 · Layer stack ============ */
  SIMS["layer-stack"] = async (el) => {
    const base = el.dataset.src || "../../assets/data/lab-01/";
    const L = [
      ["communes.geojson", "ឃុំ សង្កាត់", "poly", "#ce93d8", "#6a1b9a"], ["water.geojson", "ទឹក", "poly", "#90caf9", "#1565c0"],
      ["roads.geojson", "ផ្លូវ", "line", null, "#e65100"], ["villages.geojson", "ភូមិ", "pt", "#3949ab"],
      ["schools.geojson", "សាលារៀន", "pt", "#2e7d32"], ["health.geojson", "សុខាភិបាល", "pt", "#e53935"]];
    el.innerHTML = `<div class="sim-title">ស្រទាប់ទិន្នន័យ៖ ក្រុងកំពង់ឆ្នាំង</div>
      <div class="sim-controls"><label>មើលពីលើ <input type="range" class="ls-t" min="0" max="100" value="70"> បំបែកស្រទាប់</label>
      <span class="ls-toggles">${L.map((l, i) => `<label><input type="checkbox" data-i="${i}" checked> ${l[1]}</label>`).join("")}</span></div>
      <div class="ls-stage"><div class="ls-stack">${L.map((l, i) => `<div class="ls-layer" data-i="${i}"><canvas width="600" height="420"></canvas><span class="ls-name">${l[1]}</span></div>`).join("")}</div></div>
      <div class="sim-out">ស្រទាប់នីមួយៗរក្សាទុកវត្ថុប្រភេទតែមួយ។ ពេលដាក់ត្រួតគ្នា ពួកវាបង្កើតជាផែនទីមួយ ដោយសារប្រើ CRS ដូចគ្នា។</div>`;
    const data = await Promise.all(L.map((l) => fetch(new URL(base + l[0], location.href)).then((r) => r.json()).catch(() => null)));
    if (!data[0]) { el.querySelector(".sim-out").textContent = "មិនអាចផ្ទុកទិន្នន័យបានទេ"; return; }
    let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
    const walk = (c, f) => typeof c[0] === "number" ? f(c) : c.forEach((x) => walk(x, f));
    data[0].features.forEach((ft) => walk(ft.geometry.coordinates, ([x, y]) => { mnx = Math.min(mnx, x); mny = Math.min(mny, y); mxx = Math.max(mxx, x); mxy = Math.max(mxy, y); }));
    const k = Math.cos((mny * Math.PI) / 180), s = Math.min(560 / ((mxx - mnx) * k), 380 / (mxy - mny));
    const P = ([x, y]) => [20 + (x - mnx) * k * s, 400 - (y - mny) * s];
    el.querySelectorAll(".ls-layer canvas").forEach((cv, i) => {
      const ctx = cv.getContext("2d"), [, , type, fill, stroke] = L[i];
      ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.fillRect(0, 0, 600, 420); ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.strokeRect(0.5, 0.5, 599, 419);
      (data[i]?.features || []).forEach((ft) => {
        const g = ft.geometry, polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : null;
        if (type === "pt") { const [x, y] = P(g.coordinates); dot(ctx, x, y, 6, fill); }
        else if (polys) { ctx.beginPath(); polys.forEach((p) => p.forEach((r) => r.forEach((c, j) => { const [x, y] = P(c); j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); })));
          ctx.fillStyle = fill + "aa"; ctx.fill("evenodd"); ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
        else { const lines = g.type === "LineString" ? [g.coordinates] : g.coordinates; ctx.beginPath();
          lines.forEach((ln) => ln.forEach((c, j) => { const [x, y] = P(c); j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }));
          ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.stroke(); }
      });
    });
    const stack = el.querySelector(".ls-stack"), layers = el.querySelectorAll(".ls-layer");
    const upd = () => { const t = el.querySelector(".ls-t").value / 100;
      stack.style.transform = `rotateX(${t * 58}deg) rotateZ(${-t * 32}deg)`;
      layers.forEach((d, i) => { d.style.transform = `translateZ(${i * t * 70}px)`; d.classList.toggle("ls-flat", t < 0.05); }); };
    el.querySelector(".ls-t").addEventListener("input", upd);
    el.querySelectorAll(".ls-toggles input").forEach((c) => c.addEventListener("change", () => layers[c.dataset.i].style.opacity = c.checked ? 1 : 0));
    upd();
  };

  /* ============ L1 · Straight vs road distance ============ */
  SIMS["route"] = (el) => {
    const C = 13, R = 8, S = 44, OX = 36, OY = 30, RIVER = 3.5, M = 250;
    const { q, out } = shell(el, "ចម្ងាយត្រង់ ឬ ចម្ងាយតាមផ្លូវ?",
      `<label>ទីតាំងស្ពាន <input type="range" class="rt-b" min="0" max="${C - 1}" value="10"></label><span class="sim-hint">ចុចលើចំណុចប្រសព្វផ្លូវ ដើម្បីផ្លាស់ទីភូមិ</span>`);
    let V = [2, 6];
    const SCH = [{ n: "សាលា ក", p: [3, 1], c: "#2e7d32" }, { n: "សាលា ខ", p: [10, 6], c: "#8e24aa" }];
    const st = stage(el, OX * 2 + S * (C - 1), OY * 2 + S * (R - 1), draw);
    function bfs(from, bridge) {
      const key = (x, y) => y * C + x, dist = new Array(C * R).fill(Infinity), prev = new Array(C * R).fill(-1), Q = [from];
      dist[key(...from)] = 0;
      while (Q.length) { const [x, y] = Q.shift();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= C || ny >= R) continue;
          if (dy && Math.min(y, ny) === 3 && x !== bridge) continue;
          if (dist[key(nx, ny)] > dist[key(x, y)] + 1) { dist[key(nx, ny)] = dist[key(x, y)] + 1; prev[key(nx, ny)] = key(x, y); Q.push([nx, ny]); } } }
      return { dist, prev, key };
    }
    function draw() {
      const { ctx, W, H } = st, b = +q(".rt-b").value, P = ([x, y]) => [OX + x * S, OY + y * S];
      bg(ctx, W, H, "#f5f1e8");
      const ry = OY + RIVER * S; ctx.fillStyle = "#90caf9"; ctx.fillRect(0, ry - 14, W, 28); label(ctx, "ទន្លេ", 8, ry + 5, "#0d47a1", 12);
      ctx.strokeStyle = "#bdbdbd"; ctx.lineWidth = 3; ctx.beginPath();
      for (let y = 0; y < R; y++) { ctx.moveTo(OX, OY + y * S); ctx.lineTo(OX + (C - 1) * S, OY + y * S); }
      for (let x = 0; x < C; x++) { ctx.moveTo(OX + x * S, OY); ctx.lineTo(OX + x * S, OY + 3 * S); ctx.moveTo(OX + x * S, OY + 4 * S); ctx.lineTo(OX + x * S, OY + (R - 1) * S); }
      ctx.stroke(); ctx.strokeStyle = "#6d4c41"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(OX + b * S, OY + 3 * S); ctx.lineTo(OX + b * S, OY + 4 * S); ctx.stroke();
      label(ctx, "ស្ពាន", OX + b * S + 8, ry - 16, "#4e342e", 12);
      const g = bfs(V, b); let rows = "";
      SCH.forEach((sc) => {
        const [x1, y1] = P(V), [x2, y2] = P(sc.p); ctx.setLineDash([6, 5]); ctx.strokeStyle = sc.c; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
        let k = g.key(...sc.p); ctx.strokeStyle = sc.c; ctx.globalAlpha = 0.55; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(...P(sc.p));
        while (g.prev[k] >= 0) { k = g.prev[k]; ctx.lineTo(...P([k % C, Math.floor(k / C)])); } ctx.stroke(); ctx.globalAlpha = 1;
        dot(ctx, x2, y2, 9, sc.c); label(ctx, sc.n, x2 + 12, y2 - 8, sc.c, 13);
        sc.straight = Math.hypot(sc.p[0] - V[0], sc.p[1] - V[1]) * M; sc.road = g.dist[g.key(...sc.p)] * M;
      });
      const [vx, vy] = P(V); dot(ctx, vx, vy, 10, "#e65100"); label(ctx, "ភូមិ", vx + 12, vy + 18, "#bf360c", 13);
      const cs = SCH[0].straight < SCH[1].straight ? 0 : 1, cr = SCH[0].road < SCH[1].road ? 0 : 1;
      rows = SCH.map((sc, i) => `<tr><td style="color:${sc.c}"><b>${sc.n}</b></td><td>${fmt(sc.straight)} ម${i === cs ? " ★" : ""}</td><td>${fmt(sc.road)} ម${i === cr ? " ★" : ""}</td></tr>`).join("");
      out.innerHTML = `<table class="sim-table"><tr><th></th><th>ចម្ងាយត្រង់</th><th>តាមផ្លូវ</th></tr>${rows}</table>` +
        (cs !== cr ? `<b class="sim-warn">សាលាដែល «ជិតជាង» ប្ដូរ អាស្រ័យលើវិធីវាស់!</b>` : "វិធីវាស់ទាំងពីរ យល់ស្របគ្នា។ សាកល្បងរំកិលស្ពាន។");
    }
    q(".rt-b").addEventListener("input", draw);
    st.cv.addEventListener("click", (e) => { const [x, y] = st.pt(e); V = [clamp(Math.round((x - OX) / S), 0, C - 1), clamp(Math.round((y - OY) / S), 0, R - 1)]; draw(); });
    st.fit();
  };

  /* ============ L2 · Vector drawing ============ */
  SIMS["vector-draw"] = (el) => {
    const { q, qa, out } = shell(el, "គូរធរណីមាត្រវ៉ិចទ័រ",
      `<span class="sim-seg"><button type="button" data-m="point" class="on">ចំណុច</button><button type="button" data-m="line">បន្ទាត់</button><button type="button" data-m="polygon">ពហុកោណ</button></span>
       <button type="button" class="sim-btn vd-undo">↶ លុបចំណុចចុងក្រោយ</button><button type="button" class="sim-btn vd-clear">សម្អាត</button>
       <span class="sim-hint">ចុចដើម្បីបន្ថែមចំណុចកំពូល · អូសចំណុចដើម្បីផ្លាស់ទី</span>`,
      `<div class="vd-list"></div>`);
    let mode = "point", pts = [], drag = -1;
    const W = 600, H = 360, st = stage(el, W, H, draw);
    const coord = ([x, y]) => [Math.round(x), Math.round(H - y)];
    function selfX() { if (pts.length < 4) return false; const n = pts.length, segs = [];
      for (let i = 0; i < n - (mode === "polygon" ? 0 : 1); i++) segs.push([pts[i], pts[(i + 1) % n]]);
      for (let i = 0; i < segs.length; i++) for (let j = i + 2; j < segs.length; j++) { if (mode === "polygon" && i === 0 && j === segs.length - 1) continue; if (segInt(...segs[i], ...segs[j])) return [i, j]; }
      return false; }
    function draw() {
      const { ctx } = st; bg(ctx, W, H); grid(ctx, W, H, 30); label(ctx, "ក្រឡានីមួយៗ = ៣០ ម", W - 8, H - 8, "#9e9e9e", 11, "right");
      const bad = mode !== "point" && selfX();
      if (pts.length) {
        if (mode !== "point") { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p));
          if (mode === "polygon" && pts.length > 2) { ctx.closePath(); ctx.fillStyle = bad ? "rgba(229,57,53,.25)" : "rgba(25,118,210,.25)"; ctx.fill("evenodd"); }
          ctx.strokeStyle = bad ? "#e53935" : "#1565c0"; ctx.lineWidth = 2.5; ctx.stroke(); }
        pts.forEach((p, i) => { dot(ctx, p[0], p[1], mode === "point" ? 7 : 5, mode === "point" ? "#e65100" : i === 0 ? "#2e7d32" : "#1565c0"); label(ctx, kh(i + 1), p[0] + 8, p[1] - 6, "#424242", 11); });
      }
      const C = pts.map(coord);
      let len = 0; for (let i = 1; i < C.length; i++) len += Math.hypot(C[i][0] - C[i - 1][0], C[i][1] - C[i - 1][1]);
      let area = 0, per = len; if (mode === "polygon" && C.length > 2) { per += Math.hypot(C[0][0] - C.at(-1)[0], C[0][1] - C.at(-1)[1]);
        for (let i = 0; i < C.length; i++) { const [x1, y1] = C[i], [x2, y2] = C[(i + 1) % C.length]; area += x1 * y2 - x2 * y1; } }
      q(".vd-list").innerHTML = `<b>តារាងកូអរដោនេ (ម)</b><table class="sim-table"><tr><th>#</th><th>X</th><th>Y</th></tr>${
        C.map((c, i) => `<tr><td>${kh(i + 1)}</td><td>${fmt(c[0])}</td><td>${fmt(c[1])}</td></tr>`).join("")}</table>`;
      const need = { point: 1, line: 2, polygon: 3 }[mode];
      let msg = mode === "point" ? `ចំណុច <b>${fmt(pts.length)}</b> វត្ថុ។ ចំណុចមានទីតាំងតែប៉ុណ្ណោះ គ្មានប្រវែង គ្មានផ្ទៃ។`
        : mode === "line" ? `ចំណុចកំពូល <b>${fmt(pts.length)}</b> · ប្រវែង <b>${fmt(len)} ម</b> · ផ្ទៃ៖ គ្មាន`
        : `ចំណុចកំពូល <b>${fmt(pts.length)}</b> · បរិមាត្រ <b>${fmt(per)} ម</b> · ផ្ទៃ <b>${fmt(Math.abs(area) / 2)} ម²</b> (${fmt(Math.abs(area) / 2e4, 2)} ហ.ត) · ទិស៖ ${area > 0 ? "ច្រាសទ្រនិចនាឡិកា" : area < 0 ? "តាមទ្រនិចនាឡិកា" : "–"}`;
      if (mode !== "point" && pts.length && pts.length < need) msg += ` <span class="sim-warn">· ត្រូវការយ៉ាងតិច ${kh(need)} ចំណុច</span>`;
      if (bad) msg += ` <span class="sim-warn">· ⚠ មិនត្រឹមត្រូវ៖ ${mode === "polygon" ? "ពហុកោណកាត់ខ្លួនឯង (Self-intersection) ផ្ទៃដែលគណនាខុស" : "បន្ទាត់កាត់ខ្លួនឯង"}</span>`;
      out.innerHTML = msg;
    }
    qa(".sim-seg button").forEach((b) => b.onclick = () => { qa(".sim-seg button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); mode = b.dataset.m; pts = []; draw(); });
    q(".vd-undo").onclick = () => { pts.pop(); draw(); }; q(".vd-clear").onclick = () => { pts = []; draw(); };
    st.cv.addEventListener("pointerdown", (e) => { const p = st.pt(e); drag = pts.findIndex((v) => Math.hypot(v[0] - p[0], v[1] - p[1]) < 10);
      if (drag < 0) { pts.push(p.map((v) => clamp(v, 0, 600))); draw(); } else st.cv.setPointerCapture(e.pointerId); });
    st.cv.addEventListener("pointermove", (e) => { if (drag >= 0) { const p = st.pt(e); pts[drag] = [clamp(p[0], 0, W), clamp(p[1], 0, H)]; draw(); } });
    st.cv.addEventListener("pointerup", () => drag = -1);
    st.fit();
  };

  /* ============ L3 · Raster resolution & file size ============ */
  SIMS["raster-resolution"] = (el) => {
    const sizes = [5, 10, 30, 60, 100, 250];
    const { q, out } = shell(el, "ទំហំក្រឡា ព័ត៌មាន និងទំហំឯកសារ",
      `<label>ទំហំក្រឡា <b class="rr-s"></b> <input type="range" class="rr-r" min="0" max="${sizes.length - 1}" value="2"></label>
       <label>ប្រភេទទិន្នន័យ <select class="rr-t"><option value="1">Byte (៨ ប៊ីត)</option><option value="2">Int16 (១៦ ប៊ីត)</option><option value="4" selected>Float32 (៣២ ប៊ីត)</option><option value="8">Float64 (៦៤ ប៊ីត)</option></select></label>
       <label>បាន់ <select class="rr-b"><option>1</option><option>3</option><option>4</option><option>13</option></select></label>
       <label>តំបន់ <select class="rr-a"><option value="46.7">ក្រុងកំពង់ឆ្នាំង (៤៧ គម²)</option><option value="5295">ខេត្តកំពង់ឆ្នាំង (៥ ២៩៥ គម²)</option><option value="181035" selected>ប្រទេសកម្ពុជា (១៨១ ០៣៥ គម²)</option></select></label>`);
    const W = 600, H = 300, EXT = 1500; // 1.5 km × 0.75 km landscape
    const f = (x, y) => { const r = 380 + 60 * Math.sin(x / 90) - 0.12 * x; const river = Math.abs(y - r) < 18;
      const hill = 40 * Math.exp(-((x - 1150) ** 2 + (y - 180) ** 2) / 40000) + 12 * Math.sin(x / 60) * Math.cos(y / 70);
      return river ? 0 : y < 120 && x < 500 ? 3 : hill > 18 ? 2 : 1; };
    const COL = ["#1976d2", "#f9a825", "#2e7d32", "#d32f2f"], NAME = ["ទឹក", "ស្រែ", "ព្រៃ", "ភូមិ"];
    const st = stage(el, W, H, draw); let hover = null;
    function draw() {
      const s = sizes[q(".rr-r").value], { ctx } = st, k = W / EXT, nx = Math.ceil(EXT / s), ny = Math.ceil((H / k) / s);
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { ctx.fillStyle = COL[f((i + 0.5) * s, (j + 0.5) * s)]; ctx.fillRect(i * s * k, j * s * k, s * k + 0.6, s * k + 0.6); }
      if (s * k >= 6) { grid(ctx, W, H, s * k, "rgba(255,255,255,.35)"); }
      if (hover) { const i = Math.floor(hover[0] / k / s), j = Math.floor(hover[1] / k / s); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(i * s * k, j * s * k, s * k, s * k);
        hover.info = `ជួរដេក ${kh(j)} · ជួរឈរ ${kh(i)} · តម្លៃ <b>${kh(f((i + .5) * s, (j + .5) * s) + 1)}</b> (${NAME[f((i + .5) * s, (j + .5) * s)]})`; }
      q(".rr-s").textContent = kh(s) + " ម";
      const A = +q(".rr-a").value * 1e6, bytes = +q(".rr-t").value, bands = +q(".rr-b").value, side = Math.sqrt(A) / s, cells = A / (s * s), size = cells * bytes * bands;
      const unit = size > 1e9 ? [size / 1e9, "GB"] : size > 1e6 ? [size / 1e6, "MB"] : [size / 1e3, "KB"];
      out.innerHTML = `${hover?.info ? hover.info + "<br>" : "ដាក់កណ្ដុរលើរ៉ាស្ទ័រ ដើម្បីអានតម្លៃក្រឡា<br>"}
        ក្រឡាមួយ = <b>${fmt(s * s)} ម²</b> · ចំនួនក្រឡា ≈ <b>${fmt(cells)}</b> (ប្រហែល ${fmt(side)} × ${fmt(side)}) · ទំហំឯកសារមិនបង្ហាប់ ≈ <b class="rr-big">${fmt(unit[0], 1)} ${unit[1]}</b>
        <br><span class="sim-hint">កាត់ទំហំក្រឡាពាក់កណ្ដាល → ចំនួនក្រឡា និងទំហំឯកសារកើន ៤ ដង</span>`;
    }
    ["input", "change"].forEach((ev) => el.querySelectorAll("input,select").forEach((c) => c.addEventListener(ev, draw)));
    st.cv.addEventListener("pointermove", (e) => { hover = st.pt(e); draw(); }); st.cv.addEventListener("pointerleave", () => { hover = null; draw(); });
    st.fit();
  };

  /* ============ L4 · Field types ============ */
  SIMS["field-types"] = (el) => {
    const presets = ["020404", "12.75", "1,234", "១២៣", "2008-03-03", "3000000000", "ភូមិ ១"];
    el.innerHTML = `<div class="sim-title">តម្លៃដដែល ប្រភេទវាលខុសគ្នា</div>
      <div class="sim-controls"><label>វាយតម្លៃ <input type="text" class="ft-in sim-input" value="020404"></label>
      <span>${presets.map((p) => `<button type="button" class="sim-chip">${esc(p)}</button>`).join("")}</span></div>
      <div class="ft-out"></div>`;
    const inp = el.querySelector(".ft-in"), box = el.querySelector(".ft-out");
    const run = () => {
      const v = inp.value.trim(), num = /^[+-]?\d+(\.\d+)?$/.test(v), khd = /[០-៩]/.test(v), rows = [];
      rows.push(["Text (String)", `"${esc(v)}"`, "ok", "រក្សាទុកដូចដែលវាយ។ ប៉ុន្តែមិនអាចបូក ឬតម្រៀបតាមលេខបានត្រឹមត្រូវ (\"10\" < \"9\")។"]);
      if (num) { const n = Math.trunc(Number(v)), lost = /^0\d/.test(v), frac = v.includes("."), big = Math.abs(Number(v)) > 2147483647;
        rows.push(["Integer (32 ប៊ីត)", big ? "NULL" : String(n), big || lost || frac ? "warn" : "ok",
          big ? "លើសពី ២ ១៤៧ ៤៨៣ ៦៤៧ (ដែនកំណត់ Integer)។ ត្រូវប្រើ Integer64។" : lost ? "លេខ ០ ខាងមុខបាត់! លេខកូដ 020404 ក្លាយជា 20404 ហើយភ្ជាប់តារាងមិនបាន។" : frac ? "ផ្នែកទសភាគបាត់។" : "ត្រឹមត្រូវ។"]);
        rows.push(["Decimal (Real)", String(Number(v)), lost ? "warn" : "ok", lost ? "លេខ ០ ខាងមុខបាត់ដូចគ្នា។ លេខកូដមិនមែនជាលេខសម្រាប់គណនាទេ។" : "ល្អសម្រាប់ផ្ទៃ ចម្ងាយ ភាគរយ។"]); }
      else { const why = khd ? "លេខខ្មែរមិនត្រូវបានស្គាល់ជាលេខក្នុងកម្មវិធីភាគច្រើនទេ។ ត្រូវវាយជាលេខអារ៉ាប់។" : v.includes(",") ? "សញ្ញាក្បៀសបំបែកខ្ទង់ ធ្វើឲ្យមិនអាចបម្លែងជាលេខ។" : "មិនមែនជាលេខ។";
        rows.push(["Integer (32 ប៊ីត)", "NULL", "bad", why]); rows.push(["Decimal (Real)", "NULL", "bad", why]); }
      const d = /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
      rows.push(["Date", d ? v : "NULL", d ? "ok" : "bad", d ? "ទម្រង់ ISO (YYYY-MM-DD) ត្រឹមត្រូវ អាចគណនាចំនួនថ្ងៃបាន។" : "Date ត្រូវការទម្រង់ YYYY-MM-DD។"]);
      box.innerHTML = `<table class="sim-table ft-table"><tr><th>ប្រភេទវាល</th><th>តម្លៃដែលរក្សាទុក</th><th>កំណត់សម្គាល់</th></tr>${
        rows.map(([t, s, c, n]) => `<tr class="ft-${c}"><td>${t}</td><td><code>${s}</code></td><td>${n}</td></tr>`).join("")}</table>`;
    };
    inp.addEventListener("input", run); el.querySelectorAll(".sim-chip").forEach((b) => b.onclick = () => { inp.value = b.textContent; run(); }); run();
  };

  /* ============ L5 · Table join ============ */
  SIMS["join"] = (el) => {
    const left = [["KH040301", "ផ្សារឆ្នាំង", "Phsar Chhnang"], ["KH040302", "កំពង់ឆ្នាំង", "Kampong Chhnang"], ["KH040303", "ប្អេរ", "B'er"], ["KH040304", "ខ្សាម", "Khsam"], ["KH130307", "ស្រអែម", "Sror Aem"]];
    const right = [["040301", "Phsar Chhnang", 20226], ["040302", "Kampong Chhnang", 10236], ["040303", "Ph'er", 6543], ["040304", "Khsam", 6125], ["030911", "Trea", 7824]];
    el.innerHTML = `<div class="sim-title">ភ្ជាប់តារាងព្រំឃុំ (២០១៩) ជាមួយជំរឿន (២០០៨)</div>
      <div class="sim-controls"><label>វាលភ្ជាប់ <select class="jn-k">
        <option value="raw">CommGis = COMM_CODE</option><option value="expr">CommGis = 'KH' || COMM_CODE</option><option value="name">COM_NAME = COMM_NAME</option></select></label>
      <label><input type="checkbox" class="jn-keep" checked> រក្សាកំណត់ត្រាដែលគ្មានដៃគូ</label></div>
      <div class="jn-grid"><div><b>ស្រទាប់ឃុំ</b><table class="sim-table">${"<tr><th>CommGis</th><th>COM_NAME</th></tr>" + left.map((r) => `<tr><td><code>${r[0]}</code></td><td>${r[2]}</td></tr>`).join("")}</table></div>
      <div><b>តារាងជំរឿន</b><table class="sim-table">${"<tr><th>COMM_CODE</th><th>COMM_NAME</th><th>TOTPOP</th></tr>" + right.map((r) => `<tr><td><code>${r[0]}</code></td><td>${r[1]}</td><td>${fmt(r[2])}</td></tr>`).join("")}</table></div></div>
      <div class="jn-res"></div>`;
    const run = () => {
      const k = el.querySelector(".jn-k").value, keep = el.querySelector(".jn-keep").checked;
      const key = (r) => k === "raw" ? r[0] : k === "expr" ? "KH" + r[0] : r[1];
      const lkey = (l) => k === "name" ? l[2] : l[0];
      let m = 0; const rows = left.map((l) => { const r = right.find((x) => key(x) === lkey(l)); if (r) m++; return [l, r]; }).filter(([, r]) => keep || r);
      const unR = right.filter((r) => !left.some((l) => key(r) === lkey(l)));
      el.querySelector(".jn-res").innerHTML = `<b>លទ្ធផល</b> · ត្រូវគ្នា <b>${kh(m)}</b> / ${kh(left.length)}
        <table class="sim-table"><tr><th>CommGis</th><th>COM_NAME</th><th>TOTPOP</th></tr>${rows.map(([l, r]) =>
          `<tr class="${r ? "ft-ok" : "ft-bad"}"><td><code>${l[0]}</code></td><td>${l[2]}</td><td>${r ? fmt(r[2]) : "NULL"}</td></tr>`).join("")}</table>
        <div class="sim-hint">${k === "raw" ? "គ្មានកំណត់ត្រាណាត្រូវគ្នាទេ៖ `KH040301` ≠ `040301`។ ទម្រង់លេខកូដត្រូវដូចគ្នាទាំងស្រុង។"
          : k === "name" ? "ភ្ជាប់តាមឈ្មោះមានហានិភ័យ៖ B'er និង Ph'er គឺជាឃុំតែមួយ ប៉ុន្តែអក្ខរាវិរុទ្ធខុសគ្នា។ ឈ្មោះក៏អាចស្ទួនគ្នាក្នុងខេត្តផ្សេងៗ។"
          : "ល្អបំផុត! នៅសល់ Sror Aem (បង្កើតក្រោយឆ្នាំ ២០០៨) និងក្នុងជំរឿនមាន Trea ដែលឥឡូវនៅខេត្តត្បូងឃ្មុំ មានលេខកូដថ្មី។"}
          ${unR.length ? ` · កំណត់ត្រាជំរឿនដែលគ្មានដៃគូ៖ ${unR.map((r) => r[1]).join(", ")}` : ""}</div>`;
    };
    el.querySelectorAll("select,input").forEach((c) => c.addEventListener("change", run)); run();
  };

  /* ============ L6 · GPS accuracy ============ */
  SIMS["gps"] = (el) => {
    const { q, out } = shell(el, "ការវាស់ទីតាំងដោយ GPS",
      `<label>ឧបករណ៍ <select class="gp-d"><option value="8">ទូរស័ព្ទ (±៨ ម)</option><option value="3" selected>GPS ដៃ (±៣ ម)</option><option value="0.6">GNSS ពីរហ្វ្រេកង់ (±០,៦ ម)</option></select></label>
       <label>ចំនួនការវាស់ <b class="gp-nv"></b> <input type="range" class="gp-n" min="1" max="60" value="10"></label>
       <label><input type="checkbox" class="gp-mp"> នៅជិតអគារខ្ពស់ (multipath)</label>
       <button type="button" class="sim-btn gp-go">វាស់ម្ដងទៀត</button>`);
    const W = 600, H = 360, PX = 12; let pts = [];
    const st = stage(el, W, H, draw);
    const gen = () => { pts = Array.from({ length: 60 }, () => [rnd(), rnd()]); draw(); };
    function draw() {
      const { ctx } = st, sd = +q(".gp-d").value / 1.18, n = +q(".gp-n").value, mp = q(".gp-mp").checked, cx = W / 2, cy = H / 2;
      bg(ctx, W, H, "#eef3e8"); grid(ctx, W, H, PX * 5, "#dde5d5"); label(ctx, "ក្រឡានីមួយៗ = ៥ ម", W - 8, H - 8, "#8a9a7a", 11, "right");
      ctx.fillStyle = "#bcaaa4"; ctx.fillRect(cx - 18, cy - 14, 36, 28); label(ctx, "ផ្ទះ", cx, cy + 5, "#4e342e", 12, "center");
      if (mp) { ctx.fillStyle = "#90a4ae"; ctx.fillRect(cx + 110, cy - 150, 70, 300); label(ctx, "អគារខ្ពស់", cx + 145, cy + 170, "#37474f", 12, "center"); }
      const use = pts.slice(0, n).map(([a, b]) => [a * sd + (mp ? -4.5 : 0), b * sd + (mp ? 1.5 : 0)]);
      let mx = 0, my = 0, e1 = 0; use.forEach(([x, y]) => { mx += x / n; my += y / n; e1 += Math.hypot(x, y) / n; });
      use.forEach(([x, y]) => dot(ctx, cx + x * PX, cy - y * PX, 4, "rgba(25,118,210,.75)", "rgba(255,255,255,.6)"));
      ctx.strokeStyle = "#c62828"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, sd * 1.18 * PX, 0, 7); ctx.setLineDash([5, 4]); ctx.strokeStyle = "rgba(25,118,210,.6)"; ctx.stroke(); ctx.setLineDash([]);
      dot(ctx, cx + mx * PX, cy - my * PX, 8, "#ff6f00");
      q(".gp-nv").textContent = kh(n);
      out.innerHTML = `✚ ពណ៌ក្រហម = ទីតាំងពិត · ● ពណ៌ទឹកក្រូច = មធ្យមនៃការវាស់ <b>${kh(n)}</b> ដង<br>
        កំហុសមធ្យមនៃការវាស់មួយដង៖ <b>${fmt(e1, 1)} ម</b> · កំហុសនៃទីតាំងមធ្យម៖ <b>${fmt(Math.hypot(mx, my), 1)} ម</b>` +
        (mp ? `<br><span class="sim-warn">សញ្ញាឆ្លុះពីអគារ បង្កើតកំហុសលម្អៀង (bias)។ ការវាស់ច្រើនដងមិនអាចលុបកំហុសប្រភេទនេះបានទេ។</span>` : `<br><span class="sim-hint">កំហុសចៃដន្យ (random) ថយចុះពេលយកមធ្យមនៃការវាស់ច្រើនដង។</span>`);
    }
    el.querySelectorAll("input,select").forEach((c) => c.addEventListener("input", draw)); q(".gp-go").onclick = gen; gen(); st.fit();
  };

  /* ============ L7 · Georeferencing ============ */
  SIMS["georef"] = (el) => {
    const TRUE = [[480000, 1271000], [482400, 1271200], [484600, 1270900], [480300, 1269300], [482300, 1269100], [484500, 1269400], [480200, 1267200], [482600, 1267000], [484400, 1267300]];
    const toImg = ([X, Y], i = -1) => { const x = (X - 479800) / 12, y = (1271300 - Y) / 12, a = 0.05;
      let u = 60 + x * Math.cos(a) - y * Math.sin(a) + 0.000004 * x * x, v = 25 + x * Math.sin(a) + y * Math.cos(a) + 0.000003 * y * y;
      if (i === 4) { u += 4; v -= 3; } return [u + ((i * 37) % 5 - 2) * 0.15, v + ((i * 53) % 5 - 2) * 0.15]; };
    const IMG = TRUE.map(toImg);
    el.innerHTML = `<div class="sim-title">ចំណុចបញ្ជា (GCP) និងកំហុស RMS</div>
      <div class="sim-controls"><label>ការបំប្លែង <select class="gr-t"><option value="1">Affine / Polynomial ១ (≥ ៣ GCP)</option><option value="2">Polynomial ២ (≥ ៦ GCP)</option></select></label>
      <span class="sim-hint">ធីក GCP ដែលប្រើ។ GCP ដែលមិនធីក ក្លាយជាចំណុចពិនិត្យ (check point)។</span></div>
      <div class="sim-body"><div class="sim-canvas-wrap"><canvas></canvas></div><div class="gr-tab"></div></div><div class="sim-out" role="status"></div>`;
    const use = TRUE.map((_, i) => i !== 8);
    const W = 600, H = 420, st = stage(el, W, H, draw);
    const terms = (u, v, o) => o === 1 ? [1, u, v] : [1, u, v, u * u, u * v, v * v];
    function solve(A, b) { const n = A[0].length, M = Array.from({ length: n }, (_, i) => { const r = new Array(n + 1).fill(0);
        A.forEach((row, k) => { for (let j = 0; j < n; j++) r[j] += row[i] * row[j]; r[n] += row[i] * b[k]; }); return r; });
      for (let i = 0; i < n; i++) { let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r; [M[i], M[p]] = [M[p], M[i]];
        if (Math.abs(M[i][i]) < 1e-12) return null; for (let r = 0; r < n; r++) if (r !== i) { const f = M[r][i] / M[i][i]; for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c]; } }
      return M.map((r, i) => r[n] / r[i]); }
    function draw() {
      const o = +el.querySelector(".gr-t").value, need = o === 1 ? 3 : 6, idx = use.map((u, i) => u ? i : -1).filter((i) => i >= 0), { ctx } = st;
      bg(ctx, W, H, "#f3ecd9"); ctx.save(); ctx.translate(0, 0);
      // paper map
      ctx.strokeStyle = "#b9a67a"; ctx.lineWidth = 1; for (let i = 0; i < 9; i++) { const a = toImg([480000 + i * 600, 1271200]), b = toImg([480000 + i * 600, 1266800]); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); }
      for (let j = 0; j < 9; j++) { const a = toImg([479800, 1271200 - j * 550]), b = toImg([484900, 1271200 - j * 550]); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); }
      let fit = null; if (idx.length >= need) { const A = idx.map((i) => terms(...IMG[i], o)); const cx = solve(A, idx.map((i) => TRUE[i][0])), cy = solve(A, idx.map((i) => TRUE[i][1])); if (cx && cy) fit = { cx, cy }; }
      const pred = (i) => { const t = terms(...IMG[i], o); return [t.reduce((s, v, k) => s + v * fit.cx[k], 0), t.reduce((s, v, k) => s + v * fit.cy[k], 0)]; };
      let ss = 0, cs = 0, cn = 0; const res = TRUE.map((T, i) => { if (!fit) return null; const [X, Y] = pred(i), e = Math.hypot(X - T[0], Y - T[1]);
        if (use[i]) ss += e * e; else { cs += e * e; cn++; } return { e, dx: X - T[0], dy: Y - T[1] }; });
      TRUE.forEach((T, i) => { const [u, v] = IMG[i];
        if (res[i]) { ctx.strokeStyle = use[i] ? "#c62828" : "#6a1b9a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(u, v); ctx.lineTo(u + res[i].dx / 12 * 15, v - res[i].dy / 12 * 15); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(u - 7, v); ctx.lineTo(u + 7, v); ctx.moveTo(u, v - 7); ctx.lineTo(u, v + 7); ctx.strokeStyle = use[i] ? "#1565c0" : "#9e9e9e"; ctx.lineWidth = 2.5; ctx.stroke();
        label(ctx, "GCP " + kh(i + 1), u + 8, v - 8, use[i] ? "#0d47a1" : "#757575", 12); });
      ctx.restore(); label(ctx, "ព្រួញ = កំហុសសំណល់ (ពង្រីក ១៥ ដង)", 10, H - 10, "#6d4c41", 12);
      el.querySelector(".gr-tab").innerHTML = `<table class="sim-table"><tr><th></th><th>GCP</th><th>កំហុស (ម)</th></tr>${TRUE.map((_, i) =>
        `<tr class="${res[i] && res[i].e > 30 ? "ft-bad" : ""}"><td><input type="checkbox" data-i="${i}" ${use[i] ? "checked" : ""}></td><td>${kh(i + 1)}${use[i] ? "" : " (ពិនិត្យ)"}</td><td>${res[i] ? fmt(res[i].e, 1) : "–"}</td></tr>`).join("")}</table>`;
      el.querySelectorAll(".gr-tab input").forEach((c) => c.onchange = () => { use[c.dataset.i] = c.checked; draw(); });
      const dof = idx.length - need;
      el.querySelector(".sim-out").innerHTML = !fit ? `<span class="sim-warn">ត្រូវការ GCP យ៉ាងតិច ${kh(need)}</span>` :
        `RMS error (GCP ${kh(idx.length)}): <b>${fmt(Math.sqrt(ss / idx.length), 1)} ម</b>` + (cn ? ` · កំហុសលើចំណុចពិនិត្យ ${kh(cn)}: <b>${fmt(Math.sqrt(cs / cn), 1)} ម</b>` : "") +
        (dof === 0 ? `<br><span class="sim-warn">GCP ស្មើចំនួនអប្បបរមា៖ RMS = ០ ជានិច្ច ប៉ុន្តែមិនមានន័យថាត្រឹមត្រូវទេ។ មើលកំហុសលើចំណុចពិនិត្យ។</span>` : "");
    }
    el.querySelector(".gr-t").onchange = draw; st.fit();
  };

  /* ============ L7 · Line simplification ============ */
  SIMS["simplify"] = (el) => {
    const { q, out } = shell(el, "ចំនួនចំណុចកំពូល និងការសម្រួលបន្ទាត់ (Douglas–Peucker)",
      `<label>កម្រិតអត់ធ្មត់ <b class="sp-v"></b> <input type="range" class="sp-t" min="0" max="60" value="0"></label>`);
    const W = 600, H = 300, orig = []; for (let i = 0; i <= 480; i++) { const x = 20 + i * 1.17; orig.push([x, 150 + 70 * Math.sin(x / 60) + 22 * Math.sin(x / 13) + 8 * Math.sin(x / 4.3)]); }
    const dp = (P, eps) => { if (P.length < 3) return P; const [a, b] = [P[0], P.at(-1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]); let dmax = 0, k = 0;
      for (let i = 1; i < P.length - 1; i++) { const d = Math.abs((b[1] - a[1]) * P[i][0] - (b[0] - a[0]) * P[i][1] + b[0] * a[1] - b[1] * a[0]) / L; if (d > dmax) { dmax = d; k = i; } }
      return dmax > eps ? dp(P.slice(0, k + 1), eps).slice(0, -1).concat(dp(P.slice(k), eps)) : [a, b]; };
    const len = (P) => P.reduce((s, p, i) => i ? s + Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]) : 0, 0);
    const st = stage(el, W, H, draw);
    function draw() {
      const t = +q(".sp-t").value / 2, S = dp(orig, t), { ctx } = st; bg(ctx, W, H, "#f1f8fb");
      const line = (P, c, w) => { ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke(); };
      line(orig, "rgba(100,181,246,.55)", 6); line(S, "#0d47a1", 2); S.forEach((p) => dot(ctx, p[0], p[1], 2.8, "#e65100", "#fff"));
      q(".sp-v").textContent = fmt(t * 2.5, 1) + " ម";
      out.innerHTML = `ចំណុចកំពូល៖ <b>${fmt(S.length)}</b> / ${fmt(orig.length)} (${fmt(100 * S.length / orig.length, 1)}%) · ប្រវែង៖ <b>${fmt(len(S) * 2.5)} ម</b> / ${fmt(len(orig) * 2.5)} ម (${fmt(100 * len(S) / len(orig), 1)}%)
        <br><span class="sim-hint">ចំណុចតិច = ឯកសារតូច គូរលឿន ប៉ុន្តែស្ទឹងខ្លីជាងពិត ហើយកោងតូចៗបាត់។</span>`;
    }
    q(".sp-t").addEventListener("input", draw); st.fit();
  };

  /* ============ L8 · Accuracy vs precision ============ */
  SIMS["accuracy"] = (el) => {
    const { q, out } = shell(el, "ភាពត្រឹមត្រូវ (Accuracy) និងភាពជាក់លាក់ (Precision)",
      `<label>លម្អៀង (bias) <input type="range" class="ac-b" min="0" max="100" value="0"></label>
       <label>ការរាយប៉ាយ (spread) <input type="range" class="ac-s" min="3" max="60" value="12"></label>
       <span>${[["ត្រឹមត្រូវ + ជាក់លាក់", 0, 8], ["ជាក់លាក់ មិនត្រឹមត្រូវ", 80, 8], ["ត្រឹមត្រូវ មិនជាក់លាក់", 0, 50], ["មិនទាំងពីរ", 80, 50]]
        .map(([n, b, s]) => `<button type="button" class="sim-chip" data-b="${b}" data-s="${s}">${n}</button>`).join("")}</span>`);
    const W = 600, H = 320; let pts = Array.from({ length: 25 }, () => [rnd(), rnd()]);
    const st = stage(el, W, H, draw);
    function draw() {
      const { ctx } = st, b = +q(".ac-b").value, s = +q(".ac-s").value, cx = W / 2, cy = H / 2; bg(ctx, W, H);
      [140, 105, 70, 35].forEach((r, i) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fillStyle = i % 2 ? "#fff" : "#ffebee"; ctx.fill(); ctx.strokeStyle = "#e57373"; ctx.stroke(); });
      dot(ctx, cx, cy, 5, "#c62828");
      const P = pts.map(([x, y]) => [cx + b * 0.9 + x * s, cy - b * 0.5 + y * s]); P.forEach((p) => dot(ctx, p[0], p[1], 4.5, "#1565c0"));
      const mx = P.reduce((a, p) => a + p[0], 0) / P.length, my = P.reduce((a, p) => a + p[1], 0) / P.length;
      const sd = Math.sqrt(P.reduce((a, p) => a + (p[0] - mx) ** 2 + (p[1] - my) ** 2, 0) / P.length), off = Math.hypot(mx - cx, my - cy);
      ctx.strokeStyle = "#ff6f00"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx - 9, my - 9); ctx.lineTo(mx + 9, my + 9); ctx.moveTo(mx + 9, my - 9); ctx.lineTo(mx - 9, my + 9); ctx.stroke();
      const acc = off < 20, pre = sd < 25;
      out.innerHTML = `ចម្ងាយពីមធ្យមទៅចំណុចកណ្ដាល (accuracy)៖ <b>${fmt(off / 3.5, 1)} ម</b> → ${acc ? "✓ ត្រឹមត្រូវ" : "✗ មិនត្រឹមត្រូវ"} · ការរាយប៉ាយ (precision)៖ <b>${fmt(sd / 3.5, 1)} ម</b> → ${pre ? "✓ ជាក់លាក់" : "✗ មិនជាក់លាក់"}
        <br><span class="sim-hint">${!acc && pre ? "គ្រោះថ្នាក់បំផុត៖ លទ្ធផលមើលទៅស្របគ្នា ធ្វើឲ្យជឿថាត្រឹមត្រូវ ប៉ុន្តែខុសទាំងអស់ដូចគ្នា (ឧ. CRS ខុស ឬ datum ខុស)។" : "ភាពជាក់លាក់មិនធានាភាពត្រឹមត្រូវទេ។"}</span>`;
    }
    el.querySelectorAll("input").forEach((c) => c.addEventListener("input", draw));
    el.querySelectorAll(".sim-chip").forEach((c) => c.onclick = () => { q(".ac-b").value = c.dataset.b; q(".ac-s").value = c.dataset.s; pts = pts.map(() => [rnd(), rnd()]); draw(); });
    st.fit();
  };

  /* ============ L9 · Spatial predicates ============ */
  SIMS["predicates"] = (el) => {
    const { q, out } = shell(el, "ទំនាក់ទំនងលំហ (Spatial predicates)",
      `<span class="sim-hint">អូសប្រអប់ A (ខៀវ) ឬ B (ទឹកក្រូច)។ ទីតាំងចាប់ជាប់ក្រឡា ដើម្បីងាយធ្វើឲ្យប៉ះគ្នា។</span>
       <span>${[["ប៉ះគ្នា", [180, 110, 120, 100], [300, 140, 140, 90]], ["នៅក្នុង", [240, 130, 80, 60], [180, 90, 220, 170]], ["ត្រួតគ្នា", [150, 100, 160, 120], [250, 150, 160, 120]], ["ដាច់ពីគ្នា", [80, 80, 120, 100], [380, 170, 140, 90]]]
        .map(([n, a, b]) => `<button type="button" class="sim-chip" data-a="${a}" data-b="${b}">${n}</button>`).join("")}</span>`);
    const W = 600, H = 320, G = 10; const R = { A: [150, 100, 160, 120], B: [250, 150, 160, 120] }; let drag = null;
    const st = stage(el, W, H, draw);
    const rel = (a, b) => { const ow = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]), oh = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
      const inter = ow > 0 && oh > 0, closed = ow >= 0 && oh >= 0, within = a[0] >= b[0] && a[1] >= b[1] && a[0] + a[2] <= b[0] + b[2] && a[1] + a[3] <= b[1] + b[3];
      const contains = b[0] >= a[0] && b[1] >= a[1] && b[0] + b[2] <= a[0] + a[2] && b[1] + b[3] <= a[1] + a[3], equals = a.every((v, i) => v === b[i]);
      return { intersects: closed, disjoint: !closed, touches: closed && !inter, within, contains, equals, overlaps: inter && !within && !contains }; };
    function draw() {
      const { ctx } = st; bg(ctx, W, H); grid(ctx, W, H, G * 2);
      [["A", "rgba(25,118,210,.35)", "#1565c0"], ["B", "rgba(245,124,0,.35)", "#e65100"]].forEach(([k, f, s]) => { const r = R[k]; ctx.fillStyle = f; ctx.fillRect(...r); ctx.strokeStyle = s; ctx.lineWidth = 2.5; ctx.strokeRect(...r); label(ctx, k, r[0] + 8, r[1] + 20, s, 16); });
      const t = rel(R.A, R.B), N = [["intersects", "ប្រសព្វ"], ["disjoint", "ដាច់ពីគ្នា"], ["touches", "ប៉ះគ្នា"], ["overlaps", "ត្រួតគ្នា"], ["within", "A នៅក្នុង B"], ["contains", "A ផ្ទុក B"], ["equals", "ស្មើគ្នា"]];
      out.innerHTML = `<div class="pr-grid">${N.map(([k, n]) => `<span class="pr ${t[k] ? "pr-on" : ""}"><code>${k}</code> ${n} ${t[k] ? "✓" : "✗"}</span>`).join("")}</div>
        <span class="sim-hint">សង្កេត៖ «ប៉ះគ្នា» ក៏ជា «ប្រសព្វ» ដែរ។ ដូច្នេះ Select by Location ជាមួយ intersect នឹងជ្រើសឃុំជិតខាងដែលគ្រាន់តែប៉ះព្រំដែនផងដែរ។</span>`;
    }
    st.cv.addEventListener("pointerdown", (e) => { const [x, y] = st.pt(e); drag = ["B", "A"].find((k) => { const r = R[k]; return x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]; });
      if (drag) { drag = { k: drag, dx: x - R[drag][0], dy: y - R[drag][1] }; st.cv.setPointerCapture(e.pointerId); } });
    st.cv.addEventListener("pointermove", (e) => { if (!drag) return; const [x, y] = st.pt(e), r = R[drag.k];
      r[0] = clamp(Math.round((x - drag.dx) / G) * G, 0, W - r[2]); r[1] = clamp(Math.round((y - drag.dy) / G) * G, 0, H - r[3]); draw(); });
    st.cv.addEventListener("pointerup", () => drag = null);
    el.querySelectorAll(".sim-chip").forEach((c) => c.onclick = () => { R.A = c.dataset.a.split(",").map(Number); R.B = c.dataset.b.split(",").map(Number); draw(); });
    st.fit();
  };

  /* ============ L10 · Buffer playground ============ */
  SIMS["buffer"] = (el) => {
    const { q, qa, out } = shell(el, "សួនពិសោធន៍បាហ្វ័រ",
      `<span class="sim-seg"><button type="button" data-m="pt" class="on">ដាក់ចំណុច</button><button type="button" data-m="ln">គូរបន្ទាត់ (ចុច ២ ដង)</button></span>
       <label>ចម្ងាយ <b class="bf-dv"></b> <input type="range" class="bf-d" min="10" max="90" value="45"></label>
       <label>Segments <b class="bf-sv"></b> <input type="range" class="bf-s" min="1" max="16" value="5"></label>
       <label><input type="checkbox" class="bf-dis"> Dissolve</label><button type="button" class="sim-btn bf-clr">សម្អាត</button>`);
    const W = 600, H = 340, SCALE = 5; let mode = "pt", tmp = null;
    let F = [{ t: "pt", p: [200, 170] }, { t: "pt", p: [270, 150] }, { t: "ln", p: [[360, 80], [520, 250]] }];
    const st = stage(el, W, H, draw), off = document.createElement("canvas"); off.width = W; off.height = H;
    const ringPt = ([x, y], r, n) => Array.from({ length: 4 * n }, (_, i) => [x + r * Math.cos((i * Math.PI) / (2 * n)), y + r * Math.sin((i * Math.PI) / (2 * n))]);
    const ringLn = ([a, b], r, n) => { const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), P = [];
      for (let i = 0; i <= 2 * n; i++) { const t = ang + Math.PI / 2 + (i * Math.PI) / (2 * n); P.push([a[0] + r * Math.cos(t), a[1] + r * Math.sin(t)]); }
      for (let i = 0; i <= 2 * n; i++) { const t = ang - Math.PI / 2 + (i * Math.PI) / (2 * n); P.push([b[0] + r * Math.cos(t), b[1] + r * Math.sin(t)]); } return P; };
    const polyArea = (P) => Math.abs(P.reduce((s, p, i) => { const q2 = P[(i + 1) % P.length]; return s + p[0] * q2[1] - q2[0] * p[1]; }, 0)) / 2;
    function draw() {
      const { ctx } = st, r = +q(".bf-d").value, n = +q(".bf-s").value, dis = q(".bf-dis").checked;
      bg(ctx, W, H); grid(ctx, W, H, 20); q(".bf-dv").textContent = kh(r * SCALE) + " ម"; q(".bf-sv").textContent = kh(n);
      const rings = F.map((f) => f.t === "pt" ? ringPt(f.p, r, n) : ringLn(f.p, r, n));
      const path = (c, P) => { c.beginPath(); P.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.closePath(); };
      const oc = off.getContext("2d"); oc.clearRect(0, 0, W, H); oc.fillStyle = "#000"; rings.forEach((P) => { path(oc, P); oc.fill(); });
      const img = oc.getImageData(0, 0, W, H).data; let px = 0; for (let i = 3; i < img.length; i += 4) if (img[i] > 127) px++;
      if (dis) { const tint = document.createElement("canvas"); tint.width = W; tint.height = H; const tc = tint.getContext("2d");
        tc.drawImage(off, 0, 0); tc.globalCompositeOperation = "source-in"; tc.fillStyle = "rgba(255,152,0,.45)"; tc.fillRect(0, 0, W, H); ctx.drawImage(tint, 0, 0, W, H); }
      else rings.forEach((P) => { path(ctx, P); ctx.fillStyle = "rgba(255,152,0,.3)"; ctx.fill(); ctx.strokeStyle = "#e65100"; ctx.lineWidth = 1.5; ctx.stroke(); });
      if (n <= 3) F.filter((f) => f.t === "pt").forEach((f) => { ctx.beginPath(); ctx.arc(...f.p, r, 0, 7); ctx.setLineDash([3, 3]); ctx.strokeStyle = "#616161"; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]); });
      F.forEach((f) => f.t === "pt" ? dot(ctx, ...f.p, 5, "#c62828") : (ctx.beginPath(), ctx.moveTo(...f.p[0]), ctx.lineTo(...f.p[1]), ctx.strokeStyle = "#5d4037", ctx.lineWidth = 4, ctx.stroke()));
      if (tmp) dot(ctx, ...tmp, 5, "#5d4037");
      const sum = rings.reduce((s, P) => s + polyArea(P), 0) * SCALE * SCALE / 1e4, uni = px * SCALE * SCALE / 1e4, circ = Math.PI * r * r * SCALE * SCALE / 1e4, poly = polyArea(ringPt([0, 0], r, n)) * SCALE * SCALE / 1e4;
      out.innerHTML = `វត្ថុលទ្ធផល៖ <b>${kh(dis ? 1 : F.length)}</b> · ផ្ទៃបូករួម (មិន dissolve)៖ <b>${fmt(sum, 1)} ហ.ត</b> · ផ្ទៃពិតបន្ទាប់ពី dissolve៖ <b>${fmt(uni, 1)} ហ.ត</b>` +
        (sum - uni > 0.5 ? ` <span class="sim-warn">(រាប់ស្ទួន ${fmt(sum - uni, 1)} ហ.ត)</span>` : "") +
        `<br>បាហ្វ័រចំណុចមួយ៖ ពហុកោណ ${kh(4 * n)} ជ្រុង = ${fmt(poly, 2)} ហ.ត ធៀបនឹងរង្វង់ពិត ${fmt(circ, 2)} ហ.ត (<b>${fmt(100 * (poly - circ) / circ, 1)}%</b>)`;
    }
    qa(".sim-seg button").forEach((b) => b.onclick = () => { qa(".sim-seg button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); mode = b.dataset.m; tmp = null; });
    st.cv.addEventListener("click", (e) => { const p = st.pt(e); if (mode === "pt") F.push({ t: "pt", p }); else if (!tmp) tmp = p; else { F.push({ t: "ln", p: [tmp, p] }); tmp = null; } draw(); });
    el.querySelectorAll("input").forEach((c) => c.addEventListener("input", draw)); q(".bf-clr").onclick = () => { F = []; tmp = null; draw(); };
    st.fit();
  };

  /* ============ L11 · Overlay operations ============ */
  SIMS["overlay"] = (el) => {
    const OPS = [["intersection", "Intersection"], ["union", "Union"], ["difference", "Difference (A − B)"], ["symdiff", "Symmetrical difference"], ["clip", "Clip (A ដោយ B)"]];
    const { q, qa, out } = shell(el, "ប្រតិបត្តិការត្រួតស្រទាប់",
      `<span class="sim-seg">${OPS.map(([k, n], i) => `<button type="button" data-o="${k}" class="${i ? "" : "on"}">${n}</button>`).join("")}</span>
       <span class="sim-hint">អូសពហុកោណ B ដើម្បីផ្លាស់ទី</span>`);
    const W = 600, H = 320; let op = "intersection", B = [330, 160], drag = null;
    const A = [[90, 80], [260, 50], [360, 110], [330, 230], [200, 280], [80, 220]];
    const Bshape = (c) => Array.from({ length: 40 }, (_, i) => { const t = (i / 40) * Math.PI * 2, r = 105 + 15 * Math.sin(3 * t); return [c[0] + r * Math.cos(t), c[1] + r * 0.8 * Math.sin(t)]; });
    const st = stage(el, W, H, draw), off = document.createElement("canvas"); off.width = W; off.height = H;
    const path = (c, P) => { c.beginPath(); P.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.closePath(); };
    function draw() {
      const { ctx } = st, PB = Bshape(B), oc = off.getContext("2d"); bg(ctx, W, H); grid(ctx, W, H, 20);
      oc.globalCompositeOperation = "source-over"; oc.clearRect(0, 0, W, H); oc.fillStyle = "#43a047";
      const drawA = () => { path(oc, A); oc.fill(); }, drawB = () => { path(oc, PB); oc.fill(); };
      if (op === "intersection" || op === "clip") { drawA(); oc.globalCompositeOperation = "source-in"; drawB(); }
      else if (op === "union") { drawA(); drawB(); }
      else if (op === "difference") { drawA(); oc.globalCompositeOperation = "destination-out"; drawB(); }
      else { drawA(); oc.globalCompositeOperation = "xor"; drawB(); }
      ctx.drawImage(off, 0, 0, W, H);
      const img = oc.getImageData(0, 0, W, H).data; let px = 0; for (let i = 3; i < img.length; i += 4) if (img[i] > 127) px++;
      path(ctx, A); ctx.strokeStyle = "#1b5e20"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.stroke(); path(ctx, PB); ctx.strokeStyle = "#e65100"; ctx.stroke(); ctx.setLineDash([]);
      label(ctx, "A៖ ព្រៃឈើ", 95, 70, "#1b5e20", 14); label(ctx, "B៖ ឃុំ", B[0] + 60, B[1] - 95, "#e65100", 14);
      const fields = op === "clip" || op === "difference" ? ["cover = Forest"] : op === "union" || op === "symdiff" ? ["cover = Forest | NULL", "commune = Chi Phat | NULL"] : ["cover = Forest", "commune = Chi Phat"];
      const note = { intersection: "រក្សាតែផ្ទៃដែលមានក្នុងស្រទាប់ទាំងពីរ ហើយយកគុណលក្ខណៈពីទាំងពីរ។", clip: "ធរណីមាត្រដូច Intersection ប៉ុន្តែគុណលក្ខណៈមកពី A តែប៉ុណ្ណោះ។ B គ្រាន់តែជាកាំបិតកាត់។",
        union: "រក្សាផ្ទៃទាំងអស់។ ផ្នែកដែលមិនត្រួតគ្នាមាន NULL សម្រាប់វាលពីស្រទាប់ម្ខាងទៀត។", difference: "ផ្ទៃ A ដែលនៅក្រៅ B។ លំដាប់សំខាន់៖ A − B ≠ B − A។",
        symdiff: "ផ្ទៃដែលមានក្នុងស្រទាប់តែមួយប៉ុណ្ណោះ (មិនត្រួតគ្នា)។" }[op];
      out.innerHTML = `ផ្ទៃលទ្ធផល៖ <b>${fmt(px * 25 / 1e4, 1)} ហ.ត</b> · វាលក្នុងលទ្ធផល៖ ${fields.map((f) => `<code>${f}</code>`).join(" ")}<br>${note}`;
    }
    qa(".sim-seg button").forEach((b) => b.onclick = () => { qa(".sim-seg button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); op = b.dataset.o; draw(); });
    st.cv.addEventListener("pointerdown", (e) => { const p = st.pt(e); if (Math.hypot(p[0] - B[0], (p[1] - B[1]) / 0.8) < 110) { drag = [p[0] - B[0], p[1] - B[1]]; st.cv.setPointerCapture(e.pointerId); } });
    st.cv.addEventListener("pointermove", (e) => { if (!drag) return; const p = st.pt(e); B = [clamp(p[0] - drag[0], 0, W), clamp(p[1] - drag[1], 0, H)]; draw(); });
    st.cv.addEventListener("pointerup", () => drag = null);
    st.fit();
  };

  /* ============ L12 · Map algebra ============ */
  SIMS["map-algebra"] = (el) => {
    const A = [[12, 15, 18, 22, 25, 28], [10, 14, 19, 24, 30, 33], [8, 11, 16, null, 29, 35], [6, 9, 13, 18, 24, 31], [5, 7, 10, 14, 20, 26], [4, 6, 8, 11, 16, 22]];
    const B = [[1, 1, 2, 2, 2, 2], [1, 1, 1, 2, 2, 2], [3, 3, 1, 1, 2, 2], [3, 3, 1, 1, 1, 2], [1, 3, 3, 1, 1, 1], [1, 1, 3, 3, 1, 1]];
    const OPS = [["add", "A + 5", "ក្នុងតំបន់ (local)"], ["gt", "A > 20", "ក្នុងតំបន់ (local)"], ["and", "(A > 15) AND (B = 1)", "ក្នុងតំបន់ (local)"],
                 ["focal", "Focal mean 3×3 នៃ A", "ជិតខាង (focal)"], ["zonal", "Zonal mean A តាម B", "តំបន់ (zonal)"]];
    el.innerHTML = `<div class="sim-title">ពីជគណិតផែនទី (Map algebra)</div>
      <div class="sim-controls"><span class="sim-seg">${OPS.map(([k, n], i) => `<button type="button" data-o="${k}" class="${i ? "" : "on"}">${n}</button>`).join("")}</span></div>
      <div class="ma-grids"><div><b>A៖ កម្ពស់ (ម)</b><div class="ma-g" data-g="A"></div></div><div><b>B៖ ក្រប់ដី</b> <span class="sim-hint">១ ស្រែ · ២ ព្រៃ · ៣ ទឹក</span><div class="ma-g" data-g="B"></div></div>
      <div><b>លទ្ធផល</b><div class="ma-g" data-g="O"></div></div></div><div class="sim-out">ចុចលើក្រឡាលទ្ធផល ដើម្បីមើលការគណនា។</div>`;
    let op = "add";
    const calc = (r, c) => {
      const a = A[r][c], b = B[r][c];
      if (op === "add") return a === null ? [null, "NoData + ៥ = NoData"] : [a + 5, `${kh(a)} + ៥ = ${kh(a + 5)}`];
      if (op === "gt") return a === null ? [null, "NoData"] : [a > 20 ? 1 : 0, `${kh(a)} > ២០ → ${a > 20 ? "ពិត (១)" : "មិនពិត (០)"}`];
      if (op === "and") return a === null ? [null, "NoData"] : [a > 15 && b === 1 ? 1 : 0, `(${kh(a)} > ១៥) AND (${kh(b)} = ១) → ${a > 15 && b === 1 ? "១" : "០"}`];
      if (op === "focal") { const v = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const x = A[r + i]?.[c + j]; if (x !== undefined && x !== null) v.push(x); }
        const m = v.reduce((s, x) => s + x, 0) / v.length; return [Math.round(m * 10) / 10, `(${v.map(kh).join(" + ")}) ÷ ${kh(v.length)} = ${fmt(m, 1)}`]; }
      const v = []; A.forEach((row, i) => row.forEach((x, j) => { if (B[i][j] === b && x !== null) v.push(x); }));
      const m = v.reduce((s, x) => s + x, 0) / v.length; return [Math.round(m * 10) / 10, `មធ្យមនៃក្រឡាទាំង ${kh(v.length)} ដែល B = ${kh(b)}៖ ${fmt(m, 1)}`];
    };
    const cellCol = { A: (v) => v === null ? "#bdbdbd" : ramp((v - 4) / 31, VIRIDIS), B: (v) => ["", "#f9a825", "#2e7d32", "#1976d2"][v] };
    const render = (sel) => {
      const O = A.map((row, r) => row.map((_, c) => calc(r, c)[0])), vals = O.flat().filter((v) => v !== null), mn = Math.min(...vals), mx = Math.max(...vals);
      const hl = (g, r, c) => { if (!sel) return false; const [sr, sc] = sel; if (g === "O") return r === sr && c === sc;
        if (op === "focal") return g === "A" && Math.abs(r - sr) <= 1 && Math.abs(c - sc) <= 1;
        if (op === "zonal") return (g === "B" || g === "A") && B[r][c] === B[sr][sc];
        return r === sr && c === sc && (g === "A" || op === "and"); };
      el.querySelectorAll(".ma-g").forEach((gd) => { const g = gd.dataset.g, M = g === "A" ? A : g === "B" ? B : O;
        gd.innerHTML = M.map((row, r) => row.map((v, c) => { const bgc = g === "O" ? (v === null ? "#bdbdbd" : ramp(mx === mn ? 0.5 : (v - mn) / (mx - mn), op === "gt" || op === "and" ? [[240, 240, 240], [198, 40, 40]] : VIRIDIS)) : cellCol[g](v);
          return `<span class="ma-c ${hl(g, r, c) ? "ma-hl" : ""}" data-r="${r}" data-c="${c}" style="background:${bgc}">${v === null ? "ND" : kh(v).replace(".", ",")}</span>`; }).join("")).join(""); });
      el.querySelectorAll('.ma-g[data-g="O"] .ma-c').forEach((s) => s.onclick = () => { const r = +s.dataset.r, c = +s.dataset.c; render([r, c]);
        el.querySelector(".sim-out").innerHTML = `<b>${OPS.find((o) => o[0] === op)[2]}</b> · ក្រឡា (${kh(r)}, ${kh(c)})៖ ${calc(r, c)[1]}`; });
    };
    el.querySelectorAll(".sim-seg button").forEach((b) => b.onclick = () => { el.querySelectorAll(".sim-seg button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); op = b.dataset.o; render(); el.querySelector(".sim-out").textContent = "ចុចលើក្រឡាលទ្ធផល ដើម្បីមើលការគណនា។"; });
    render();
  };

  /* ============ L13 · IDW interpolation ============ */
  SIMS["idw"] = (el) => {
    const { q, qa, out } = shell(el, "អាំងទែប៉ូឡាស្យុងទឹកភ្លៀង (IDW)",
      `<span class="sim-seg"><button type="button" data-m="idw" class="on">IDW</button><button type="button" data-m="nn">ចំណុចជិតបំផុត</button></span>
       <label>ស្វ័យគុណ p <b class="id-pv"></b> <input type="range" class="id-p" min="1" max="6" step="0.5" value="2"></label>
       <span class="sim-hint">អូសស្ថានីយ៍ · ចុចលើស្ថានីយ៍ ដើម្បីប្ដូរតម្លៃ</span>`);
    const W = 600, H = 340, CELL = 6; let mode = "idw", drag = -1, hover = null;
    const S = [[90, 80, 180], [250, 60, 240], [470, 90, 150], [140, 250, 120], [330, 200, 310], [520, 280, 90]];
    const st = stage(el, W, H, draw);
    const val = (x, y) => { const p = +q(".id-p").value; let n = 0, d = 0, best = 1e9, bv = 0;
      for (const [sx, sy, v] of S) { const r = Math.hypot(x - sx, y - sy); if (r < 0.5) return v; if (r < best) { best = r; bv = v; } const w = 1 / r ** p; n += w * v; d += w; }
      return mode === "nn" ? bv : n / d; };
    function draw() {
      const { ctx } = st; q(".id-pv").textContent = fmt(+q(".id-p").value, 1); q(".id-p").disabled = mode === "nn";
      for (let x = 0; x < W; x += CELL) for (let y = 0; y < H; y += CELL) { ctx.fillStyle = ramp((val(x + CELL / 2, y + CELL / 2) - 80) / 240, BLUES); ctx.fillRect(x, y, CELL + 0.5, CELL + 0.5); }
      S.forEach(([x, y, v], i) => { dot(ctx, x, y, 8, "#e65100"); label(ctx, kh(v) + " មម", x + 11, y - 8, "#212121", 13); });
      for (let i = 0; i <= 5; i++) { ctx.fillStyle = ramp(i / 5, BLUES); ctx.fillRect(10 + i * 30, H - 22, 30, 12); } label(ctx, "៨០", 10, H - 26, "#212121", 11); label(ctx, "៣២០ មម", 190, H - 26, "#212121", 11, "right");
      out.innerHTML = (hover ? `តម្លៃប៉ាន់ស្មាននៅទីតាំងកណ្ដុរ៖ <b>${fmt(val(...hover), 0)} មម</b><br>` : "") +
        (mode === "nn" ? "ចំណុចជិតបំផុត (Thiessen/Voronoi)៖ តម្លៃលោតភ្លាមៗនៅព្រំដែន ដែលមិនសមនឹងទឹកភ្លៀងពិត។"
          : `p តូច → ផ្ទៃរលោង ស្ថានីយ៍ឆ្ងាយមានឥទ្ធិពលច្រើន · p ធំ → «ភ្នែកគោ» ជុំវិញស្ថានីយ៍នីមួយៗ។ IDW មិនអាចបង្កើតតម្លៃលើសពីតម្លៃអតិបរមា ឬទាបជាងអប្បបរមានៃស្ថានីយ៍ទេ។`);
    }
    qa(".sim-seg button").forEach((b) => b.onclick = () => { qa(".sim-seg button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); mode = b.dataset.m; draw(); });
    q(".id-p").addEventListener("input", draw);
    st.cv.addEventListener("pointerdown", (e) => { const [x, y] = st.pt(e); drag = S.findIndex((s) => Math.hypot(s[0] - x, s[1] - y) < 12); if (drag >= 0) { st.cv.setPointerCapture(e.pointerId); st.moved = false; } });
    st.cv.addEventListener("pointermove", (e) => { const p = st.pt(e); hover = p; if (drag >= 0) { S[drag][0] = clamp(p[0], 5, W - 5); S[drag][1] = clamp(p[1], 5, H - 30); st.moved = true; } draw(); });
    st.cv.addEventListener("pointerup", () => { if (drag >= 0 && !st.moved) { const v = prompt("តម្លៃទឹកភ្លៀង (មម)", S[drag][2]); if (v !== null && !isNaN(+v)) S[drag][2] = clamp(+v, 80, 320); draw(); } drag = -1; });
    st.fit();
  };

  /* ============ L13 · Hillshade ============ */
  SIMS["hillshade"] = (el) => {
    const { q, out } = shell(el, "ស្រមោលភ្នំ (Hillshade)",
      `<label>ទិសព្រះអាទិត្យ (azimuth) <b class="hs-av"></b> <input type="range" class="hs-a" min="0" max="359" value="315"></label>
       <label>កម្ពស់ព្រះអាទិត្យ <b class="hs-hv"></b> <input type="range" class="hs-h" min="5" max="90" value="45"></label>
       <label>ពង្រីកកម្ពស់ <b class="hs-zv"></b> <input type="range" class="hs-z" min="1" max="5" step="0.5" value="1"></label>
       <span class="sim-seg"><button type="button" data-v="hs" class="on">Hillshade</button><button type="button" data-v="slope">ជម្រាល</button><button type="button" data-v="dem">កម្ពស់</button></span>`);
    const NX = 200, NY = 120, CS = 20, W = 600, H = 360; let view = "hs";
    const Z = new Float32Array(NX * NY);
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const x = i / NX, y = j / NY;
      Z[j * NX + i] = 600 * Math.exp(-((x - 0.3) ** 2 + (y - 0.4) ** 2) / 0.02) + 380 * Math.exp(-((x - 0.72) ** 2 + (y - 0.62) ** 2) / 0.035) + 40 * Math.sin(x * 25) * Math.cos(y * 19) + 150 * x; }
    const st = stage(el, W, H, draw), img = new ImageData(NX, NY), tmp = document.createElement("canvas"); tmp.width = NX; tmp.height = NY;
    function draw() {
      const az = +q(".hs-a").value, alt = +q(".hs-h").value, zf = +q(".hs-z").value, zen = ((90 - alt) * Math.PI) / 180, azr = (((360 - az + 90) % 360) * Math.PI) / 180;
      q(".hs-av").textContent = kh(az) + "°"; q(".hs-hv").textContent = kh(alt) + "°"; q(".hs-zv").textContent = fmt(zf, 1) + "×";
      let zmn = 1e9, zmx = -1e9; Z.forEach((v) => { zmn = Math.min(zmn, v); zmx = Math.max(zmx, v); });
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
        const z = (a, b) => Z[clamp(b, 0, NY - 1) * NX + clamp(a, 0, NX - 1)] * zf;
        const dzdx = ((z(i + 1, j - 1) + 2 * z(i + 1, j) + z(i + 1, j + 1)) - (z(i - 1, j - 1) + 2 * z(i - 1, j) + z(i - 1, j + 1))) / (8 * CS);
        const dzdy = ((z(i - 1, j + 1) + 2 * z(i, j + 1) + z(i + 1, j + 1)) - (z(i - 1, j - 1) + 2 * z(i, j - 1) + z(i + 1, j - 1))) / (8 * CS);
        const slope = Math.atan(Math.hypot(dzdx, dzdy)), aspect = Math.atan2(dzdy, -dzdx);
        const k = (j * NX + i) * 4; let c;
        if (view === "hs") { const v = 255 * (Math.cos(zen) * Math.cos(slope) + Math.sin(zen) * Math.sin(slope) * Math.cos(azr - aspect)); c = [v, v, v].map((x) => clamp(x, 0, 255)); }
        else if (view === "slope") { const t = (slope * 180) / Math.PI / 40; c = ramp(t, RDYLGN.slice().reverse()).match(/\d+/g).map(Number); }
        else c = ramp((Z[j * NX + i] - zmn) / (zmx - zmn), [[26, 150, 65], [166, 217, 106], [255, 255, 191], [253, 174, 97], [140, 81, 10]]).match(/\d+/g).map(Number);
        img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255; }
      tmp.getContext("2d").putImageData(img, 0, 0); const { ctx } = st; ctx.imageSmoothingEnabled = true; ctx.drawImage(tmp, 0, 0, W, H);
      const cx = W - 45, cy = 45, r = 30; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fill(); label(ctx, "ជ", cx, cy - r + 12, "#212121", 11, "center");
      const a = (az * Math.PI) / 180; dot(ctx, cx + Math.sin(a) * (r - 6), cy - Math.cos(a) * (r - 6), 6, "#ffb300");
      out.innerHTML = view === "hs" ? `អ្នកមើលផែនទីជាទូទៅរំពឹងថាពន្លឺមកពីទិសពាយ័ព្យ (៣១៥°)។ សាកល្បងដាក់ទិស ១៣៥°៖ ភ្នំអាចមើលទៅដូចជ្រលង (terrain reversal)។`
        : view === "slope" ? "ជម្រាលគណនាពីភាពខុសគ្នានៃកម្ពស់ក្រឡាជិតខាង ៣×៣ (Horn)។ ពណ៌ក្រហម = ចោត។" : "កម្ពស់ពីទាប (បៃតង) ដល់ខ្ពស់ (ត្នោត)។ ផែនទីកម្ពស់តែឯង មើលរូបរាងភ្នំពិបាកជាង hillshade។";
    }
    el.querySelectorAll("input").forEach((c) => c.addEventListener("input", draw));
    el.querySelectorAll(".sim-seg button").forEach((b) => b.onclick = () => { el.querySelectorAll(".sim-seg button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); view = b.dataset.v; draw(); });
    st.fit();
  };

  /* ============ L14 · Weighted overlay (MCDA) ============ */
  SIMS["mcda"] = (el) => {
    const C = [["road", "ជិតផ្លូវ"], ["slope", "ជម្រាលទាប"], ["flood", "មិនលិចទឹក"]];
    const { q, out } = shell(el, "ជ្រើសទីតាំងសាលារៀនថ្មី៖ ការវិភាគសមស្របភាពដោយទម្ងន់",
      `${C.map(([k, n], i) => `<label>${n} <b class="mc-${k}v"></b> <input type="range" class="mc-${k}" min="0" max="10" value="${[5, 3, 2][i]}"></label>`).join("")}
       <label><input type="checkbox" class="mc-con" checked> ដកតំបន់ការពារ និងទឹកចេញ (constraint)</label>`,
      `<div class="mc-thumbs"></div>`);
    const NX = 60, NY = 36, W = 600, H = 360;
    const road = [], slope = [], flood = [], mask = [];
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const dr = Math.min(Math.abs(j - (8 + i * 0.35)), Math.abs(i - 42)); road.push(clamp(1 - dr / 18, 0, 1));
      const h = Math.exp(-((i - 12) ** 2 + (j - 26) ** 2) / 80) + 0.8 * Math.exp(-((i - 50) ** 2 + (j - 8) ** 2) / 60); slope.push(clamp(1 - h * 1.1, 0, 1));
      const fd = Math.abs(j - (24 + 6 * Math.sin(i / 8))); flood.push(clamp(fd / 10, 0, 1));
      mask.push(fd < 1.5 || (i > 22 && i < 34 && j > 26));
    }
    const LAY = { road, slope, flood };
    el.querySelector(".mc-thumbs").innerHTML = C.map(([k, n]) => `<div><canvas width="${NX}" height="${NY}" data-k="${k}"></canvas><span>${n}</span></div>`).join("") + `<div><canvas width="${NX}" height="${NY}" data-k="mask"></canvas><span>Constraint</span></div>`;
    el.querySelectorAll(".mc-thumbs canvas").forEach((cv) => { const c = cv.getContext("2d"), im = c.createImageData(NX, NY), L = LAY[cv.dataset.k];
      for (let n = 0; n < NX * NY; n++) { const col = cv.dataset.k === "mask" ? (mask[n] ? [120, 120, 120] : [255, 255, 255]) : ramp(L[n], RDYLGN).match(/\d+/g).map(Number); im.data.set([...col, 255], n * 4); } c.putImageData(im, 0, 0); });
    const st = stage(el, W, H, draw), tmp = document.createElement("canvas"); tmp.width = NX; tmp.height = NY;
    function draw() {
      const w = C.map(([k]) => +q(".mc-" + k).value), sw = w.reduce((a, b) => a + b, 0) || 1, con = q(".mc-con").checked;
      C.forEach(([k], i) => q(`.mc-${k}v`).textContent = kh(Math.round((100 * w[i]) / sw)) + "%");
      const S = road.map((_, n) => (w[0] * road[n] + w[1] * slope[n] + w[2] * flood[n]) / sw), valid = S.map((s, n) => !(con && mask[n]));
      const sorted = S.filter((_, n) => valid[n]).sort((a, b) => b - a), top = sorted[Math.floor(sorted.length * 0.05)] ?? 1;
      const im = tmp.getContext("2d").createImageData(NX, NY); let best = -1, bi = 0;
      S.forEach((s, n) => { const col = valid[n] ? ramp(s, RDYLGN).match(/\d+/g).map(Number) : [110, 110, 110]; im.data.set([...col, 255], n * 4); if (valid[n] && s > best) { best = s; bi = n; } });
      tmp.getContext("2d").putImageData(im, 0, 0); const { ctx } = st; ctx.imageSmoothingEnabled = false; ctx.drawImage(tmp, 0, 0, W, H);
      const cw = W / NX; ctx.strokeStyle = "#000"; ctx.lineWidth = 1.2; S.forEach((s, n) => { if (valid[n] && s >= top) ctx.strokeRect((n % NX) * cw + 1, Math.floor(n / NX) * cw + 1, cw - 2, cw - 2); });
      const bx = (bi % NX + 0.5) * cw, by = (Math.floor(bi / NX) + 0.5) * cw; ctx.font = "26px sans-serif"; ctx.textAlign = "center"; ctx.fillText("★", bx, by + 9);
      out.innerHTML = `★ = ទីតាំងល្អបំផុត (ពិន្ទុ ${fmt(best * 100)}/១០០) · ប្រអប់ខ្មៅ = ៥% ល្អបំផុត<br><span class="sim-hint">ប្ដូរទម្ងន់ ហើយមើលថា ★ ផ្លាស់ទីទៅណា។ លទ្ធផល MCDA ពឹងលើការសម្រេចចិត្តរបស់មនុស្ស ដូច្នេះត្រូវរាយការណ៍ទម្ងន់ និងហេតុផលជានិច្ច។</span>`;
    }
    el.querySelectorAll("input").forEach((c) => c.addEventListener("input", draw)); st.fit();
  };

  /* ============ L15 · File path checker ============ */
  SIMS["path-check"] = (el) => {
    const presets = ["D:\\GIS\\Lab11\\data\\kk_lc2015.gpkg", "C:\\Users\\Sarath\\Desktop\\គម្រោង GIS\\ផែនទី final (2).shp", "data/kk_communes.gpkg", "E:\\New folder\\New folder (3)\\Untitled.qgz"];
    el.innerHTML = `<div class="sim-title">ពិនិត្យឈ្មោះ និងផ្លូវឯកសារ</div>
      <div class="sim-controls"><input type="text" class="pc-in sim-input" style="flex:1 1 100%" value="${esc(presets[1])}">
      <span>${presets.map((p, i) => `<button type="button" class="sim-chip" data-i="${i}">ឧទាហរណ៍ ${kh(i + 1)}</button>`).join("")}</span></div><div class="pc-out"></div>`;
    const inp = el.querySelector(".pc-in");
    const run = () => {
      const p = inp.value, name = p.split(/[\\/]/).pop(), checks = [
        [/\s/.test(p), "មានដកឃ្លា", "ឧបករណ៍ Processing និង script មួយចំនួនបរាជ័យ។ ប្រើ _ ឬ - ជំនួស។"],
        [/[\u1780-\u17FF]/.test(p), "មានអក្សរខ្មែរ", "កម្មវិធី GDAL/Python ចាស់ៗ និង SAGA/GRASS អាចមិនស្គាល់។ ប្រើអក្សរឡាតាំងសម្រាប់ឈ្មោះឯកសារ។"],
        [/^[A-Za-z]:[\\/]|^\//.test(p), "ផ្លូវពេញ (absolute path)", "ពេលផ្ញើគម្រោងទៅកុំព្យូទ័រផ្សេង ស្រទាប់នឹងបាត់។ រក្សាទិន្នន័យក្នុងថតជាមួយគម្រោង ហើយប្រើផ្លូវ relative។"],
        [/final|untitled|new folder|\(\d\)|copy/i.test(p), "ឈ្មោះមិនប្រាប់ខ្លឹមសារ", "ឈ្មោះល្អប្រាប់ អ្វី · កន្លែង · ឆ្នាំ ឧ. kk_forest_loss_1997_2015.gpkg"],
        [/\.shp$/i.test(name), "Shapefile", "ត្រូវចម្លងឯកសារ ៥–៧ ជាមួយគ្នា ឈ្មោះវាលខ្លីបំផុត ១០ តួ។ GeoPackage (.gpkg) ជាឯកសារតែមួយ។"],
        [p.length > 120, "ផ្លូវវែងពេក", "Windows មានដែនកំណត់ ២៦០ តួអក្សរ។"]];
      const bad = checks.filter((c) => c[0]);
      el.querySelector(".pc-out").innerHTML = bad.length
        ? `<table class="sim-table">${bad.map(([, t, n]) => `<tr class="ft-warn"><td>⚠ ${t}</td><td>${n}</td></tr>`).join("")}</table>`
        : `<div class="ft-ok" style="padding:.5em">✓ ផ្លូវនេះល្អ៖ ខ្លី គ្មានដកឃ្លា ជាផ្លូវ relative និងឈ្មោះមានន័យ។</div>`;
    };
    inp.addEventListener("input", run); el.querySelectorAll(".sim-chip").forEach((b) => b.onclick = () => { inp.value = presets[b.dataset.i]; run(); }); run();
  };

  /* ---------- quizzes shared with workbook.js ---------- */
  window.WB_QUIZZES = Object.assign(window.WB_QUIZZES || {}, {
    "l01-questions": { title: "សំណួរនីមួយៗ ជាប្រភេទសំណួរ GIS អ្វី?", pairs: [
      ["ទីតាំង៖ នៅឯណា?", "តើមណ្ឌលសុខភាពក្នុងខេត្តកំពង់ឆ្នាំងនៅឯណាខ្លះ?"], ["លក្ខខណ្ឌ៖ មានអ្វីបំពេញលក្ខខណ្ឌ?", "តើភូមិណាមានប្រជាជនលើស ៣ ០០០ នាក់?"],
      ["ភាពជិតឆ្ងាយ៖ ឆ្ងាយប៉ុនណា?", "តើភូមិណានៅឆ្ងាយពីមណ្ឌលសុខភាពជាង ៥ គម?"], ["ការស្ថិតក្នុងតំបន់៖ នៅក្នុងព្រំប្រទល់ណា?", "តើតំបន់ការពារនីមួយៗបាត់បង់ព្រៃប៉ុន្មាន?"],
      ["ការប្រែប្រួល៖ ផ្លាស់ប្ដូរដូចម្ដេច?", "តើព្រៃឈើកោះកុងប្រែប្រួលយ៉ាងណាពីឆ្នាំ ១៩៩៧ ដល់ ២០១៥?"], ["សេណារីយ៉ូ៖ បើលក្ខខណ្ឌប្រែប្រួល?", "បើទឹកទន្លេឡើង ១ ម៉ែត្រ តើភូមិណាខ្លះនឹងលិច?"]] },
    "l04-scales": { title: "ផ្គូផ្គងវាល និងកម្រិតរង្វាស់", pairs: [
      ["Nominal (ឈ្មោះ/ប្រភេទ)", "ប្រភេទក្រប់ដី៖ ព្រៃ ស្រែ ទឹក"], ["Ordinal (លំដាប់)", "ស្ថានភាពផ្លូវ៖ ល្អ មធ្យម ខូច"],
      ["Interval (ចន្លោះ)", "សីតុណ្ហភាព °C"], ["Ratio (សមាមាត្រ)", "ចំនួនប្រជាជន"]] },
    "l06-sources": { title: "ទិន្នន័យបឋម ឬ ទិន្នន័យបន្ទាប់បន្សំ?", pairs: [
      ["បឋម៖ វាស់ដោយខ្លួនឯង", "វាស់ទីតាំងអណ្ដូងដោយ GPS"], ["បឋម៖ ស្ទង់មតិ", "សម្ភាសន៍គ្រួសារអំពីចម្ងាយទៅសាលា"],
      ["បន្ទាប់បន្សំ៖ ស្ថាប័ន", "ជំរឿនប្រជាជនពី NIS"], ["បន្ទាប់បន្សំ៖ សហគមន៍", "ផ្លូវពី OpenStreetMap"], ["រូបភាពពីចម្ងាយ", "រូបភាព Sentinel-2"]] },
    "l09-queries": { title: "សំណួរតាមគុណលក្ខណៈ ឬ តាមលំហ?", pairs: [
      ["គុណលក្ខណៈ", "\"TOTPOP\" > 5000"], ["លំហ៖ within", "សាលារៀនដែលនៅក្នុងខេត្តកំពង់ឆ្នាំង"],
      ["លំហ៖ distance", "ភូមិដែលនៅក្នុងចម្ងាយ ៥ គម ពីមណ្ឌលសុខភាព"], ["លំហ៖ touches", "ឃុំដែលជាប់ព្រំឃុំខ្សាម"], ["គុណលក្ខណៈ + លំហ", "សាលាបឋមសិក្សា ក្នុងតំបន់លិចទឹក"]] },
  });

  function init() { document.querySelectorAll(".sim[data-sim]").forEach((el) => { if (el.dataset.ready) return; el.dataset.ready = "1";
    const f = SIMS[el.dataset.sim] || (window.EXTRA_SIMS || {})[el.dataset.sim]; if (f) Promise.resolve(f(el)).catch((e) => { console.error(e); el.textContent = "Simulator error: " + e.message; }); else el.textContent = "Unknown simulator: " + el.dataset.sim; }); }
  if (typeof document$ !== "undefined") document$.subscribe(init);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
