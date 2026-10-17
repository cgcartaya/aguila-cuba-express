export const pwaManifest = {
  id: "/gestores",
  name: "ShareAPP · Perla Marketplace",
  short_name: "ShareAPP",
  description:
    "Tu catálogo, publicaciones y resultados de ventas, en un solo lugar.",
  lang: "es",
  start_url: "/gestores?source=installed",
  scope: "/gestores",
  display: "standalone",
  background_color: "#f6f7fb",
  theme_color: "#151d35",
  categories: ["business", "productivity"],
  icons: [
    {
      src: "/shareapp/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/shareapp/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/shareapp/icon-maskable.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
};
export const serviceWorker = `
const CACHE = 'shareapp-public-v1';
const OFFLINE = '/shareapp/offline.html';
const ASSETS = [OFFLINE, '/shareapp/icon-192.png', '/shareapp/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('shareapp-public-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Never intercept or cache API requests, Auth traffic, product data or private pages.
  if (event.request.mode === 'navigate' && (url.pathname === '/gestores' || url.pathname.startsWith('/gestores/'))) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(OFFLINE)));
  }
});
`;
