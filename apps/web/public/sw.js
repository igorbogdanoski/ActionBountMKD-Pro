// ─── АВАНТУРА Service Worker v2 ──────────────────────────────────────────────
// Strategy:
//   /assets/*.js|css  → CacheFirst  (Vite content-hashed, immutable)
//   Firebase Storage  → CacheFirst  (media files for offline play)
//   /index.html       → NetworkFirst (must always be fresh — Vercel no-cache)
//   Everything else   → NetworkOnly  (Firestore, Auth, API)
//
// Quest data is cached in localStorage by MobilePlayer (not here).
// This SW only caches static assets + media for offline stage rendering.

const ASSET_CACHE  = 'av-assets-v2';
const MEDIA_CACHE  = 'av-media-v2';
const OLD_CACHES   = ['actionbound-pwa-v1', 'av-assets-v1', 'av-media-v1'];

// Storage origins whose responses we cache as media
const MEDIA_ORIGINS = [
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
];

// ─── Install: skip waiting so new SW activates immediately ───────────────────
self.addEventListener('install', () => {
  self.skipWaiting();
});

// ─── Activate: clean up old caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(k => OLD_CACHES.includes(k))
          .map(k => caches.delete(k)),
      );
      // Also clean legacy per-quest caches from old cacheQuestResources()
      await Promise.all(
        keys
          .filter(k => k.startsWith('avanturakreator-quest-'))
          .map(k => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // ── Vite assets: CacheFirst (immutable hashes) ───────────────────────────
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  // ── Firebase Storage media: CacheFirst ───────────────────────────────────
  if (MEDIA_ORIGINS.some(origin => url.hostname.includes(origin))) {
    event.respondWith(cacheFirst(request, MEDIA_CACHE));
    return;
  }

  // ── index.html: NetworkFirst (must stay fresh) ────────────────────────────
  if (url.pathname === '/' || url.pathname === '/index.html' ||
      (!url.pathname.startsWith('/assets/') && !url.pathname.includes('.'))) {
    event.respondWith(networkFirst(request, ASSET_CACHE));
    return;
  }

  // Everything else (Firestore, Auth, API): network only
});

// ─── Strategies ──────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline — resource not cached', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Exact match first (e.g. previously-visited /play/:id deep link)
    const cached = await cache.match(request);
    if (cached) return cached;
    // SPA fallback: serve the cached app shell so client-side routing works offline
    if (request.mode === 'navigate') {
      const shell = (await cache.match('/index.html')) ?? (await cache.match('/'));
      if (shell) return shell;
    }
    return new Response('Offline', { status: 503 });
  }
}

// ─── Message handler: cache media on demand ──────────────────────────────────
// MobilePlayer sends { type: 'CACHE_MEDIA', urls: string[] }
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_MEDIA') {
    const urls = (event.data.urls ?? []).filter(
      u => typeof u === 'string' && u.startsWith('http') && !u.includes('youtube.com'),
    );
    event.waitUntil(
      caches.open(MEDIA_CACHE).then(cache =>
        Promise.allSettled(urls.map(u => cache.add(u))),
      ),
    );
  }
});
