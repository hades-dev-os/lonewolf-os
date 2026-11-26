// LONEWOLF OS service worker: makes the app work offline.
// When you change ANY file, bump VERSION so devices download the new files.
const VERSION = '2.7.0';
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
  './life.js',
  './life.css',
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

// ===== Background checks (Android, installed app): Weekly Wrapped on Sunday evening + Debrief reminder =====
const TRK = { uni: 'UNI', gym: 'GYM', read: 'READ', write: 'WRITE', life: 'LIFE' };
const dk = d => d.toISOString().slice(0, 10);
function readState() {
  return new Promise(res => {
    const r = indexedDB.open('lonewolf', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onerror = () => res(null);
    r.onsuccess = () => { try { const q = r.result.transaction('kv', 'readonly').objectStore('kv').get('state'); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch (e) { res(null); } };
  });
}
async function meta(key, val) {
  const c = await caches.open('lw-meta'), u = './__meta/' + key;
  if (val === undefined) { const r = await c.match(u); return r ? r.text() : ''; }
  await c.put(u, new Response(String(val)));
}
async function backgroundTick() {
  const S = await readState(); if (!S || !S.x || !S.x.notif || !S.x.notif.on) return;
  const x = S.x, now = new Date(), today = dk(now), h = now.getHours(), wd = now.getDay();
  // Weekly Wrapped: Sunday from 18:00, or any time Monday (if Sunday was missed)
  if ((wd === 0 && h >= 18) || wd === 1) {
    const end = new Date(now); if (wd === 1) end.setDate(end.getDate() - 1);
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(end); d.setDate(d.getDate() - 6 + i); return dk(d); });
    if (await meta('wrapped') !== days[0]) {
      const net = (d, t) => Math.max(0, (((x.dg || {})[d] || {})[t] || 0) - (((x.dl || {})[d] || {})[t] || 0));
      const per = {}; Object.keys(TRK).forEach(t => { per[t] = days.reduce((a, d) => a + net(d, t), 0); });
      const tot = days.map(d => Object.keys(TRK).reduce((a, t) => a + net(d, t), 0));
      let mins = 0; Object.values(x.sess || {}).forEach(s => { if (s && !s.del && days.includes(s.d)) mins += s.m || 0; });
      const top = Object.keys(per).filter(t => per[t]).sort((a, b) => per[b] - per[a]).slice(0, 3).map(t => `${TRK[t]} +${per[t]}`).join(' · ');
      const bi = tot.indexOf(Math.max(...tot)), best = tot[bi] ? new Date(days[bi] + 'T12:00:00Z').toLocaleDateString('en', { weekday: 'short' }) : '';
      const hm = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
      await self.registration.showNotification('LONEWOLF // WEEKLY WRAPPED', { body: `${top || 'Quiet week, Sir.'}\n${hm} logged${best ? ' · best day ' + best : ''} · tap for the full dossier`, tag: 'wrapped', icon: 'icons/icon-192.png', badge: 'icons/favicon-32.png', data: { hash: '#wrapped' } });
      await meta('wrapped', days[0]);
    }
  }
  // Debrief reminder: after 20:00 if fewer than 2 answers today
  if (x.notif.debrief !== false && h >= 20) {
    const deb = (x.deb || {})[today] || {}, n = Object.keys(deb).filter(k => k[0] !== '_' && deb[k] && deb[k].v != null).length;
    if (n < 2 && await meta('debrief') !== today) {
      await self.registration.showNotification('Field report pending, Sir', { body: 'Gym, pages, words, sleep: 30 seconds and your tracks are up to date.', tag: 'debrief', icon: 'icons/icon-192.png', badge: 'icons/favicon-32.png', data: { hash: '#debrief' } });
      await meta('debrief', today);
    }
  }
}
self.addEventListener('periodicsync', e => { if (e.tag === 'lw-tick') e.waitUntil(backgroundTick()); });
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const hash = (e.notification.data && e.notification.data.hash) || '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const c = list[0];
    if (c) { c.postMessage({ open: hash.slice(1) }); return c.focus(); }
    return self.clients.openWindow('./' + hash);
  }));
});
