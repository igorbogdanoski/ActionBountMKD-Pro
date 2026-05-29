const CACHE_NAME = 'actionbound-pwa-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Just precaching the root so it works offline
      return cache.addAll(['/']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME && !name.startsWith('actionbound-quest-')).map((name) => {
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // If request is HTTP/HTTPS, fallback to network and update cache
  if (event.request.url.startsWith('http')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // If we got a valid response, cache it (except for api/ firebase requests)
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic' && event.request.method === 'GET' && !event.request.url.includes('firebase')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Ignore network errors - return cached if available
          return cachedResponse;
        });
        
        return cachedResponse || fetchPromise;
      })
    );
  }
});
