/* AURA : fonctionnement sans connexion. Tout ce qui est chargé une fois reste disponible à bord. */
const CACHE = 'aura-v2-2';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  const u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  // les films sont lus par morceaux (requêtes partielles) : le navigateur les gère lui-même
  if (r.headers.has('range') || u.pathname.endsWith('.mp4')) return;
  // réseau d'abord (toujours la dernière version), sinon la copie gardée à bord
  e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(k => k.put(r, c)); return res; }).catch(() => caches.match(r)));
});
