const SHELL_CACHE = "flamingopark-shell-v3";
const IMAGE_CACHE = "flamingopark-images-v1";
const APP_SHELL = ["/index.html", "/manifest.json", "/icons/app-icon-1024.png"];

const isCacheableResponse = (response) => response && (response.ok || response.type === "opaque");

const isSupabaseImage = (url) =>
  url.hostname.endsWith("supabase.co") &&
  (url.pathname.includes("/storage/v1/object/public/") || url.pathname.includes("/storage/v1/render/image/public/"));

const isStorefrontImageRequest = (request, url) =>
  request.destination === "image" &&
  (url.origin === self.location.origin || isSupabaseImage(url));

const staleWhileRevalidateImage = async (request, event) => {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (isCacheableResponse(response)) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(networkPromise);
    return cached;
  }

  const network = await networkPromise;
  if (network) return network;

  return new Response("", { status: 504, statusText: "Image unavailable" });
};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const allowedCaches = new Set([SHELL_CACHE, IMAGE_CACHE]);

  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !allowedCaches.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.headers.has("authorization")) return;

  const url = new URL(request.url);

  if (isStorefrontImageRequest(request, url)) {
    event.respondWith(staleWhileRevalidateImage(request, event));
    return;
  }

  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/media/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match("/index.html")),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/images/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
  }
});
