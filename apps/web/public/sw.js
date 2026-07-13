// Minimal offline-support service worker for Praxis.
//
// The core offline guarantee for the pointeuse (section 6.3) does NOT
// depend on this file — clock events are queued in IndexedDB by
// src/lib/offline-queue.ts regardless of whether a service worker is
// active. What this worker adds on top is being able to reopen the app
// shell itself (navigate to /app/me/pointeuse) while fully offline, by
// caching pages and same-origin assets as they're visited
// (stale-while-revalidate) rather than precompiling a build-time
// manifest (the next-pwa/Workbox approach) — kept intentionally simple
// so it has no build step of its own.

const CACHE_NAME = 'praxis-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // never cache API responses

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    }),
  );
});
