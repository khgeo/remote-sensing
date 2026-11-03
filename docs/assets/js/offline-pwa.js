/* "Read without internet": registers sw.js and fills the <div class="offline-save"></div> widget. */
(function () {
  "use strict";
  const me = (document.currentScript && document.currentScript.src) || "";
  const ROOT = me.replace(/assets\/js\/offline-pwa\.js.*$/, "") || new URL("./", location.href).href;
  const KM = "០១២៣៤៥៦៧៨៩", kh = (n) => String(n).replace(/[0-9]/g, (d) => KM[d]);
  const day = (t) => { const d = new Date(t); return kh(`${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`); };
  const mb = (b) => kh((b / 1e6).toFixed(b > 1e8 ? 0 : 1).replace(".", ","));
  const CACHE = "khgeo:" + new URL(ROOT).pathname, KEY = "khgeo-offline:" + new URL(ROOT).pathname;
  const http = location.protocol === "https:" || location.protocol === "http:";
  const ok = http && "serviceWorker" in navigator && "caches" in window && !navigator.webdriver;
  const get = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } };
  const put = (v) => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch (e) {} };
  if (ok) navigator.serviceWorker.register(ROOT + "sw.js", { scope: ROOT }).catch(() => {});

  const css = `.offline-save{border:1px solid var(--md-default-fg-color--lightest,#ddd);border-left:5px solid #795548;border-radius:8px;padding:.9em 1.1em;margin:1em 0;background:var(--md-code-bg-color,#faf7f4)}
.offline-save .os-row{display:flex;flex-wrap:wrap;gap:.5em;align-items:center;margin:.4em 0}.offline-save button{font:inherit;cursor:pointer;border-radius:6px;padding:.45em 1em;border:2px solid #795548;background:#795548;color:#fff}
.offline-save button.alt{background:transparent;color:#795548}.offline-save button:disabled{opacity:.55;cursor:wait}.offline-save progress{width:100%;height:10px}.offline-save .os-st{font-size:.92em}
@media print{.offline-save,.os-offline-badge{display:none!important}}
.os-offline-badge{position:fixed;left:12px;bottom:12px;z-index:9;background:#5d4037;color:#fff;border-radius:20px;padding:.3em .9em;font-size:.75rem;box-shadow:0 2px 6px #0004}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  async function manifest() { const r = await fetch(ROOT + "offline-manifest.json", { cache: "no-store" }); if (!r.ok) throw new Error(r.status); return r.json(); }

  async function save(el, m) {
    const btns = el.querySelectorAll("button"); btns.forEach((b) => (b.disabled = true));
    const bar = el.querySelector("progress"), out = el.querySelector(".os-st"); bar.hidden = false;
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) {}
    const cache = await caches.open(CACHE), files = m.files.slice(); let done = 0, bad = 0, bytes = 0;
    bar.max = files.length;
    const worker = async () => { while (files.length) { const [p, s] = files.shift();
      try { const r = await fetch(ROOT + p, { cache: "no-cache" }); if (!r.ok) throw 0; await cache.put(ROOT + p, r); bytes += s; } catch (e) { bad++; }
      done++; bar.value = done; out.textContent = `កំពុងរក្សាទុក… ${kh(done)} / ${kh(bar.max)} ឯកសារ (${mb(bytes)} MB)`; } };
    await Promise.all(Array.from({ length: 6 }, worker));
    if (!bad) put({ v: m.version, t: Date.now(), b: m.bytes });
    else out.textContent = `បានរក្សាទុក ប៉ុន្តែ ${kh(bad)} ឯកសារបរាជ័យ។ សូមចុចម្ដងទៀតពេលអ៊ីនធឺណិតល្អ។`;
    render(el, bad ? null : m);
  }

  async function render(el, m) {
    if (navigator.webdriver) { el.hidden = true; return; }
    if (!ok) { el.innerHTML = location.protocol === "file:" ? "<b>✓ អ្នកកំពុងអានកំណែ offline។</b>" : "កម្មវិធីរុករកនេះ មិនអាចរក្សាទុកសៀវភៅបានទេ។ សូមប្រើ Chrome, Edge, Firefox ឬ Safari ថ្មី ឬទាញយកឯកសារ ZIP ខាងក្រោម។"; return; }
    const s = get();
    el.innerHTML = `<div class="os-row"><b>📥 អានដោយគ្មានអ៊ីនធឺណិតលើទូរសព្ទ ឬកុំព្យូទ័រនេះ</b></div><div class="os-st">កំពុងពិនិត្យ…</div><div class="os-row"><button type="button" class="os-save"></button><button type="button" class="alt os-del" hidden>លុបចេញពីឧបករណ៍</button></div><progress hidden></progress>`;
    const out = el.querySelector(".os-st"), sb = el.querySelector(".os-save"), del = el.querySelector(".os-del");
    if (!m) { try { m = await manifest(); } catch (e) { m = null; } }
    if (!m) { out.textContent = s ? `✓ បានរក្សាទុកនៅ ${day(s.t)}។ ឥឡូវគ្មានអ៊ីនធឺណិត ប៉ុន្តែសៀវភៅនៅតែបើកបាន។` : "គ្មានអ៊ីនធឺណិត៖ សូមភ្ជាប់អ៊ីនធឺណិតមុនរក្សាទុក។"; sb.hidden = true; del.hidden = !s; }
    else if (s && s.v === m.version) { out.innerHTML = `<b>✓ បានរក្សាទុករួច</b> (${mb(m.bytes)} MB · ${day(s.t)})។ បើកសៀវភៅ និងស្លាយបានទោះគ្មានអ៊ីនធឺណិត ដោយប្រើតំណដដែលនេះ។`; sb.textContent = "រក្សាទុកម្ដងទៀត"; sb.className = "alt os-save"; del.hidden = false; }
    else if (s) { out.innerHTML = `មានកំណែថ្មីនៃសៀវភៅ។ ចុចដើម្បីធ្វើបច្ចុប្បន្នភាព (${mb(m.bytes)} MB)។`; sb.textContent = "ធ្វើបច្ចុប្បន្នភាព"; del.hidden = false; }
    else { out.innerHTML = `រក្សាទុកមេរៀន លំហាត់ ស្លាយ និងពិសោធន៍ទាំងអស់ (${mb(m.bytes)} MB) ម្ដង ពេលមាន Wi-Fi។ ក្រោយមក បើកតំណនេះដោយគ្មានអ៊ីនធឺណិតក៏បាន។`; sb.textContent = "រក្សាទុកសៀវភៅទាំងមូល"; }
    sb.onclick = () => m && save(el, m);
    del.onclick = async () => { await caches.delete(CACHE); put(null); render(el, m); };
  }

  function scan() { document.querySelectorAll(".offline-save:not([data-os])").forEach((el) => { el.dataset.os = "1"; render(el); }); }
  function badge() { let b = document.querySelector(".os-offline-badge");
    if (navigator.onLine || location.protocol === "file:" || !document.querySelector(".md-container")) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement("div"); b.className = "os-offline-badge"; b.textContent = "● កំពុងអានដោយគ្មានអ៊ីនធឺណិត"; document.body.appendChild(b); } }
  const init = () => { scan(); badge(); };
  if (window.document$ && window.document$.subscribe) window.document$.subscribe(init);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  window.addEventListener("online", badge); window.addEventListener("offline", badge);
})();
