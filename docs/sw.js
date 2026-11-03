/* Service worker: lets the book open without internet after it was saved once.
   Pages: network first, cached copy when offline. Other files: cached copy first,
   refreshed in the background. "Save for offline" on the home page fills the cache. */
const SCOPE = new URL(self.registration.scope).pathname;
const CACHE = "khgeo:" + SCOPE;
const OFFLINE_HTML = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>គ្មានអ៊ីនធឺណិត</title><body style="font:18px/1.8 Battambang,sans-serif;max-width:640px;margin:10vh auto;padding:20px"><h2>គ្មានអ៊ីនធឺណិត</h2><p>ទំព័រនេះមិនទាន់បានរក្សាទុកលើឧបករណ៍នេះទេ។ ពេលមានអ៊ីនធឺណិត សូមចុច «រក្សាទុកសៀវភៅទាំងមូល» នៅទំព័រដើម។</p><p><a href="' + SCOPE + '">ទៅទំព័រដើម</a></p>';

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

const keep = (cache, req, res) => { if (res && res.ok && (res.type === "basic" || res.type === "default")) cache.put(req, res.clone()).catch(() => {}); return res; };

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !url.pathname.startsWith(SCOPE) || url.pathname.endsWith("/offline-manifest.json") || url.pathname.includes("/downloads/")) return;
  const page = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const key = url.origin + url.pathname;
    if (page) {
      try {
        const res = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(() => no(new Error("slow")), 6000))]);
        return keep(cache, key, res);
      } catch (err) {
        const hit = (await cache.match(key)) || (await cache.match(key.endsWith("/") ? key + "index.html" : key + "/")) || (await cache.match(key.replace(/index\.html$/, "")));
        return hit || (await cache.match(url.origin + SCOPE)) || new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
    }
    const hit = await cache.match(key, { ignoreSearch: true });
    const net = fetch(req).then((res) => keep(cache, key, res)).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || new Response("", { status: 504, statusText: "offline" });
  }));
});
