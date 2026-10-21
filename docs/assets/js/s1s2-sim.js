/* ============================================================
   Real Sentinel-1 + Sentinel-2 scene: Siem Reap – Tonle Sap floodplain
   S1 IW GRD 17 Oct 2026 (ASC, rel. orbit 26) · S2 L2A 19 Oct 2026 with Cloud Score+
   Aggregated to 40 m (S1 averaged in linear power, then dB). Contains modified Copernicus Sentinel data 2026.
   Usage: <div class="sim" data-sim="rs-s1s2"></div>        (Book 3 · Lesson 15)
          <div class="sim" data-sim="ag-s1s2-flood"></div>  (Book 4 · Lesson 7)
   Data: assets/data/sr_s1.png (R = VV, G = VH, B = cs_cdf), sr_s2rgb.png (B4 B3 B2), sr_s2idx.png (NDVI, MNDWI, B8)
   ============================================================ */
(function () {
  "use strict";
  const KM = "០១២៣៤៥៦៧៨៩", kh = (n) => String(n).replace(/[0-9]/g, (d) => KM[d]);
  const khn = (n, d = 0) => kh(Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/,/g, " ").replace(".", ",").replace("-", "−"));
  const BASE = new URL("../data/", (document.currentScript && document.currentScript.src) || location.href);
  const font = () => getComputedStyle(document.body).fontFamily || "Battambang, sans-serif";
  const X0 = 364220, Y0 = 1475530, PX = 40, PKM2 = (PX * PX) / 1e6;
  let cache = null;
  async function img(name) {
    const b = await (await fetch(new URL(name, BASE))).blob();
    let bm; try { bm = await createImageBitmap(b, { colorSpaceConversion: "none", premultiplyAlpha: "none" }); } catch (e) { bm = await createImageBitmap(b); }
    const c = document.createElement("canvas"); c.width = bm.width; c.height = bm.height; const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(bm, 0, 0); return { w: bm.width, h: bm.height, d: x.getImageData(0, 0, bm.width, bm.height).data };
  }
  async function load() {
    if (cache) return cache;
    const [a, b, c] = await Promise.all(["sr_s1.png", "sr_s2rgb.png", "sr_s2idx.png"].map(img));
    const w = a.w, h = a.h, N = w * h, dq = (v, lo, hi) => (v === 0 ? NaN : lo + ((v - 1) / 254) * (hi - lo));
    const D = { w, h, N, VV: new Float32Array(N), VH: new Float32Array(N), cs: new Float32Array(N), nd: new Float32Array(N), mn: new Float32Array(N), rgb: b.d, nir: new Uint8Array(N) };
    for (let i = 0; i < N; i++) { const o = i * 4;
      D.VV[i] = dq(a.d[o], -30, 5); D.VH[i] = dq(a.d[o + 1], -40, 0); D.cs[i] = a.d[o + 2] / 2.5;
      D.nd[i] = dq(c.d[o], -1, 1); D.mn[i] = dq(c.d[o + 1], -1, 1); D.nir[i] = c.d[o + 2]; }
    return (cache = D);
  }
  const RANGE = { VV: [-28, 2], VH: [-36, -6] };
  const toS = (db, s) => (s === "db" ? db : s === "pow" ? Math.pow(10, db / 10) : Math.pow(10, db / 20));
  const fromS = (v, s) => (s === "db" ? v : s === "pow" ? 10 * Math.log10(v) : 20 * Math.log10(v));
  const LAYERS = [["VV", "S1 VV"], ["VH", "S1 VH"], ["S1RGB", "S1 VV·VH·ratio"], ["TC", "S2 ពណ៌ធម្មជាតិ"], ["FC", "S2 ពណ៌ក្លែង"], ["CS", "Cloud Score+"], ["CMP", "ប្រៀបធៀប S1 × S2"]];
  const NOTE = {
    VV: "<b>VV</b>៖ ទឹករាបស្មើឆ្លុះសញ្ញាចេញ (specular) ដូច្នេះងងឹតខ្លាំង (≈ −១៩ dB)។ ទីក្រុងសៀមរាប និងភ្នំក្រោមភ្លឺ ដោយសារ double bounce និងជម្រាលបែរមុខទៅរ៉ាដា។ ព្រៃលិចទឹកក្បែរបឹងក៏ភ្លឺខ្លាំងដែរ៖ សញ្ញាលោតពីផ្ទៃទឹកទៅដើមឈើ ហើយត្រឡប់មកវិញ។",
    VH: "<b>VH</b> (cross-pol) កើតភាគច្រើនពី volume scattering ក្នុងរុក្ខជាតិ។ ទឹកងងឹតខ្លាំងជាង VV (≈ −២៩ dB) ប៉ុន្តែជិតកម្រិតសំឡេងរំខាន (noise floor) ដូច្នេះ VH ងាយរងសំឡេងរំខានជាង VV។",
    S1RGB: "<b>RGB = VV · VH · VV−VH</b>៖ ទឹកលេចពណ៌ខៀវ (ទាបទាំងពីរ តែផលធៀបធំ) រុក្ខជាតិ និងព្រៃលិចទឹកលេចពណ៌លឿងបៃតង (VV និង VH ខ្ពស់)។ គ្មានពពក និងគ្មានស្រមោលពពកទេ។",
    TC: "<b>S2 ពណ៌ធម្មជាតិ</b> ថតពីរថ្ងៃក្រោយ S1៖ ទឹកជំនន់មានល្បាប់ច្រើន (ពណ៌ត្នោតខៀវ) ពពក cumulus ពណ៌ស និងស្រមោលពពកងងឹតរាយប៉ាយ។ ស្រមោលពពកងងឹតដូចទឹក ហើយអាចច្រឡំជាទឹកបាន។",
    FC: "<b>S2 ពណ៌ក្លែង (B8 · B4 · B3)</b>៖ រុក្ខជាតិពណ៌ក្រហម។ ព្រៃលិចទឹកនៅតែក្រហម ព្រោះ S2 ឃើញតែដំបូលឈើ មិនឃើញទឹកខាងក្រោមទេ។",
    CS: "<b>Cloud Score+ (cs_cdf)</b>៖ ០ = មិនច្បាស់ ១០០ = ច្បាស់។ ក្រឡាក្រោមកម្រិតត្រូវបិទបាំង។ សង្កេត៖ ផ្ទៃបឹងទន្លេសាបមានល្បាប់ច្រើន ទទួលពិន្ទុទាប ទោះគ្មានពពកក៏ដោយ ដូច្នេះរបាំងពពកក៏ «ប្រើទឹក» ខ្លះដែរ។",
    CMP: "<b>ប្រៀបធៀប</b> ទឹក S1 (backscatter &lt; កម្រិត) ជាមួយទឹក S2 (MNDWI &gt; ០) លើតែក្រឡាដែលគ្មានពពក។ <span style='color:#0097a7'>■</span> ពណ៌ខៀវខ្ចី៖ S2 ឃើញទឹក តែ S1 មិនឃើញ ភាគច្រើនជាវាលគុម្ពោតលិចទឹកជុំវិញបឹង (ដើមរុក្ខជាតិបញ្ចេញសញ្ញាត្រឡប់)។ <span style='color:#e67800'>■</span> ពណ៌ទឹកក្រូច៖ S1 ងងឹត តែ S2 មិនមែនទឹក ជាផ្ទៃរលោង ឬស្រែសើម។ ព្រៃលិចទឹក (ភ្លឺក្នុង S1 ក្រហមក្នុង S2) គ្មានវិធីណាមួយក្នុងពីរនេះរកឃើញទេ។"
  };
  const otsu = (bins) => { let tot = 0, sum = 0; bins.forEach((b, i) => { tot += b; sum += i * b; });
    let wB = 0, sB = 0, best = 0, bi = 0; for (let i = 0; i < bins.length; i++) { wB += bins[i]; if (!wB) continue; const wF = tot - wB; if (!wF) break; sB += i * bins[i];
      const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF); if (v > best) { best = v; bi = i; } } return bi + 1; };

  function make(book) {
    return async (el) => {
      el.innerHTML = `<div class="sim-title">${book === "rs" ? "ទិន្នន័យពិត Sentinel-1 និង Sentinel-2៖ សៀមរាប – ទន្លេសាប ខែតុលា ២០២៦" : "ផែនទីទឹកជំនន់ពីទិន្នន័យពិត៖ S1 ១៧ តុលា ២០២៦ ផ្ទៀងផ្ទាត់ជាមួយ S2 ១៩ តុលា"}</div>
        <div class="sim-controls"><span class="sim-seg ss-l">${LAYERS.map(([k, t]) => `<button type="button" data-v="${k}">${t}</button>`).join("")}</span></div>
        <div class="sim-controls">
          <span class="sim-seg ss-b"><button type="button" data-v="VV" class="on">កម្រិតលើ VV</button><button type="button" data-v="VH">កម្រិតលើ VH</button></span>
          <span class="sim-seg ss-s"><button type="button" data-v="db" class="on">dB</button><button type="button" data-v="amp">Amplitude</button><button type="button" data-v="pow">Power</button></span>
          <label><input type="checkbox" class="ss-ov" ${book === "ag" ? "" : ""}> បង្ហាញទឹក S1</label>
        </div><div class="sim-controls">
          <label>កម្រិត <input class="ss-t" type="range" min="-28" max="-8" step="0.1" value="-17"> <b class="ss-tv"></b></label>
          <button type="button" class="sim-btn ss-o">Otsu</button>
          <label>Cloud Score+ ≥ <input class="ss-c" type="range" min="0" max="85" step="5" value="60"> <b class="ss-cv"></b></label>
        </div>
        <div class="sim-body"><div class="sim-canvas-wrap"><canvas></canvas></div></div>
        <div class="sim-hint ss-px">ដាក់ម៉ៅស៍លើរូប ដើម្បីអានតម្លៃក្រឡា។</div><div class="sim-out" role="status">កំពុងផ្ទុកទិន្នន័យ…</div>`;
      const q = (s) => el.querySelector(s), cv = q("canvas"), ctx = cv.getContext("2d");
      let D; try { D = await load(); } catch (e) { q(".sim-out").textContent = "ផ្ទុកទិន្នន័យមិនបាន៖ " + e.message; return; }
      const { w, h, N } = D;
      let layer = book === "rs" ? "VV" : "CMP", band = "VV", scale = "db", otsuNote = "";
      const segs = (cls, set, cur) => el.querySelectorAll(`.${cls} button`).forEach((b) => { b.classList.toggle("on", b.dataset.v === cur);
        b.onclick = () => { el.querySelectorAll(`.${cls} button`).forEach((x) => x.classList.toggle("on", x === b)); set(b.dataset.v); otsuNote = ""; draw(); }; });
      segs("ss-l", (v) => (layer = v), layer); segs("ss-b", (v) => { band = v; q(".ss-t").min = v === "VV" ? -28 : -34; q(".ss-t").max = v === "VV" ? -8 : -14; q(".ss-t").value = v === "VV" ? -17 : -24; }, band); segs("ss-s", (v) => (scale = v), scale);
      const W = 760, H = 430, IW = 440, IH = (IW * h) / w, IX = 8, IY = 26;
      const off = document.createElement("canvas"); off.width = w; off.height = h; const octx = off.getContext("2d");
      const st = (v, lo, hi) => Math.max(0, Math.min(255, ((v - lo) / (hi - lo)) * 255));
      const draw = () => {
        const s = cv.parentElement.clientWidth || W, k = s / W, dpr = window.devicePixelRatio || 1;
        cv.style.width = s + "px"; cv.style.height = H * k + "px"; cv.width = s * dpr; cv.height = H * k * dpr; ctx.setTransform(k * dpr, 0, 0, k * dpr, 0, 0);
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
        const T = +q(".ss-t").value, CT = +q(".ss-c").value, B = D[band]; q(".ss-tv").textContent = khn(T, 1) + " dB"; q(".ss-cv").textContent = khn(CT);
        const im = octx.createImageData(w, h), p = im.data, ov = q(".ss-ov").checked;
        const cnt = { ww: 0, dd: 0, wd: 0, dw: 0, cl: 0, s1: 0 };
        for (let i = 0; i < N; i++) { const o = i * 4, v = B[i], s1w = v < T, clear = D.cs[i] >= CT, s2w = D.mn[i] > 0; let r, g, b;
          if (s1w) cnt.s1++;
          if (!clear) cnt.cl++; else if (s1w && s2w) cnt.ww++; else if (s1w) cnt.wd++; else if (s2w) cnt.dw++; else cnt.dd++;
          if (layer === "VV") r = g = b = st(D.VV[i], -24, 0);
          else if (layer === "VH") r = g = b = st(D.VH[i], -30, -8);
          else if (layer === "S1RGB") { r = st(D.VV[i], -22, 0); g = st(D.VH[i], -28, -8); b = st(D.VV[i] - D.VH[i], 2, 14); }
          else if (layer === "TC") { r = Math.min(255, D.rgb[o] * 1.6); g = Math.min(255, D.rgb[o + 1] * 1.6); b = Math.min(255, D.rgb[o + 2] * 1.6); }
          else if (layer === "FC") { r = D.nir[i] * 1.15; g = Math.min(255, D.rgb[o] * 1.9); b = Math.min(255, D.rgb[o + 1] * 1.9); }
          else if (layer === "CS") { const c = D.cs[i]; if (c < CT) { r = 230; g = 60; b = 60; } else { r = g = b = st(c, 30, 90); } }
          else { [r, g, b] = !clear ? [120, 120, 120] : s1w && s2w ? [30, 90, 200] : s1w ? [230, 120, 0] : s2w ? [0, 200, 200] : [236, 236, 236]; }
          if (ov && layer !== "CMP" && s1w) { r = r * 0.35 + 0; g = g * 0.35 + 120; b = b * 0.35 + 220; }
          p[o] = r; p[o + 1] = g; p[o + 2] = b; p[o + 3] = 255; }
        octx.putImageData(im, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(off, IX, IY, IW, IH);
        ctx.strokeStyle = "#90a4ae"; ctx.strokeRect(IX, IY, IW, IH);
        ctx.fillStyle = "#212121"; ctx.font = `bold 13px ${font()}`; ctx.textAlign = "left"; ctx.fillText(LAYERS.find((l) => l[0] === layer)[1] + (layer === "VV" || layer === "VH" ? " (dB)" : ""), IX, 18);
        // scale bar 2 km + north
        const sb = (2000 / PX) * (IW / w); ctx.fillStyle = "#fff"; ctx.fillRect(IX + 8, IY + IH - 26, sb + 16, 20); ctx.fillStyle = "#212121"; ctx.fillRect(IX + 16, IY + IH - 14, sb, 4); ctx.font = `11px ${font()}`; ctx.fillText("២ គម", IX + 18, IY + IH - 17);
        // histogram (stacked by S2 reference class)
        const HX = 478, HY = 40, HW = 270, HH = 190, nb = 60, R = RANGE[band], lo = toS(R[0], scale), hi = scale === "db" ? R[1] : toS(band === "VV" ? -4 : -12, scale);
        const bw = [new Array(nb).fill(0), new Array(nb).fill(0), new Array(nb).fill(0)], fine = new Array(400).fill(0);
        for (let i = 0; i < N; i++) { const v = B[i]; if (!isFinite(v)) continue; const x = toS(v, scale), f = (x - lo) / (hi - lo); if (f < 0) continue;
          const j = Math.min(nb - 1, Math.floor(f * nb)), c = D.cs[i] < CT ? 2 : D.mn[i] > 0 ? 0 : 1; bw[c][j]++; fine[Math.min(399, Math.floor(f * 400))]++; }
        const tot = bw[0].map((_, j) => bw[0][j] + bw[1][j] + bw[2][j]), mx = Math.max(...tot);
        const COL = ["#1e5ac8", "#d7b98e", "#9e9e9e"];
        for (let j = 0; j < nb; j++) { let y = HY + HH; for (let c = 0; c < 3; c++) { const bh = (bw[c][j] / mx) * HH; ctx.fillStyle = COL[c]; ctx.fillRect(HX + (j * HW) / nb, y - bh, HW / nb - 0.5, bh); y -= bh; } }
        ctx.strokeStyle = "#455a64"; ctx.beginPath(); ctx.moveTo(HX, HY + HH); ctx.lineTo(HX + HW, HY + HH); ctx.stroke();
        const tx = HX + ((toS(T, scale) - lo) / (hi - lo)) * HW; ctx.strokeStyle = "#c62828"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, HY - 4); ctx.lineTo(tx, HY + HH); ctx.stroke(); ctx.lineWidth = 1;
        ctx.fillStyle = "#212121"; ctx.font = `bold 12px ${font()}`; ctx.fillText(`អ៊ីស្តូក្រាម ${band} · ${scale === "db" ? "dB" : scale === "amp" ? "Amplitude" : "Power (σ⁰ លីនេអ៊ែរ)"}`, HX, HY - 14);
        ctx.font = `11px ${font()}`; const fmt = (v) => (scale === "db" ? khn(v, 0) : khn(v, scale === "pow" ? 3 : 2));
        for (let t = 0; t <= 4; t++) { const v = lo + (t / 4) * (hi - lo); ctx.textAlign = "center"; ctx.fillText(fmt(v), HX + (t / 4) * HW, HY + HH + 14); }
        if (scale !== "db") { ctx.textAlign = "right"; ctx.fillText("ក្រឡាលើសនេះ ដាក់ក្នុងធុងចុងក្រោយ", HX + HW, HY + HH + 28); }
        ctx.textAlign = "left"; [["ទឹក S2 (MNDWI > ០)", 0], ["មិនមែនទឹក S2", 1], ["ពពក (បិទបាំង)", 2]].forEach(([t, c], j) => { ctx.fillStyle = COL[c]; ctx.fillRect(HX, HY + HH + 44 + j * 18, 12, 12); ctx.fillStyle = "#212121"; ctx.fillText(t, HX + 18, HY + HH + 54 + j * 18); });
        ctx.fillStyle = "#c62828"; ctx.fillRect(HX + 150, HY + HH + 48, 12, 3); ctx.fillStyle = "#212121"; ctx.fillText("កម្រិត", HX + 168, HY + HH + 54);
        if (layer === "CMP") { [["ទឹកទាំងពីរ", "#1e5ac8"], ["S1 តែមួយ", "#e67800"], ["S2 តែមួយ", "#00c8c8"], ["ដីទាំងពីរ", "#ececec"], ["ពពក", "#787878"]].forEach(([t, c], j) => {
          ctx.fillStyle = c; ctx.fillRect(HX + 150, HY + HH + 58 + j * 18, 12, 12); ctx.strokeStyle = "#9e9e9e"; ctx.strokeRect(HX + 150, HY + HH + 58 + j * 18, 12, 12); ctx.fillStyle = "#212121"; ctx.fillText(t, HX + 168, HY + HH + 68 + j * 18); }); }
        el._fine = { fine, lo, hi };
        const clearN = N - cnt.cl, oa = (cnt.ww + cnt.dd) / clearN, iou = cnt.ww / (cnt.ww + cnt.wd + cnt.dw), pa = cnt.ww / (cnt.ww + cnt.dw), ua = cnt.ww / (cnt.ww + cnt.wd);
        q(".sim-out").innerHTML = NOTE[layer] + `<br>ផ្ទៃទឹក S1 (${band} &lt; ${khn(T, 1)} dB)៖ <b>${khn(cnt.s1 * PKM2, 1)} គម²</b> នៃ ${khn(N * PKM2, 1)} គម² (${khn((cnt.s1 / N) * 100, 1)}%)` + otsuNote +
          `<br>លើក្រឡាគ្មានពពក (${khn((clearN / N) * 100, 0)}% នៃរូប) ធៀបនឹង S2៖ ភាពត្រូវគ្នាសរុប <b>${khn(oa * 100, 1)}%</b> · IoU ទឹក <b>${khn(iou, 2)}</b> · Producer's ${khn(pa * 100, 0)}% · User's ${khn(ua * 100, 0)}%` +
          `<br><span class="sim-hint">S2 មិនមែនជា «ការពិតដី» ទេ៖ វាថតពីរថ្ងៃក្រោយ ហើយមិនឃើញទឹកក្រោមដំបូលឈើ។ ក្រឡា ៤០ ម (មធ្យម ៤×៤ ក្រឡា ១០ ម ក្នុង power) ដូច្នេះ speckle តិចជាងរូបដើម។ ផ្ទុកទិន្នន័យ Copernicus Sentinel ២០២៦ ដែលបានកែច្នៃ។</span>`;
      };
      q(".ss-o").onclick = () => { const { fine, lo, hi } = el._fine, j = otsu(fine), v = lo + (j / 400) * (hi - lo), db = fromS(v, scale), t = q(".ss-t");
        t.value = Math.max(+t.min, Math.min(+t.max, db)); draw(); otsuNote = ` · Otsu លើអ៊ីស្តូក្រាម ${scale === "db" ? "dB" : scale === "amp" ? "Amplitude" : "Power"}៖ <b>${khn(db, 1)} dB</b>${scale !== "db" ? " (ផ្សេងពី Otsu លើ dB ព្រោះរាងអ៊ីស្តូក្រាមប្ដូរ)" : ""}`; draw(); };
      el.querySelectorAll("input").forEach((i) => i.addEventListener("input", () => { otsuNote = ""; draw(); }));
      cv.addEventListener("mousemove", (e) => { const r = cv.getBoundingClientRect(), k = r.width / W, x = (e.clientX - r.left) / k - IX, y = (e.clientY - r.top) / k - IY;
        if (x < 0 || y < 0 || x >= IW || y >= IH) return; const c = Math.floor((x / IW) * w), rr = Math.floor((y / IH) * h), i = rr * w + c;
        q(".ss-px").innerHTML = `E ${khn(X0 + (c + 0.5) * PX)} · N ${khn(Y0 - (rr + 0.5) * PX)} (UTM 48N) · VV <b>${khn(D.VV[i], 1)}</b> dB · VH <b>${khn(D.VH[i], 1)}</b> dB · NDVI ${khn(D.nd[i], 2)} · MNDWI ${khn(D.mn[i], 2)} · Cloud Score+ ${khn(D.cs[i])}`; });
      draw(); window.addEventListener("resize", () => el.isConnected && draw());
    };
  }
  window.EXTRA_SIMS = window.EXTRA_SIMS || {};
  window.EXTRA_SIMS["rs-s1s2"] = make("rs");
  window.EXTRA_SIMS["ag-s1s2-flood"] = make("ag");
})();
