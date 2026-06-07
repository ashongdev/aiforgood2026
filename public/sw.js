const CACHE = "aiforgood-shell-v1";

// On install: cache the app shell (index.html)
self.addEventListener("install", (evt) => {
  evt.waitUntil(caches.open(CACHE).then((c) => c.add("/")));
  self.skipWaiting();
});

// On activate: clear any old cache versions
self.addEventListener("activate", (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (evt) => {
  const url = new URL(evt.request.url);

  // Let Supabase API and Google API calls pass through untouched —
  // offline handling for those is done in app code (localStorage cache / queue)
  if (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("googletagmanager.com") ||
    evt.request.method !== "GET"
  ) {
    return;
  }

  // Navigation requests (HTML): network-first, fall back to cached shell
  if (evt.request.mode === "navigate") {
    evt.respondWith(
      fetch(evt.request).catch(() => caches.match("/")),
    );
    return;
  }

  // Static assets: cache-first, populate cache on first load
  evt.respondWith(
    caches.match(evt.request).then((cached) => {
      if (cached) return cached;
      return fetch(evt.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((c) => c.put(evt.request, clone));
        }
        return response;
      });
    }),
  );
});
