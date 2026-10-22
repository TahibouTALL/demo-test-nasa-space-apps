/* AURA : fonctionnement hors connexion.
   Toutes les ressources de la plateforme sont mises en cache au premier
   chargement ; ensuite, AURA s’ouvre et calcule sans réseau. */
const CACHE = 'aura-v4';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/aura.css',
  'assets/icon.svg',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/qr-aura.svg',
  'assets/fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2',
  'assets/fonts/atkinson-hyperlegible-next-latin-ext-wght-normal.woff2',
  'assets/fonts/atkinson-hyperlegible-next-latin-wght-italic.woff2',
  'js/data.js',
  'js/kb.js',
  'js/engine.js',
  'js/store.js',
  'js/ui.js',
  'js/views-a.js',
  'js/views-b.js',
  'js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Réseau d’abord pour les pages (mise à jour), cache sinon ; cache d’abord pour le reste.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); return res; })
        .catch(() => caches.match('index.html'))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
