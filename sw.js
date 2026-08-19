const CACHE = 'ecco-v1';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './src/ecco-core.mjs',
  './ecco/manifest.json',
  './ecco/missions.json',
  './ecco/protocol.md',
  './ecco/seed-capsule.json',
  './ecco/keys.txt',
  './llms.txt',
  './assets/ecco-mark.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }))
  );
});
