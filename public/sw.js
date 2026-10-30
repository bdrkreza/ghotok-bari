/* আলতা service worker.
   Pages always come from the network (they show one ghotok's private data, so none of them is kept here);
   when the network is gone the offline page is shown instead. Build assets under /_next/static/ carry a content
   hash in their name, so once fetched they are served from the cache. Registered by components/pwa.tsx. */
const CACHE = "alta-v1";
const OFFLINE_URL = "/offline";
const STAMP_URL = "/__offline-stamp";
const DAY = 24 * 60 * 60 * 1000;

// Used only if the offline page itself could not be cached.
const FALLBACK_HTML = `<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ইন্টারনেট নেই · আলতা</title></head>
<body style="margin:0;min-height:100dvh;display:grid;place-items:center;background:#f8f6f3;color:#1f2333;font-family:system-ui,sans-serif;text-align:center;padding:16px">
<div><p style="font-size:28px;font-weight:800;margin:0 0 8px">ইন্টারনেট নেই</p><p style="color:#6b7183;margin:0 0 20px">সংযোগ ফিরে এলে আবার চেষ্টা করুন।</p>
<form action="/"><button style="min-height:48px;padding:0 20px;border:0;border-radius:16px;background:#b3213a;color:#fff;font-weight:700;font-size:16px">আবার চেষ্টা করুন</button></form></div></body></html>`;

/** Fetches the offline page again, and the stylesheets it links, so it keeps up with new builds. */
async function cacheOfflinePage() {
  const cache = await caches.open(CACHE);
  const res = await fetch(OFFLINE_URL, { cache: "reload" });
  if (!res.ok) return;
  const html = await res.clone().text();
  await cache.put(OFFLINE_URL, res);
  const sheets = [...new Set(html.match(/\/_next\/static\/[^"' ]+\.css/g) ?? [])];
  await Promise.all(sheets.map((href) => cache.add(href).catch(() => {})));
  await cache.put(STAMP_URL, new Response(String(Date.now())));
}

async function refreshOfflinePageIfStale() {
  const cache = await caches.open(CACHE);
  const stamp = await cache.match(STAMP_URL);
  const at = stamp ? Number(await stamp.text()) : 0;
  if (Date.now() - at > DAY) await cacheOfflinePage().catch(() => {});
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheOfflinePage().catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // server actions and other POSTs pass straight through
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res = await fetch(request);
        event.waitUntil(refreshOfflinePageIfStale());
        return res;
      } catch {
        const cache = await caches.open(CACHE);
        return (await cache.match(OFFLINE_URL)) ?? new Response(FALLBACK_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
    })());
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(request);
      if (hit) return hit;
      const res = await fetch(request);
      if (res.ok) await cache.put(request, res.clone());
      return res;
    })());
  }
});
