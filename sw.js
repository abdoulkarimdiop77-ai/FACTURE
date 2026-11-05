// Service worker — Facturier
// Met l'application en cache pour qu'elle s'ouvre et fonctionne sans connexion.
const V = 'facturier-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const CDN = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.all(SHELL.map((u) => c.add(u).catch(() => {})));
    await Promise.all(CDN.map(async (u) => {
      try {
        const r = await fetch(u, { mode: 'no-cors' });
        await c.put(u, r);
      } catch (_) {}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (k !== V) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  // Les appels à la base de données ne passent jamais par le cache
  if (u.hostname.endsWith('supabase.co')) return;

  e.respondWith((async () => {
    const c = await caches.open(V);
    const hit = await c.match(r, { ignoreSearch: true });
    const net = fetch(r).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        c.put(r, res.clone()).catch(() => {});
      }
      return res;
    }).catch(() => null);
    if (hit) { net.catch(() => {}); return hit; }
    const res = await net;
    if (res) return res;
    if (r.mode === 'navigate') {
      const home = await c.match('./index.html');
      if (home) return home;
    }
    return Response.error();
  })());
});
