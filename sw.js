const CACHE_NAME = "kefo-ui-cache-v3";
const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./sw.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Install: خزّن الملفات الأساسية
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE))
  );
  self.skipWaiting();
});

// Activate: امسح كل الكاشات القديمة ثم سيطر فوراً
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
      await self.clients.claim();
    })()
  );
});

// Fetch:
// - HTML: Network First + fallback للكاش
// - باقي الملفات: Stale-While-Revalidate (يعطي سرعة + يجدد بالخلفية)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const accept = req.headers.get("accept") || "";
  const isHTML = accept.includes("text/html");

  if (isHTML) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req, { cache: "no-store" });
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, fresh.clone());
          return fresh;
        } catch (e) {
          const cached = await caches.match(req);
          return cached || caches.match("./index.html");
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      const cache = await caches.open(CACHE_NAME);

      const fetchPromise = fetch(req)
        .then((res) => {
          cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);

      // لو موجود كاش أعطه فوراً وحدثه بالخلفية
      if (cached) {
        fetchPromise; // تحديث بالخلفية
        return cached;
      }

      // لو ما في كاش: ارجع نتيجة الشبكة
      const network = await fetchPromise;
      return network || cached;
    })()
  );
});
