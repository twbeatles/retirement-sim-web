const APP_SHELL_CACHE = "retirement-sim-app-v3";
const STATIC_ASSET_CACHE = "retirement-sim-static-v3";
const ALL_CACHES = [APP_SHELL_CACHE, STATIC_ASSET_CACHE];

function scopedPath(path = "") {
  return new URL(path, self.registration.scope).pathname;
}

const APP_SHELL_URLS = [
  scopedPath(""),
  scopedPath("index.html"),
  scopedPath("manifest.json")
];

const STATIC_ASSET_PATTERN = /\/assets\/.+\.(js|css|woff2?|png|jpe?g|svg|webp)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !ALL_CACHES.includes(key)).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function staleWhileRevalidate(request, cacheName, event) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    event.waitUntil(networkPromise);
    return cached;
  }

  const network = await networkPromise;
  return network || Response.error();
}

async function networkFirst(request, timeoutMs = 1500) {
  const cache = await caches.open(APP_SHELL_CACHE);
  const timeout = new Promise((resolve) =>
    setTimeout(() => resolve(undefined), timeoutMs)
  );

  let response = await Promise.race([
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      })
      .catch(() => undefined),
    timeout
  ]);

  if (!response) {
    response = await cache.match(request);
  }

  if (!response) {
    response = await cache.match(scopedPath("index.html"));
  }

  return response || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  if (!isSameOrigin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (STATIC_ASSET_PATTERN.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_ASSET_CACHE, event));
    return;
  }
});
