const CACHE_NAME = "desportlogger-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "reload" }).catch(() => caches.match(request))
    );
    return;
  }
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
