// service-worker.js  — scoped to /Wiz/ only (when registered correctly)

const CACHE_NAME = 'wiz-v1';
let OFFLINE_URL = 'index.html';

// Make OFFLINE_URL path-aware (so it works under /Wiz/)
try {
  const swUrl = new URL(self.location.href);
  // <...>/Wiz/service-worker.js  ->  <...>/Wiz/index.html
  OFFLINE_URL = swUrl.pathname.replace(/service-worker\.js$/, '') + 'index.html';
} catch (_) {}

// Install: cache just the shell so app is installable + basic offline
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: network-first for navigation, fallback to cached index.html
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only care about navigation (React router / SPA shell)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Everything else: don't mess with it (no aggressive asset caching)
});
