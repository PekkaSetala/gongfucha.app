// CACHE_NAME MUST be bumped on every static-asset release. The activate
// handler deletes caches whose name doesn't match, so a fresh CACHE_NAME
// is how clients drop the old bundle of /sounds/, /icons/, manifest, etc.
// If you add or change anything in STATIC_ASSETS, bump the suffix.
const CACHE_NAME = "gongfucha-v2";
const STATIC_ASSETS = [
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/sounds/ceramic-tap.wav",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Navigation requests (HTML documents): network-first, no cache fallback.
  // Prevents stale app-shell HTML from being served to crawlers or users
  // visiting newly-published SSG routes like /tea/[slug], /brewing, etc.
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(fetch(req).catch(() => Response.error()));
    return;
  }

  // Static asset allowlist.
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/sounds/") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/icon.svg" ||
    url.pathname === "/icon-192.png" ||
    url.pathname === "/icon-512.png" ||
    url.pathname === "/apple-touch-icon.png";

  if (!isStatic) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return response;
      });
      return cached || fetched;
    })
  );
});
