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
       <label><input type="checkbox" class="rv-l"> បង្ហាញស្រទាប់ក្រប់ដី</label>`);
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
      out.innerHTML = `${NOTE}<br><span class="sim-hint">ទិដ្ឋភាពគំរូ ២០០ × ២០០ ក្រឡា ក្រឡា ១០ ម (ប្រហែល ២ × ២ គម) · តម្លៃឆ្លុះបញ្ចាំងជាតម្លៃសំយោគតាមបែប Sentinel-2។</span>`;
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
})();
