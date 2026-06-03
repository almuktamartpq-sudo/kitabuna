const CACHE_NAME = "kitabmadin-v3";

// Assets yang di-cache
const ASSETS = [
  "/",
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
  console.log('[SW] Installing v3...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => console.log('[SW] All assets cached'))
  );
});

// Activate - hapus cache lama
self.addEventListener("activate", event => {
  console.log('[SW] Activating v3...');
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

// Fetch - network-first untuk HTML, cache-first untuk aset lain
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  
  // Network-first untuk HTML navigations (app.html, index.html)
  if (event.request.destination === 'document' || 
      event.request.mode === 'navigate' ||
      url.pathname.endsWith('.html') ||
      url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then(cached => {
            return cached || caches.match('/app.html');
          });
        })
    );
    return;
  }
  
  // Cache-first untuk aset statis (JS, CSS, gambar)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(fetchResponse => {
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
        if (event.request.destination === 'image') {
          return new Response('', { status: 404 });
        }
      })
  );
});

// Listen untuk skip waiting dan clear cache
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // Clear cache saat logout
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('[SW] Cache cleared');
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'CACHE_CLEARED' });
        });
      });
    });
  }
});