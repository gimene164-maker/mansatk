// Bump this version number every time you re-upload changed files.
// Changing it forces every visitor's browser to drop the old cache
// and fetch the new files instead of showing the old (broken-looking) version.
const CACHE_NAME = "elite3-cache-v2";

// Only truly static assets (icons) are cache-first.
// HTML/CSS/JS are network-first so updates show immediately on hosting.
const STATIC_ASSETS = [
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png"
];

const CORE_ASSETS = [
  "./index.html",
  "./css/style.css",
  "./js/db.js",
  "./js/app.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([...STATIC_ASSETS, ...CORE_ASSETS])).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isCore = CORE_ASSETS.some((a) => url.pathname.endsWith(a.replace("./", "/"))) ||
                 event.request.mode === "navigate";

  if (isCore) {
    // Network-first: always try to get the latest file from the host.
    // Falls back to cache only if the network request fails (offline).
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets (icons etc.) — rarely change.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            return res;
          })
          .catch(() => cached)
      );
    })
  );
});
