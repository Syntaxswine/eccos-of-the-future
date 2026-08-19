const RELEASE = '2026.08.19.4';
const CACHE = `ecco-v4-coherent-shell-${RELEASE}`;
const SHELL = [
  './',
  './index.html',
  `./styles.css?v=${RELEASE}`,
  `./app.js?v=${RELEASE}`,
  './src/ecco-core.mjs',
  './src/ssi-screen.mjs',
  './.well-known/ecco-challenge.json',
  './ecco/manifest.json',
  './ecco/missions.json',
  './ecco/protocol.md',
  './ecco/seed-capsule.json',
  './ecco/keys.txt',
  './llms.txt',
  './AGENTS.md',
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
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((client) => client.postMessage({
        type: 'ECCO_SHELL_UPDATED',
        release: RELEASE
      })))
  );
});

async function remember(request, response) {
  if (!response || !response.ok || response.type === 'opaque') return;
  const cache = await caches.open(CACHE);
  await cache.put(request, response.clone());
}

async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request);
    await remember(request, response);
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  await remember(request, response);
  return response;
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  const isNavigation = event.request.mode === 'navigate';
  const isExecutable = ['script', 'style', 'worker'].includes(event.request.destination);
  const isGameData = /\.(?:html|js|mjs|css|json|txt|md)$/u.test(requestUrl.pathname);

  if (isNavigation) {
    event.respondWith(networkFirst(event.request, './index.html'));
    return;
  }

  event.respondWith(
    isExecutable || isGameData
      ? networkFirst(event.request)
      : cacheFirst(event.request)
  );
});
