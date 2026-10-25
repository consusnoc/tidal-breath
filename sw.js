// Keeps Tidal Breath working offline. Bump VERSION when any app file changes.
const VERSION = 'tidal-breath-v2';
const APP_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App page: open the saved copy straight away, and refresh it in the background when online.
  if (req.mode === 'navigate') {
    const fresh = fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('index.html', copy)); }
      return res;
    });
    event.waitUntil(fresh.catch(() => {}));
    event.respondWith(
      caches.match('index.html', { ignoreSearch: true })
        .then(hit => hit || caches.match('./', { ignoreSearch: true }))
        .then(hit => hit || fresh)
    );
    return;
  }

  // Everything else (icons, fonts): use the saved copy, fetch and save it the first time.
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
