// Service worker do LENDAS: guarda os arquivos do build para jogar sem internet.
// A lista __PRECACHE__ e a versão são preenchidas pelo build (vite.config.js).
// Todos os caminhos são relativos ao próprio sw.js (o GitHub Pages usa base './').
const VERSION = '__VERSION__';
const CACHE = `lendas-${VERSION}`;
const PRECACHE = /*__PRECACHE__*/[];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(PRECACHE.map((file) => cache.add(new URL(file, self.location).href).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('lendas-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  // Páginas: rede primeiro (pega a versão nova), cache quando estiver sem internet.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(new URL('./index.html', self.location).href, copy));
      return response;
    }).catch(() => caches.match(new URL('./index.html', self.location).href)));
    return;
  }
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => (request.mode === 'navigate' ? caches.match(new URL('./index.html', self.location).href) : Response.error()));
    })
  );
});
