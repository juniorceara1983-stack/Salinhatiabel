/* ============================================================
   sw.js — Service Worker for Salinha da Tia Bel
   Provides offline caching of all local assets.
   ============================================================ */

var CACHE_NAME = 'salinha-tia-bel-v2';

var LOCAL_ASSETS = [
  './',
  './index.html',
  './salinha-tia-bel.html',
  './app.js',
  './manifest.webmanifest',
  './data/game-data.json',
  './data/config.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
];

/* ---- Install: pre-cache all local assets ---- */
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(LOCAL_ASSETS);
    })
  );
  self.skipWaiting();
});

/* ---- Activate: clean up old caches ---- */
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

/* ---- Fetch: cache-first for local, network-first for external ---- */
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  /* Only handle GET requests */
  if (event.request.method !== 'GET') return;

  if (url.origin === self.location.origin) {
    /* Local assets: cache-first, fall back to network */
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        return fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      })
    );
  } else {
    /* External resources (fonts, TIA_BEL image):
       network-first, fall back to cache if offline */
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(function() {
          return caches.match(event.request);
        })
    );
  }
});
