// Offline-first service worker.
//
// Shell: the whole built app (index, hashed JS/CSS, manifest, icons) is
// precached at install — the manifest below is injected at build time by the
// sw-precache plugin in vite.config.js — so the app opens offline from the
// first visit, and a deploy mid-flight can't strand a cached index pointing
// at assets that were never fetched. Navigations stay network-first so new
// deploys show up immediately; the precached shell is the offline fallback.
//
// Images: article bodies live in IndexedDB, but their <img> tags point at
// the open web. Image requests (any origin) are served cache-first from a
// separate capped cache, filled two ways: passively as she reads online, and
// actively via CACHE_IMAGES messages the app posts after a save (see
// warmArticleImages in App.jsx). Cross-origin fetches are no-cors — opaque
// responses are fine to store and serve for <img>.
//
// /api is never touched: extraction only makes sense online.

const MANIFEST = {"version":"c5edb009","urls":["/","/assets/index-CeCecrdO.js","/icons/apple-touch-icon.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest"]} || { version: "dev", urls: ["/"] };
const SHELL = `later-shell-${MANIFEST.version}`;
const IMAGES = "later-img-v1";
const IMAGE_CAP = 400;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(MANIFEST.urls)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL && k !== IMAGES)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Cache API keys() returns entries in insertion order in every engine that
// matters here — good enough for oldest-first eviction.
async function trimImages() {
  const cache = await caches.open(IMAGES);
  const keys = await cache.keys();
  if (keys.length <= IMAGE_CAP) return;
  await Promise.all(keys.slice(0, keys.length - IMAGE_CAP).map((k) => cache.delete(k)));
}

async function cacheImage(url) {
  const cache = await caches.open(IMAGES);
  if (await cache.match(url)) return;
  const res = await fetch(url, { mode: "no-cors" }).catch(() => null);
  if (res && (res.ok || res.type === "opaque")) {
    await cache.put(url, res);
    await trimImages();
  }
}

self.addEventListener("message", (e) => {
  const msg = e.data;
  if (!msg || msg.type !== "CACHE_IMAGES" || !Array.isArray(msg.urls)) return;
  const urls = msg.urls.filter((u) => /^https?:\/\//i.test(u));
  e.waitUntil(Promise.all(urls.map((u) => cacheImage(u).catch(() => {}))));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.startsWith("/api/")) return;

  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/", { cacheName: SHELL }))
    );
    return;
  }

  // Article images, any origin: cache-first, fill on the way through.
  if (e.request.destination === "image") {
    e.respondWith(
      caches.open(IMAGES).then(async (cache) => {
        const hit = await cache.match(e.request.url);
        if (hit) return hit;
        const res = await fetch(e.request);
        if (res.ok || res.type === "opaque") {
          cache.put(e.request.url, res.clone()).then(trimImages);
        }
        return res;
      })
    );
    return;
  }

  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(
        (hit) =>
          hit ||
          fetch(e.request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(SHELL).then((c) => c.put(e.request, copy));
            }
            return res;
          })
      )
    );
  }
});
