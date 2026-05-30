// Self-destroying service worker.
// The previous cache-first worker ('actionbound-pwa-v1') served stale modules and
// the old app icon. The browser re-checks this file on every navigation, so this
// version takes over the old one, deletes ALL caches, unregisters itself and
// force-reloads any open client so the live app is served from the network.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    })(),
  );
});
