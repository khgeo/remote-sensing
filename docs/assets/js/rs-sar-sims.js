/* ============================================================
   Book 3 · Lesson 15 · SAR geometry and data scales
   rs-sar-geom   foreshortening, layover and shadow from incidence angle and slopes
   rs-sar-scale  the same SAR scene in power, amplitude and dB
   ============================================================ */
(function () {
  "use strict";
  window.EXTRA_SIMS = window.EXTRA_SIMS || {};
  const KM = "០១២៣៤៥៦៧៨៩", kh = (n) => String(n).replace(/[0-9]/g, (d) => KM[d]);
  const fmtN = (n, d = 0) => kh(Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/,/g, " ").replace(".", ","));
  const font = () => getComputedStyle(document.body).fontFamily;
  const RAD = Math.PI / 180;
  const shell = (el, title, controls) => {
    el.innerHTML = `<div class="sim-title">${title}</div><div class="sim-controls">${controls}</div><div class="sim-body"><div class="sim-canvas-wrap"><canvas></canvas></div></div><div class="sim-out"></div>`;
    const cv = el.querySelector("canvas"); return { cv, ctx: cv.getContext("2d"), out: el.querySelector(".sim-out"), q: (s) => el.querySelector(s) };
  };
  const fit = (cv, ctx, W, H) => { const w = cv.parentElement.clientWidth || W, s = w / W, d = window.devicePixelRatio || 1;
    cv.style.width = w + "px"; cv.style.height = H * s + "px"; cv.width = w * d; cv.height = H * s * d; ctx.setTransform(s * d, 0, 0, s * d, 0, 0); };

  /* ---------- geometric distortions ---------- */
  window.EXTRA_SIMS["rs-sar-geom"] = (el) => {
    const { cv, ctx, out, q } = shell(el, "ការខូចទ្រង់ទ្រាយធរណីមាត្រ SAR៖ Foreshortening · Layover · Shadow",
      `<label>មុំ incidence θ <input class="sg-t" type="range" min="20" max="60" value="38"> <b class="sg-tv"></b></label>
       <label>ជម្រាលមុខ α <input class="sg-a" type="range" min="5" max="75" value="25"> <b class="sg-av"></b></label>
       <label>ជម្រាលក្រោយ β <input class="sg-b" type="range" min="5" max="75" value="30"> <b class="sg-bv"></b></label>
       <label><input type="checkbox" class="sg-rtc"> បន្ទាប់ពី RTC</label>
       <span class="sim-hint">Sentinel-1 IW៖ θ ប្រហែល ២៩° (ជិត) ដល់ ៤៦° (ឆ្ងាយ)</span>`);
    const W = 680, H = 360;
    const draw = () => {
      fit(cv, ctx, W, H);
      const th = +q(".sg-t").value * RAD, al = +q(".sg-a").value * RAD, be = +q(".sg-b").value * RAD, rtc = q(".sg-rtc").checked;
      q(".sg-tv").textContent = kh(q(".sg-t").value) + "°"; q(".sg-av").textContent = kh(q(".sg-a").value) + "°"; q(".sg-bv").textContent = kh(q(".sg-b").value) + "°";
      const h = 120, a = 140, b = a + h / Math.tan(al), c = b + h / Math.tan(be), E = 640;
      const k = Math.min(1, (E - 160) / (c - a + 40)), gx = (x) => 20 + (a + (x - a) * k), gy = (z) => 230 - z * k;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      // terrain
      ctx.beginPath(); ctx.moveTo(gx(0), gy(0)); [[a, 0], [b, h], [c, 0], [E / k, 0]].forEach(([x, z]) => ctx.lineTo(Math.min(gx(x), 660), gy(z)));
      ctx.lineTo(660, 260); ctx.lineTo(gx(0), 260); ctx.closePath(); ctx.fillStyle = "#d7ccc8"; ctx.fill(); ctx.strokeStyle = "#6d4c41"; ctx.lineWidth = 2; ctx.stroke();
      // illumination: rays from upper-left
      const d = [Math.sin(th), -Math.cos(th)];
      ctx.setLineDash([5, 4]); ctx.strokeStyle = "#ef6c00"; ctx.lineWidth = 1.2;
      for (let x = -200; x < E; x += 36) { const L = 400; ctx.beginPath(); ctx.moveTo(gx(x) - d[0] * L, gy(0) + d[1] * L); ctx.lineTo(gx(x), gy(0)); ctx.stroke(); }
      ctx.setLineDash([]);
      // shadow wedge on the ground behind the peak
      const xs = b + h * Math.tan(th), shadow = xs > c;
      if (shadow) { ctx.beginPath(); ctx.moveTo(gx(b), gy(h)); ctx.lineTo(Math.min(gx(xs), 660), gy(0)); ctx.lineTo(gx(c), gy(0)); ctx.closePath(); ctx.fillStyle = "rgba(38,50,56,.55)"; ctx.fill(); }
      ctx.font = `bold 14px ${font()}`; ctx.fillStyle = "#4e342e"; ctx.textAlign = "center";
      ctx.fillText("a", gx(a), gy(0) + 18); ctx.fillText("b", gx(b), gy(h) - 8); ctx.fillText("c", gx(c), gy(0) + 18);
      ctx.fillStyle = "#455a64"; ctx.font = `12px ${font()}`; ctx.fillText("ផ្កាយរណប ↖ (មើលចំហៀង)", 90, 22);
      // slant-range image strip
      const r = (x, z) => x * Math.sin(th) - z * Math.cos(th), ra = r(a, 0), rb = r(b, h), rc = r(c, 0);
      const r0 = r(a - 80, 0), r1 = r(c + 120, 0), X = (R) => 40 + ((R - r0) / (r1 - r0)) * 600, y = 300;
      // brightness of each image cell ~ ground length per slant length (with cos of local incidence)
      for (let px = 0; px < 600; px++) {
        const R = r0 + (px / 600) * (r1 - r0); let br = 0.35, nodata = false;
        if (rb < ra && R >= rb && R <= ra) br = 1; // layover: several slopes add up
        else if (R > Math.min(ra, rb) && R < Math.max(ra, rb)) br = Math.min(1, 0.35 * ((b - a) * Math.sin(th)) / Math.max(1e-3, Math.abs(rb - ra)));
        if (shadow && R > Math.max(ra, rb) && R < r(xs, 0)) { br = 0; nodata = true; }
        if (rtc && rb < ra && R >= rb && R <= ra) nodata = true;
        if (rtc && !nodata) br = 0.35;
        const g = Math.round(255 * br);
        ctx.fillStyle = nodata ? (rtc ? "#e91e63" : "#000") : `rgb(${g},${g},${g})`; ctx.fillRect(40 + px, y - 12, 1.2, 24);
      }
      ctx.strokeStyle = "#263238"; ctx.lineWidth = 1; ctx.strokeRect(40, y - 12, 600, 24);
      ctx.font = `bold 13px ${font()}`; ctx.fillStyle = "#c62828";
      [[ra, "a′", -18], [rb, "b′", 32], [rc, "c′", -18]].forEach(([R, t, dy]) => { if (X(R) > 30 && X(R) < 650) { ctx.beginPath(); ctx.arc(X(R), y, 3.5, 0, 7); ctx.fill(); ctx.fillText(t, X(R), y + dy); } });
      ctx.font = `12px ${font()}`; ctx.fillStyle = "#455a64"; ctx.fillText(rtc ? "រូបភាពក្រោយ RTC (ពណ៌ផ្កាឈូក = No Data)" : "រូបភាពក្នុង slant range (ពណ៌ស = ភ្លឺ · ខ្មៅ = គ្មានសញ្ញា)", 340, 350);
      const st = [];
      if (rb < ra) st.push("<b style='color:#c62828'>Layover</b>៖ α > θ ដូច្នេះកំពូល b ទៅដល់ផ្កាយរណបមុនជើង a។ ជម្រាលមុខបញ្ច្រាសក្នុងរូបភាព ហើយលាយជាមួយសញ្ញាពីដីខាងមុខ៖ មិនអាចបំបែកបានទេ។");
      else if (al > th * 0.6) st.push("<b style='color:#ef6c00'>Foreshortening ខ្លាំង</b>៖ α ជិត θ ដូច្នេះជម្រាលមុខទាំងមូលរួញជាឆ្នូតតូច និងភ្លឺ។");
      else st.push("<b>Foreshortening</b>៖ ជម្រាលមុខ (α < θ) រួញ និងភ្លឺជាងដីរាប ព្រោះវាបែរទៅផ្កាយរណប។");
      if (shadow) st.push("<b style='color:#37474f'>Shadow</b>៖ β > ៩០° − θ ដូច្នេះរលកមិនដល់ជម្រាលក្រោយ៖ គ្មានទិន្នន័យ។");
      out.innerHTML = st.join("<br>") + `<br><span class="sim-hint">មុំ θ ធំ (ឆ្ងាយ) → layover តិច ប៉ុន្តែ shadow ច្រើន។ RTC ប្រើ DEM កែ foreshortening ប៉ុន្តែ layover និង shadow ក្លាយជា No Data ព្រោះគ្មានសញ្ញាដែលអាចកែបាន។</span>`;
    };
    el.querySelectorAll("input").forEach((i) => i.addEventListener("input", draw));
    draw(); window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- power, amplitude and dB ---------- */
  window.EXTRA_SIMS["rs-sar-scale"] = (el) => {
    const { cv, ctx, out, q } = shell(el, "ទិន្នន័យ SAR តែមួយ ក្នុង power · amplitude · dB",
      `<span class="sim-seg ss-m"><button type="button" data-v="pow" class="on">Power (σ⁰)</button><button type="button" data-v="amp">Amplitude √σ⁰</button><button type="button" data-v="db">dB = ១០·log₁₀ σ⁰</button></span>
       <label>Looks <input class="ss-l" type="range" min="1" max="16" value="4"> <b class="ss-lv"></b></label>`);
    const n = 160, cls = new Uint8Array(n * n), MEAN = [0.002, 0.025, 0.08, 0.15, 1.2];   // water, bare field, rice, forest, urban (VV)
    const NAMES = ["ទឹក", "ដីរលោង", "ស្រែ", "ព្រៃ", "សំណង់"];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, river = Math.abs(y - 60 - 18 * Math.sin(x / 22)) < 9;
      cls[i] = river ? 0 : x > 112 && y < 70 ? 4 : y > 112 ? 3 : (Math.floor(x / 28) + Math.floor(y / 26)) % 2 ? 2 : 1; }
    let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const gammaL = (L) => { let s = 0; for (let k = 0; k < L; k++) s -= Math.log(rnd() + 1e-12); return s / L; };   // mean-1 speckle
    let mode = "pow", img = null, L0 = -1;
    const gen = (L) => { seed = 3; img = new Float32Array(n * n); for (let i = 0; i < n * n; i++) img[i] = MEAN[cls[i]] * gammaL(L) * (cls[i] === 4 && rnd() < 0.02 ? 8 : 1); };
    el.querySelectorAll(".ss-m button").forEach((b) => (b.onclick = () => { el.querySelectorAll(".ss-m button").forEach((x) => x.classList.toggle("on", x === b)); mode = b.dataset.v; draw(); }));
    const W = 680, H = 300;
    const draw = () => {
      const L = +q(".ss-l").value; q(".ss-lv").textContent = kh(L); if (L !== L0) { gen(L); L0 = L; }
      fit(cv, ctx, W, H); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      const tf = mode === "pow" ? (v) => v : mode === "amp" ? (v) => Math.sqrt(v) : (v) => 10 * Math.log10(v + 1e-6);
      const [lo, hi] = mode === "pow" ? [0, 0.3] : mode === "amp" ? [0, Math.sqrt(0.3) * 1.3] : [-30, 0];
      const id = ctx.createImageData(n, n);
      for (let i = 0; i < n * n; i++) { const g = Math.max(0, Math.min(255, ((tf(img[i]) - lo) / (hi - lo)) * 255)); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = g; id.data[i * 4 + 3] = 255; }
      const off = document.createElement("canvas"); off.width = off.height = n; off.getContext("2d").putImageData(id, 0, 0);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(off, 10, 10, 270, 270);
      // histogram of each class in the current scale
      const hx = 310, hw = 350, hy = 250, bins = 50, cols = ["#1565c0", "#a1887f", "#c0ca33", "#2e7d32", "#c62828"];
      const hs = MEAN.map(() => new Array(bins).fill(0));
      for (let i = 0; i < n * n; i++) { const t = (tf(img[i]) - lo) / (hi - lo); if (t >= 0 && t < 1) hs[cls[i]][Math.floor(t * bins)]++; }
      const mx = Math.max(...hs.flat());
      hs.forEach((hh, c) => { ctx.strokeStyle = cols[c]; ctx.lineWidth = 2; ctx.beginPath(); hh.forEach((v, j) => { const X = hx + (j / bins) * hw, Y = hy - (v / mx) * 200; j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.stroke(); });
      ctx.strokeStyle = "#555"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + hw, hy); ctx.stroke();
      ctx.font = `11px ${font()}`; ctx.fillStyle = "#333"; ctx.textAlign = "left";
      ctx.fillText(mode === "db" ? "−៣០ dB" : "០", hx, hy + 14); ctx.textAlign = "right"; ctx.fillText(mode === "pow" ? "០,៣" : mode === "amp" ? "០,៧" : "០ dB", hx + hw, hy + 14);
      ctx.textAlign = "left"; NAMES.forEach((t, c) => { ctx.fillStyle = cols[c]; ctx.fillRect(hx + c * 72, 22, 10, 10); ctx.fillStyle = "#333"; ctx.fillText(t, hx + 14 + c * 72, 31); });
      const note = { pow: "<b>Power</b>៖ តម្លៃភាគច្រើនជិតសូន្យ ហើយសំណង់ពីរបីក្រឡាធ្វើឲ្យ stretch ខូច។ ល្អសម្រាប់គណនាស្ថិតិ (មធ្យម) ប៉ុន្តែពិបាកមើល។ ទឹក និងដីរលោងស្ទើរដូចគ្នា។",
        amp: "<b>Amplitude</b>៖ ឫសការេបង្រួមជួរ ធ្វើឲ្យរូបភាពមើលទៅធម្មជាតិជាង។",
        db: "<b>dB</b>៖ លោការីតពង្រីកតម្លៃទាប ដូច្នេះទឹក (ប្រហែល −២៧ dB) បំបែកចេញពីដីទទេ (−១៦ dB) ច្បាស់។ ល្អសម្រាប់កំណត់កម្រិតទឹក ប៉ុន្តែកុំគណនាមធ្យមក្នុង dB៖ គណនាក្នុង power រួចបម្លែង។" }[mode];
      out.innerHTML = `${note}<br>Looks ${kh(L)}៖ ការបូកមធ្យម (multi-look) កាត់ speckle ប៉ុន្តែបង្រួមភាពច្បាស់លំហ។ <span class="sim-hint">រូបភាពក្លែងធ្វើ៖ មធ្យម VV ទឹក ០,០០២ · ដីរលោង ០,០២៥ · ស្រែ ០,០៨ · ព្រៃ ០,១៥ · សំណង់ ១,២ (power)។</span>`;
    };
    q(".ss-l").addEventListener("input", draw); draw(); window.addEventListener("resize", () => el.isConnected && draw());
  };
})();
