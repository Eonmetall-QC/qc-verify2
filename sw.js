/* QC Verifier 2 (Code List 2) – offline app shell. Bump VERSION when you upload a new index.html. */
const VERSION = 'qcl2-r4';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'maskable-192.png', 'maskable-512.png', 'favicon-32.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('qcl2-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.hostname.endsWith('google.com') || u.hostname.endsWith('googleusercontent.com')) return; // never cache the Google Sheet
  if (u.origin === location.origin && (e.request.mode === 'navigate' || u.pathname.endsWith('.html'))) {
    // page: newest from the web, saved copy when offline
    // cache:'no-cache' = always ask GitHub for the newest page (GitHub lets browsers reuse it for 10 min otherwise)
    e.respondWith(fetch(u.href, { cache: 'no-cache', credentials: 'same-origin' }).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
    return;
  }
  if (/cdn\.jsdelivr\.net/.test(u.hostname) || /\/weights\.bin$/.test(u.pathname)) {
    // big files (AI library, barcode reader, model weights): download once, then always use the saved copy.
    // After retraining the model, change VERSION above so the new weights are fetched.
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); } return r; })));
    return;
  }
  if (u.origin === location.origin || /fonts\.(googleapis|gstatic)\.com/.test(u.hostname)) {
    // icons, reader library, fonts: saved copy first, refresh in background
    e.respondWith(caches.match(e.request).then(hit => {
      const net = fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); } return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});
