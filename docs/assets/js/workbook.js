/* ============================================================
   Workbook interactive tools · Fundamentals of GIS (khgeo/gis-fundamentals)
   Requires Leaflet (mkdocs.yml extra_javascript). Works with Material's
   instant navigation (document$).

   COMPONENTS (put the HTML in a lab page; configs live in the registries)
   <div class="lab-map" data-map="lab-10"></div>          map (LAB_MAPS)
   <div class="lab-chart" data-chart="lab-11-classes"></div> bar chart (CHARTS)
   <div class="change-matrix" data-matrix="lab-11"></div>  change matrix (MATRICES)
   <div class="match-quiz" data-quiz="lab-02-errors"></div> matching quiz (QUIZZES)
   <div class="raster-sim" data-src="../../assets/data/lab-02/polygon.json"></div>
   <div class="self-check" data-min="1" data-max="2" data-hint="…" markdown>Q</div>
   <div class="self-check" data-answer="A|B" markdown>Q</div>

   Map options: layers[] {id,file,name,on,style|point,popup,pane,table,fit}
                swipe {left:id, right:id, leftLabel, rightLabel}
                tasks[] {q, layer, check(props), ok}   click-on-map quiz
                table: true   attribute table linked to the map
   Answers are visible in page source: use for self-study, not grading.
   ============================================================ */

(function () {
  "use strict";

  /* ---------------- Helpers ---------------- */
  const KM = "០១២៣៤៥៦៧៨៩";
  const kh = (n) => String(n).replace(/[0-9]/g, (d) => KM[d]);
  const fmt = (n, dec = 0) =>
    kh(Number(n).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })
      .replace(/,/g, " ").replace(".", ","));
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const url = (rel) => new URL(rel, window.location.href);
  const LC = {
    "Forest cover": ["#2e7d32", "ព្រៃឈើ"], "Agricultural land": ["#f9a825", "ដីកសិកម្ម"],
    "Urban or built-up area": ["#d32f2f", "តំបន់ទីក្រុង"], "Water": ["#1976d2", "ទឹក"], "Baren land": ["#a1887f", "ដីទំនេរ"],
  };
  const lcStyle = (p) => ({ color: LC[p.cls || p.to]?.[0], weight: 0.3, fillColor: LC[p.cls || p.to]?.[0], fillOpacity: 0.75 });
  const lcLegend = Object.values(LC).map(([c, n]) => ["box", c, n]);
  const ramp = (v, breaks, colors) => colors[breaks.filter((b) => v >= b).length - 1] || colors[0];
  window.labMaps = window.labMaps || {};

  /* ---------------- Map registry ---------------- */
  const LAB_MAPS = {
    /* Lab 1: explore layers and the map–table link (Kampong Chhnang town) */
    "lab-01": {
      base: "../../assets/data/lab-01/",
      table: true,
      layers: [
        { id: "communes", file: "communes.geojson", name: "ឃុំ សង្កាត់ (ពហុកោណ)", on: true, fit: true,
          style: { color: "#6a1b9a", weight: 1.5, dashArray: "4 3", fillColor: "#ce93d8", fillOpacity: 0.08 },
          popup: (p) => `<b>${p.COMNAME_KH}</b><br>${p.COM_NAME}<br><code>${p.CommGis}</code>`,
          table: [["CommGis", "លេខកូដ"], ["COMNAME_KH", "ឈ្មោះ"], ["COM_NAME", "ឈ្មោះឡាតាំង"]] },
        { id: "water", file: "water.geojson", name: "ទន្លេ និងបឹង (ពហុកោណ)", on: true,
          style: { color: "#1565c0", weight: 0.5, fillColor: "#64b5f6", fillOpacity: 0.6 },
          popup: (p) => `<b>${esc(p.NAME) || "ផ្ទៃទឹក"}</b><br>ផ្ទៃ៖ ${fmt(p.area_km2, 2)} គម²` },
        { id: "roads", file: "roads.geojson", name: "ផ្លូវ (បន្ទាត់)", on: true,
          style: (p) => ({ color: /Primary|Secondary/.test(p.Type) ? "#e65100" : "#8d6e63", weight: /Primary|Secondary/.test(p.Type) ? 3 : 1.3 }),
          popup: (p) => `<b>${p.Type}</b><br>ផ្ទៃផ្លូវ៖ ${p.ROAD_COND_}<br>ប្រវែង៖ ${fmt(p.len_km, 2)} គម`,
          table: [["Type", "ប្រភេទ"], ["ROAD_COND_", "ផ្ទៃផ្លូវ"], ["len_km", "ប្រវែង (គម)"]] },
        { id: "villages", file: "villages.geojson", name: "ភូមិ (ចំណុច)", on: true,
          point: (p) => ({ radius: 4 + Math.sqrt(p.TOTPOP) / 12, color: "#fff", weight: 1, fillColor: "#3949ab", fillOpacity: 0.9 }),
          popup: (p) => `<b>${p.VILL_NAME}</b><br>លេខកូដ៖ ${p.VILL_CODE}<br>ប្រជាជន៖ ${fmt(p.TOTPOP)} នាក់<br>គ្រួសារ៖ ${fmt(p.HH_TOT)}`,
          table: [["VILL_CODE", "លេខកូដ"], ["VILL_NAME", "ឈ្មោះ"], ["TOTPOP", "ប្រជាជន"], ["HH_TOT", "គ្រួសារ"]] },
        { id: "schools", file: "schools.geojson", name: "សាលារៀន (ចំណុច)", on: true,
          point: { radius: 5, color: "#fff", weight: 1, fillColor: "#2e7d32", fillOpacity: 1 },
          popup: (p) => `<b>${p.SCHOOL_NAM}</b><br>${p.SCHOOL_TYP} · ${p.Location}`,
          table: [["SCHOOL_NAM", "ឈ្មោះ"], ["SCHOOL_TYP", "ប្រភេទ"], ["Location", "ទីតាំង"]] },
        { id: "health", file: "health.geojson", name: "មូលដ្ឋានសុខាភិបាល (ចំណុច)", on: true,
          point: (p) => ({ radius: 7, color: "#fff", weight: 1.5, fillColor: p.TYPE === "Referral hospital" ? "#b71c1c" : "#e53935", fillOpacity: 1 }),
          popup: (p) => `<b>${p.FACILITNAM}</b><br>${p.TYPE === "Referral hospital" ? "មន្ទីរពេទ្យបង្អែក" : "មណ្ឌលសុខភាព"}`,
          table: [["FACILITNAM", "ឈ្មោះ"], ["TYPE", "ប្រភេទ"]] },
      ],
      legend: [["dot", "#3949ab", "ភូមិ (ទំហំតាមប្រជាជន)"], ["dot", "#2e7d32", "សាលារៀន"], ["dot", "#e53935", "សុខាភិបាល"],
               ["line", "#e65100", "ផ្លូវធំ"], ["line", "#8d6e63", "ផ្លូវតូច"], ["box", "#64b5f6", "ទឹក"], ["dash", "#6a1b9a", "ព្រំឃុំ"]],
      tasks: [
        { q: "ចុចលើ **ភូមិ** ណាមួយ ដើម្បីមើលគុណលក្ខណៈរបស់វា។", layer: "villages", check: () => true,
          ok: "ល្អ! ចំណុចមួយភ្ជាប់ទៅជួរដេកមួយក្នុងតារាង។ មើលជួរដែលបន្លិចនៅក្នុងតារាងខាងក្រោម។" },
        { q: "ចុចលើ **ផ្លូវ** ណាមួយ។ តើផ្លូវជាធរណីមាត្រប្រភេទអ្វី?", layer: "roads", check: () => true,
          ok: "ត្រឹមត្រូវ! ផ្លូវជាវ៉ិចទ័រ **បន្ទាត់** ដែលមានប្រវែង ប៉ុន្តែគ្មានផ្ទៃ។" },
        { q: "ប្រើតារាងខាងក្រោម (ស្រទាប់ភូមិ) តម្រៀបតាមប្រជាជន រួចចុចលើ **ភូមិដែលមានប្រជាជនច្រើនជាងគេ** នៅលើផែនទី។", layer: "villages",
          check: (p) => p.VILL_CODE === "04030103", ok: "អស្ចារ្យ! ភូមិចុងកោះ មានប្រជាជន ៣ ៦៥៥ នាក់ (ជំរឿន ២០០៨)។" },
        { q: "ចុចលើ **មូលដ្ឋានសុខាភិបាល** ដែលជាមន្ទីរពេទ្យបង្អែក។", layer: "health",
          check: (p) => p.TYPE === "Referral hospital", ok: "ត្រឹមត្រូវ! ពណ៌ និងតារាងប្រាប់ពីប្រភេទ មិនមែនទីតាំងទេ។" },
        { q: "ចុចលើ **ឃុំ សង្កាត់** ដែលមានលេខកូដ `KH040304`។", layer: "communes",
          check: (p) => p.CommGis === "KH040304", ok: "ត្រឹមត្រូវ! សង្កាត់ខ្សាម។ លេខកូដ `KH04 03 04` = ខេត្ត · ស្រុក · ឃុំ។" },
      ],
    },

    /* Lab 10: buffers and proximity (Kampong Chhnang) */
    "lab-10": {
      base: "../../assets/data/lab-10/",
      layers: [
        { id: "nb", file: "neighbours.geojson", name: "ខេត្តជិតខាង", on: true,
          style: { color: "#9e9e9e", weight: 1, fillColor: "#bdbdbd", fillOpacity: 0.25 },
          popup: (p) => `<b>${p.Name_KH}</b><br>${p.Name_EN}` },
        { id: "buf", file: "buffer_5km.geojson", name: "បាហ្វ័រ ៥ គម ជុំវិញមណ្ឌលសុខភាព", on: true,
          style: { color: "#e65100", weight: 1, fillColor: "#ff9800", fillOpacity: 0.25 } },
        { id: "prov", file: "province.geojson", name: "ខេត្តកំពង់ឆ្នាំង", on: true, fit: true,
          style: { color: "#00695c", weight: 2.5, fill: false } },
        { id: "vill", file: "villages.geojson", name: "ភូមិ (ជំរឿន ២០០៨)", on: true,
          point: { radius: 3, color: "#1a237e", weight: 0.5, fillColor: "#3949ab", fillOpacity: 0.85 },
          popup: (p) => `<b>${p.VILL_NAME}</b><br>លេខកូដ៖ ${p.VILL_CODE}<br>ប្រជាជន៖ ${fmt(p.TOTPOP)} នាក់` },
        { id: "hc", file: "health_centres.geojson", name: "មណ្ឌលសុខភាព", on: true,
          point: (p) => ({ radius: 6, color: "#fff", weight: 1.5, fillColor: p.in_prov ? "#c62828" : "#ef9a9a", fillOpacity: 1 }),
          popup: (p) => `<b>${p.FACILITNAM}</b><br>ស្រុកប្រតិបត្តិ៖ ${p.ODNAME}<br>${p.in_prov ? "នៅក្នុងខេត្ត" : "នៅខេត្តជិតខាង"}` },
      ],
      legend: [["dot", "#c62828", "មណ្ឌលសុខភាពក្នុងខេត្ត"], ["dot", "#ef9a9a", "មណ្ឌលសុខភាពខេត្តជិតខាង"],
               ["dot-sm", "#3949ab", "ភូមិ"], ["box", "#ff9800", "ក្នុងចម្ងាយ ៥ គម"], ["line", "#00695c", "ព្រំខេត្តកំពង់ឆ្នាំង"]],
    },

    /* Lab 11a: swipe 1997 | 2015 land cover (Koh Kong) */
    "lab-11-swipe": {
      base: "../../assets/data/lab-11/",
      swipe: { left: "lc97", right: "lc15", leftLabel: "១៩៩៧ (MRC)", rightLabel: "២០១៥ (MoE)" },
      layers: [
        { id: "lc97", file: "lc1997.geojson", name: "ក្រប់ដី ១៩៩៧", on: true, style: lcStyle,
          popup: (p) => `<b>${p.kh}</b> · ១៩៩៧` },
        { id: "lc15", file: "lc2015.geojson", name: "ក្រប់ដី ២០១៥", on: true, style: lcStyle,
          popup: (p) => `<b>${p.kh}</b> · ២០១៥` },
        { id: "prov", file: "province.geojson", name: "ព្រំខេត្តកោះកុង", on: true, fit: true, style: { color: "#212121", weight: 2, fill: false } },
      ],
      legend: lcLegend,
    },

    /* Lab 11b: forest loss, protected areas, communes */
    "lab-11-loss": {
      base: "../../assets/data/lab-11/",
      layers: [
        { id: "comm", file: "communes.geojson", name: "ភាគរយបាត់បង់ព្រៃតាមឃុំ", on: false,
          style: (p) => ({ color: "#616161", weight: 0.8, fillOpacity: 0.75,
            fillColor: ramp(p.pct, [0, 10, 20, 30, 40], ["#fff5eb", "#fdd0a2", "#fd8d3c", "#d94801", "#7f2704"]) }),
          popup: (p) => `<b>${p.COMNAME_KH}</b> (${p.COM_NAME})<br>ស្រុក៖ ${p.DISNAME_KH}<br>បាត់បង់ព្រៃ៖ ${fmt(p.loss_ha)} ហ.ត<br>ស្មើ ${fmt(p.pct, 1)}% នៃផ្ទៃឃុំ` },
        { id: "loss", file: "forest_loss.geojson", name: "ព្រៃឈើបាត់បង់ ១៩៩៧–២០១៥", on: true, style: lcStyle,
          popup: (p) => `ព្រៃឈើ → <b>${p.kh}</b>` },
        { id: "pa", file: "protected_areas.geojson", name: "តំបន់ការពារធម្មជាតិ (២០១៨)", on: true,
          style: { color: "#1b5e20", weight: 2, dashArray: "6 4", fill: true, fillOpacity: 0 },
          popup: (p) => `<b>${p.Name_E}</b><br>${p.PA_TYPE}` },
        { id: "prov", file: "province.geojson", name: "ព្រំខេត្តកោះកុង", on: true, fit: true, style: { color: "#212121", weight: 2, fill: false } },
      ],
      legend: [["box", "#f9a825", "ព្រៃ → កសិកម្ម"], ["box", "#a1887f", "ព្រៃ → ដីទំនេរ"], ["box", "#1976d2", "ព្រៃ → ទឹក"],
               ["box", "#d32f2f", "ព្រៃ → ទីក្រុង"], ["dash", "#1b5e20", "តំបន់ការពារ"]],
    },
  };

  /* ---------------- Charts, matrices, quizzes ---------------- */
  const CHARTS = {
    "l04-school-types": { title: "សាលារៀនក្នុងខេត្តកំពង់ឆ្នាំងតាមប្រភេទ (ទីតាំងក្នុងព្រំខេត្ត)", delta: false,
      categories: ["Primary", "Pre school", "College", "Lycee G7-12"], colors: ["#26a69a", "#26a69a", "#26a69a", "#26a69a"],
      series: [{ name: "", values: [263, 77, 61, 14] }], note: "ប្រភព៖ Kh_School · សរុប ៤១៥ សាលា" },
    "l05-density": { title: "ដង់ស៊ីតេប្រជាជនខ្ពស់បំផុត ខេត្តកំពង់ឆ្នាំង (នាក់/គម² · ២០០៨)", delta: false,
      categories: ["B'er", "Phsar Chhnang", "Ponley"], colors: ["#cb181d", "#fb6a4a", "#fcae91"],
      series: [{ name: "", values: [2821, 1906, 1165] }], note: "ប្រជាជនពី Census_Commune ២០០៨ · ផ្ទៃពី $area នៃ Kh_Commune_area" },
    "l06-accuracy": { title: "ភាពត្រឹមត្រូវប្រហែលនៃឧបករណ៍ GNSS (ម៉ែត្រ · កាន់តែខ្លី កាន់តែល្អ)", delta: false, scale: "sqrt", dec: 2,
      categories: ["ទូរស័ព្ទ", "GPS ដៃ", "GNSS ពីរហ្វ្រេកង់", "RTK"], colors: ["#ef5350", "#ffa726", "#66bb6a", "#26a69a"],
      series: [{ name: "", values: [8, 3, 0.6, 0.02] }], note: "តម្លៃធម្មតាក្នុងលក្ខខណ្ឌចំហ។ ក្រោមដើមឈើ ឬជិតអគារ កំហុសអាចធំជាងនេះច្រើន។" },
    "l08-kkg-years": { title: "ក្រប់ដីក្នុងស្រទាប់ KKG_LC ទាំងបីឆ្នាំ (ហិកតា · មុន Clip)", scale: "sqrt",
      categories: ["ដីកសិកម្ម", "ដីទំនេរ", "ទឹក", "តំបន់ទីក្រុង"], colors: ["#f9a825", "#a1887f", "#1976d2", "#d32f2f"],
      series: [{ name: "១៩៩៧", values: [47852, 26908, 14908, 620] }, { name: "២០០៣", values: [26973, 126893, 21938, 453] }, { name: "២០១៥", values: [132499, 79220, 38848, 11490] }],
      note: "ដីទំនេរកើន ៥ ដងនៅឆ្នាំ ២០០៣ រួចថយវិញ ខណៈដីកសិកម្មធ្លាក់ពាក់កណ្ដាល៖ លំនាំនេះទំនងមកពីវិធីផលិតផែនទីខុសគ្នា (MRC · JICA · MoE)។ ភាគរយខាងលើ ប្រៀបធៀបឆ្នាំ ១៩៩៧ និង ២០១៥។" },
    "l09-schools": { title: "សំណួរលើសាលារៀន ៤១៥ ក្នុងខេត្តកំពង់ឆ្នាំង", delta: false,
      categories: ["សាលាទាំងអស់ក្នុងខេត្ត", "ក្នុងចម្ងាយ ១ គម ពីផ្លូវជាតិ", "ក្នុងតំបន់ជំនន់ ២០១១", "សាលាបឋមសិក្សាក្នុងជំនន់"], colors: ["#90a4ae", "#ff7043", "#42a5f5", "#1565c0"],
      series: [{ name: "", values: [415, 119, 80, 65] }] },
    "l10-classes": { title: "ប្រជាជនឆ្នាំ ២០០៨ តាមចម្ងាយទៅមណ្ឌលសុខភាពជិតបំផុត · ខេត្តកំពង់ឆ្នាំង", delta: false,
      categories: ["០–២ គម (១៨៩ ភូមិ)", "២–៥ គម (២៤០ ភូមិ)", "៥–១០ គម (១២០ ភូមិ)", "លើស ១០ គម (១៩ ភូមិ)"], colors: ["#1a9850", "#a6d96a", "#fdae61", "#d73027"],
      series: [{ name: "", values: [191178, 184126, 85912, 9596] }], note: "៩៥ ៥០៨ នាក់ (២០%) រស់នៅលើស ៥ គម តាមបន្ទាត់ត្រង់" },
    "l12-zonal": { title: "ចម្ងាយមធ្យមទៅមណ្ឌលសុខភាពជិតបំផុត តាមស្រុក (គម · Zonal statistics)", delta: false, dec: 1,
      categories: ["ទឹកផុស", "កំពង់លែង", "សាមគ្គីមានជ័យ", "បរិបូណ៌", "រលាប្អៀរ", "ជលគីរី", "កំពង់ត្រឡាច", "ក្រុងកំពង់ឆ្នាំង"],
      colors: ["#d73027", "#f46d43", "#fdae61", "#fee08b", "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850"],
      series: [{ name: "", values: [10.0, 8.5, 6.6, 5.6, 5.2, 4.6, 3.8, 2.6] }], note: "រ៉ាស្ទ័រ Proximity ១០០ ម ពីមណ្ឌលសុខភាពទូទាំងប្រទេស" },
    "l13-mae": { title: "កំហុសដាច់ខាតមធ្យម (MAE) នៃ IDW អក្ខរកម្មភូមិ តាមស្វ័យគុណ p", delta: false, dec: 1,
      categories: ["p = ១", "p = ២", "p = ៤"], colors: ["#7986cb", "#3949ab", "#7986cb"],
      series: [{ name: "", values: [10.7, 9.8, 10.4] }], note: "ពិន្ទុភាគរយ · មធ្យមនៃការបំបែក train/test ២០ ដង · ភាពខុសគ្នារវាង p តូចជាងកំហុសខ្លួនឯង" },
    "l14-sensitivity": { title: "ផ្ទៃពិន្ទុសមស្របភាព ≥ ០,៨ តាមសេណារីយ៉ូទម្ងន់ (ហិកតា)", delta: false,
      categories: ["ផ្លូវ ០,៤ · សាលា ០,៦", "ផ្លូវ ០,៧ · សាលា ០,៣"], colors: ["#26a69a", "#00897b"],
      series: [{ name: "", values: [9396, 10298] }], note: "ផ្ទៃប្ដូរតិច ប៉ុន្តែទីតាំងប្ដូរ៖ ត្រូវប្រៀបធៀបផែនទី មិនមែនតែតួលេខ" },
    "lab-11-classes": {
      title: "ផ្ទៃក្រប់ដីខេត្តកោះកុង (ហិកតា)",
      categories: ["ព្រៃឈើ", "ដីកសិកម្ម", "ដីទំនេរ", "ទឹក", "តំបន់ទីក្រុង"],
      colors: ["#2e7d32", "#f9a825", "#a1887f", "#1976d2", "#d32f2f"],
      series: [{ name: "១៩៩៧", values: [1017129, 40385, 25388, 13675, 620] },
               { name: "២០១៥", values: [871147, 110268, 70113, 35386, 10287] }],
      scale: "sqrt",
      note: "ប្រវែងរបារប្រើមាត្រដ្ឋានឫសការ៉េ ដើម្បីឲ្យថ្នាក់តូចៗមើលឃើញ។ ប្រៀបធៀបតួលេខ មិនមែនប្រវែងរបារទេ។",
    },
  };

  const MATRICES = {
    "lab-11": {
      labels: ["ព្រៃឈើ", "ដីកសិកម្ម", "ដីទំនេរ", "ទឹក", "តំបន់ទីក្រុង"],
      keys: ["Forest cover", "Agricultural land", "Baren land", "Water", "Urban or built-up area"],
      rowTitle: "១៩៩៧ ↓", colTitle: "២០១៥ →", unit: "ហ.ត",
      values: [
        [857244, 75980, 56360, 23097, 4449],
        [5294, 24417, 6426, 1118, 3131],
        [6110, 9284, 6758, 1441, 1797],
        [2497, 464, 545, 9667, 503],
        [3, 123, 24, 63, 407],
      ],
      map: "lab-11-loss", layer: "loss", field: "to",
    },
  };

  const QUIZZES = {
    "lab-01-concepts": {
      title: "ផ្គូផ្គងពាក្យ និងអត្ថន័យ",
      pairs: [
        ["ស្រទាប់ (Layer)", "សំណុំវត្ថុប្រភេទដូចគ្នា ដូចជាសាលារៀនទាំងអស់"],
        ["វត្ថុ (Feature)", "សាលារៀនមួយនៅលើផែនទី"],
        ["គុណលក្ខណៈ (Attribute)", "ចំនួនប្រជាជនរបស់ភូមិមួយ"],
        ["លេខសម្គាល់ (ID)", "KH040304"],
        ["CRS", "EPSG:32648"],
      ],
    },
    "lab-02-geometry": {
      title: "វត្ថុនីមួយៗ គួរតំណាងដោយធរណីមាត្រអ្វី នៅមាត្រដ្ឋានខេត្ត?",
      pairs: [
        ["ចំណុច (Point)", "មណ្ឌលសុខភាព"],
        ["បន្ទាត់ (Line)", "ផ្លូវជាតិលេខ ៥"],
        ["ពហុកោណ (Polygon)", "ព្រំឃុំ សង្កាត់"],
        ["រ៉ាស្ទ័រ (Raster)", "សីតុណ្ហភាពផ្ទៃដី"],
      ],
    },
    "lab-02-errors": {
      title: "ផ្គូផ្គងកំហុសធរណីមាត្រ និងការពិពណ៌នា",
      pairs: [
        ["លើសចុង (Overshoot)", "បន្ទាត់លាតហួសចំណុចប្រសព្វ"],
        ["ខ្វះចុង (Undershoot)", "បន្ទាត់មិនដល់ចំណុចប្រសព្វ ទុកចន្លោះតូច"],
        ["ពហុកោណកាត់ខ្លួនឯង (Self-intersection)", "ព្រំពហុកោណឆ្លងកាត់គ្នា ដូចលេខ ៨"],
        ["ចន្លោះស្ដើង (Sliver)", "ពហុកោណតូចស្ដើងរវាងព្រំដែនពីរដែលមិនស៊ីគ្នា"],
        ["ធរណីមាត្រស្ទួន (Duplicate)", "វត្ថុពីរដូចគ្នាបេះបិទ នៅទីតាំងតែមួយ"],
      ],
    },
    "lab-11-tools": {
      title: "ឧបករណ៍ណា ឆ្លើយសំណួរណា?",
      pairs: [
        ["Intersection", "ផ្ទៃណាខ្លះប្ដូរពីព្រៃឈើ ទៅជាដីកសិកម្ម?"],
        ["Clip", "កាត់ក្រប់ដីឲ្យនៅត្រឹមព្រំខេត្ត"],
        ["Union", "រក្សាផ្ទៃទាំងអស់ពីស្រទាប់ទាំងពីរ ទោះមិនត្រួតគ្នាក៏ដោយ"],
        ["Difference", "ព្រៃឈើណាខ្លះនៅក្រៅតំបន់ការពារ?"],
        ["Join attributes by location", "ភ្ជាប់ឈ្មោះឃុំទៅចំណុចសាលារៀននីមួយៗ"],
      ],
    },
  };

  /* ---------------- Map builder ---------------- */
  async function buildMap(el) {
    if (el.dataset.ready) return; el.dataset.ready = "1";
    const id = el.dataset.map, cfg = LAB_MAPS[id];
    if (!cfg) { el.textContent = "រកមិនឃើញការកំណត់ផែនទី៖ " + id; return; }
    if (typeof L === "undefined") { el.textContent = "មិនអាចផ្ទុក Leaflet បានទេ។ សូមពិនិត្យអ៊ីនធឺណិត។"; return; }

    // Task panel above the map
    let taskBox = null, taskIdx = 0;
    if (cfg.tasks) { taskBox = h("div", "map-tasks"); el.before(taskBox); }

    const map = L.map(el, { scrollWheelZoom: false, preferCanvas: false });
    const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { maxZoom: 18, attribution: "© អ្នករួមចំណែក OpenStreetMap" }).addTo(map);
    const layers = {}, overlays = {};
    let bounds = null;
    const state = { map, layers, cfg, selected: null };
    window.labMaps[id] = state;

    if (cfg.swipe) {
      ["swipeLeft", "swipeRight"].forEach((p) => { map.createPane(p).style.zIndex = 410; });
    }

    for (const lyr of cfg.layers) {
      try {
        const data = await (await fetch(url(cfg.base + lyr.file))).json();
        let pane = "overlayPane";
        if (cfg.swipe && lyr.id === cfg.swipe.left) pane = "swipeLeft";
        if (cfg.swipe && lyr.id === cfg.swipe.right) pane = "swipeRight";
        const renderer = L.svg({ pane });
        const gj = L.geoJSON(data, {
          pane, renderer,
          style: typeof lyr.style === "function" ? (f) => lyr.style(f.properties) : lyr.style,
          pointToLayer: lyr.point ? (f, ll) => L.circleMarker(ll, Object.assign({ pane, renderer },
            typeof lyr.point === "function" ? lyr.point(f.properties) : lyr.point)) : undefined,
          onEachFeature: (f, l) => {
            l._lyr = lyr; l.feature = f;
            if (lyr.popup) l.bindPopup(lyr.popup(f.properties));
            l.on("click", () => onFeatureClick(state, lyr, l));
          },
        });
        gj._source = data;
        if (lyr.on) gj.addTo(map);
        layers[lyr.id] = gj; overlays[lyr.name] = gj;
        if (lyr.fit) bounds = gj.getBounds();
      } catch (e) { console.error("Lab map layer failed:", lyr.file, e); }
    }
    map.fitBounds(bounds || [[10, 102], [14.7, 107.7]]);
    L.control.layers({ "OpenStreetMap": osm, "គ្មានផែនទីមូលដ្ឋាន": L.layerGroup() }, overlays, { collapsed: true }).addTo(map);
    L.control.scale({ metric: true, imperial: false }).addTo(map);
    if (cfg.legend) addLegend(map, cfg.legend);
    if (cfg.swipe) addSwipe(el, map, cfg.swipe);
    if (cfg.table) buildTable(el, state);
    if (cfg.tasks) renderTask();
    el.addEventListener("click", () => map.scrollWheelZoom.enable(), { once: true });

    function renderTask() {
      const t = cfg.tasks[taskIdx];
      if (!t) { taskBox.innerHTML = '<div class="mt-done">🎉 អ្នកបានបញ្ចប់កិច្ចការទាំងអស់! <button type="button" class="md-button mt-restart">ធ្វើម្ដងទៀត</button></div>';
        taskBox.querySelector(".mt-restart").onclick = () => { taskIdx = 0; renderTask(); }; return; }
      const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<code>$1</code>");
      taskBox.innerHTML = `<div class="mt-head">កិច្ចការ ${kh(taskIdx + 1)} / ${kh(cfg.tasks.length)}</div>
        <div class="mt-q">${md(t.q)}</div><div class="mt-fb" role="status"></div>`;
      taskBox.dataset.state = "";
      state.task = { t, done: false, md };
    }
    state.onTask = (lyr, props) => {
      const s = state.task; if (!s || s.done) return;
      const fb = taskBox.querySelector(".mt-fb");
      if (lyr.id === s.t.layer && s.t.check(props)) {
        s.done = true; taskBox.dataset.state = "ok";
        fb.innerHTML = "✓ " + s.md(s.t.ok) + ' <button type="button" class="md-button mt-next">បន្ទាប់ →</button>';
        fb.querySelector(".mt-next").onclick = () => { taskIdx++; renderTask(); };
      } else {
        taskBox.dataset.state = "bad";
        fb.textContent = lyr.id === s.t.layer ? "មិនទាន់ត្រូវ សាកល្បងវត្ថុផ្សេងទៀត" : "នោះជា " + lyr.name + " សូមរកស្រទាប់ផ្សេង";
      }
    };
  }

  function onFeatureClick(state, lyr, l) {
    highlight(state, l);
    if (state.onTask) state.onTask(lyr, l.feature.properties);
    if (state.tableSync) state.tableSync(lyr, l);
  }

  function highlight(state, l) {
    if (state.selected) {
      const s = state.selected;
      if (s._lyr && s.setStyle) s.setStyle(typeof s._lyr.style === "function" ? s._lyr.style(s.feature.properties)
        : s._lyr.point ? (typeof s._lyr.point === "function" ? s._lyr.point(s.feature.properties) : s._lyr.point) : s._lyr.style);
    }
    state.selected = l;
    if (l.setStyle) l.setStyle({ color: "#00e5ff", weight: 4 });
    if (l.bringToFront) l.bringToFront();
  }

  function addLegend(map, items) {
    const c = L.control({ position: "bottomright" });
    c.onAdd = () => {
      const d = L.DomUtil.create("div", "lab-map-legend");
      d.innerHTML = items.map(([t, col, label]) => `<div><i class="lg-${t}" style="--c:${col}"></i>${label}</div>`).join("");
      L.DomEvent.disableClickPropagation(d);
      return d;
    };
    c.addTo(map);
  }

  function addSwipe(el, map, sw) {
    const wrap = h("div", "swipe-ui");
    wrap.innerHTML = `<div class="swipe-line"><span class="swipe-handle">⟷</span></div>
      <span class="swipe-label swipe-l">${sw.leftLabel}</span><span class="swipe-label swipe-r">${sw.rightLabel}</span>
      <input type="range" min="0" max="1000" value="500" class="swipe-range" aria-label="រំកិលប្រៀបធៀប">`;
    el.appendChild(wrap);
    const range = wrap.querySelector(".swipe-range"), line = wrap.querySelector(".swipe-line");
    L.DomEvent.disableClickPropagation(range); L.DomEvent.disableScrollPropagation(range);
    ["mousedown", "touchstart", "pointerdown"].forEach((e) => range.addEventListener(e, (ev) => { ev.stopPropagation(); map.dragging.disable(); }));
    ["mouseup", "touchend", "pointerup"].forEach((e) => range.addEventListener(e, () => map.dragging.enable()));
    const lp = map.getPane("swipeLeft"), rp = map.getPane("swipeRight");
    const update = () => {
      const size = map.getSize(), x = size.x * range.value / 1000;
      const nw = map.containerPointToLayerPoint([0, 0]), se = map.containerPointToLayerPoint(size);
      const cx = nw.x + x;
      lp.style.clip = `rect(${nw.y}px, ${cx}px, ${se.y}px, ${nw.x}px)`;
      rp.style.clip = `rect(${nw.y}px, ${se.x}px, ${se.y}px, ${cx}px)`;
      line.style.left = x + "px";
    };
    range.addEventListener("input", update);
    map.on("move zoom resize viewreset", update);
    update();
  }

  function buildTable(el, state) {
    const box = h("div", "attr-table");
    const tabLayers = state.cfg.layers.filter((l) => l.table && state.layers[l.id]);
    box.innerHTML = `<div class="at-bar"><label>តារាងគុណលក្ខណៈ៖ <select class="at-select">${
      tabLayers.map((l) => `<option value="${l.id}">${l.name}</option>`).join("")}</select></label>
      <span class="at-count"></span></div><div class="at-scroll"><table><thead></thead><tbody></tbody></table></div>`;
    el.after(box);
    const sel = box.querySelector(".at-select"), thead = box.querySelector("thead"), tbody = box.querySelector("tbody");
    let sortKey = null, sortDir = 1;
    const render = () => {
      const lyr = tabLayers.find((l) => l.id === sel.value), gj = state.layers[lyr.id];
      const rows = gj.getLayers();
      if (sortKey) rows.sort((a, b) => {
        const x = a.feature.properties[sortKey], y = b.feature.properties[sortKey];
        return (typeof x === "number" ? x - y : String(x).localeCompare(String(y))) * sortDir;
      });
      thead.innerHTML = "<tr>" + lyr.table.map(([k, lab]) =>
        `<th data-k="${k}" title="ចុចដើម្បីតម្រៀប">${lab}${sortKey === k ? (sortDir > 0 ? " ▲" : " ▼") : ""}</th>`).join("") + "</tr>";
      tbody.innerHTML = "";
      rows.forEach((l) => {
        const tr = h("tr", null, lyr.table.map(([k]) => {
          const v = l.feature.properties[k];
          return `<td>${typeof v === "number" ? fmt(v, Number.isInteger(v) ? 0 : 2) : esc(v)}</td>`;
        }).join(""));
        tr._leaf = l; l._row = tr;
        tr.onclick = () => {
          if (!state.map.hasLayer(state.layers[lyr.id])) state.layers[lyr.id].addTo(state.map);
          if (l.getBounds) state.map.fitBounds(l.getBounds(), { maxZoom: 15 }); else state.map.setView(l.getLatLng(), 15);
          highlight(state, l); markRow(tr); l.openPopup();
          if (state.onTask) state.onTask(lyr, l.feature.properties);
        };
        tbody.appendChild(tr);
      });
      box.querySelector(".at-count").textContent = `${kh(rows.length)} វត្ថុ`;
      thead.querySelectorAll("th").forEach((th) => th.onclick = () => {
        sortDir = sortKey === th.dataset.k ? -sortDir : (th.dataset.k.match(/POP|HH|len/) ? -1 : 1);
        sortKey = th.dataset.k; render();
      });
    };
    const markRow = (tr) => { tbody.querySelectorAll("tr.at-sel").forEach((r) => r.classList.remove("at-sel")); if (tr) tr.classList.add("at-sel"); };
    sel.onchange = () => { sortKey = null; render(); };
    state.tableSync = (lyr, l) => {
      if (!lyr.table) return;
      if (sel.value !== lyr.id) { sel.value = lyr.id; sortKey = null; render(); }
      markRow(l._row); l._row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
    render();
  }

  /* ---------------- Chart ---------------- */
  function buildChart(el) {
    if (el.dataset.ready) return; el.dataset.ready = "1";
    const c = CHARTS[el.dataset.chart]; if (!c) return;
    const max = Math.max(...c.series.flatMap((s) => s.values)), dec = c.dec || 0;
    const sc = (v) => c.scale === "sqrt" ? Math.sqrt(v) / Math.sqrt(max) : v / max;
    let html = `<div class="ch-title">${c.title}</div>`;
    c.categories.forEach((cat, i) => {
      const v0 = c.series[0].values[i], v1 = c.series[c.series.length - 1].values[i];
      const ch = ((v1 - v0) / v0) * 100, showDelta = c.delta !== false && c.series.length > 1;
      html += `<div class="ch-group"><div class="ch-cat">${cat}${showDelta ? `<span class="ch-delta ${ch < 0 ? "neg" : "pos"}">${ch < 0 ? "▼" : "▲"} ${fmt(Math.abs(ch), 0)}%</span>` : ""}</div>`;
      c.series.forEach((s, j) => {
        html += `<div class="ch-row"><span class="ch-sname">${s.name}</span><span class="ch-bar" style="--w:${(sc(s.values[i]) * 100).toFixed(1)}%;--c:${c.colors[i]};opacity:${c.series.length > 1 ? 0.45 + 0.55 * j / (c.series.length - 1) : 1}"></span><span class="ch-val">${fmt(s.values[i], dec)}</span></div>`;
      });
      html += "</div>";
    });
    if (c.note) html += `<div class="ch-note">${c.note}</div>`;
    el.innerHTML = html;
    requestAnimationFrame(() => el.classList.add("ch-in"));
  }

  /* ---------------- Change matrix ---------------- */
  function buildMatrix(el) {
    if (el.dataset.ready) return; el.dataset.ready = "1";
    const m = MATRICES[el.dataset.matrix]; if (!m) return;
    const n = m.labels.length, rowSum = m.values.map((r) => r.reduce((a, b) => a + b, 0));
    const colSum = m.labels.map((_, j) => m.values.reduce((a, r) => a + r[j], 0));
    const offMax = Math.max(...m.values.flatMap((r, i) => r.filter((_, j) => j !== i)));
    let t = `<table><thead><tr><th class="cm-corner">${m.rowTitle}<br>${m.colTitle}</th>${m.labels.map((l) => `<th>${l}</th>`).join("")}<th>សរុប ១៩៩៧</th></tr></thead><tbody>`;
    m.values.forEach((r, i) => {
      t += `<tr><th>${m.labels[i]}</th>` + r.map((v, j) => {
        const a = i === j ? 0 : Math.min(1, Math.sqrt(v / offMax));
        return `<td class="${i === j ? "cm-diag" : "cm-off"}" data-i="${i}" data-j="${j}" style="--a:${a.toFixed(2)}">${fmt(v)}</td>`;
      }).join("") + `<td class="cm-sum">${fmt(rowSum[i])}</td></tr>`;
    });
    t += `<tr><th>សរុប ២០១៥</th>${colSum.map((v) => `<td class="cm-sum">${fmt(v)}</td>`).join("")}<td class="cm-sum">${fmt(rowSum.reduce((a, b) => a + b, 0))}</td></tr></tbody></table>`;
    el.innerHTML = `<div class="cm-scroll">${t}</div><div class="cm-info" role="status">ចុចលើក្រឡាណាមួយ ដើម្បីអានអត្ថន័យ។</div>`;
    const info = el.querySelector(".cm-info");
    el.querySelectorAll("td[data-i]").forEach((td) => td.onclick = () => {
      el.querySelectorAll("td.cm-sel").forEach((x) => x.classList.remove("cm-sel")); td.classList.add("cm-sel");
      const i = +td.dataset.i, j = +td.dataset.j, v = m.values[i][j], pct = (100 * v) / rowSum[i];
      info.innerHTML = i === j
        ? `<b>${fmt(v)} ${m.unit}</b> នៅតែជា <b>${m.labels[i]}</b> ទាំងឆ្នាំ ១៩៩៧ និង ២០១៥ (${fmt(pct, 1)}% នៃ${m.labels[i]}ឆ្នាំ ១៩៩៧)។`
        : `<b>${fmt(v)} ${m.unit}</b> ដែលជា <b>${m.labels[i]}</b> ក្នុងឆ្នាំ ១៩៩៧ បានក្លាយជា <b>${m.labels[j]}</b> ក្នុងឆ្នាំ ២០១៥ ស្មើ <b>${fmt(pct, 1)}%</b> នៃ${m.labels[i]}ឆ្នាំ ១៩៩៧។`;
      const st = window.labMaps[m.map];
      if (st && st.layers[m.layer] && i === 0) {
        const key = m.keys[j];
        st.layers[m.layer].eachLayer((l) => {
          const on = j === 0 || l.feature.properties[m.field] === key;
          l.setStyle({ fillOpacity: on ? 0.85 : 0.08, opacity: on ? 1 : 0.1 });
        });
        info.innerHTML += j === 0 ? " ផែនទីខាងក្រោមបង្ហាញប្រភេទបាត់បង់ទាំងអស់។" : ` ផែនទីខាងក្រោមបានបន្លិចតែ ព្រៃ → ${m.labels[j]}។`;
      }
    });
  }

  /* ---------------- Matching quiz ---------------- */
  function buildQuiz(el) {
    if (el.dataset.ready) return; el.dataset.ready = "1";
    const q = QUIZZES[el.dataset.quiz] || (window.WB_QUIZZES || {})[el.dataset.quiz]; if (!q) return;
    const start = () => {
      let pick = null, done = 0, tries = 0;
      el.innerHTML = `<div class="mq-title">${q.title}</div><div class="mq-hint">ចុចពាក្យនៅខាងឆ្វេង រួចចុចអត្ថន័យត្រូវគ្នានៅខាងស្ដាំ។</div>
        <div class="mq-cols"><div class="mq-col mq-left"></div><div class="mq-col mq-right"></div></div>
        <div class="mq-score" role="status"></div>`;
      const L_ = el.querySelector(".mq-left"), R_ = el.querySelector(".mq-right"), score = el.querySelector(".mq-score");
      shuffle(q.pairs.map((p, i) => [p[0], i])).forEach(([t, i]) => { const b = h("button", "mq-item", esc(t)); b.type = "button"; b.dataset.i = i; L_.appendChild(b); });
      shuffle(q.pairs.map((p, i) => [p[1], i])).forEach(([t, i]) => { const b = h("button", "mq-item", esc(t)); b.type = "button"; b.dataset.i = i; R_.appendChild(b); });
      L_.querySelectorAll("button").forEach((b) => b.onclick = () => { if (b.disabled) return; L_.querySelectorAll(".mq-pick").forEach((x) => x.classList.remove("mq-pick")); b.classList.add("mq-pick"); pick = b; });
      R_.querySelectorAll("button").forEach((b) => b.onclick = () => {
        if (!pick || b.disabled) return; tries++;
        if (pick.dataset.i === b.dataset.i) {
          [pick, b].forEach((x) => { x.classList.remove("mq-pick"); x.classList.add("mq-ok"); x.disabled = true; }); pick = null; done++;
        } else { b.classList.add("mq-bad"); setTimeout(() => b.classList.remove("mq-bad"), 600); }
        score.innerHTML = done === q.pairs.length
          ? `🎉 ត្រឹមត្រូវទាំងអស់! ប្រើ ${kh(tries)} ដង (ល្អបំផុត ${kh(q.pairs.length)}) <button type="button" class="md-button mq-again">ធ្វើម្ដងទៀត</button>`
          : `ត្រូវ ${kh(done)} / ${kh(q.pairs.length)}`;
        const again = score.querySelector(".mq-again"); if (again) again.onclick = start;
      });
    };
    start();
  }

  /* ---------------- Raster simulator (Lab 2) ---------------- */
  async function buildRasterSim(el) {
    if (el.dataset.ready) return; el.dataset.ready = "1";
    let poly;
    try { poly = await (await fetch(url(el.dataset.src))).json(); } catch (e) { el.textContent = "មិនអាចផ្ទុកទិន្នន័យបានទេ"; return; }
    const ring = poly.ring, sizes = [10, 20, 30, 50, 100, 200];
    const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
    const W = Math.max(...xs), H = Math.max(...ys);
    el.innerHTML = `
      <div class="rs-controls">
        <label>ទំហំក្រឡា៖ <b class="rs-size"></b><input type="range" class="rs-range" min="0" max="${sizes.length - 1}" value="3"></label>
        <span class="rs-rules">ក្បួន៖
          <label><input type="radio" name="rs-rule-${Math.random().toString(36).slice(2, 7)}" value="centre" checked> ចំណុចកណ្ដាលក្រឡានៅក្នុង</label>
          <label><input type="radio" name="rs-rule-x" value="touch"> ក្រឡាប៉ះពហុកោណ</label></span>
        <label><input type="checkbox" class="rs-outline" checked> បង្ហាញព្រំវ៉ិចទ័រ</label>
      </div>
      <canvas class="rs-canvas" role="img" aria-label="ការបម្លែងពហុកោណទៅជារ៉ាស្ទ័រ"></canvas>
      <div class="rs-stats"></div>`;
    const radios = el.querySelectorAll('.rs-rules input'); const nm = radios[0].name; radios.forEach((r) => r.name = nm);
    const cv = el.querySelector("canvas"), ctx = cv.getContext("2d");
    const inside = (x, y) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
    const segX = (a, b, c, d) => { const o = (p, q, r) => Math.sign((q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]));
      return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b); };
    const touches = (x0, y0, s) => {
      const x1 = x0 + s, y1 = y0 + s;
      if (inside(x0 + s / 2, y0 + s / 2) || inside(x0, y0) || inside(x1, y0) || inside(x0, y1) || inside(x1, y1)) return true;
      const E = [[[x0, y0], [x1, y0]], [[x1, y0], [x1, y1]], [[x1, y1], [x0, y1]], [[x0, y1], [x0, y0]]];
      for (let i = 0; i < ring.length - 1; i++) {
        const a = ring[i], b = ring[i + 1];
        if (a[0] >= x0 && a[0] <= x1 && a[1] >= y0 && a[1] <= y1) return true;
        if (Math.max(a[0], b[0]) < x0 || Math.min(a[0], b[0]) > x1 || Math.max(a[1], b[1]) < y0 || Math.min(a[1], b[1]) > y1) continue;
        for (const [c, d] of E) if (segX(a, b, c, d)) return true;
      }
      return false;
    };
    const draw = () => {
      const s = sizes[el.querySelector(".rs-range").value];
      const rule = el.querySelector(".rs-rules input:checked").value;
      const cs = getComputedStyle(el), dpr = window.devicePixelRatio || 1, pad = 12;
      const cssW = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const k = (cssW - 2 * pad) / W, cssH = H * k + 2 * pad;
      cv.style.width = cssW + "px"; cv.style.height = cssH + "px"; cv.width = cssW * dpr; cv.height = cssH * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cssW, cssH);
      const X = (x) => pad + x * k, Y = (y) => cssH - pad - y * k;
      const nx = Math.ceil(W / s), ny = Math.ceil(H / s); let cells = 0;
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
        const x0 = i * s, y0 = j * s;
        const on = rule === "centre" ? inside(x0 + s / 2, y0 + s / 2) : touches(x0, y0, s);
        if (on) { cells++; ctx.fillStyle = "rgba(25,118,210,0.75)"; ctx.fillRect(X(x0), Y(y0 + s), s * k, s * k); }
      }
      if (s * k >= 3) { ctx.strokeStyle = "rgba(128,128,128,0.35)"; ctx.lineWidth = 0.5; ctx.beginPath();
        for (let i = 0; i <= nx; i++) { ctx.moveTo(X(i * s), Y(0)); ctx.lineTo(X(i * s), Y(ny * s)); }
        for (let j = 0; j <= ny; j++) { ctx.moveTo(X(0), Y(j * s)); ctx.lineTo(X(nx * s), Y(j * s)); } ctx.stroke(); }
      if (el.querySelector(".rs-outline").checked) { ctx.strokeStyle = "#e65100"; ctx.lineWidth = 2; ctx.beginPath();
        ring.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))); ctx.closePath(); ctx.stroke(); }
      const vA = poly.area_m2 / 1e4, rA = (cells * s * s) / 1e4, d = ((rA - vA) / vA) * 100;
      el.querySelector(".rs-size").textContent = kh(s) + " ម";
      el.querySelector(".rs-stats").innerHTML =
        `<span>ផ្ទៃវ៉ិចទ័រ៖ <b>${fmt(vA, 1)} ហ.ត</b></span><span>ក្រឡា៖ <b>${fmt(cells)}</b> × ${kh(s)}×${kh(s)} ម</span>
         <span>ផ្ទៃរ៉ាស្ទ័រ៖ <b>${fmt(rA, 1)} ហ.ត</b></span><span class="${Math.abs(d) < 5 ? "rs-good" : "rs-bad"}">ខុសគ្នា៖ <b>${d > 0 ? "+" : "−"}${fmt(Math.abs(d), 1)}%</b></span>`;
    };
    el.querySelectorAll("input").forEach((i) => i.addEventListener("input", draw));
    let t; window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => el.isConnected && draw(), 150); });
    draw();
  }

  /* ---------------- Self-check ---------------- */
  const normNumber = (s) => s.replace(/[០-៩]/g, (d) => KM.indexOf(d)).replace(/[\s,]/g, "");
  const normText = (s) => s.trim().toLowerCase().replace(/[^a-z0-9\u1780-\u17ff]/g, "");
  function buildCheck(box) {
    if (box.dataset.ready) return; box.dataset.ready = "1";
    const row = h("div", "sc-row",
      '<input type="text" class="sc-input" placeholder="ចម្លើយរបស់អ្នក" aria-label="ចម្លើយ">' +
      '<button type="button" class="md-button sc-button">ពិនិត្យ</button><span class="sc-result" role="status"></span>');
    box.appendChild(row);
    const input = row.querySelector(".sc-input"), out = row.querySelector(".sc-result");
    const check = () => {
      const raw = input.value;
      if (!raw.trim()) { out.textContent = ""; box.dataset.state = ""; return; }
      let ok = false, close = false;
      if (box.dataset.answer !== undefined) ok = box.dataset.answer.split("|").some((a) => normText(a) === normText(raw));
      else {
        const v = parseFloat(normNumber(raw)), min = parseFloat(box.dataset.min), max = parseFloat(box.dataset.max);
        if (isNaN(v)) { out.textContent = "សូមបញ្ចូលជាលេខ"; box.dataset.state = "bad"; return; }
        ok = v >= min && v <= max; const mid = (min + max) / 2; close = !ok && Math.abs(v - mid) <= Math.abs(mid) * 0.1;
      }
      box.dataset.state = ok ? "ok" : close ? "close" : "bad";
      out.textContent = ok ? "✓ ត្រឹមត្រូវ" : close ? "ជិតហើយ ពិនិត្យជំហានម្ដងទៀត" : "មិនទាន់ត្រឹមត្រូវ" + (box.dataset.hint ? " · " + box.dataset.hint : "");
    };
    row.querySelector(".sc-button").addEventListener("click", check);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
  }

  /* ---------------- Init ---------------- */
  function init() {
    document.querySelectorAll(".lab-chart").forEach(buildChart);
    document.querySelectorAll(".change-matrix").forEach(buildMatrix);
    document.querySelectorAll(".match-quiz").forEach(buildQuiz);
    document.querySelectorAll(".raster-sim").forEach(buildRasterSim);
    document.querySelectorAll(".self-check").forEach(buildCheck);
    document.querySelectorAll(".lab-map").forEach(buildMap);
  }
  if (typeof document$ !== "undefined") document$.subscribe(init);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
