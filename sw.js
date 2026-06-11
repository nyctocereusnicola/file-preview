const CACHE_NAME = 'quick-view-v1';
const ASSETS = [
  '/file-preview/',
  '/file-preview/index.html',
  '/file-preview/manifest.json',
  // CDN libs — cache for offline
  'https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js',
  'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
];

// Install — cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first for assets, network-first for everything else
self.addEventListener('fetch', event => {
  // Don't cache file:// or blob://
  if (!event.request.url.startsWith('http')) return;

  // Cache-first for our assets
  if (ASSETS.some(a => event.request.url.includes(a)) ||
      event.request.url.includes('cdn.jsdelivr.net') ||
      event.request.url.includes('cdn.sheetjs.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  }
  // Network-first for everything else
  else {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});
