/* ============================================================
   Remote-sensing simulators · Book 3 (khgeo/remote-sensing)
   Registered into window.EXTRA_SIMS; rendered by lesson-sims.js.
   The sample scene is SYNTHETIC but uses realistic Sentinel-2
   surface-reflectance values for water, forest, rice, built-up
   and bare soil.
   ============================================================ */
(function () {
  "use strict";
  const KM = "០១២៣៤៥៦៧៨៩";
  const kh = (n) => String(n).replace(/[0-9]/g, (d) => KM[d]);
  const fmtN = (n, dec = 0) => kh(Number(n).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/,/g, " ").replace(".", ","));
  const font = () => getComputedStyle(document.body).fontFamily;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  window.EXTRA_SIMS = window.EXTRA_SIMS || {};
  const ramp = (t, stops) => { t = clamp(t, 0, 1); const n = stops.length - 1, i = Math.min(n - 1, Math.floor(t * n)), f = t * n - i; const a = stops[i], b = stops[i + 1]; return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(",")})`; };

  /* ---------- sample scene ---------- */
  let scene = null;
  const loadScene = async () => {
    if (scene) return scene;
    const j = await (await fetch(new URL("../../assets/data/scene_sample.json", location.href))).json();
    const bin = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
    const raw = bin(j.data), n = j.n, nb = j.bands.length;
    const b = []; for (let k = 0; k < nb; k++) b.push(raw.subarray(k * n * n, (k + 1) * n * n));
    scene = { n, nb, names: j.bands, scale: j.scale, px: j.px_m, classes: j.classes, band: b, cls: bin(j.cls) };
    return scene;
  };
  const refl = (S, b, i) => S.band[b][i] * S.scale;          // surface reflectance 0–0.6
  const CLSCOL = [[38, 108, 168], [27, 94, 32], [124, 179, 66], [183, 28, 28], [161, 136, 107]];

  const shell = (el, title, controls, extra = "") => {
    el.innerHTML = `<div class="sim-title">${title}</div><div class="sim-controls">${controls}</div>
      <div class="sim-body"><div class="sim-canvas-wrap"><canvas></canvas></div>${extra}</div><div class="sim-out"></div>`;
    const cv = el.querySelector("canvas"), ctx = cv.getContext("2d");
    return { cv, ctx, out: el.querySelector(".sim-out"), q: (s) => el.querySelector(s) };
  };
  const fit = (cv, ctx, W, H) => { const w = cv.parentElement.clientWidth || W, s = w / W, d = window.devicePixelRatio || 1;
    cv.style.width = w + "px"; cv.style.height = H * s + "px"; cv.width = w * d; cv.height = H * s * d; ctx.setTransform(s * d, 0, 0, s * d, 0, 0); ctx.imageSmoothingEnabled = false; };

  /* draw the scene (band triple, simple 2 % linear stretch) into an ImageData */
  const composite = (S, rgbBands, size, agg) => {
    const out = new Uint8ClampedArray(size * size * 4);
    const step = S.n / size;
    const lo = [], hi = [];
    rgbBands.forEach((b) => { const v = Array.from(S.band[b]).sort((a, c) => a - c);
      lo.push(v[Math.floor(v.length * 0.02)]); hi.push(v[Math.floor(v.length * 0.98)]); });
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const px = [];
      for (let k = 0; k < 3; k++) {
        let sum = 0, cnt = 0;
        for (let yy = Math.floor(y * step); yy < Math.ceil((y + 1) * step); yy++)
          for (let xx = Math.floor(x * step); xx < Math.ceil((x + 1) * step); xx++) { sum += S.band[rgbBands[k]][yy * S.n + xx]; cnt++; }
        const v = agg ? sum / cnt : S.band[rgbBands[k]][Math.floor(y * step) * S.n + Math.floor(x * step)];
        px.push(clamp(((v - lo[k]) / (hi[k] - lo[k])) * 255, 0, 255));
      }
      const o = (y * size + x) * 4; out[o] = px[0]; out[o + 1] = px[1]; out[o + 2] = px[2]; out[o + 3] = 255;
    }
    return new ImageData(out, size, size);
  };
  const putScaled = (ctx, img, x, y, w) => {
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    c.getContext("2d").putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(c, x, y, w, w);
  };

  /* ---------- L1 · what a satellite sees ---------- */
  window.EXTRA_SIMS["rs-view"] = async (el) => {
    const S = await loadScene();
    const { cv, ctx, out, q } = shell(el, "តើផ្កាយរណបឃើញអ្វី?",
      `<span class="sim-seg rv-c"><button type="button" data-c="true" class="on">ពណ៌ពិត (B4-B3-B2)</button><button type="button" data-c="false">ពណ៌សន្មត (B8-B4-B3)</button><button type="button" data-c="swir">SWIR (B12-B8-B4)</button></span>
       <label><input type="checkbox" class="rv-l"> បង្ហាញស្រទាប់គម្របដី</label>`);
    const W = 640, H = 340;
    const draw = () => {
      fit(cv, ctx, W, H); const c = el.querySelector(".rv-c .on").dataset.c, showCls = q(".rv-l").checked;
      const combo = { true: [2, 1, 0], false: [3, 2, 1], swir: [5, 3, 2] }[c];
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      putScaled(ctx, composite(S, combo, S.n, false), 14, 18, 300);
      if (showCls) { const img = ctx.createImageData(S.n, S.n);
        for (let i = 0; i < S.n * S.n; i++) { const col = CLSCOL[S.cls[i]]; const o = i * 4;
          img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255; }
        putScaled(ctx, img, 330, 18, 300);
        ctx.font = `12px ${font()}`;
        S.classes.forEach((t, i) => { ctx.fillStyle = `rgb(${CLSCOL[i].join(",")})`; ctx.fillRect(330 + i * 62, 324, 14, 11);
          ctx.fillStyle = "#333"; ctx.font = `10px ${font()}`; ctx.fillText(t, 330 + i * 62, 320); });
      } else {
        ctx.font = `12px ${font()}`; ctx.fillStyle = "#333";
        const rows = { true: [["ទឹក", "ខ្មៅ ឬខៀវងងឹត"], ["ព្រៃឈើ", "បៃតងចាស់"], ["ស្រែ", "បៃតងស្រាល"], ["តំបន់សាងសង់", "ប្រផេះ ស"], ["ដីទទេ", "ត្នោតស"]],
          false: [["ទឹក", "ខ្មៅ (ស្រូបអ៊ីនហ្វ្រាក្រហម)"], ["ព្រៃឈើ", "ក្រហមចាស់"], ["ស្រែ", "ក្រហមភ្លឺ"], ["តំបន់សាងសង់", "ប្រផេះ ខៀវស្រាល"], ["ដីទទេ", "បៃតងស ឬត្នោត"]],
          swir: [["ទឹក", "ខ្មៅ"], ["ព្រៃឈើ", "បៃតងចាស់"], ["ស្រែសើម", "បៃតង"], ["តំបន់សាងសង់", "ស្វាយ ផ្កាឈូក"], ["ដីទទេ", "ផ្កាឈូកភ្លឺ"]] }[c];
        ctx.fillText("វត្ថុនីមួយៗលេចឡើងយ៉ាងណា", 330, 34);
        rows.forEach(([a, b], i) => { ctx.fillStyle = "#333"; ctx.font = `12px ${font()}`; ctx.fillText(a, 330, 62 + i * 26);
          ctx.fillStyle = "#666"; ctx.fillText(b, 450, 62 + i * 26); });
      }
      const NOTE = { true: "ពណ៌ពិតប្រើរលកដែលភ្នែកមនុស្សឃើញ (ក្រហម បៃតង ខៀវ)។ វាមើលទៅធម្មជាតិ ប៉ុន្តែពិបាកបែងចែករុក្ខជាតិ។",
        false: "ពណ៌សន្មតបញ្ចូលអ៊ីនហ្វ្រាក្រហមជិត (B8) ជាពណ៌ក្រហម។ រុក្ខជាតិដែលមានសុខភាពល្អឆ្លុះអ៊ីនហ្វ្រាក្រហមខ្លាំង ដូច្នេះវាក្លាយជាក្រហមភ្លឺ។",
        swir: "SWIR (B12) ជួយបែងចែកសំណើម ដី និងតំបន់សាងសង់ ព្រមទាំងអាចមើលឆ្លងផ្សែងបានខ្លះ។" }[c];
      out.innerHTML = `${NOTE}<br><span class="sim-hint">ទិដ្ឋភាពគំរូ ២០០ × ២០០ ក្រឡា ក្រឡា ១០ ម (ប្រហែល ២ × ២ គម) · តម្លៃចាំងផ្លាតជាតម្លៃសំយោគតាមបែប Sentinel-2។</span>`;
    };
    el.querySelectorAll(".rv-c button").forEach((b) => (b.onclick = () => { el.querySelectorAll(".rv-c button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); draw(); }));
    q(".rv-l").addEventListener("change", draw); draw();
    window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L1 · pixel size and what you can identify ---------- */
  window.EXTRA_SIMS["rs-resolution"] = async (el) => {
    const S = await loadScene();
    const { cv, ctx, out, q } = shell(el, "ទំហំក្រឡា៖ អ្នកអាចសម្គាល់អ្វីខ្លះ?",
      `<label>ទំហំក្រឡា <select class="rr-p"><option value="10" selected>១០ ម (Sentinel-2)</option><option value="20">២០ ម (Sentinel-2 SWIR)</option><option value="30">៣០ ម (Landsat)</option><option value="60">៦០ ម</option><option value="250">២៥០ ម (MODIS)</option></select></label>
       <label><input type="checkbox" class="rr-m" checked> ក្រឡាចម្រុះ (mixed pixels)</label>`);
    const W = 640, H = 350;
    const draw = () => {
      fit(cv, ctx, W, H); const px = +q(".rr-p").value, mix = q(".rr-m").checked;
      const factor = px / S.px, size = Math.max(1, Math.round(S.n / factor));
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      putScaled(ctx, composite(S, [2, 1, 0], S.n, false), 12, 18, 300);
      putScaled(ctx, composite(S, [2, 1, 0], size, mix), 326, 18, 300);
      ctx.font = `12px ${font()}`; ctx.fillStyle = "#333";
      ctx.fillText("១០ ម (ដើម)", 12, 334); ctx.fillText(`${kh(px)} ម`, 326, 334);
      const canSee = [["ផ្ទះមួយខ្នង (១៥ ម)", 10], ["ផ្លូវជាតិ (២០ ម)", 20], ["ស្រែមួយក្បាល (១០០ ម)", 60], ["ភូមិ (៣០០ ម)", 250], ["តំបន់ព្រៃ (គីឡូម៉ែត្រ)", 1000]];
      const ok = canSee.filter(([, r]) => px <= r).length;
      out.innerHTML = `ក្រឡា ១ = <b>${fmtN(px * px / 10000, 2)} ហ.ត</b> · រូបភាពមាន <b>${fmtN(size * size)}</b> ក្រឡា (ធៀបនឹង ${fmtN(S.n * S.n)})<br>` +
        canSee.map(([t, r]) => `<span style="color:${px <= r ? "#2e7d32" : "#c62828"}">${px <= r ? "✓" : "✗"} ${t}</span>`).join(" · ") +
        `<br><span class="sim-hint">${mix ? "ក្រឡាចម្រុះ៖ តម្លៃក្រឡាធំជាមធ្យមនៃវត្ថុច្រើនប្រភេទ ដូច្នេះព្រំដែនក្លាយជាព្រិល។" : "គំរូដោយយកក្រឡាកណ្ដាល (nearest)៖ វត្ថុតូចៗអាចបាត់ទាំងស្រុង។"}</span>`;
    };
    el.querySelectorAll("select,input").forEach((x) => x.addEventListener("change", draw)); draw();
    window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L2 · EM spectrum, atmospheric windows and sensor bands ---------- */
  const S2BANDS = [["B1", 443, 20], ["B2", 490, 65], ["B3", 560, 35], ["B4", 665, 30], ["B5", 705, 15], ["B6", 740, 15], ["B7", 783, 20],
    ["B8", 842, 115], ["B8A", 865, 20], ["B9", 945, 20], ["B10", 1375, 30], ["B11", 1610, 90], ["B12", 2190, 180]];
  const L8BANDS = [["B1", 443, 16], ["B2", 482, 60], ["B3", 561, 57], ["B4", 655, 37], ["B5", 865, 28], ["B6", 1609, 85], ["B7", 2201, 187], ["B9", 1373, 20]];
  /* very simplified atmospheric transmission (0.4–14 µm) for teaching */
  const transmission = (um) => {
    const dip = (c, w, d) => d * Math.exp(-((um - c) ** 2) / (2 * w * w));
    if (um < 0.30) return 0.02;
    let t = 0.95;
    if (um < 0.40) t = 0.35 + (um - 0.30) * 5;                       // ozone / UV
    t -= dip(0.76, 0.012, 0.35);                                      // O2
    t -= dip(0.94, 0.03, 0.55) + dip(1.13, 0.04, 0.7);                // H2O
    t -= dip(1.40, 0.06, 0.98) + dip(1.88, 0.07, 0.98);               // H2O (blocked)
    t -= dip(2.70, 0.16, 0.99) + dip(4.30, 0.12, 0.95);               // H2O / CO2
    t -= dip(6.20, 0.45, 0.98);                                       // H2O
    t -= dip(9.60, 0.22, 0.45);                                       // O3
    if (um > 5.2 && um < 7.6) t = Math.min(t, 0.06);
    if (um > 13.5) t = Math.max(0.03, t - (um - 13.5) * 0.25);
    return clamp(t, 0.01, 0.98);
  };
  window.EXTRA_SIMS["rs-spectrum"] = (el) => {
    const { cv, ctx, out, q } = shell(el, "វិសាលគមអេឡិចត្រូម៉ាញេទិច និងបង្អួចបរិយាកាស",
      `<span class="sim-seg sp-s"><button type="button" data-s="s2" class="on">Sentinel-2</button><button type="button" data-s="l8">Landsat 8/9</button><button type="button" data-s="none">គ្មានក្រុមរលក</button></span>
       <label><input type="checkbox" class="sp-t" checked> ខ្សែបញ្ជូនបរិយាកាស</label>
       <span class="sim-hint">ដាក់កណ្ដុរលើក្រាប ដើម្បីអានរលក និងការបញ្ជូន</span>`);
    const W = 640, H = 330, X0 = 48, X1 = 620, Y0 = 40, Y1 = 220;
    const lo = Math.log10(0.35), hi = Math.log10(14);
    const X = (um) => X0 + ((Math.log10(um) - lo) / (hi - lo)) * (X1 - X0);
    let hover = null;
    const REG = [[0.38, 0.45, "ស្វាយ", "#7e57c2"], [0.45, 0.50, "ខៀវ", "#1e88e5"], [0.50, 0.57, "បៃតង", "#43a047"], [0.57, 0.59, "លឿង", "#fdd835"],
      [0.59, 0.62, "ទឹកក្រូច", "#fb8c00"], [0.62, 0.75, "ក្រហម", "#e53935"], [0.75, 1.3, "NIR", "#8d6e63"], [1.3, 3.0, "SWIR", "#6d4c41"], [3.0, 14, "កំដៅ (TIR)", "#455a64"]];
    const draw = () => {
      fit(cv, ctx, W, H); const src = el.querySelector(".sp-s .on").dataset.s, showT = q(".sp-t").checked;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      REG.forEach(([a, b, name, col]) => { ctx.fillStyle = col; ctx.globalAlpha = 0.16; ctx.fillRect(X(a), Y0, X(b) - X(a), Y1 - Y0); ctx.globalAlpha = 1;
        if (X(b) - X(a) > 26) { ctx.save(); ctx.translate((X(a) + X(b)) / 2, Y0 - 6); ctx.fillStyle = col; ctx.font = `10px ${font()}`; ctx.textAlign = "center"; ctx.fillText(name, 0, 0); ctx.restore(); } });
      ctx.textAlign = "left";
      if (showT) { ctx.beginPath();
        for (let i = 0; i <= 600; i++) { const um = 10 ** (lo + ((hi - lo) * i) / 600), x = X(um), y = Y1 - transmission(um) * (Y1 - Y0);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.lineTo(X1, Y1); ctx.lineTo(X0, Y1); ctx.closePath(); ctx.fillStyle = "rgba(2,119,189,.18)"; ctx.fill();
        ctx.beginPath();
        for (let i = 0; i <= 600; i++) { const um = 10 ** (lo + ((hi - lo) * i) / 600), x = X(um), y = Y1 - transmission(um) * (Y1 - Y0);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.strokeStyle = "#0277bd"; ctx.lineWidth = 1.6; ctx.stroke(); }
      ctx.strokeStyle = "#555"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X0, Y1); ctx.lineTo(X1, Y1); ctx.moveTo(X0, Y0); ctx.lineTo(X0, Y1); ctx.stroke();
      ctx.font = `11px ${font()}`; ctx.fillStyle = "#555";
      [0.4, 0.5, 0.7, 1, 1.5, 2, 3, 5, 8, 12].forEach((t) => { ctx.fillText(String(t).replace(".", ","), X(t) - 6, Y1 + 16);
        ctx.strokeStyle = "#eee"; ctx.beginPath(); ctx.moveTo(X(t), Y0); ctx.lineTo(X(t), Y1); ctx.stroke(); });
      ctx.fillText("មីក្រូម៉ែត្រ (µm)", X1 - 70, Y1 + 32); ctx.save(); ctx.translate(14, (Y0 + Y1) / 2 + 30); ctx.rotate(-Math.PI / 2); ctx.fillText("ការបញ្ជូន ០–១០០%", 0, 0); ctx.restore();
      const bands = src === "s2" ? S2BANDS : src === "l8" ? L8BANDS : [];
      bands.forEach(([n, c, w]) => { const um = c / 1000, x1 = X((c - w / 2) / 1000), x2 = X((c + w / 2) / 1000);
        ctx.fillStyle = "rgba(230,81,0,.55)"; ctx.fillRect(x1, Y1 - 12, Math.max(1.6, x2 - x1), 12);
        ctx.fillStyle = "#bf360c"; ctx.font = `9px ${font()}`; ctx.save(); ctx.translate((x1 + x2) / 2 + 3, Y1 + 30); ctx.rotate(-Math.PI / 3); ctx.fillText(n, 0, 0); ctx.restore(); });
      if (src === "l8") { [10.9, 12.0].forEach((um, i) => { const x = X(um);
        ctx.fillStyle = "rgba(230,81,0,.55)"; ctx.fillRect(x - 4, Y1 - 12, 8, 12);
        ctx.fillStyle = "#bf360c"; ctx.save(); ctx.translate(x + 3, Y1 + 34); ctx.rotate(-Math.PI / 3); ctx.fillText("B" + (10 + i), 0, 0); ctx.restore(); }); }
      const info = hover ? `រលក <b>${fmtN(hover.um, 2)} µm</b> · ការបញ្ជូន <b>${fmtN(transmission(hover.um) * 100)}%</b>` : "ដាក់កណ្ដុរលើក្រាបដើម្បីអានតម្លៃ";
      out.innerHTML = `${info}<br><span class="sim-hint">តំបន់ដែលការបញ្ជូនខ្ពស់ហៅថា <b>បង្អួចបរិយាកាស</b>។ សង្កេតថាក្រុមរលករបស់ផ្កាយរណបស្ថិតក្នុងបង្អួច ហើយចន្លោះ ១,៤ និង ១,៩ µm គ្មានក្រុមរលកសម្រាប់ផ្ទៃដីទេ ព្រោះចំហាយទឹកស្រូបស្ទើរទាំងស្រុង (លើកលែង B10 ដែលប្រើរកពពក cirrus)។</span>`;
    };
    cv.addEventListener("mousemove", (e) => { const r = cv.getBoundingClientRect(), sx = r.width / W, x = (e.clientX - r.left) / sx;
      hover = x >= X0 && x <= X1 ? { um: 10 ** (lo + ((x - X0) / (X1 - X0)) * (hi - lo)) } : null; draw(); });
    cv.addEventListener("mouseleave", () => { hover = null; draw(); });
    el.querySelectorAll(".sp-s button").forEach((b) => (b.onclick = () => { el.querySelectorAll(".sp-s button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); draw(); }));
    q(".sp-t").addEventListener("change", draw); draw();
    window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L2 · scattering ---------- */
  window.EXTRA_SIMS["rs-scatter"] = (el) => {
    const { cv, ctx, out, q } = shell(el, "ការខ្ចាត់ខ្ចាយក្នុងបរិយាកាស",
      `<span class="sim-seg sc-t"><button type="button" data-t="rayleigh" class="on">Rayleigh (ម៉ូលេគុល)</button><button type="button" data-t="mie">Mie (អាកាសត្រាត)</button><button type="button" data-t="non">មិនជ្រើសរើស (ពពក)</button></span>`);
    const W = 640, H = 300;
    const draw = () => {
      fit(cv, ctx, W, H); const t = el.querySelector(".sc-t .on").dataset.t;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      const X0 = 60, X1 = 340, Y0 = 56, Y1 = 220, barTop = Y0 + 24;
      const bands = [["ខៀវ", 0.47, "#1e88e5"], ["បៃតង", 0.56, "#43a047"], ["ក្រហម", 0.66, "#e53935"], ["NIR", 0.84, "#6d4c41"], ["SWIR", 1.6, "#455a64"]];
      const rel = (um) => (t === "rayleigh" ? Math.pow(0.47 / um, 4) : t === "mie" ? Math.pow(0.47 / um, 1.3) : 1);
      const mx = Math.max(...bands.map(([, u]) => rel(u)));
      ctx.strokeStyle = "#555"; ctx.beginPath(); ctx.moveTo(X0, Y1); ctx.lineTo(X1, Y1); ctx.stroke();
      ctx.font = `12px ${font()}`; ctx.fillStyle = "#333"; ctx.fillText("ការខ្ចាត់ខ្ចាយធៀប (ខៀវ = ១០០%)", X0, 22);
      bands.forEach(([n, um, col], i) => { const h = (rel(um) / mx) * (Y1 - barTop), x = X0 + 10 + i * 54;
        ctx.fillStyle = col; ctx.fillRect(x, Y1 - h, 34, h);
        ctx.fillStyle = "#333"; ctx.font = `11px ${font()}`; ctx.fillText(n, x - 2, Y1 + 16); ctx.fillText(fmtN(rel(um) / mx * 100) + "%", x - 2, Y1 - h - 6); });
      // picture
      const cx = 480, cy = 130;
      ctx.fillStyle = "#e3f2fd"; ctx.fillRect(390, 30, 230, 200);
      ctx.strokeStyle = "#90a4ae"; ctx.strokeRect(390, 30, 230, 200);
      const n = t === "rayleigh" ? 90 : t === "mie" ? 40 : 14, r = t === "rayleigh" ? 1.6 : t === "mie" ? 4 : 12;
      let seed = 4; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(396 + rnd() * 218, 36 + rnd() * 188, r, 0, 7);
        ctx.fillStyle = t === "non" ? "rgba(255,255,255,.95)" : "rgba(120,144,156,.55)"; ctx.fill(); }
      ctx.strokeStyle = t === "rayleigh" ? "#1e88e5" : t === "mie" ? "#90a4ae" : "#fff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(390, 60); ctx.lineTo(cx, cy); ctx.stroke();
      for (let a = 0; a < 8; a++) { const ang = (a / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * 40, cy + Math.sin(ang) * 40); ctx.stroke(); }
      const NOTE = { rayleigh: "ការខ្ចាត់ខ្ចាយ Rayleigh កើតពីម៉ូលេគុលខ្យល់ ដែលតូចជាងរលកច្រើន។ កម្លាំងរបស់វាសមាមាត្រនឹង ១/λ⁴ ដូច្នេះរលកខៀវខ្ចាត់ខ្ចាយខ្លាំងជាងក្រហមប្រហែល ៤ ដង។ នេះជាមូលហេតុដែលមេឃមានពណ៌ខៀវ ហើយក្រុមរលកខៀវ (B2) មានអ័ព្ទច្រើនជាងគេក្នុងរូបភាព។",
        mie: "ការខ្ចាត់ខ្ចាយ Mie កើតពីភាគល្អិតដែលមានទំហំប្រហាក់ប្រហែលរលក ដូចជាធូលី ផ្សែង និងអាកាសត្រាត។ វាប៉ះពាល់រលកវែងជាងផង ហើយធ្វើឲ្យរូបភាពស្រអាប់ក្នុងថ្ងៃដែលមានផ្សែងដុតចម្ការ។",
        non: "ការខ្ចាត់ខ្ចាយមិនជ្រើសរើសកើតពីដំណក់ទឹកក្នុងពពក ដែលធំជាងរលកច្រើន។ វាខ្ចាត់ខ្ចាយគ្រប់រលកស្មើៗគ្នា ដូច្នេះពពកមើលទៅពណ៌ស ហើយបាំងផ្ទៃដីទាំងស្រុងចំពោះឧបករណ៍អុបទិក។" }[t];
      out.innerHTML = NOTE;
    };
    el.querySelectorAll(".sc-t button").forEach((b) => (b.onclick = () => { el.querySelectorAll(".sc-t button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); draw(); }));
    draw(); window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L3 · spectral signatures + pixel probe ---------- */
  const SIG = {
    "ទឹកស្អាត": { col: "#1565c0", v: [[0.44, .045], [0.49, .045], [0.56, .04], [0.665, .028], [0.705, .02], [0.842, .012], [1.61, .006], [2.19, .004]] },
    "ទឹកល្បាក់": { col: "#4dd0e1", v: [[0.44, .06], [0.49, .075], [0.56, .105], [0.665, .11], [0.705, .10], [0.842, .06], [1.61, .02], [2.19, .012]] },
    "ព្រៃឈើ": { col: "#1b5e20", v: [[0.44, .028], [0.49, .03], [0.56, .055], [0.665, .028], [0.705, .10], [0.842, .34], [1.61, .15], [2.19, .065]] },
    "ស្រែខ្ចី": { col: "#7cb342", v: [[0.44, .04], [0.49, .045], [0.56, .085], [0.665, .045], [0.705, .13], [0.842, .40], [1.61, .21], [2.19, .10]] },
    "ស្រែស្ងួត": { col: "#c0ca33", v: [[0.44, .07], [0.49, .09], [0.56, .14], [0.665, .17], [0.705, .20], [0.842, .28], [1.61, .33], [2.19, .26]] },
    "ដីទទេ": { col: "#a1887f", v: [[0.44, .10], [0.49, .13], [0.56, .17], [0.665, .21], [0.705, .23], [0.842, .27], [1.61, .33], [2.19, .29]] },
    "តំបន់សាងសង់": { col: "#b71c1c", v: [[0.44, .11], [0.49, .125], [0.56, .145], [0.665, .16], [0.705, .17], [0.842, .20], [1.61, .26], [2.19, .23]] },
  };
  window.EXTRA_SIMS["rs-signature"] = (el) => {
    const names = Object.keys(SIG);
    const { cv, ctx, out, q } = shell(el, "សញ្ញាណស្ពិចត្រាល់",
      `<span class="sim-controls-inline">${names.map((n, i) => `<label><input type="checkbox" class="sg" value="${n}" ${i < 3 ? "checked" : ""}> ${n}</label>`).join(" ")}</span>
       <label><input type="checkbox" class="sg-b" checked> ក្រុមរលក Sentinel-2</label>`);
    const W = 640, H = 340, X0 = 54, X1 = 470, Y0 = 30, Y1 = 250;
    const lo = 0.4, hi = 2.35;
    const X = (um) => X0 + ((um - lo) / (hi - lo)) * (X1 - X0), Y = (r) => Y1 - (r / 0.45) * (Y1 - Y0);
    const draw = () => {
      fit(cv, ctx, W, H);
      const sel = [...el.querySelectorAll(".sg")].filter((c) => c.checked).map((c) => c.value);
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      if (q(".sg-b").checked) S2BANDS.filter(([, c]) => c / 1000 >= lo && c / 1000 <= hi && c !== 1375).forEach(([n, c, w]) => {
        ctx.fillStyle = "rgba(120,144,156,.14)"; ctx.fillRect(X((c - w / 2) / 1000), Y0, Math.max(1.5, X((c + w / 2) / 1000) - X((c - w / 2) / 1000)), Y1 - Y0);
        ctx.fillStyle = "#78909c"; ctx.font = `8px ${font()}`; ctx.save(); ctx.translate(X(c / 1000) + 3, Y1 + 26); ctx.rotate(-Math.PI / 3); ctx.fillText(n, 0, 0); ctx.restore(); });
      ctx.strokeStyle = "#555"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X0, Y1); ctx.lineTo(X1, Y1); ctx.moveTo(X0, Y0); ctx.lineTo(X0, Y1); ctx.stroke();
      ctx.font = `11px ${font()}`; ctx.fillStyle = "#555";
      [0, 0.1, 0.2, 0.3, 0.4].forEach((r) => { ctx.fillText(fmtN(r * 100), 22, Y(r) + 4); ctx.strokeStyle = "#f0f0f0"; ctx.beginPath(); ctx.moveTo(X0, Y(r)); ctx.lineTo(X1, Y(r)); ctx.stroke(); });
      [0.5, 1.0, 1.5, 2.0].forEach((u) => ctx.fillText(String(u).replace(".", ","), X(u) - 8, Y1 + 16));
      ctx.fillText("ការចាំងផ្លាត %", 16, Y0 - 10); ctx.fillText("រលក µm", X1 - 44, Y1 + 34);
      sel.forEach((n) => { const s2 = SIG[n]; ctx.beginPath();
        s2.v.forEach(([um, r], i) => (i ? ctx.lineTo(X(um), Y(r)) : ctx.moveTo(X(um), Y(r))));
        ctx.strokeStyle = s2.col; ctx.lineWidth = 2.2; ctx.stroke();
        s2.v.forEach(([um, r]) => { ctx.beginPath(); ctx.arc(X(um), Y(r), 2.6, 0, 7); ctx.fillStyle = s2.col; ctx.fill(); }); });
      let ly = Y0 + 10; ctx.font = `12px ${font()}`;
      sel.forEach((n) => { ctx.strokeStyle = SIG[n].col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(492, ly); ctx.lineTo(516, ly); ctx.stroke();
        ctx.fillStyle = "#333"; ctx.fillText(n, 524, ly + 4); ly += 22; });
      // separability hint at B4 / B8
      if (sel.length >= 2) {
        const at = (n, um) => { const v = SIG[n].v; for (let i = 1; i < v.length; i++) if (v[i][0] >= um) { const [u0, r0] = v[i - 1], [u1, r1] = v[i]; return r0 + ((r1 - r0) * (um - u0)) / (u1 - u0); } return v[v.length - 1][1]; };
        const pairs = [];
        for (let i = 0; i < sel.length; i++) for (let j = i + 1; j < sel.length; j++) {
          const d = [0.665, 0.842, 1.61].map((u) => Math.abs(at(sel[i], u) - at(sel[j], u)));
          const best = [["B4", d[0]], ["B8", d[1]], ["B11", d[2]]].sort((a, b) => b[1] - a[1])[0];
          pairs.push(`${sel[i]} ↔ ${sel[j]}៖ បែងចែកបានល្អបំផុតក្នុង <b>${best[0]}</b> (ភាពខុសគ្នា ${fmtN(best[1] * 100, 1)} ពិន្ទុ%)`);
        }
        out.innerHTML = pairs.slice(0, 4).join("<br>") + `<br><span class="sim-hint">តម្លៃជាតម្លៃធម្មតា (typical) សម្រាប់បង្រៀន។ សញ្ញាណពិតប្រែប្រួលតាមសំណើម រដូវ និងមុំមើល។</span>`;
      } else out.innerHTML = `ជ្រើសយ៉ាងតិចពីរប្រភេទ ដើម្បីប្រៀបធៀបភាពបែងចែក។`;
    };
    el.querySelectorAll("input").forEach((c) => c.addEventListener("change", draw)); draw();
    window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* pixel probe on the sample scene */
  window.EXTRA_SIMS["rs-probe"] = async (el) => {
    const S = await loadScene();
    const { cv, ctx, out } = shell(el, "ចុចលើរូបភាព ដើម្បីអានសញ្ញាណរបស់ក្រឡា", `<span class="sim-hint">ចុច ឬអូសលើរូបភាពខាងឆ្វេង</span>`);
    const W = 640, H = 330, MS = 290, ox = 12, oy = 20;
    let pick = { x: Math.floor(S.n * 0.3), y: Math.floor(S.n * 0.3) };
    const um = [0.49, 0.56, 0.665, 0.842, 1.61, 2.19];
    const draw = () => {
      fit(cv, ctx, W, H);
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      putScaled(ctx, composite(S, [2, 1, 0], S.n, false), ox, oy, MS);
      const px = ox + (pick.x / S.n) * MS, py = oy + (pick.y / S.n) * MS;
      ctx.strokeStyle = "#ffeb3b"; ctx.lineWidth = 2; ctx.strokeRect(px - 5, py - 5, 10, 10);
      const i = pick.y * S.n + pick.x, vals = [0, 1, 2, 3, 4, 5].map((b) => refl(S, b, i));
      const X0 = 340, X1 = 620, Y0 = 40, Y1 = 230;
      const X = (u) => X0 + ((Math.log10(u) - Math.log10(0.45)) / (Math.log10(2.3) - Math.log10(0.45))) * (X1 - X0);
      const Y = (r) => Y1 - (r / 0.45) * (Y1 - Y0);
      ctx.strokeStyle = "#555"; ctx.beginPath(); ctx.moveTo(X0, Y1); ctx.lineTo(X1, Y1); ctx.moveTo(X0, Y0); ctx.lineTo(X0, Y1); ctx.stroke();
      ctx.font = `10px ${font()}`; ctx.fillStyle = "#666";
      [0, 0.1, 0.2, 0.3, 0.4].forEach((r) => ctx.fillText(fmtN(r * 100), X0 - 24, Y(r) + 4));
      ctx.beginPath(); vals.forEach((r, k) => (k ? ctx.lineTo(X(um[k]), Y(r)) : ctx.moveTo(X(um[k]), Y(r))));
      ctx.strokeStyle = "#e65100"; ctx.lineWidth = 2.2; ctx.stroke();
      vals.forEach((r, k) => { ctx.beginPath(); ctx.arc(X(um[k]), Y(r), 3, 0, 7); ctx.fillStyle = "#e65100"; ctx.fill();
        ctx.fillStyle = "#666"; ctx.fillText(S.names[k], X(um[k]) - 8, Y1 + 14); });
      const ndvi = (vals[3] - vals[2]) / (vals[3] + vals[2]), ndwi = (vals[1] - vals[3]) / (vals[1] + vals[3]);
      out.innerHTML = `ក្រឡា (${kh(pick.x)}, ${kh(pick.y)}) · គម្របដីពិត៖ <b>${S.classes[S.cls[i]]}</b><br>` +
        S.names.map((n, k) => `${n} ${fmtN(vals[k] * 100, 1)}%`).join(" · ") +
        `<br>NDVI = <b>${fmtN(ndvi, 2)}</b> · NDWI = <b>${fmtN(ndwi, 2)}</b> <span class="sim-hint">(សន្ទស្សន៍នឹងសិក្សាក្នុងមេរៀនទី១០)</span>`;
    };
    const pickAt = (e) => { const r = cv.getBoundingClientRect(), s2 = r.width / W;
      const x = (e.clientX - r.left) / s2 - ox, y = (e.clientY - r.top) / s2 - oy;
      if (x < 0 || y < 0 || x > MS || y > MS) return;
      pick = { x: clamp(Math.floor((x / MS) * S.n), 0, S.n - 1), y: clamp(Math.floor((y / MS) * S.n), 0, S.n - 1) }; draw(); };
    cv.addEventListener("pointerdown", pickAt);
    cv.addEventListener("pointermove", (e) => { if (e.buttons) pickAt(e); });
    draw(); window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L4 · orbit, swath and revisit ---------- */
  let wl = null;
  window.EXTRA_SIMS["rs-orbit"] = async (el) => {
    if (!wl) wl = await (await fetch(new URL("../../assets/data/world_land.json", location.href))).json();
    const { cv, ctx, out, q } = shell(el, "គន្លង ទទឹងថត និងរយៈពេលមកម្ដងទៀត",
      `<label>ផ្កាយរណប <select class="ob-s"><option value="s2">Sentinel-2 (២៩០ គម · ៥ ថ្ងៃ)</option><option value="l8">Landsat 8/9 (១៨៥ គម · ១៦ ថ្ងៃ)</option><option value="modis">MODIS (២ ៣៣០ គម · ១ ថ្ងៃ)</option></select></label>
       <label>ចំនួនគន្លង <b class="ob-nv"></b> <input type="range" class="ob-n" min="1" max="30" value="8"></label>`);
    const W = 640, H = 330, X0 = 10, Y0 = 20, MW = 620, MH = 290;
    const SAT = { s2: { swath: 290, days: 5, orbits: 14.3, col: "#e65100" }, l8: { swath: 185, days: 16, orbits: 14.6, col: "#1565c0" }, modis: { swath: 2330, days: 1, orbits: 14.1, col: "#2e7d32" } };
    const X = (lon) => X0 + ((lon + 180) / 360) * MW, Y = (lat) => Y0 + ((90 - lat) / 180) * MH;
    const draw = () => {
      fit(cv, ctx, W, H); const s2 = SAT[q(".ob-s").value], n = +q(".ob-n").value;
      q(".ob-nv").textContent = kh(n);
      ctx.fillStyle = "#dbeafe"; ctx.fillRect(X0, Y0, MW, MH);
      ctx.fillStyle = "#cfd8c8"; ctx.strokeStyle = "#9aa88f"; ctx.lineWidth = 0.5;
      wl.land.forEach((ring) => { ctx.beginPath(); ring.forEach(([lo2, la], i) => (i ? ctx.lineTo(X(lo2), Y(la)) : ctx.moveTo(X(lo2), Y(la)))); ctx.closePath(); ctx.fill(); ctx.stroke(); });
      const swathDeg = (s2.swath / 111) / 2;
      ctx.globalAlpha = 0.32; ctx.fillStyle = s2.col;
      for (let k = 0; k < n; k++) {
        const lon0 = 180 - (((360 / s2.orbits) * k) % 360);
        for (let lat = -82; lat < 82; lat += 2) {
          const c1 = Math.max(0.25, Math.cos((lat * Math.PI) / 180));
          const lonC = lon0 + 12 * Math.sin((lat * Math.PI) / 180);
          const half = swathDeg / c1;
          let a = lonC - half, b2 = lonC + half;
          const seg = (aa, bb) => { const x1 = X(aa), x2 = X(bb); ctx.fillRect(Math.min(x1, x2), Y(lat + 2), Math.abs(x2 - x1), Math.abs(Y(lat) - Y(lat + 2)) + 0.6); };
          a = ((a + 540) % 360) - 180; b2 = ((b2 + 540) % 360) - 180;
          if (a <= b2) seg(a, b2); else { seg(a, 180); seg(-180, b2); }
        }
      }
      ctx.globalAlpha = 1;
      // Cambodia marker
      ctx.beginPath(); ctx.arc(X(105), Y(12.5), 4, 0, 7); ctx.fillStyle = "#c62828"; ctx.fill();
      ctx.font = `11px ${font()}`; ctx.fillStyle = "#b71c1c"; ctx.fillText("កម្ពុជា", X(105) + 7, Y(12.5) + 4);
      ctx.strokeStyle = "#90a4ae"; ctx.strokeRect(X0, Y0, MW, MH);
      const perDay = (24 * 60) / (1440 / s2.orbits);
      out.innerHTML = `ទទឹងថត <b>${fmtN(s2.swath)} គម</b> · គន្លងប្រហែល <b>${fmtN(s2.orbits, 1)}</b> ជុំក្នុងមួយថ្ងៃ · គ្របដណ្ដប់ពេញផែនដីក្នុង <b>${kh(s2.days)}</b> ថ្ងៃ<br>` +
        `<span class="sim-hint">ឆ្នូតនីមួយៗជាតំបន់ដែលឧបករណ៍ថតក្នុងមួយជុំ។ ទទឹងថតតូច (Landsat) ត្រូវការគន្លងច្រើនជាង ដើម្បីគ្របដណ្ដប់ផែនដី ដូច្នេះរយៈពេលមកម្ដងទៀតវែងជាង។ រូបនេះជាគំនូរបំព្រួញ មិនមែនការគណនាគន្លងពិតទេ។</span>`;
    };
    el.querySelectorAll("select,input").forEach((x) => x.addEventListener("input", draw)); draw();
    window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L5 · the four resolutions and their trade-offs ---------- */
  window.EXTRA_SIMS["rs-tradeoff"] = async (el) => {
    const S = await loadScene();
    const { cv, ctx, out, q } = shell(el, "គុណភាពបង្ហាញទាំងបួន និងការសម្របសម្រួល",
      `<label>លំហ (ម) <select class="tr-s"><option>5</option><option selected>10</option><option>30</option><option>60</option><option>250</option></select></label>
       <label>រ៉ាដ្យូម៉ែត្រ <select class="tr-b"><option value="1">១ ប៊ីត (២ កម្រិត)</option><option value="3">៣ ប៊ីត (៨)</option><option value="5">៥ ប៊ីត (៣២)</option><option value="8" selected>៨ ប៊ីត (២៥៦)</option><option value="12">១២ ប៊ីត (៤ ០៩៦)</option></select></label>
       <label>ក្រុមរលក <select class="tr-n"><option value="3">៣ (RGB)</option><option value="6" selected>៦ (ពហុស្ពិចត្រាល់)</option><option value="13">១៣ (Sentinel-2)</option><option value="200">២០០ (hyperspectral)</option></select></label>`);
    const W = 640, H = 340;
    const draw = () => {
      fit(cv, ctx, W, H);
      const px = +q(".tr-s").value, bits = +q(".tr-b").value, nb = +q(".tr-n").value;
      const size = Math.max(1, Math.round(S.n / (px / S.px)));
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      const img = composite(S, [2, 1, 0], size, true), lv = Math.pow(2, bits);
      for (let i = 0; i < img.data.length; i += 4) for (let k = 0; k < 3; k++)
        img.data[i + k] = Math.round((Math.round((img.data[i + k] / 255) * (lv - 1)) / (lv - 1)) * 255);
      putScaled(ctx, img, 14, 18, 300);
      ctx.font = `12px ${font()}`; ctx.fillStyle = "#333";
      ctx.fillText(`${kh(px)} ម · ${kh(bits)} ប៊ីត`, 14, 334);
      // trade-off bars
      const area = 100, pxPerScene = (area * 1e6) / (px * px);
      const bytes = (pxPerScene * nb * (bits > 8 ? 2 : 1)) / 1e6;
      const snr = Math.min(100, Math.round(((px * px) / (nb / 6) / 100) * 22));
      const rows = [["ចំនួនក្រឡា (tile ១០០ គម²)", Math.min(100, Math.log10(pxPerScene) * 14), fmtN(Math.round(pxPerScene))],
        ["ទំហំទិន្នន័យ (MB)", Math.min(100, Math.log10(Math.max(1.1, bytes)) * 22), fmtN(Math.round(bytes))],
        ["សញ្ញាធៀបសំឡេងរំខាន (ធៀប)", snr, kh(snr) + "%"],
        ["កម្រិតពណ៌ដែលបែងចែកបាន", Math.min(100, (bits / 12) * 100), fmtN(lv)]];
      rows.forEach(([lab, v, txt], i) => { const y = 54 + i * 52;
        ctx.fillStyle = "#333"; ctx.font = `12px ${font()}`; ctx.fillText(lab, 336, y - 6);
        ctx.fillStyle = "#eceff1"; ctx.fillRect(336, y, 200, 14);
        ctx.fillStyle = ["#1565c0", "#6a1b9a", "#2e7d32", "#e65100"][i]; ctx.fillRect(336, y, (v / 100) * 200, 14);
        ctx.fillStyle = "#333"; ctx.fillText(txt, 544, y + 12); });
      out.innerHTML = `ក្រឡា <b>${kh(px)} ម</b> · <b>${kh(bits)}</b> ប៊ីត · <b>${kh(nb)}</b> ក្រុមរលក<br>` +
        `<span class="sim-hint">ការបង្កើនគុណភាពបង្ហាញមួយ តែងតម្រូវឲ្យបន្ថយមួយផ្សេង៖ ក្រឡាតូច និងក្រុមរលកច្រើន ទុកថាមពលតិចក្នុងមួយការវាស់ ដូច្នេះសញ្ញាធៀបសំឡេងរំខានធ្លាក់ ហើយទិន្នន័យរីកធំ។ ៨ ប៊ីតឡើងទៅ ភ្នែកមនុស្សលែងបែងចែកបាន ប៉ុន្តែការគណនានៅតែទទួលផល។</span>`;
    };
    el.querySelectorAll("select").forEach((x) => x.addEventListener("change", draw)); draw();
    window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L6 · choosing a source ---------- */
  window.EXTRA_SIMS["rs-choose"] = (el) => {
    el.innerHTML = `<div class="sim-title">ជ្រើសប្រភពរូបភាពតាមសំណួរ</div>
      <div class="sim-controls">
        <label>វត្ថុតូចបំផុត <select class="ch-o"><option value="2">អគារ ឬព្រំក្បាលដី (~១០ ម)</option><option value="15" selected>ក្បាលស្រែ (~១០០ ម)</option><option value="60">ភូមិ ឬតំបន់ព្រៃ (~៥០០ ម)</option><option value="250">តំបន់ធំ (គីឡូម៉ែត្រ)</option></select></label>
        <label>រដូវ <select class="ch-c"><option value="dry" selected>រដូវប្រាំង (ពពកតិច)</option><option value="wet">រដូវវស្សា (ពពកច្រើន)</option></select></label>
        <label>ប្រវត្តិ <select class="ch-h"><option value="now" selected>ឆ្នាំបច្ចុប្បន្ន</option><option value="2015">តាំងពី ២០១៥</option><option value="1990">តាំងពីទសវត្សរ៍ ១៩៩០</option></select></label>
        <label>ថវិកា <select class="ch-b"><option value="free" selected>ឥតគិតថ្លៃ</option><option value="paid">អាចទិញបាន</option></select></label></div>
      <div class="ch-out sim-out"></div>`;
    const draw = () => {
      const o = +el.querySelector(".ch-o").value, c = el.querySelector(".ch-c").value,
        h = el.querySelector(".ch-h").value, b = el.querySelector(".ch-b").value;
      const rows = [];
      const add = (name, ok, why) => rows.push([name, ok, why]);
      add("Sentinel-2 (១០ ម · ៥ ថ្ងៃ · ឥតគិតថ្លៃ)", o >= 15 && h !== "1990" && !(c === "wet" && o < 60) ? 2 : o < 15 ? 0 : 1,
        o < 15 ? "ក្រឡា ១០ ម មិនគ្រប់គ្រាន់សម្រាប់វត្ថុតូចបែបនេះ" : h === "1990" ? "គ្មានទិន្នន័យមុនឆ្នាំ ២០១៥" : c === "wet" ? "អាចប្រើបាន ប៉ុន្តែពពករារាំងញឹកញាប់" : "សមស្របបំផុត");
      add("Landsat 8/9 (៣០ ម · ១៦ ថ្ងៃ · ឥតគិតថ្លៃ)", o >= 60 ? 2 : o >= 15 ? 1 : 0,
        o < 15 ? "ក្រឡាធំពេក" : o < 60 ? "អាចប្រើបាន សម្រាប់ក្បាលស្រែធំ" : "សមស្រប ហើយមានក្រុមរលកកំដៅ");
      add("បណ្ណសារ Landsat 5/7 (៣០ ម · តាំងពី ១៩៨៤)", h === "1990" ? 2 : 1, h === "1990" ? "ជម្រើសតែមួយគត់សម្រាប់ប្រវត្តិយូរ" : "ប្រើពេលត្រូវការប្រវត្តិមុន ២០១៥");
      add("Sentinel-1 រ៉ាដា (~១០ ម · ៦ ទៅ ១២ ថ្ងៃ)", c === "wet" ? 2 : 1, c === "wet" ? "ឆ្លងកាត់ពពក ដូច្នេះសមស្របបំផុតក្នុងរដូវវស្សា" : "ប្រើជាជំនួយ ពេលរូបភាពអុបទិកខ្វះ");
      add("MODIS · VIIRS (២៥០ ម ដល់ ១ គម · ប្រចាំថ្ងៃ)", o >= 250 ? 2 : 0, o >= 250 ? "ល្អសម្រាប់តំបន់ធំ និងការតាមដានប្រចាំថ្ងៃ" : "ក្រឡាធំពេកសម្រាប់វត្ថុនេះ");
      add("រូបភាពពាណិជ្ជកម្ម (០,៣ ទៅ ៣ ម)", b === "paid" && o < 15 ? 2 : b === "paid" ? 1 : 0,
        b === "free" ? "ត្រូវការថវិកា" : o < 15 ? "ចាំបាច់សម្រាប់វត្ថុតូចបែបនេះ" : "អាចប្រើ តែថ្លៃដោយឥតប្រយោជន៍ច្រើន");
      const icon = ["✗", "⚠", "✓"], col = ["#c62828", "#f57f17", "#2e7d32"];
      el.querySelector(".ch-out").innerHTML = rows.sort((a, b2) => b2[1] - a[1])
        .map(([n, ok, why]) => `<div style="margin:.25em 0"><b style="color:${col[ok]}">${icon[ok]}</b> <b>${n}</b> · <span style="color:#555">${why}</span></div>`).join("") +
        `<span class="sim-hint">ការជ្រើសពិតត្រូវពិចារណាផងដែរ៖ ជំនាញក្រុមការងារ · ពេលវេលាដំណើរការ · និងតម្រូវការភាពត្រឹមត្រូវ។</span>`;
    };
    el.querySelectorAll("select").forEach((x) => x.addEventListener("change", draw)); draw();
  };

  /* ---------- L7 · DN to reflectance, haze and correction ---------- */
  window.EXTRA_SIMS["rs-correction"] = async (el) => {
    const S = await loadScene();
    const { cv, ctx, out, q } = shell(el, "ពី DN ទៅការចាំងផ្លាតផ្ទៃដី",
      `<label>អ័ព្ទ (ពន្លឺផ្លូវ) <b class="co-hv"></b> <input type="range" class="co-h" min="0" max="60" value="25"></label>
       <label>មុំព្រះអាទិត្យពីកំពូល <b class="co-zv"></b> <input type="range" class="co-z" min="10" max="60" value="30"></label>
       <label><input type="checkbox" class="co-c"> អនុវត្តការកែតម្រូវ (DOS)</label>`);
    const W = 640, H = 350;
    const draw = () => {
      fit(cv, ctx, W, H);
      const haze = +q(".co-h").value / 1000, zen = +q(".co-z").value, corr = q(".co-c").checked;
      q(".co-hv").textContent = kh(+q(".co-h").value); q(".co-zv").textContent = kh(zen) + "°";
      const cosz = Math.cos((zen * Math.PI) / 180);
      // path radiance decreases with wavelength (Rayleigh-ish): B2 strongest
      const pathFor = [1.0, 0.72, 0.5, 0.22, 0.07, 0.04].map((f) => haze * f);
      const n = S.n, img = ctx.createImageData(n, n);
      const bandVals = [2, 1, 0].map((b) => new Float32Array(n * n));
      for (let i = 0; i < n * n; i++) [2, 1, 0].forEach((b, k) => {
        let r = refl(S, b, i) * cosz + pathFor[b];                 // simulated TOA
        if (corr) r = Math.max(0, (r - pathFor[b]) / cosz);         // dark-object subtraction + sun correction
        bandVals[k][i] = r; });
      const lo = 0, hi = 0.45;
      for (let i = 0; i < n * n; i++) { const o = i * 4;
        for (let k = 0; k < 3; k++) img.data[o + k] = clamp(((bandVals[k][i] - lo) / (hi - lo)) * 255, 0, 255);
        img.data[o + 3] = 255; }
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      putScaled(ctx, img, 12, 18, 290);
      // histogram of band B4 (red)
      const hx = 330, hy = 40, hw = 290, hh = 150, bins = 40, cnt = new Array(bins).fill(0);
      for (let i = 0; i < n * n; i++) cnt[clamp(Math.floor((bandVals[0][i] / 0.45) * bins), 0, bins - 1)]++;
      const cmax = Math.max(...cnt);
      ctx.strokeStyle = "#999"; ctx.strokeRect(hx, hy, hw, hh);
      cnt.forEach((c, i) => { const h2 = (c / cmax) * (hh - 6); ctx.fillStyle = "#c62828";
        ctx.fillRect(hx + (hw * i) / bins + 1, hy + hh - h2, hw / bins - 2, h2); });
      ctx.font = `11px ${font()}`; ctx.fillStyle = "#555";
      ctx.fillText("អ៊ីស្តូក្រាមនៃក្រុមរលកក្រហម", hx, hy - 8);
      ctx.fillText("០", hx, hy + hh + 14); ctx.fillText("០,៤៥", hx + hw - 24, hy + hh + 14);
      const minv = Math.min(...bandVals[0]), water = bandVals[0][Math.floor(n * 0.62) * n + Math.floor(n * 0.5)];
      const idxOf = (cls) => { for (let i = 0; i < n * n; i++) if (S.cls[i] === cls) return i; return 0; };
      const iw = idxOf(0), ifo = idxOf(1);
      const ndviRaw = (() => { const nir = refl(S, 3, ifo) * cosz + haze * 0.1, red = refl(S, 2, ifo) * cosz + haze * 0.5;
        return (nir - red) / (nir + red); })();
      const ndviCorr = (() => { const nir = refl(S, 3, ifo), red = refl(S, 2, ifo); return (nir - red) / (nir + red); })();
      out.innerHTML = `តម្លៃអប្បបរមាក្នុងក្រុមរលកក្រហម៖ <b>${fmtN(minv * 100, 1)}%</b> ` +
        (corr ? "(ក្រោយកែតម្រូវ)" : "(មានពន្លឺផ្លូវ)") +
        `<br>NDVI នៃព្រៃឈើ៖ មុនកែ <b>${fmtN(ndviRaw, 2)}</b> · ក្រោយកែ <b>${fmtN(ndviCorr, 2)}</b>` +
        `<br><span class="sim-hint">ពន្លឺផ្លូវបន្ថែមតម្លៃថេរ ជាពិសេសក្នុងក្រុមរលកខ្លី ដូច្នេះអ៊ីស្តូក្រាមរំកិលទៅស្ដាំ ហើយ NDVI ធ្លាក់។ វិធី Dark Object Subtraction សន្មតថាក្រឡាងងឹតបំផុត (ទឹកជ្រៅ ឬស្រមោល) គួរមានតម្លៃជិតសូន្យ ហើយដកតម្លៃនោះចេញពីគ្រប់ក្រឡា។ ការបែងចែកនឹង cos(មុំព្រះអាទិត្យ) កែឥទ្ធិពលនៃមុំបំភ្លឺ។</span>`;
    };
    el.querySelectorAll("input").forEach((x) => x.addEventListener("input", draw)); draw();
    window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L8 · geometric distortion, GCPs and mosaicking ---------- */
  window.EXTRA_SIMS["rs-geocorrect"] = async (el) => {
    const S = await loadScene();
    const { cv, ctx, out, q } = shell(el, "ការខូចទ្រង់ទ្រាយធរណីមាត្រ និងចំណុចត្រួតពិនិត្យ (GCP)",
      `<label>ការខូចទ្រង់ទ្រាយ <select class="gc-d"><option value="none">គ្មាន (ត្រឹមត្រូវ)</option><option value="skew" selected>ជម្រិត (ដោយសារជម្រាលភូមិសាស្ត្រ)</option><option value="shift">រំកិល (offset)</option><option value="rotate">បង្វិល</option></select></label>
       <label>ចំនួន GCP <b class="gc-nv"></b> <input type="range" class="gc-n" min="3" max="12" value="4"></label>
       <label><input type="checkbox" class="gc-c"> អនុវត្តការកែតម្រូវ (georeferencing)</label>`);
    const W = 640, H = 350, M = 300, ox = 14, oy = 18;
    const GCP = [[0.15, 0.18], [0.82, 0.12], [0.12, 0.85], [0.85, 0.82], [0.5, 0.5], [0.3, 0.68], [0.68, 0.3], [0.4, 0.15], [0.15, 0.5], [0.85, 0.5], [0.5, 0.85], [0.5, 0.15]];
    const distort = (u, v, mode) => { if (mode === "none") return [u, v];
      if (mode === "skew") return [u + 0.18 * v * (1 - v), v + 0.10 * u];
      if (mode === "shift") return [u + 0.06, v - 0.05];
      if (mode === "rotate") { const cx = 0.5, cy = 0.5, a = 0.09, du = u - cx, dv = v - cy;
        return [cx + du * Math.cos(a) - dv * Math.sin(a), cy + du * Math.sin(a) + dv * Math.cos(a)]; }
      return [u, v]; };
    const draw = () => {
      fit(cv, ctx, W, H); const mode = q(".gc-d").value, n = +q(".gc-n").value, corr = q(".gc-c").checked;
      q(".gc-nv").textContent = kh(n);
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      // draw distorted image via per-pixel remap (small preview grid for speed)
      const size = 140, img = ctx.createImageData(size, size);
      for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
        let u = px / size, v = py / size;
        if (mode !== "none" && !corr) { const [du, dv] = distort(u, v, mode); u = du; v = dv; }
        const sx = clamp(Math.floor(u * S.n), 0, S.n - 1), sy = clamp(Math.floor(v * S.n), 0, S.n - 1);
        const i = sy * S.n + sx, o = (py * size + px) * 4;
        img.data[o] = refl(S, 2, i) * 255 * 2.2; img.data[o + 1] = refl(S, 1, i) * 255 * 2.2; img.data[o + 2] = refl(S, 0, i) * 255 * 2.2; img.data[o + 3] = 255;
      }
      putScaled(ctx, img, ox, oy, M);
      ctx.strokeStyle = "#555"; ctx.strokeRect(ox, oy, M, M);
      // GCPs: reference (map) position vs where they land in the (possibly distorted) image
      let rmse = 0;
      GCP.slice(0, n).forEach(([u, v]) => {
        const rx = ox + u * M, ry = oy + v * M;                 // true/reference position
        let iu = u, iv = v;
        if (mode !== "none" && !corr) [iu, iv] = distort(u, v, mode);
        const ix = ox + iu * M, iy2 = oy + iv * M;
        ctx.beginPath(); ctx.arc(rx, ry, 4, 0, 7); ctx.fillStyle = "#2e7d32"; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke();
        if (mode !== "none" && !corr) { ctx.beginPath(); ctx.arc(ix, iy2, 4, 0, 7); ctx.fillStyle = "#c62828"; ctx.fill();
          ctx.strokeStyle = "rgba(198,40,40,.6)"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(ix, iy2); ctx.stroke(); ctx.setLineDash([]);
          rmse += (rx - ix) ** 2 + (ry - iy2) ** 2; }
      });
      rmse = Math.sqrt(rmse / n) / M * 2000;                    // arbitrary metres scale for teaching
      ctx.font = `12px ${font()}`; ctx.fillStyle = "#2e7d32"; ctx.fillText("● ទីតាំងយោង (ផែនទី)", 336, 40);
      if (mode !== "none" && !corr) { ctx.fillStyle = "#c62828"; ctx.fillText("● ទីតាំងក្នុងរូបភាព (ខូច)", 336, 60); }
      out.innerHTML = corr
        ? `<b class="ft-ok">បានកែតម្រូវ</b> ដោយប្រើ ${kh(n)} ចំណុច GCP។ រូបភាពឥឡូវត្រូវនឹងព្រំដែនផែនទី។`
        : mode === "none" ? "រូបភាពគ្មានការខូចទ្រង់ទ្រាយ។ ជ្រើសប្រភេទការខូចទ្រង់ទ្រាយ ដើម្បីមើលឥទ្ធិពល។"
        : `RMSE ប៉ាន់ស្មាន៖ <b>${fmtN(rmse, 0)} ម</b> ជាមួយ ${kh(n)} ចំណុច។ ធីក «អនុវត្តការកែតម្រូវ» ដើម្បីមើលលទ្ធផលក្រោយកែ។` +
          `<br><span class="sim-hint">GCP តិចពេក ឬចែកមិនស្មើ (ប្រមូលផ្ដុំតែជ្រុងមួយ) ធ្វើឲ្យការកែត្រឹមត្រូវតែជិតៗនោះ ឯតំបន់ឆ្ងាយនៅតែខូច។</span>`;
    };
    el.querySelectorAll("select,input").forEach((x) => x.addEventListener("input", draw)); draw();
    window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L8 · mosaicking two tiles ---------- */
  window.EXTRA_SIMS["rs-mosaic"] = async (el) => {
    const S = await loadScene();
    const { cv, ctx, out, q } = shell(el, "ការរួមផ្សំរូបភាព (Mosaicking)",
      `<span class="sim-seg mo-m"><button type="button" data-m="none" class="on">គ្មានការកែសម្រួល</button><button type="button" data-m="feather">លាយគែម (Feathering)</button><button type="button" data-m="hist">ផ្គូផ្គងអ៊ីស្តូក្រាម</button></span>`);
    const W = 640, H = 300;
    const draw = () => {
      fit(cv, ctx, W, H); const mode = el.querySelector(".mo-m .on").dataset.m;
      const size = 150; const half = Math.floor(S.n / 2);
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      const bright2 = mode === "hist" ? 1.0 : 1.45;             // right tile simulated "different acquisition"
      const img = ctx.createImageData(S.n, S.n);
      for (let y = 0; y < S.n; y++) for (let x = 0; x < S.n; x++) {
        const i = y * S.n + x, o = i * 4, rightSide = x >= half;
        const mult = rightSide ? bright2 : 1.0;
        let a = 1;
        if (mode === "feather") { const d = Math.abs(x - half); if (d < 14) a = d / 14; }
        const under = !rightSide || mode !== "feather" ? [refl(S, 2, i), refl(S, 1, i), refl(S, 0, i)] : [refl(S, 2, i), refl(S, 1, i), refl(S, 0, i)];
        const rgb = [refl(S, 2, i) * mult, refl(S, 1, i) * mult, refl(S, 0, i) * mult];
        img.data[o] = clamp(rgb[0] * 255 * 2.2, 0, 255); img.data[o + 1] = clamp(rgb[1] * 255 * 2.2, 0, 255); img.data[o + 2] = clamp(rgb[2] * 255 * 2.2, 0, 255); img.data[o + 3] = 255;
      }
      putScaled(ctx, img, 14, 18, 300);
      if (mode !== "feather") { ctx.strokeStyle = "#ffca28"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(14 + 150, 18); ctx.lineTo(14 + 150, 318); ctx.stroke(); ctx.setLineDash([]); }
      ctx.font = `12px ${font()}`; ctx.fillStyle = "#333"; ctx.fillText("ព្រំរវាងសន្លឹកទាំងពីរ", 340, 40);
      const NOTE = { none: "សន្លឹកទាំងពីរថតនៅថ្ងៃខុសគ្នា ដែលមានពន្លឺ ឬកម្រិតកែតម្រូវខុសគ្នាបន្តិច។ ព្រំរវាងសន្លឹកលេចធ្លោជាបន្ទាត់ត្រង់មើលឃើញច្បាស់។",
        feather: "ការលាយគែម (feathering) ធ្វើឲ្យតម្លៃផ្លាស់ប្ដូរបន្តិចម្ដងៗលើគែម ជំនួសឲ្យប្ដូរភ្លាមៗ ដែលលាក់បន្ទាត់ព្រំ ប៉ុន្តែមិនកែភាពខុសគ្នានៃពន្លឺទេ។",
        hist: "ការផ្គូផ្គងអ៊ីស្តូក្រាម កែសម្រួលការចែកចាយតម្លៃនៃសន្លឹកមួយ ឲ្យស្រដៀងនឹងមួយទៀត មុននឹងផ្សំ ដែលកាត់បន្ថយភាពខុសគ្នានៃពន្លឺដោយផ្ទាល់។" }[mode];
      out.innerHTML = NOTE + `<br><span class="sim-hint">ការជ្រើសរូបភាពគ្រុមកាលបរិច្ឆេទ និងកែតម្រូវបរិយាកាសដូចគ្នា (មេរៀនទី៧) ជាដំណោះស្រាយល្អបំផុត ព្រោះការលាយគែម និងការផ្គូផ្គងគ្រាន់តែលាក់បញ្ហា មិនកែឫសគល់ទេ។</span>`;
    };
    el.querySelectorAll(".mo-m button").forEach((b) => (b.onclick = () => { el.querySelectorAll(".mo-m button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); draw(); }));
    draw(); window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L9 · stretch and band combination lab ---------- */
  window.EXTRA_SIMS["rs-stretch"] = async (el) => {
    const S = await loadScene();
    const { cv, ctx, out, q } = shell(el, "ការបំពាញកម្រិតពណ៌ (Contrast Stretch)",
      `<label>ក្រុមរលក (R-G-B) <select class="st-c"><option value="true" selected>B4-B3-B2 (ពិត)</option><option value="false">B8-B4-B3 (សន្មត NIR)</option><option value="swir">B12-B8-B4 (SWIR)</option></select></label>
       <label>វិធី stretch <select class="st-m"><option value="none">គ្មាន (DN ឆៅ)</option><option value="minmax" selected>Min-Max</option><option value="pct">Cumulative ២–៩៨%</option><option value="std">គម្លាតគំរូ (± ២σ)</option></select></label>`);
    const W = 640, H = 340;
    const combos = { true: [2, 1, 0], false: [3, 2, 1], swir: [5, 3, 2] };
    const draw = () => {
      fit(cv, ctx, W, H); const cKey = q(".st-c").value, mKey = q(".st-m").value, bands = combos[cKey];
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      const n = S.n, lo = [], hi = [];
      bands.forEach((b) => { const v = Array.from(S.band[b]).map((x) => x * S.scale).sort((a, c) => a - c);
        if (mKey === "none") { lo.push(0); hi.push(0.6); }
        else if (mKey === "minmax") { lo.push(v[0]); hi.push(v[v.length - 1]); }
        else if (mKey === "pct") { lo.push(v[Math.floor(v.length * 0.02)]); hi.push(v[Math.floor(v.length * 0.98)]); }
        else { const m = v.reduce((a, c) => a + c, 0) / v.length, sd = Math.sqrt(v.reduce((a, c) => a + (c - m) ** 2, 0) / v.length);
          lo.push(Math.max(0, m - 2 * sd)); hi.push(m + 2 * sd); } });
      const img = ctx.createImageData(n, n);
      for (let i = 0; i < n * n; i++) { const o = i * 4;
        bands.forEach((b, k) => { const v = refl(S, b, i); img.data[o + k] = clamp(((v - lo[k]) / (hi[k] - lo[k])) * 255, 0, 255); });
        img.data[o + 3] = 255; }
      putScaled(ctx, img, 14, 18, 290);
      // histogram of band 0 (first of the three) before/after
      const hx = 330, hy = 40, hw = 296, hh = 130, bins = 40;
      const raw = Array.from(S.band[bands[0]]).map((x) => x * S.scale);
      const cnt = new Array(bins).fill(0); raw.forEach((v) => cnt[clamp(Math.floor((v / 0.6) * bins), 0, bins - 1)]++);
      const cmax = Math.max(...cnt);
      ctx.strokeStyle = "#999"; ctx.strokeRect(hx, hy, hw, hh);
      cnt.forEach((c, i) => { const h2 = (c / cmax) * (hh - 6); ctx.fillStyle = "#90a4ae"; ctx.fillRect(hx + (hw * i) / bins + 1, hy + hh - h2, hw / bins - 2, h2); });
      const loX = hx + (lo[0] / 0.6) * hw, hiX = hx + (hi[0] / 0.6) * hw;
      ctx.strokeStyle = "#c62828"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(loX, hy); ctx.lineTo(loX, hy + hh); ctx.moveTo(hiX, hy); ctx.lineTo(hiX, hy + hh); ctx.stroke();
      ctx.font = `11px ${font()}`; ctx.fillStyle = "#555"; ctx.fillText("អ៊ីស្តូក្រាមក្រុមរលកទី១ · បន្ទាត់ក្រហម = ដែន stretch", hx, hy - 8);
      ctx.fillText("០", hx, hy + hh + 14); ctx.fillText("០,៦", hx + hw - 14, hy + hh + 14);
      out.innerHTML = mKey === "none" ? "គ្មាន stretch៖ តម្លៃពិតទាំងអស់ចង្អៀតនៅផ្នែកតូចមួយនៃជួរ ០ ដល់ ២៥៥ ដូច្នេះរូបភាពមើលទៅស្ទើរខ្មៅ។" :
        `ដែន stretch៖ <b>${fmtN(lo[0] * 100, 1)}%</b> ដល់ <b>${fmtN(hi[0] * 100, 1)}%</b> ត្រូវបានទាញឲ្យសមនឹង ០–២៥៥។<br><span class="sim-hint">Min-Max រសើបនឹងតម្លៃខ្លាំង (ចំណុចភ្លឺ ឬងងឹតតែមួយអាចទាញដែនទាំងមូល)។ Cumulative % ធន់នឹងតម្លៃខ្លាំងជាង។ ការ stretch ប្ដូរតែការបង្ហាញ មិនប្ដូរទិន្នន័យទេ។</span>`;
    };
    el.querySelectorAll("select").forEach((x) => x.addEventListener("change", draw)); draw();
    window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L9 · pan-sharpening concept ---------- */
  window.EXTRA_SIMS["rs-pansharpen"] = async (el) => {
    const S = await loadScene();
    const { cv, ctx, out, q } = shell(el, "គោលការណ៍នៃ Pan-sharpening",
      `<label><input type="checkbox" class="ps-s" checked> បង្ហាញកំណែបុនចម</label>`);
    const W = 640, H = 300;
    const draw = () => {
      fit(cv, ctx, W, H); const sharp = q(".ps-s").checked;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      const coarse = composite(S, [2, 1, 0], 40, true);          // 4x coarser colour
      putScaled(ctx, coarse, 14, 18, 190);
      ctx.font = `11px ${font()}`; ctx.fillStyle = "#333"; ctx.fillText("ក្រុមរលកពណ៌ (គំរូ ៤០ ម)", 14, 224);
      // simulate a panchromatic (grayscale, fine detail) band
      const n = S.n, pan = new Float32Array(n * n);
      for (let i = 0; i < n * n; i++) pan[i] = (refl(S, 0, i) + refl(S, 1, i) + refl(S, 2, i)) / 3;
      const panImg = ctx.createImageData(n, n);
      for (let i = 0; i < n * n; i++) { const v = clamp(pan[i] * 255 * 2.2, 0, 255); const o = i * 4; panImg.data[o] = v; panImg.data[o + 1] = v; panImg.data[o + 2] = v; panImg.data[o + 3] = 255; }
      putScaled(ctx, panImg, 222, 18, 190); ctx.fillText("Panchromatic (គំរូ ១០ ម)", 222, 224);
      if (sharp) {
        const outImg = ctx.createImageData(n, n);
        const coarseAt = (i) => { const y = Math.floor(i / n), x = i % n, cs = 40, cx2 = Math.floor((x / n) * cs), cy2 = Math.floor((y / n) * cs);
          const ci = cy2 * cs + cx2, o2 = ci * 4; return [coarse.data[o2] / 255, coarse.data[o2 + 1] / 255, coarse.data[o2 + 2] / 255]; };
        for (let i = 0; i < n * n; i++) { const [r, g, b] = coarseAt(i), o = i * 4, ratio = pan[i] / Math.max(0.02, (r + g + b) / 3 / 2.2);
          outImg.data[o] = clamp(r * 2.2 * ratio * 255, 0, 255); outImg.data[o + 1] = clamp(g * 2.2 * ratio * 255, 0, 255); outImg.data[o + 2] = clamp(b * 2.2 * ratio * 255, 0, 255); outImg.data[o + 3] = 255; }
        putScaled(ctx, outImg, 430, 18, 190); ctx.fillText("លទ្ធផលបុនចម (ពណ៌ + លម្អិត)", 430, 224);
      }
      out.innerHTML = sharp
        ? "Pan-sharpening បញ្ចូលលម្អិតលំហពី panchromatic ចូលទៅក្នុងពណ៌ពីក្រុមរលកគំរូធំ។ លទ្ធផលមើលទៅមានលម្អិត ប៉ុន្តែ <b>ព័ត៌មានពណ៌ពិតនៅតែមកពីក្រុមរលកគំរូធំ</b> មិនមែនកើនឡើងទេ។"
        : "សង្កេតភាពខុសគ្នារវាងក្រុមរលកពណ៌ (ព័ត៌មានច្រើន ប៉ុន្តែព្រិល) និង panchromatic (លម្អិតច្រើន ប៉ុន្តែគ្មានពណ៌)។ ធីកខាងលើ ដើម្បីមើលការបញ្ចូលគ្នា។";
    };
    q(".ps-s").addEventListener("change", draw); draw();
    window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L10 · spectral index explorer ---------- */
  const INDEX_DEFS = {
    ndvi: { name: "NDVI", formula: (v) => (v.nir - v.red) / (v.nir + v.red), bands: ["nir", "red"], range: [-1, 1], desc: "សន្ទស្សន៍ភាពខៀវបៃតង (Normalized Difference Vegetation Index)" },
    evi: { name: "EVI", formula: (v) => 2.5 * ((v.nir - v.red) / (v.nir + 6 * v.red - 7.5 * v.blue + 1)), bands: ["nir", "red", "blue"], range: [-1, 1], desc: "សន្ទស្សន៍រុក្ខជាតិកែលម្អ (កាត់បន្ថយឥទ្ធិពលដី និងបរិយាកាស)" },
    ndwi: { name: "NDWI", formula: (v) => (v.green - v.nir) / (v.green + v.nir), bands: ["green", "nir"], range: [-1, 1], desc: "សន្ទស្សន៍ទឹក (McFeeters)" },
    mndwi: { name: "MNDWI", formula: (v) => (v.green - v.swir1) / (v.green + v.swir1), bands: ["green", "swir1"], range: [-1, 1], desc: "សន្ទស្សន៍ទឹកកែលម្អ (បែងចែកទឹក និងតំបន់សាងសង់បានប្រសើរជាង)" },
    ndbi: { name: "NDBI", formula: (v) => (v.swir1 - v.nir) / (v.swir1 + v.nir), bands: ["swir1", "nir"], range: [-1, 1], desc: "សន្ទស្សន៍តំបន់សាងសង់" },
    bsi: { name: "BSI", formula: (v) => ((v.swir1 + v.red) - (v.nir + v.blue)) / ((v.swir1 + v.red) + (v.nir + v.blue)), bands: ["swir1", "red", "nir", "blue"], range: [-1, 1], desc: "សន្ទស្សន៍ដីទទេ (Bare Soil Index)" },
  };
  const bandIdxMap = { blue: 0, green: 1, red: 2, nir: 3, swir1: 4, swir2: 5 };
  window.EXTRA_SIMS["rs-index"] = async (el) => {
    const S = await loadScene();
    const { cv, ctx, out, q } = shell(el, "ស្វែងយល់សន្ទស្សន៍ស្ពិចត្រាល់",
      `<label>សន្ទស្សន៍ <select class="ix-i"><option value="ndvi" selected>NDVI</option><option value="evi">EVI</option><option value="ndwi">NDWI</option><option value="mndwi">MNDWI</option><option value="ndbi">NDBI</option><option value="bsi">BSI</option></select></label>
       <label>ឈុតពណ៌ <select class="ix-p"><option value="rdylgn" selected>ក្រហម–លឿង–បៃតង</option><option value="gray">ប្រផេះ</option><option value="bwr">ខៀវ–ស–ក្រហម</option></select></label>`);
    const W = 640, H = 350;
    const rampFor = (t, pal) => { t = clamp(t, 0, 1);
      if (pal === "gray") { const v = Math.round(t * 255); return `rgb(${v},${v},${v})`; }
      if (pal === "bwr") return ramp(t, [[33, 102, 172], [247, 247, 247], [178, 24, 43]]);
      return ramp(t, [[165, 0, 38], [255, 255, 191], [26, 152, 80]]); };
    const draw = () => {
      fit(cv, ctx, W, H); const key = q(".ix-i").value, pal = q(".ix-p").value, def = INDEX_DEFS[key];
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      const n = S.n, vals = new Float32Array(n * n);
      for (let i = 0; i < n * n; i++) { const v = { blue: refl(S, 0, i), green: refl(S, 1, i), red: refl(S, 2, i), nir: refl(S, 3, i), swir1: refl(S, 4, i), swir2: refl(S, 5, i) };
        vals[i] = def.formula(v); }
      const img = ctx.createImageData(n, n), [lo, hi] = def.range;
      for (let i = 0; i < n * n; i++) { const t = (vals[i] - lo) / (hi - lo), c = rampFor(t, pal).match(/\d+/g).map(Number), o = i * 4;
        img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255; }
      putScaled(ctx, img, 14, 18, 300);
      // legend
      const lx = 330, ly = 40, lw = 220, lh = 16;
      for (let i = 0; i < lw; i++) { ctx.fillStyle = rampFor(i / lw, pal); ctx.fillRect(lx + i, ly, 1, lh); }
      ctx.strokeStyle = "#999"; ctx.strokeRect(lx, ly, lw, lh);
      ctx.font = `11px ${font()}`; ctx.fillStyle = "#333"; ctx.fillText(fmtN(lo, 1), lx - 4, ly + lh + 14); ctx.fillText(fmtN(hi, 1), lx + lw - 10, ly + lh + 14);
      ctx.font = `13px ${font()}`; ctx.fillText(def.name, lx, ly - 10);
      // per-class mean
      const sums = {}, counts = {};
      for (let i = 0; i < n * n; i++) { const c = S.cls[i]; sums[c] = (sums[c] || 0) + vals[i]; counts[c] = (counts[c] || 0) + 1; }
      let ly2 = ly + 46; ctx.font = `12px ${font()}`;
      S.classes.forEach((name, c) => { const m = (sums[c] || 0) / (counts[c] || 1);
        ctx.fillStyle = "#333"; ctx.fillText(`${name}៖`, lx, ly2); ctx.fillStyle = "#555"; ctx.fillText(fmtN(m, 2), lx + 110, ly2); ly2 += 20; });
      out.innerHTML = `<b>${def.name}</b> · ${def.desc} · ក្រុមរលកប្រើ៖ ${def.bands.map((b) => S.names[bandIdxMap[b]]).join(" · ")}` +
        `<br><span class="sim-hint">ជួរតម្លៃដែលបង្ហាញ៖ ${fmtN(lo, 1)} ដល់ ${fmtN(hi, 1)}។ សូមប្រៀបធៀបតម្លៃមធ្យមតាមថ្នាក់ខាងលើ ដើម្បីមើលថាតើសន្ទស្សន៍នេះបែងចែកថ្នាក់ណាបានល្អ។</span>`;
    };
    el.querySelectorAll("select").forEach((x) => x.addEventListener("change", draw)); draw();
    window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L10 · NDVI formula builder ---------- */
  window.EXTRA_SIMS["rs-ndvi-calc"] = (el) => {
    const { cv, ctx, out, q } = shell(el, "គណនា NDVI ដោយខ្លួនឯង",
      `<label>NIR (%) <b class="nc-nv"></b> <input type="range" class="nc-n" min="0" max="60" value="40"></label>
       <label>ក្រហម (%) <b class="nc-rv"></b> <input type="range" class="nc-r" min="0" max="60" value="6"></label>`);
    const W = 640, H = 220;
    const draw = () => {
      fit(cv, ctx, W, H); const nir = +q(".nc-n").value / 100, red = +q(".nc-r").value / 100;
      q(".nc-nv").textContent = kh(+q(".nc-n").value); q(".nc-rv").textContent = kh(+q(".nc-r").value);
      const ndvi = (nir - red) / (nir + red || 1e-9);
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      const x0 = 20, x1 = 620, y = 110;
      ctx.strokeStyle = "#999"; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      [-1, -0.5, 0, 0.5, 1].forEach((t) => { const x = x0 + ((t + 1) / 2) * (x1 - x0); ctx.strokeStyle = "#ddd"; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke();
        ctx.fillStyle = "#666"; ctx.font = `11px ${font()}`; ctx.fillText(fmtN(t, 1), x - 8, y + 22); });
      const px = x0 + ((ndvi + 1) / 2) * (x1 - x0);
      ctx.beginPath(); ctx.arc(px, y, 8, 0, 7); ctx.fillStyle = ndvi > 0.4 ? "#2e7d32" : ndvi > 0.1 ? "#c0ca33" : ndvi > -0.1 ? "#a1887f" : "#1565c0"; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = `20px ${font()}`; ctx.fillStyle = "#333"; ctx.fillText(`NDVI = (${fmtN(nir * 100)}−${fmtN(red * 100)}) ÷ (${fmtN(nir * 100)}+${fmtN(red * 100)}) = ${fmtN(ndvi, 2)}`, 20, 50);
      const label = ndvi > 0.6 ? "ព្រៃឈើ ឬដំណាំក្រាស់ មានសុខភាពល្អ" : ndvi > 0.3 ? "រុក្ខជាតិមធ្យម ឬដំណាំកំពុងលូតលាស់" : ndvi > 0.1 ? "រុក្ខជាតិស្ដើង ឬដីចម្រុះ" : ndvi > -0.1 ? "ដីទទេ ថ្ម ឬតំបន់សាងសង់" : "ទឹក ព្រិល ឬពពក";
      out.innerHTML = `ការបកស្រាយប្រហាក់ប្រហែល៖ <b>${label}</b><br><span class="sim-hint">សាកល្បងកំណត់ NIR = ១% និងក្រហម = ១% (ទឹក)៖ NDVI ក្លាយអវិជ្ជមាន។ កំណត់ទាំងពីរស្មើគ្នា៖ NDVI = ០។</span>`;
    };
    el.querySelectorAll("input").forEach((x) => x.addEventListener("input", draw)); draw();
    window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L11 · unsupervised classification (k-means) ---------- */
  window.EXTRA_SIMS["rs-kmeans"] = async (el) => {
    const S = await loadScene();
    const { cv, ctx, out, q } = shell(el, "ការចាត់ថ្នាក់គ្មានការណែនាំ (K-means)",
      `<label>ចំនួនចង្កោម (k) <b class="km-kv"></b> <input type="range" class="km-k" min="2" max="8" value="5"></label>
       <label>ជំហានធ្វើម្ដងទៀត <b class="km-iv"></b> <input type="range" class="km-i" min="0" max="12" value="0"></label>
       <button type="button" class="km-run">ដំណើរការជំហានបន្ទាប់</button>`);
    const W = 640, H = 340;
    const size = 60, n2 = size * size;
    // downsample scene to a working grid of 6-band vectors
    const step = S.n / size, vecs = [];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const sy = Math.floor(y * step), sx = Math.floor(x * step), i = sy * S.n + sx;
      vecs.push([refl(S, 0, i), refl(S, 1, i), refl(S, 2, i), refl(S, 3, i), refl(S, 4, i), refl(S, 5, i)]);
    }
    const clsDown = new Uint8Array(n2);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) clsDown[y * size + x] = S.cls[Math.floor(y * step) * S.n + Math.floor(x * step)];
    let centers = [], labels = new Int32Array(n2).fill(-1), seed = 7, iter = 0;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const initCenters = (k) => { seed = 7; centers = []; for (let c = 0; c < k; c++) centers.push(vecs[Math.floor(rnd() * n2)].slice()); labels.fill(-1); iter = 0; };
    const KCOL = ["#e53935", "#1e88e5", "#43a047", "#fb8c00", "#8e24aa", "#00897b", "#6d4c41", "#546e7a"];
    const step1 = () => { // assign
      for (let i = 0; i < n2; i++) { let best = 0, bd = Infinity;
        centers.forEach((c, ci) => { let d = 0; for (let b = 0; b < 6; b++) d += (vecs[i][b] - c[b]) ** 2; if (d < bd) { bd = d; best = ci; } });
        labels[i] = best; }
      // update
      const sums = centers.map(() => [0, 0, 0, 0, 0, 0]), counts = centers.map(() => 0);
      for (let i = 0; i < n2; i++) { const c = labels[i]; counts[c]++; for (let b = 0; b < 6; b++) sums[c][b] += vecs[i][b]; }
      centers = centers.map((c, ci) => (counts[ci] ? sums[ci].map((v) => v / counts[ci]) : c));
      iter++;
    };
    const k0 = 5; initCenters(k0);
    const draw = () => {
      fit(cv, ctx, W, H); const k = +q(".km-k").value;
      q(".km-kv").textContent = kh(k); q(".km-iv").textContent = kh(iter);
      if (centers.length !== k) initCenters(k);
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      // left: true colour reference
      putScaled(ctx, composite(S, [2, 1, 0], S.n, false), 12, 18, 190);
      ctx.font = `11px ${font()}`; ctx.fillStyle = "#333"; ctx.fillText("ពណ៌ពិត (យោង)", 12, 224);
      // middle: cluster map
      const img = ctx.createImageData(size, size);
      for (let i = 0; i < n2; i++) { const c = labels[i] < 0 ? [200, 200, 200] : hexToRgb(KCOL[labels[i] % KCOL.length]); const o = i * 4;
        img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255; }
      putScaled(ctx, img, 222, 18, 190); ctx.fillText("ផែនទីចង្កោម (មិនទាន់ដាក់ស្លាក)", 222, 224);
      // legend
      ctx.font = `12px ${font()}`;
      for (let c = 0; c < k; c++) { const y = 60 + c * 22; ctx.fillStyle = KCOL[c % KCOL.length]; ctx.fillRect(432, y, 16, 14);
        ctx.strokeStyle = "#999"; ctx.strokeRect(432, y, 16, 14); ctx.fillStyle = "#333"; ctx.fillText(`ចង្កោម ${kh(c + 1)}`, 454, y + 12); }
      // purity: majority true-class per cluster
      let correct = 0; const majMap = [];
      for (let c = 0; c < k; c++) { const cnt = {}; for (let i = 0; i < n2; i++) if (labels[i] === c) cnt[clsDown[i]] = (cnt[clsDown[i]] || 0) + 1;
        const maj = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]; majMap.push(maj ? +maj[0] : -1);
        if (maj) correct += maj[1]; }
      const purity = iter > 0 ? (correct / n2) * 100 : 0;
      out.innerHTML = iter === 0
        ? "កណ្ដាលចង្កោមចាប់ផ្ដើមដោយចៃដន្យ។ ចុច «ដំណើរការជំហានបន្ទាប់» ដើម្បីធ្វើការចាត់ថ្នាក់ម្ដងមួយជំហាន (assign → update)។"
        : `ជំហាន <b>${kh(iter)}</b> · Purity (ភាគរយក្រឡាដែលចង្កោមភាគច្រើនត្រូវនឹងគម្របដីពិត) ≈ <b>${fmtN(purity)}%</b><br><span class="sim-hint">ក្បួនដោះស្រាយមិនស្គាល់ឈ្មោះ «ព្រៃ» ឬ «ទឹក» ទេ វាគ្រាន់តែដាក់ក្រុមតាមភាពស្រដៀងគ្នា។ ការដាក់ស្លាកឈ្មោះថ្នាក់ ត្រូវធ្វើដោយមនុស្សនៅជំហានក្រោយ។</span>`;
    };
    const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));
    el.querySelector(".km-run").onclick = () => { step1(); draw(); };
    q(".km-k").addEventListener("input", () => { initCenters(+q(".km-k").value); draw(); });
    draw(); window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L11 · elbow method for choosing k ---------- */
  window.EXTRA_SIMS["rs-elbow"] = async (el) => {
    const S = await loadScene();
    const { cv, ctx, out } = shell(el, "ជ្រើសចំនួនចង្កោម៖ វិធីកែងដៃ (Elbow method)", "");
    const W = 640, H = 300;
    const size = 45, n2 = size * size, step = S.n / size, vecs = [];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const sy = Math.floor(y * step), sx = Math.floor(x * step), i = sy * S.n + sx;
      vecs.push([refl(S, 0, i), refl(S, 1, i), refl(S, 2, i), refl(S, 3, i), refl(S, 4, i), refl(S, 5, i)]); }
    const wcss = (k) => { let seed = 3; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      let centers = []; for (let c = 0; c < k; c++) centers.push(vecs[Math.floor(rnd() * n2)].slice());
      let labels = new Int32Array(n2);
      for (let it = 0; it < 8; it++) { for (let i = 0; i < n2; i++) { let best = 0, bd = Infinity;
          centers.forEach((c, ci) => { let d = 0; for (let b = 0; b < 6; b++) d += (vecs[i][b] - c[b]) ** 2; if (d < bd) { bd = d; best = ci; } }); labels[i] = best; }
        const sums = centers.map(() => [0, 0, 0, 0, 0, 0]), counts = centers.map(() => 0);
        for (let i = 0; i < n2; i++) { const c = labels[i]; counts[c]++; for (let b = 0; b < 6; b++) sums[c][b] += vecs[i][b]; }
        centers = centers.map((c, ci) => (counts[ci] ? sums[ci].map((v) => v / counts[ci]) : c)); }
      let sse = 0; for (let i = 0; i < n2; i++) { let d = 0; for (let b = 0; b < 6; b++) d += (vecs[i][b] - centers[labels[i]][b]) ** 2; sse += d; }
      return sse; };
    const draw = () => {
      fit(cv, ctx, W, H); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      const ks = [2, 3, 4, 5, 6, 7, 8, 9, 10], vals = ks.map(wcss), mx = Math.max(...vals);
      const X0 = 60, X1 = 600, Y0 = 30, Y1 = 230;
      ctx.strokeStyle = "#555"; ctx.beginPath(); ctx.moveTo(X0, Y1); ctx.lineTo(X1, Y1); ctx.moveTo(X0, Y0); ctx.lineTo(X0, Y1); ctx.stroke();
      ctx.font = `11px ${font()}`; ctx.fillStyle = "#555";
      ks.forEach((k, i) => { const x = X0 + (i / (ks.length - 1)) * (X1 - X0); ctx.fillText(kh(k), x - 4, Y1 + 16); });
      ctx.fillText("ចំនួនចង្កោម (k)", X1 - 60, Y1 + 34); ctx.save(); ctx.translate(20, (Y0 + Y1) / 2 + 30); ctx.rotate(-Math.PI / 2); ctx.fillText("WCSS (កំហុសក្នុងចង្កោម)", 0, 0); ctx.restore();
      ctx.beginPath(); vals.forEach((v, i) => { const x = X0 + (i / (ks.length - 1)) * (X1 - X0), y = Y1 - (v / mx) * (Y1 - Y0); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.strokeStyle = "#1565c0"; ctx.lineWidth = 2; ctx.stroke();
      vals.forEach((v, i) => { const x = X0 + (i / (ks.length - 1)) * (X1 - X0), y = Y1 - (v / mx) * (Y1 - Y0); ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fillStyle = i === 3 ? "#e65100" : "#1565c0"; ctx.fill(); });
      ctx.fillStyle = "#e65100"; ctx.font = `12px ${font()}`; ctx.fillText("← កែងដៃប្រហាក់ប្រហែល (k=5)", X0 + (3 / (ks.length - 1)) * (X1 - X0) + 8, Y1 - (vals[3] / mx) * (Y1 - Y0) - 6);
      out.innerHTML = "កំហុសសរុប (WCSS) ធ្លាក់លឿននៅដំបូង រួចធ្លាក់យឺតៗ។ ចំណុច «កែងដៃ» ជាកន្លែងដែលការបន្ថែមចង្កោមថ្មី លែងកាត់បន្ថយកំហុសច្រើនទៀត។ សម្រាប់ទិដ្ឋភាពគំរូនេះ (ទឹក ព្រៃ ស្រែ សំណង់ ដីទទេ) កែងដៃស្ថិតជិត k=5 ដែលត្រូវនឹងចំនួនប្រភេទគម្របដីពិត។<br><span class=\"sim-hint\">វិធីនេះជាការណែនាំ មិនមែនវិធីត្រឹមត្រូវទាំងស្រុងទេ។ ចំនួនចង្កោមសមស្របគួរផ្ទៀងផ្ទាត់ដោយចំណេះដឹងតំបន់ផងដែរ។</span>";
    };
    draw(); window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L12 · supervised classification (minimum distance / parallelepiped) ---------- */
  const noiseHash = (i, b) => { let x = (i * 374761393 + b * 668265263) >>> 0; x = (x ^ (x >>> 13)) >>> 0; x = Math.imul(x, 1274126177) >>> 0; x = (x ^ (x >>> 16)) >>> 0; return (x % 2000) / 1000 - 1; };
  const reflNoisy = (S, b, i) => clamp(refl(S, b, i) + 0.06 * noiseHash(i, b), 0, 1);
  window.EXTRA_SIMS["rs-supervised"] = async (el) => {
    const S = await loadScene();
    const { cv, ctx, out, q } = shell(el, "ការចាត់ថ្នាក់មានការណែនាំ៖ ចម្ងាយអប្បបរមា",
      `<label>ចំនួនគំរូក្នុងមួយថ្នាក់ <b class="sv-nv"></b> <input type="range" class="sv-n" min="3" max="40" value="10"></label>
       <button type="button" class="sv-run">យកគំរូ និងចាត់ថ្នាក់</button>`);
    const W = 640, H = 340;
    let seed = 11; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const CCOL = ["#1565c0", "#2e7d32", "#7cb342", "#c62828", "#a1887f"];
    let signatures = null, classified = null;
    const takeSamples = (perClass) => {
      const byClass = [[], [], [], [], []];
      for (let i = 0; i < S.n * S.n; i++) byClass[S.cls[i]].push(i);
      signatures = byClass.map((idxs) => { const picks = []; for (let k = 0; k < perClass && idxs.length; k++) picks.push(idxs[Math.floor(rnd() * idxs.length)]);
        const mean = [0, 0, 0, 0, 0, 0]; picks.forEach((i) => { for (let b = 0; b < 6; b++) mean[b] += reflNoisy(S, b, i); });
        return mean.map((v) => v / picks.length); });
    };
    const classify = () => { classified = new Uint8Array(S.n * S.n);
      for (let i = 0; i < S.n * S.n; i++) { let best = 0, bd = Infinity;
        signatures.forEach((sig, c) => { let d = 0; for (let b = 0; b < 6; b++) d += (reflNoisy(S, b, i) - sig[b]) ** 2; if (d < bd) { bd = d; best = c; } });
        classified[i] = best; } };
    const draw = () => {
      fit(cv, ctx, W, H); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      putScaled(ctx, composite(S, [2, 1, 0], S.n, false), 12, 18, 190);
      ctx.font = `11px ${font()}`; ctx.fillStyle = "#333"; ctx.fillText("ពណ៌ពិត", 12, 224);
      if (classified) { const img = ctx.createImageData(S.n, S.n);
        for (let i = 0; i < S.n * S.n; i++) { const c = hexToRgb(CCOL[classified[i]]); const o = i * 4; img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255; }
        putScaled(ctx, img, 222, 18, 190); ctx.fillText("លទ្ធផលចាត់ថ្នាក់", 222, 224); }
      else { ctx.fillStyle = "#999"; ctx.fillText("ចុច «យកគំរូ និងចាត់ថ្នាក់»", 222, 110); }
      ctx.font = `12px ${font()}`;
      S.classes.forEach((n, c) => { const y = 60 + c * 22; ctx.fillStyle = CCOL[c]; ctx.fillRect(432, y, 16, 14); ctx.strokeStyle = "#999"; ctx.strokeRect(432, y, 16, 14);
        ctx.fillStyle = "#333"; ctx.fillText(n, 454, y + 12); });
      if (classified) { let correct = 0; for (let i = 0; i < S.n * S.n; i++) if (classified[i] === S.cls[i]) correct++;
        const acc = (correct / (S.n * S.n)) * 100;
        out.innerHTML = `ភាពត្រឹមត្រូវសរុប ≈ <b>${fmtN(acc)}%</b> ជាមួយ <b>${kh(+q(".sv-n").value)}</b> គំរូក្នុងមួយថ្នាក់<br><span class="sim-hint">ចំនួនគំរូតិចពេក ធ្វើឲ្យសញ្ញាណថ្នាក់មិនស្ថិតស្ថេរ ហើយភាពត្រឹមត្រូវប្រែប្រួលខ្លាំងរាល់ដងយកគំរូថ្មី។ ការវាយតម្លៃភាពត្រឹមត្រូវដ៏តឹងរឹងជាងនេះ ស្ថិតក្នុងមេរៀនទី១៣។</span>`;
      } else out.innerHTML = "ជ្រើសចំនួនគំរូ ហើយចុចប៊ូតុងដើម្បីចាត់ថ្នាក់ក្រឡាទាំងអស់ដោយវិធីចម្ងាយអប្បបរមា។";
    };
    const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));
    el.querySelector(".sv-run").onclick = () => { seed = Math.floor(Math.random() * 90000) + 1; takeSamples(+q(".sv-n").value); classify(); draw(); };
    q(".sv-n").addEventListener("input", () => (q(".sv-nv").textContent = kh(+q(".sv-n").value)));
    q(".sv-nv").textContent = kh(10);
    draw(); window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L12 · decision boundary visualisation (2-band) ---------- */
  window.EXTRA_SIMS["rs-boundary"] = (el) => {
    const { cv, ctx, out, q } = shell(el, "ព្រំដែនការសម្រេចចិត្ត៖ ចម្ងាយអប្បបរមា ធៀបនឹង Parallelepiped",
      `<span class="sim-seg bd-m"><button type="button" data-m="dist" class="on">ចម្ងាយអប្បបរមា</button><button type="button" data-m="para">Parallelepiped</button></span>`);
    const W = 640, H = 320;
    const pts = { water: [0.05, 0.02], forest: [0.55, 0.15], rice: [0.75, 0.35] };
    const cols = { water: "#1565c0", forest: "#2e7d32", rice: "#7cb342" };
    const X0 = 60, Y0 = 20, X1 = 480, Y1 = 280;
    const X = (v) => X0 + v * (X1 - X0), Y = (v) => Y1 - v * (Y1 - Y0);
    const draw = () => {
      fit(cv, ctx, W, H); const mode = el.querySelector(".bd-m .on").dataset.m;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      const size = 3;
      for (let py = 0; py <= (Y1 - Y0); py += size) for (let px = 0; px <= (X1 - X0); px += size) {
        const vx = px / (X1 - X0), vy = 1 - py / (Y1 - Y0);
        let cls;
        if (mode === "dist") { let best = null, bd = Infinity;
          Object.entries(pts).forEach(([k, [a, b]]) => { const d = (vx - a) ** 2 + (vy - b) ** 2; if (d < bd) { bd = d; best = k; } }); cls = best;
        } else { cls = null;
          Object.entries(pts).forEach(([k, [a, b]]) => { if (Math.abs(vx - a) < 0.14 && Math.abs(vy - b) < 0.14) cls = k; }); }
        if (cls) { ctx.fillStyle = cols[cls]; ctx.globalAlpha = 0.28; ctx.fillRect(X0 + px, Y0 + (Y1 - Y0 - py - size), size + 1, size + 1); ctx.globalAlpha = 1; }
      }
      ctx.strokeStyle = "#555"; ctx.strokeRect(X0, Y0, X1 - X0, Y1 - Y0);
      Object.entries(pts).forEach(([k, [a, b]]) => { ctx.beginPath(); ctx.arc(X(a), Y(b), 6, 0, 7); ctx.fillStyle = cols[k]; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
        if (mode === "para") { ctx.strokeStyle = cols[k]; ctx.lineWidth = 1.2; ctx.setLineDash([3, 2]); ctx.strokeRect(X(a - 0.14), Y(b + 0.14), 0.28 * (X1 - X0), 0.28 * (Y1 - Y0)); ctx.setLineDash([]); } });
      ctx.font = `11px ${font()}`; ctx.fillStyle = "#333"; ctx.fillText("ក្រហម", X1 - 30, Y1 + 16); ctx.save(); ctx.translate(20, (Y0 + Y1) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText("NIR", 0, 0); ctx.restore();
      out.innerHTML = mode === "dist"
        ? "ចម្ងាយអប្បបរមា៖ ក្រឡាទាំងអស់ត្រូវបានចាត់ថ្នាក់ (ព្រំដែនបិទជិត គ្មានតំបន់ទទេ)។ ចំណុចនៅចម្ងាយឆ្ងាយពីគំរូទាំងអស់ នៅតែត្រូវបានចាត់ថ្នាក់ទៅថ្នាក់ជិតបំផុត ទោះវាមិនស្រដៀងថ្នាក់នោះក៏ដោយ។"
        : "Parallelepiped៖ កំណត់ប្រអប់ជុំវិញគំរូនីមួយៗ។ ក្រឡាដែលធ្លាក់ក្រៅប្រអប់ទាំងអស់ មិនត្រូវបានចាត់ថ្នាក់ (តំបន់ស) ដែលស្មោះត្រង់ជាង ប៉ុន្តែផ្ដល់ «គម្លាត» ច្រើន។";
    };
    el.querySelectorAll(".bd-m button").forEach((b) => (b.onclick = () => { el.querySelectorAll(".bd-m button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); draw(); }));
    draw(); window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L13 · confusion matrix builder ---------- */
  window.EXTRA_SIMS["rs-confmat"] = async (el) => {
    const S = await loadScene();
    const { cv, ctx, out, q } = shell(el, "បង្កើត និងអានតារាងច្របូកច្របល់",
      `<label>ចំនួនចំណុចផ្ទៀងផ្ទាត់ក្នុងមួយថ្នាក់ <b class="cm-nv"></b> <input type="range" class="cm-n" min="5" max="40" value="15"></label>
       <button type="button" class="cm-run">យកគំរូ ចាត់ថ្នាក់ និងវាយតម្លៃ</button>`);
    const W = 640, H = 420;
    const k = 5;
    let seed = 21; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const noiseHash = (i, b) => { let x = (i * 374761393 + b * 668265263) >>> 0; x = (x ^ (x >>> 13)) >>> 0; x = Math.imul(x, 1274126177) >>> 0; x = (x ^ (x >>> 16)) >>> 0; return (x % 2000) / 1000 - 1; };
    const rNoisy = (b, i) => clamp(refl(S, b, i) + 0.06 * noiseHash(i, b), 0, 1);
    let M = null, trainIdx = [], valIdx = [];
    const run = () => {
      const perClass = +q(".cm-n").value;
      const byClass = [[], [], [], [], []];
      for (let i = 0; i < S.n * S.n; i++) byClass[S.cls[i]].push(i);
      trainIdx = []; valIdx = [];
      const sigs = byClass.map((idxs) => { const shuffled = idxs.slice().sort(() => rnd() - 0.5);
        const train = shuffled.slice(0, perClass), val = shuffled.slice(perClass, perClass + Math.max(5, Math.floor(perClass / 2)));
        trainIdx.push(train); valIdx.push(val);
        const m = [0, 0, 0, 0, 0, 0]; train.forEach((i) => { for (let b = 0; b < 6; b++) m[b] += rNoisy(b, i); }); return m.map((v) => v / train.length); });
      M = Array.from({ length: k }, () => new Array(k).fill(0));
      valIdx.forEach((idxs, trueC) => idxs.forEach((i) => { let best = 0, bd = Infinity;
        sigs.forEach((sig, c) => { let d = 0; for (let b = 0; b < 6; b++) d += (rNoisy(b, i) - sig[b]) ** 2; if (d < bd) { bd = d; best = c; } });
        M[trueC][best]++; }));
    };
    const draw = () => {
      fit(cv, ctx, W, H); q(".cm-nv").textContent = kh(+q(".cm-n").value);
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      if (!M) { ctx.font = `13px ${font()}`; ctx.fillStyle = "#999"; ctx.fillText("ចុចប៊ូតុងខាងលើ ដើម្បីបង្កើតតារាងច្របូកច្របល់", 20, 40); out.innerHTML = "ជ្រើសចំនួនគំរូ ហើយចុចប៊ូតុង។"; return; }
      const cx0 = 160, cy0 = 60, cell = 42;
      ctx.font = `11px ${font()}`; ctx.fillStyle = "#333"; ctx.fillText("ចាត់ថ្នាក់ព្យាករ (Predicted)", cx0, 30);
      S.classes.forEach((n2, j) => { ctx.save(); ctx.translate(cx0 + j * cell + cell / 2 + 4, cy0 - 10); ctx.rotate(-Math.PI / 4); ctx.fillText(n2, 0, 0); ctx.restore(); });
      S.classes.forEach((n2, i) => ctx.fillText(n2, cx0 - 60, cy0 + i * cell + cell / 2 + 4));
      const rowSum = M.map((r) => r.reduce((a, b) => a + b, 0));
      const colSum = S.classes.map((_, j) => M.reduce((a, r) => a + r[j], 0));
      let total = 0, diag = 0;
      for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) { const v = M[i][j]; total += v; if (i === j) diag += v;
        ctx.fillStyle = i === j ? "#c8e6c9" : v > 0 ? "#ffe0b2" : "#fafafa"; ctx.fillRect(cx0 + j * cell, cy0 + i * cell, cell, cell);
        ctx.strokeStyle = "#bbb"; ctx.strokeRect(cx0 + j * cell, cy0 + i * cell, cell, cell);
        ctx.fillStyle = "#333"; ctx.font = `12px ${font()}`; ctx.fillText(kh(v), cx0 + j * cell + cell / 2 - 6, cy0 + i * cell + cell / 2 + 4); }
      // row/col totals
      for (let i = 0; i < k; i++) ctx.fillText(kh(rowSum[i]), cx0 + k * cell + 8, cy0 + i * cell + cell / 2 + 4);
      for (let j = 0; j < k; j++) ctx.fillText(kh(colSum[j]), cx0 + j * cell + cell / 2 - 6, cy0 + k * cell + 16);
      ctx.fillText("សរុប", cx0 + k * cell + 4, cy0 - 6);
      const OA = (diag / total) * 100;
      const y0 = cy0 + k * cell + 40;
      ctx.font = `12px ${font()}`; ctx.fillStyle = "#333";
      ctx.fillText(`ភាពត្រឹមត្រូវសរុប (Overall Accuracy) = ${kh(diag)} ÷ ${kh(total)} = ${fmtN(OA)}%`, 20, y0);
      let ly = y0 + 22;
      S.classes.forEach((n2, i) => { const PA = rowSum[i] ? (M[i][i] / rowSum[i]) * 100 : 0, UA = colSum[i] ? (M[i][i] / colSum[i]) * 100 : 0;
        ctx.fillText(`${n2}៖ Producer's = ${fmtN(PA)}% · User's = ${fmtN(UA)}%`, 20, ly); ly += 18; });
      out.innerHTML = `<span class="sim-hint">Producer's accuracy (ជួរដេក) = ពីចំណុចពិតនៃថ្នាក់នេះ ប៉ុន្មានភាគរយត្រូវបានចាត់ថ្នាក់ត្រូវ។ User's accuracy (ជួរឈរ) = ពីចំណុចដែលចាត់ថ្នាក់ថាជាថ្នាក់នេះ ប៉ុន្មានភាគរយជាការពិត។</span>`;
    };
    el.querySelector(".cm-run").onclick = () => { run(); draw(); };
    draw(); window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L13 · Kappa intuition ---------- */
  window.EXTRA_SIMS["rs-kappa"] = (el) => {
    const { cv, ctx, out, q } = shell(el, "ហេតុអ្វីត្រូវការ Kappa បន្ថែមពីលើភាពត្រឹមត្រូវសរុប",
      `<label>ថ្នាក់ភាគច្រើន (%) <b class="kp-mv"></b> <input type="range" class="kp-m" min="20" max="95" value="80"></label>
       <label>ភាពត្រឹមត្រូវសរុប (%) <b class="kp-av"></b> <input type="range" class="kp-a" min="50" max="99" value="82"></label>`);
    const W = 640, H = 260;
    const draw = () => {
      fit(cv, ctx, W, H); const maj = +q(".kp-m").value / 100, OA = +q(".kp-a").value / 100;
      q(".kp-mv").textContent = kh(+q(".kp-m").value); q(".kp-av").textContent = kh(+q(".kp-a").value);
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      const pe = maj * maj + (1 - maj) * (1 - maj);              // chance agreement, 2-class simplification
      const kappa = (OA - pe) / (1 - pe);
      const X0 = 60, X1 = 560, Y0 = 30, Y1 = 150;
      [["ភាពត្រឹមត្រូវសរុប", OA, "#1565c0"], ["ការឯកភាពដោយចៃដន្យ (pe)", pe, "#e65100"], ["Kappa", Math.max(0, kappa), "#2e7d32"]].forEach(([lab, v, col], i) => {
        const y = Y0 + i * 42; ctx.fillStyle = "#eceff1"; ctx.fillRect(X0, y, X1 - X0, 24);
        ctx.fillStyle = col; ctx.fillRect(X0, y, Math.max(0, v) * (X1 - X0), 24);
        ctx.fillStyle = "#333"; ctx.font = `12px ${font()}`; ctx.fillText(`${lab}: ${fmtN(v * 100)}%`, X0, y - 4); });
      out.innerHTML = `Kappa = (OA − pe) ÷ (1 − pe) = <b>${fmtN(kappa, 2)}</b><br><span class="sim-hint">បើថ្នាក់មួយគ្របដណ្ដប់ភាគច្រើននៃទិន្នន័យ (ដូចព្រៃឈើនៅភាគច្រើននៃប្រទេស) សូម្បីតែការទាយចៃដន្យក៏អាចទទួលបានភាពត្រឹមត្រូវសរុបខ្ពស់ដែរ។ Kappa កាត់បន្ថយឥទ្ធិពលនៃការឯកភាពដោយចៃដន្យនេះចេញ ដើម្បីបង្ហាញលទ្ធផលពិតរបស់ការចាត់ថ្នាក់។</span>`;
    };
    el.querySelectorAll("input").forEach((x) => x.addEventListener("input", draw)); draw();
    window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L14 · image differencing / change detection ---------- */
  window.EXTRA_SIMS["rs-changedetect"] = async (el) => {
    const S = await loadScene();
    const { cv, ctx, out, q } = shell(el, "ការរកការផ្លាស់ប្ដូរដោយវិធីខុសគ្នានៃរូបភាព (Image Differencing)",
      `<label>ភាពចាស់ទុំនៃការកាប់ព្រៃ <b class="cd-tv"></b> <input type="range" class="cd-t" min="0" max="100" value="40"></label>
       <label>កម្រិតកំណត់ (threshold) NDVI Δ <b class="cd-hv"></b> <input type="range" class="cd-h" min="5" max="60" value="20"></label>`);
    const W = 640, H = 360;
    const n = S.n;
    // deterministic "clearing" patch (simulated deforestation) south-west of the forest block
    const clearMask = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const dx = x - 40, dy = y - 118;
      const d = Math.sqrt(dx * dx * 1.3 + dy * dy); clearMask[y * n + x] = d < 22 ? 1 : d < 30 ? (30 - d) / 8 : 0; }
    const ndvi = (b) => (refl(S, 3, b) - refl(S, 2, b)) / (refl(S, 3, b) + refl(S, 2, b) + 1e-9);
    const draw = () => {
      fit(cv, ctx, W, H); const prog = +q(".cd-t").value / 100, thr = +q(".cd-h").value / 100;
      q(".cd-tv").textContent = kh(+q(".cd-t").value) + "%"; q(".cd-hv").textContent = fmtN(thr, 2);
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      putScaled(ctx, composite(S, [2, 1, 0], n, false), 12, 18, 185);
      ctx.font = `11px ${font()}`; ctx.fillStyle = "#333"; ctx.fillText("ឆ្នាំ ២០២០ (មុន)", 12, 214);
      // "after" image: where clearMask*prog exceeds threshold, replace forest reflectance with bare-soil-like reflectance
      const img2 = ctx.createImageData(n, n), diffImg = ctx.createImageData(n, n);
      let changed = 0;
      const BARE = [0.135, 0.165, 0.20, 0.25, 0.31, 0.27];
      for (let i = 0; i < n * n; i++) { const clear = clearMask[i] * prog;
        const mix = (b) => refl(S, b, i) * (1 - clear) + BARE[b] * clear;
        const o = i * 4;
        img2.data[o] = clamp(mix(2) * 255 * 2.2, 0, 255); img2.data[o + 1] = clamp(mix(1) * 255 * 2.2, 0, 255); img2.data[o + 2] = clamp(mix(0) * 255 * 2.2, 0, 255); img2.data[o + 3] = 255;
        const nirA = refl(S, 3, i), redA = refl(S, 2, i), ndviA = (nirA - redA) / (nirA + redA + 1e-9);
        const nirB = mix(3), redB = mix(2), ndviB = (nirB - redB) / (nirB + redB + 1e-9);
        const d = ndviA - ndviB, isChange = d > thr;
        if (isChange) changed++;
        diffImg.data[o] = isChange ? 220 : 245; diffImg.data[o + 1] = isChange ? 40 : 245; diffImg.data[o + 2] = isChange ? 40 : 245; diffImg.data[o + 3] = 255; }
      putScaled(ctx, img2, 222, 18, 185); ctx.fillText("ឆ្នាំ ២០២៤ (ក្រោយ)", 222, 214);
      putScaled(ctx, diffImg, 432, 18, 185); ctx.fillText("ផែនទីការផ្លាស់ប្ដូរ (ក្រហម)", 432, 214);
      const ha = (changed / (n * n)) * 4;                        // scene ~2x2km => 4 sq km total, teaching approximation
      out.innerHTML = `ផ្ទៃដែលរកឃើញថាបានផ្លាស់ប្ដូរ ≈ <b>${fmtN(ha, 2)} គម²</b> (${fmtN((changed / (n * n)) * 100, 1)}% នៃទិដ្ឋភាព)<br><span class="sim-hint">វិធីនេះគណនា NDVI ដាច់ដោយឡែកសម្រាប់រូបភាពទាំងពីរ រួចដកគ្នា។ តម្លៃខ្ពស់ (ធ្លាក់ចុះខ្លាំង) ចាត់ទុកជាការផ្លាស់ប្ដូរ។ កម្រិតកំណត់ទាបពេក រកឃើញការប្រែប្រួលធម្មតា (ចម្រុះជាភាពមិនប្រាកដប្រជា) ជា «ការផ្លាស់ប្ដូរ» ដោយខុស។ កម្រិតកំណត់ខ្ពស់ពេក អាចខកខានការផ្លាស់ប្ដូរតូចៗ។ ទិន្នន័យនេះជាគំរូសម្រាប់បង្រៀន។</span>`;
    };
    el.querySelectorAll("input").forEach((x) => x.addEventListener("input", draw)); draw();
    window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L14 · phenology / NDVI time series ---------- */
  window.EXTRA_SIMS["rs-timeseries"] = (el) => {
    const { cv, ctx, out, q } = shell(el, "ដេរិកកម្មនៃ NDVI តាមរដូវដាំដុះ (Phenology)",
      `<label>ប្រភេទស្រែ <select class="ts-c"><option value="single" selected>ស្រែតែមួយរដូវ (ភ្លៀង)</option><option value="double">ស្រែពីររដូវ (ស្រោចស្រព)</option><option value="forest">ព្រៃឈើអចិន្ត្រៃយ៍</option></select></label>
       <label>ខែបច្ចុប្បន្ន <b class="ts-mv"></b> <input type="range" class="ts-m" min="0" max="11" value="6"></label>`);
    const W = 640, H = 300;
    const MONTHS = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
    const curve = (kind) => { const pts = [];
      for (let m = 0; m < 12; m++) { let v;
        if (kind === "forest") v = 0.78 + 0.05 * Math.sin((m / 12) * Math.PI * 2);
        else if (kind === "single") { // transplant ~ July, peak ~Sept-Oct, harvest ~Dec
          const phase = ((m - 6 + 12) % 12) / 12; v = phase < 0.08 ? 0.05 : phase < 0.5 ? 0.05 + (phase - 0.08) / 0.42 * 0.8 : phase < 0.6 ? 0.85 : phase < 0.75 ? 0.85 - (phase - 0.6) / 0.15 * 0.7 : 0.1; }
        else { const phase1 = ((m - 1 + 12) % 12) / 12, phase2 = ((m - 7 + 12) % 12) / 12;
          const c1 = phase1 < 0.42 ? 0.05 + phase1 / 0.42 * 0.78 : phase1 < 0.5 ? 0.83 : 0.83 * Math.max(0, 1 - (phase1 - 0.5) / 0.17);
          const c2 = phase2 < 0.42 ? 0.05 + phase2 / 0.42 * 0.78 : phase2 < 0.5 ? 0.83 : 0.83 * Math.max(0, 1 - (phase2 - 0.5) / 0.17);
          v = Math.max(c1, c2, 0.05); }
        pts.push(Math.max(0.02, v)); }
      return pts; };
    const draw = () => {
      fit(cv, ctx, W, H); const kind = q(".ts-c").value, cm = +q(".ts-m").value;
      q(".ts-mv").textContent = MONTHS[cm];
      const pts = curve(kind);
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      const X0 = 60, X1 = 600, Y0 = 30, Y1 = 210;
      ctx.strokeStyle = "#555"; ctx.beginPath(); ctx.moveTo(X0, Y1); ctx.lineTo(X1, Y1); ctx.moveTo(X0, Y0); ctx.lineTo(X0, Y1); ctx.stroke();
      ctx.font = `10px ${font()}`; ctx.fillStyle = "#555";
      MONTHS.forEach((mn, i) => { const x = X0 + (i / 11) * (X1 - X0); ctx.fillText(mn.slice(0, 3), x - 10, Y1 + 16); });
      [0, 0.25, 0.5, 0.75, 1].forEach((v) => { const y = Y1 - v * (Y1 - Y0); ctx.fillText(fmtN(v, 2), 20, y + 4); ctx.strokeStyle = "#f0f0f0"; ctx.beginPath(); ctx.moveTo(X0, y); ctx.lineTo(X1, y); ctx.stroke(); });
      ctx.fillText("NDVI", X0 - 20, Y0 - 10);
      ctx.beginPath(); pts.forEach((v, i) => { const x = X0 + (i / 11) * (X1 - X0), y = Y1 - v * (Y1 - Y0); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.strokeStyle = "#2e7d32"; ctx.lineWidth = 2.4; ctx.stroke();
      pts.forEach((v, i) => { const x = X0 + (i / 11) * (X1 - X0), y = Y1 - v * (Y1 - Y0); ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fillStyle = "#2e7d32"; ctx.fill(); });
      const cx = X0 + (cm / 11) * (X1 - X0), cy = Y1 - pts[cm] * (Y1 - Y0);
      ctx.strokeStyle = "#c62828"; ctx.lineWidth = 1.4; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(cx, Y0); ctx.lineTo(cx, Y1); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 7); ctx.fillStyle = "#c62828"; ctx.fill();
      const STAGE = kind === "forest" ? "ព្រៃឈើមិនប្ដូរច្រើនតាមរដូវ" : pts[cm] < 0.15 ? "ទឹកជន់ / ដីទទេ (មុនស្ទូង ឬក្រោយច្រូតកាត់)" : pts[cm] < 0.5 ? "ដំណាំកំពុងលូតលាស់" : pts[cm] < 0.75 ? "ដំណាំជិតដល់កំពូល" : "ដំណាំពេញលូតលាស់ / ជិតច្រូតកាត់";
      out.innerHTML = `ខែ <b>${MONTHS[cm]}</b>៖ NDVI ≈ <b>${fmtN(pts[cm], 2)}</b> · ដំណាក់កាលប្រហាក់ប្រហែល៖ <b>${STAGE}</b><br><span class="sim-hint">ខ្សែកោងនេះជាគំរូធម្មតាសម្រាប់បង្រៀន។ រូបរាងពិតប្រែប្រួលតាមពូជ ទឹកភ្លៀង និងការគ្រប់គ្រង។ ដើម្បីវាស់ខ្សែកោងពិត ត្រូវការរូបភាពជាច្រើននៅចន្លោះពេលទៀងទាត់ ដែលហៅថា <b>ស៊េរីពេលវេលា (Time series)</b>។</span>`;
    };
    el.querySelectorAll("select,input").forEach((x) => x.addEventListener("input", draw)); draw();
    window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L15 · SAR backscatter vs optical, under cloud ---------- */
  window.EXTRA_SIMS["rs-sar"] = async (el) => {
    const S = await loadScene();
    const { cv, ctx, out, q } = shell(el, "រ៉ាដា SAR ធៀបនឹងអុបទិក ក្រោមពពក",
      `<label><input type="checkbox" class="sr-c" checked> ពពកគ្របដណ្ដប់</label>
       <label><input type="checkbox" class="sr-s" checked> សំឡេងរំខាន Speckle</label>`);
    const W = 640, H = 340;
    const n = S.n;
    // synthetic backscatter (dB-like 0..1 display scale) per class + per-pixel texture
    const BACK = { 0: 0.08, 1: 0.62, 2: 0.40, 3: 0.85, 4: 0.30 };           // water low, built very high (corner reflector), forest high/rough
    const noiseHash = (i, k) => { let x = (i * 2654435761 + k * 40503) >>> 0; x = (x ^ (x >>> 13)) >>> 0; x = Math.imul(x, 1274126177) >>> 0; return ((x >>> 16) % 1000) / 1000; };
    const cloudMask = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const a = Math.sin(x * 0.05 + 1) * Math.cos(y * 0.04 + 2) + Math.sin(x * 0.02 - y * 0.03);
      cloudMask[y * n + x] = clamp(a * 0.5 + 0.5, 0, 1); }
    const draw = () => {
      fit(cv, ctx, W, H); const cloud = q(".sr-c").checked, speck = q(".sr-s").checked;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      const opt = ctx.createImageData(n, n), sar = ctx.createImageData(n, n);
      for (let i = 0; i < n * n; i++) { const o = i * 4;
        let r = refl(S, 2, i) * 2.2, g = refl(S, 1, i) * 2.2, b = refl(S, 0, i) * 2.2;
        if (cloud && cloudMask[i] > 0.55) { const cv2 = 0.85 + noiseHash(i, 1) * 0.15; r = g = b = cv2; }
        opt.data[o] = clamp(r * 255, 0, 255); opt.data[o + 1] = clamp(g * 255, 0, 255); opt.data[o + 2] = clamp(b * 255, 0, 255); opt.data[o + 3] = 255;
        let v = BACK[S.cls[i]]; if (speck) v = clamp(v * (0.7 + noiseHash(i, 2) * 0.6), 0, 1);
        const vv = Math.round(v * 255); sar.data[o] = vv; sar.data[o + 1] = vv; sar.data[o + 2] = vv; sar.data[o + 3] = 255; }
      putScaled(ctx, opt, 14, 18, 290); ctx.font = `12px ${font()}`; ctx.fillStyle = "#333"; ctx.fillText("អុបទិក (Sentinel-2)", 14, 324);
      putScaled(ctx, sar, 334, 18, 290); ctx.fillText("រ៉ាដា SAR (Sentinel-1 · គំរូ)", 334, 324);
      const cloudPct = cloud ? (Array.from(cloudMask).filter((v) => v > 0.55).length / (n * n)) * 100 : 0;
      out.innerHTML = cloud
        ? `ពពកបាំង ≈ <b>${fmtN(cloudPct)}%</b> នៃទិដ្ឋភាពអុបទិក។ រូបភាពរ៉ាដាមើលឃើញផ្ទៃដីទាំងស្រុង ព្រោះរលកមីក្រូវ៉េវឆ្លងកាត់ពពក។`
        : "គ្មានពពកទេ ដូច្នេះទាំងពីររូបភាពមើលឃើញផ្ទៃដីស្មើគ្នា។ សូមសាកល្បងបើកពពកឡើងវិញ ដើម្បីមើលភាពខុសគ្នា។";
      out.innerHTML += `<br><span class="sim-hint">ក្នុងរូបរ៉ាដា ទឹកមើលទៅខ្មៅ (ស្មូធ ឆ្លុះចេញឆ្ងាយពីឧបករណ៍) សំណង់ភ្លឺបំផុត (ឆ្លុះត្រឡប់ត្រង់ដូចកញ្ចក់ជ្រុង) ព្រៃឈើមធ្យមទៅភ្លឺ (រដុប) ។ ចំណុចភ្លឺ/ងងឹតតូចៗគ្រាប់ៗគ្នាហៅថា <b>speckle</b> ដែលជាសំឡេងរំខានធម្មតានៃរូបភាពរ៉ាដា។</span>`;
    };
    el.querySelectorAll("input").forEach((x) => x.addEventListener("change", draw)); draw();
    window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L15 · SAR flood mapping threshold ---------- */
  window.EXTRA_SIMS["rs-sarflood"] = (el) => {
    const { cv, ctx, out, q } = shell(el, "ធ្វើផែនទីទឹកជំនន់ពីរ៉ាដា៖ កម្រិតកំណត់ Backscatter",
      `<label>កម្រិតកំណត់ (dB · គំរូ) <b class="sf-tv"></b> <input type="range" class="sf-t" min="10" max="60" value="25"></label>`);
    const W = 640, H = 300, n = 90;
    // synthetic pre-flood vs flood backscatter grid (simple shapes: river + floodplain that fills as threshold relates to "water extent")
    let seed = 5; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const base = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const riverD = Math.abs(y - (45 + 10 * Math.sin(x / 12))); const lowland = Math.max(0, 1 - Math.abs(y - 45) / 35) * (0.4 + 0.3 * Math.sin(x / 9));
      base[y * n + x] = riverD < 3 ? 0.05 : clamp(0.55 - lowland * 0.45 + rnd() * 0.08, 0.05, 0.9); }
    const draw = () => {
      fit(cv, ctx, W, H); const thr = +q(".sf-t").value / 100; q(".sf-tv").textContent = fmtN(+q(".sf-t").value);
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      const img = ctx.createImageData(n, n); let waterPx = 0;
      for (let i = 0; i < n * n; i++) { const v = base[i], isWater = v < thr; if (isWater) waterPx++;
        const o = i * 4; if (isWater) { img.data[o] = 33; img.data[o + 1] = 100; img.data[o + 2] = 200; } else { const g = Math.round(v * 200 + 40); img.data[o] = g; img.data[o + 1] = g * 0.85; img.data[o + 2] = g * 0.6; }
        img.data[o + 3] = 255; }
      putScaled(ctx, img, 20, 18, 300);
      ctx.font = `12px ${font()}`; ctx.fillStyle = "#333"; ctx.fillText("ខៀវ = ចាត់ទុកជាទឹក (backscatter < កម្រិតកំណត់)", 340, 60);
      const areaKm2 = (waterPx / (n * n)) * 4;
      out.innerHTML = `ផ្ទៃដែលចាត់ទុកជាទឹក ≈ <b>${fmtN(areaKm2, 2)} គម²</b> (${fmtN((waterPx / (n * n)) * 100)}% នៃទិដ្ឋភាព)<br><span class="sim-hint">ទឹកស្ងប់ឆ្លុះរលកចេញឆ្ងាយពីឧបករណ៍ ដូច្នេះមាន backscatter ទាប។ កម្រិតកំណត់ទាបពេក ខកខានផ្ទៃទឹករាក់ ឬមានរលក។ ខ្ពស់ពេក រួមបញ្ចូលដីសើម ឬស្រមោលជាទឹកខុស។ ការធ្វើផែនទីទឹកជំនន់ពិត ច្រើនតែប្រៀបធៀបរូបភាពមុន/ក្រោយជំនន់ ដើម្បីកាត់បន្ថយកំហុសនេះ (Image Differencing ដូច[មេរៀនទី១៤](lesson-14.md))។</span>`;
    };
    q(".sf-t").addEventListener("input", draw); draw();
    window.addEventListener("resize", () => el.isConnected && draw());
  };

  /* ---------- L14 · REAL change detection: Sihanoukville 2015 vs 2021 ---------- */
  let shvCache = null;
  const loadSHV = async () => {
    if (shvCache) return shvCache;
    const j = await (await fetch(new URL("../../assets/data/shv_change.json", location.href))).json();
    const bin = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
    const n = j.w * j.h, nb = j.bands.length;
    const raw15 = bin(j.y2015), raw21 = bin(j.y2021);
    const b15 = [], b21 = [];
    for (let k = 0; k < nb; k++) { b15.push(raw15.subarray(k * n, (k + 1) * n)); b21.push(raw21.subarray(k * n, (k + 1) * n)); }
    shvCache = { w: j.w, h: j.h, bands: j.bands, b15, b21 };
    return shvCache;
  };
  window.EXTRA_SIMS["rs-shv-change"] = async (el) => {
    const D = await loadSHV();
    const { cv, ctx, out, q } = shell(el, "ករណីសិក្សាពិត៖ ការផ្លាស់ប្ដូរនៅព្រះសីហនុ ២០១៥ ធៀបនឹង ២០២១",
      `<label>កម្រិតកំណត់នៃការផ្លាស់ប្ដូរ <b class="sh-tv"></b> <input type="range" class="sh-t" min="10" max="90" value="35"></label>`);
    const W = 640, H = 340, w = D.w, h = D.h;
    // bands: B2 B3 B4 B5 B6 B7 -> indices 0..5
    const at = (arr, b, i) => arr[b][i] / 255;
    const draw = () => {
      fit(cv, ctx, W, H); const thr = +q(".sh-t").value / 100; q(".sh-tv").textContent = fmtN(+q(".sh-t").value);
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      const mw = 190;
      const mk = (arr) => { const img = ctx.createImageData(w, h);
        for (let i = 0; i < w * h; i++) { const o = i * 4;
          img.data[o] = at(arr, 2, i) * 255 * 1.15; img.data[o + 1] = at(arr, 1, i) * 255 * 1.15; img.data[o + 2] = at(arr, 0, i) * 255 * 1.15; img.data[o + 3] = 255; }
        return img; };
      putScaled(ctx, mk(D.b15), 6, 18, mw); ctx.font = `11px ${font()}`; ctx.fillStyle = "#333"; ctx.fillText("ឆ្នាំ ២០១៥", 6, mw * (h / w) + 32);
      putScaled(ctx, mk(D.b21), 6 + mw + 10, 18, mw); ctx.fillText("ឆ្នាំ ២០២១", 6 + mw + 10, mw * (h / w) + 32);
      // change vector magnitude across the 6 bands
      const chImg = ctx.createImageData(w, h); let changedPx = 0;
      for (let i = 0; i < w * h; i++) { let sq = 0; for (let b = 0; b < 6; b++) { const d = at(D.b21, b, i) - at(D.b15, b, i); sq += d * d; }
        const mag = Math.sqrt(sq / 6); const isCh = mag > thr; if (isCh) changedPx++;
        const o = i * 4; if (isCh) { chImg.data[o] = 220; chImg.data[o + 1] = 30; chImg.data[o + 2] = 30; } else { const g = at(D.b15, 2, i) * 200 + 30; chImg.data[o] = g; chImg.data[o + 1] = g; chImg.data[o + 2] = g; }
        chImg.data[o + 3] = 255; }
      putScaled(ctx, chImg, 6 + 2 * (mw + 10), 18, mw); ctx.fillText("ការផ្លាស់ប្ដូរ (ក្រហម)", 6 + 2 * (mw + 10), mw * (h / w) + 32);
      const pctCh = (changedPx / (w * h)) * 100;
      out.innerHTML = `ទិន្នន័យ Sentinel-2 ពិតលើក្រុងព្រះសីហនុ (Sihanoukville) ដែលកំពុងអភិវឌ្ឍយ៉ាងលឿន។ ផ្ទៃដែលរកឃើញថាផ្លាស់ប្ដូរ ≈ <b>${fmtN(pctCh)}%</b> នៃទិដ្ឋភាព<br><span class="sim-hint">វិធីនេះហៅថា <b>Change Vector Analysis (CVA)</b>៖ គណនាចម្ងាយស្ពិចត្រាល់រវាងឆ្នាំទាំងពីរ ឆ្លងកាត់ក្រុមរលកច្រើន ក្នុងពេលតែមួយ ជំនួសឲ្យប្រើសន្ទស្សន៍តែមួយ។ តំបន់ក្រហមភ្លឺបំផុតត្រូវនឹងទីតាំងសំណង់ថ្មី និងការជម្រុះដីសម្រាប់ការអភិវឌ្ឍតាមឆ្នេរ។ បង្កើនកម្រិតកំណត់ ដើម្បីមើលតែការផ្លាស់ប្ដូរខ្លាំងបំផុត។</span>`;
    };
    q(".sh-t").addEventListener("input", draw); draw();
    window.addEventListener("resize", () => el.isConnected && draw());
  };
})();
