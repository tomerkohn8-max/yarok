// Caches the app shell so it opens offline; bump VERSION when files change.
const VERSION = 'yarok-v25';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'push.js', 'firebase-config.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/badge-96.png',
  'img/bg.webp', 'img/monstera.webp', 'img/snake.webp', 'img/pothos.webp',
  'img/lily.webp', 'img/zz.webp', 'img/fern.webp', 'img/cactus.webp',
  'img/my-basil.webp', 'img/my-philodendron.webp', 'img/my-dracaena.webp', 'img/my-adansonii.webp',
  'img/my-ivy.webp', 'img/my-coleus.webp', 'img/my-kalanchoe.webp', 'img/my-croton.webp',
  'img/my-sansevieria.webp', 'img/my-dieffenbachia.webp',
  'img/my-pothos-water.webp', 'img/my-coleus2.webp', 'img/my-basil2.webp', 'img/my-kalanchoe2.webp', 'img/my-pothos2.webp'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') {
    // the page is always fetched fresh so updates show at once; cache is the offline fallback
    e.respondWith(fetch(e.request).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put('index.html', copy)); return res;
    }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match('index.html')))
  );
});

// Reminders from the hourly job arrive as data-only FCM messages.
self.addEventListener('push', e => {
  let msg = {};
  try { const d = e.data.json(); msg = d.data || d.notification || d; } catch (err) {}
  e.waitUntil(self.registration.showNotification(msg.title || 'ירוק בבית', {
    body: msg.body || 'הצמחים מחכים לך',
    icon: 'icons/icon-192.png',
    badge: 'icons/badge-96.png',
    tag: 'daily',
    lang: 'he',
    dir: 'rtl',
    data: { url: msg.url || './' }
  }));
});

// Tapping a reminder opens (or focuses) the app.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(list => {
    const open = list.find(c => 'focus' in c);
    return open ? open.focus() : self.clients.openWindow(e.notification.data?.url || './');
  }));
});
