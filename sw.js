// Cache offline, network-first: online prende sempre la versione nuova.
// Se la rete manca (o risponde troppo lenta) apre la copia salvata nel telefono.
const CACHE = "pianta-alicedue-v1";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png",
  "plan.json", "plan_base.png", "plan_dims.png", "plan_mobili.png", "plan_rooms.png"];
const WAIT = 5000; // ms di attesa della rete prima di usare la copia salvata

self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });

const fromCache = req => caches.match(req, { ignoreSearch: true })
  .then(r => r || (req.mode === "navigate" ? caches.match("index.html") : undefined));

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || !req.url.startsWith("http")) return;
  e.respondWith(new Promise(resolve => {
    let done = false;
    const finish = r => { if (!done && r) { done = true; resolve(r); } };
    const net = fetch(req).then(r => {
      if (r.ok || r.type === "opaque") { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)).catch(() => {}); }
      return r;
    });
    const timer = setTimeout(() => fromCache(req).then(finish), WAIT);
    net.then(r => { clearTimeout(timer); finish(r); })
      .catch(() => { clearTimeout(timer); fromCache(req).then(r => finish(r || Response.error())); });
  }));
});
