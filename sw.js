// GLS offline — service worker
const CACHE = "gls-offline-v3";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./tess-worker.js",
  "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",
  "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  if (same) {
    // aplicația: răspunde imediat din cache, actualizează în fundal când există internet
    e.respondWith(caches.open(CACHE).then(async c => {
      const key = req.mode === "navigate" ? "./index.html" : req;
      const hit = await c.match(key, {ignoreSearch: true});
      const net = fetch(req).then(r => { if (r && r.ok) c.put(key, r.clone()); return r; }).catch(() => null);
      return hit || (await net) || new Response("Offline", {status: 503});
    }));
    return;
  }
  // cititorul de imagini, datele de limbă și fonturile: din cache, altfel de pe internet și se păstrează
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req);
    if (hit) return hit;
    try { const r = await fetch(req); if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }
    catch (err) { return new Response("", {status: 504}); }
  }));
});
