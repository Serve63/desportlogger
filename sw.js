const SW_VERSION = "2026-02-11-v3";
const STATIC_CACHE = `desportlogger-static-${SW_VERSION}`;
const RUNTIME_CACHE = `desportlogger-runtime-${SW_VERSION}`;

const APP_SCOPE_URL = self.registration.scope;
const toScopedUrl = (path) => new URL(path, APP_SCOPE_URL).toString();

const PRECACHE_PATHS = [
  "",
  "index.html",
  "vandaag/",
  "maandag/",
  "dinsdag/",
  "woensdag/",
  "donderdag/",
  "vrijdag/",
  "zaterdag/",
  "zondag/",
  "dinsdag.html",
  "woensdag.html",
  "donderdag.html",
  "vrijdag.html",
  "zaterdag.html",
  "zondag.html",
  "manifest.webmanifest",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "styles.css",
  "app.js",
];

const PRECACHE_URLS = [...new Set(PRECACHE_PATHS.map(toScopedUrl))];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("desportlogger-") && key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

const withTimeout = (promise, ms) =>
  new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("timeout")), ms);
    promise
      .then((result) => {
        clearTimeout(id);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(id);
        reject(error);
      });
  });

const isCacheable = (response) => !!response && response.ok;

const staleWhileRevalidate = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (isCacheable(response)) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;
  const network = await networkPromise;
  if (network) return network;
  throw new Error("network-unavailable");
};

const networkFirstDocument = async (request) => {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const network = await withTimeout(fetch(request, { cache: "no-cache" }), 4500);
    if (isCacheable(network)) {
      cache.put(request, network.clone());
    }
    return network;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;

    const precachedToday = await caches.match(toScopedUrl("vandaag/"));
    if (precachedToday) return precachedToday;

    const precachedIndex = await caches.match(toScopedUrl("index.html"));
    if (precachedIndex) return precachedIndex;

    throw error;
  }
};

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (!sameOrigin) {
    const isKnownCDN = /(^|\.)cdn\.jsdelivr\.net$/.test(url.hostname);
    const isFontHost = /(^|\.)fonts\.googleapis\.com$/.test(url.hostname) || /(^|\.)fonts\.gstatic\.com$/.test(url.hostname);
    if (isKnownCDN || isFontHost) {
      event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    }
    return;
  }

  if (!url.href.startsWith(APP_SCOPE_URL)) return;

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirstDocument(request));
    return;
  }

  if (["style", "script", "font", "image"].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
