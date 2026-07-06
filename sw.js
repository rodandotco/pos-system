var CACHE_NAME = 'rodanpos-v1';
var ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/supabase-config.js',
  '/js/auth.js',
  '/js/app.js',
  '/js/transaksi.js',
  '/js/inventory.js',
  '/js/laporan.js',
  '/js/setting.js',
  '/js/printer-struk.js',
  '/js/printer-label.js',
  '/js/printer-label-ad240.js',
  '/js/printer-label-mp234.js',
  '/js/camera-scanner.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  if (event.request.url.includes('supabase.co')) return;
  
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request).then(function(response) {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseClone);
        });
        return response;
      });
    }).catch(function() {
      return new Response('Anda sedang offline.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    })
  );
});