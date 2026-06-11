const CACHE_NAME = 'quick-view-v1';
const SHARED_FILE_KEY = '/file-preview/__shared_file__';

const ASSETS = [
  '/file-preview/',
  '/file-preview/index.html',
  '/file-preview/manifest.json',
  'https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js',
  'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
];

// ===== Install =====
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ===== Activate =====
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ===== Handle Share Target =====
async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !file.name) {
      return Response.redirect('/file-preview/?shared=error', 303);
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Store file in cache with metadata headers
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(arrayBuffer, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'X-Shared-Filename': encodeURIComponent(file.name),
        'X-Shared-Filetype': file.type || '',
      }
    });
    await cache.put(SHARED_FILE_KEY, response);

    // Redirect to main page with metadata in query string
    const nameEnc = encodeURIComponent(file.name);
    const typeEnc = encodeURIComponent(file.type || '');
    return Response.redirect(
      `/file-preview/?shared=true&name=${nameEnc}&type=${typeEnc}`,
      303
    );
  } catch (err) {
    console.error('Share target error:', err);
    return Response.redirect('/file-preview/?shared=error', 303);
  }
}

// ===== Fetch Handler =====
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Intercept share target POST
  if (url.pathname === '/file-preview/share-target' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
    return;
  }

  // Don't handle non-HTTP requests
  if (!event.request.url.startsWith('http')) return;

  // Cache-first for known assets
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

// ===== Message Handler: deliver shared file to page =====
self.addEventListener('message', async event => {
  if (event.data && event.data.type === 'GET_SHARED_FILE') {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(SHARED_FILE_KEY);

    if (!cached) {
      event.ports[0].postMessage({ ok: false, error: 'no shared file found' });
      return;
    }

    const blob = await cached.blob();
    const filename = decodeURIComponent(
      cached.headers.get('X-Shared-Filename') || 'shared-file'
    );
    const filetype = cached.headers.get('X-Shared-Filetype') || '';

    // Send file data back to page as a transferable ArrayBuffer
    const buffer = await blob.arrayBuffer();
    event.ports[0].postMessage(
      { ok: true, name: filename, type: filetype, buffer },
      [buffer]  // Transfer ownership to page
    );

    // Clean up cache entry
    await cache.delete(SHARED_FILE_KEY);
  }
});
