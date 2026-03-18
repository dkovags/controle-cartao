const CACHE_NAME = 'scpc-v1';
const URLS_TO_CACHE = [
  '/controle-cartao/',
  '/controle-cartao/index.html',
  '/controle-cartao/manifest.json',
  '/controle-cartao/icon-192.png',
  '/controle-cartao/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(URLS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
});

self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
