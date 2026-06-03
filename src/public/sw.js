const CACHE_NAME = "kitabmadin-v2";

// Assets yang di-cache
const ASSETS = [
  "/",
  "/index.html",
  "/app.html",
  "/css/style.css",
  "/js/supabase.js",
  "/js/device.js",
  "/js/auth.js",
  "/js/db-local.js",
  "/js/offline-core.js",
  "/js/master-kelas.js",
  "/js/sync-manager.js",
  "/js/app-offline.js",
  "/js/admin-devices.js",
  "/js/sync-notification.js",
  "/manifest.json"
];

// Install - cache semua assets
self.addEventListener("install", event => {
  console.log('[SW] Installing...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => console.log('[SW] All assets cached'))
  );
});

// Activate - hapus cache lama
self.addEventListener("activate", event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
        )
      )
    ]).then(() => {
      console.log('[SW] Activated, claiming clients');
      return self.clients.matchAll();
    }).then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'SW_ACTIVATED' });
      });
    })
  );
});

// Fetch - cache first, network fallback
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(fetchResponse => {
          // Cache new requests
          if (fetchResponse && fetchResponse.status === 200) {
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return fetchResponse;
        });
      })
      .catch(() => {
        // Offline fallback
        if (event.request.destination === 'document') {
          return caches.match('/app.html');
        }
      })
  );
});

// Listen for skip waiting message
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});