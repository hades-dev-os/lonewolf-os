// LONEWOLF OS service worker: makes the app work offline.
// When you change ANY file, bump VERSION so devices download the new files.
const VERSION = '2.6.0';
const CACHE = 'lonewolf-' + VERSION;

// Files saved for offline use on install (includes the 17 MB PHP engine).
// Python (14 MB) is saved the first time you run Python code.
const CORE = [
  './',
  './index.html',
  './app.js',
  './pwa.js',
  './forge.js',
  './rig.js',
  './sfx.js',
  './ops.js',
  './ops.css',
  './libs/doc/mammoth.browser.min.js',
  './libs/doc/pdf.min.js',
  './libs/doc/pdf.worker.min.js',
  './libs/sb/supabase.js',
  './libs/sb/591.supabase.js',
  './manifest.webmanifest',
  './libs/marked.min.js',
  './libs/cm/codemirror-bundle.js',
  './libs/cm/codemirror.css',
  './libs/php/PhpWeb.mjs',
  './libs/php/PhpBase.mjs',
  './libs/php/php-web.mjs',
  './libs/php/php-web.mjs.wasm',
  './modules/index.json',
  './modules/sswd.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', event => {
  // cache: 'reload' = always download fresh copies, never old ones from the browser cache
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  // delete caches from older versions
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('lonewolf-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data === 'version' && event.ports[0]) event.ports[0].postMessage(VERSION);
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: use the saved copy, refresh it in the background
  if (url.host.includes('fonts.googleapis.com') || url.host.includes('fonts.gstatic.com')) {
    event.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  // Our own files: offline copy first, otherwise download and save it
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => {
      if (r.ok) caches.open(CACHE).then(c => c.put(req, r.clone()));
      return r;
    }).catch(() => req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
  );
});
