/* Service worker: simpan semua fail app supaya boleh dibuka tanpa internet. */
const CACHE = 'harbin-trip-v11';
const ASSETS = [
  './', 'index.html', 'admin.html', 'manifest-admin.webmanifest', 'vendor/qrcode.js', 'css/style.css', 'js/app.js', 'js/mt.js', 'js/i18n.js', 'js/data-phrases.js', 'js/data-checklist.js', 'js/data-glossary.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];
// Fail enjin terjemahan (besar) — disimpan bila pakej terjemahan dimuat turun
const LAZY = ['vendor/transformers.min.js', 'vendor/ort-wasm-simd-threaded.jsep.mjs', 'vendor/ort-wasm-simd-threaded.jsep.wasm', 'vendor/pinyin-pro.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    // Kekalkan cache model AI ('transformers-cache') & cache vendor
    keys.filter(k => k !== CACHE && k.startsWith('harbin-trip-') && k !== 'harbin-trip-vendor').map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('message', e => {
  if (e.data === 'cache-vendor') {
    e.waitUntil(caches.open('harbin-trip-vendor').then(c => c.addAll(LAZY)));
  }
});
// Cache dahulu (offline), kemas kini cache di belakang bila ada internet.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.indexOf('__no_local_models__') >= 0) return; // enjin terjemahan: biar gagal terus
  if (url.pathname.endsWith('/data/shared.json')) {
    // Kandungan penganjur: cuba internet dahulu, jika tiada guna salinan tersimpan
    e.respondWith(fetch(e.request, { cache: 'no-store' }).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(new Request(url.pathname), copy)); }
      return res;
    }).catch(() => caches.match(new Request(url.pathname)).then(h => h || new Response('{"v":0}', { headers: { 'Content-Type': 'application/json' } }))));
    return;
  }
  const isVendor = url.pathname.indexOf('/vendor/') >= 0;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      if (hit && isVendor) return hit; // fail vendor tidak berubah — terus dari cache
      const net = fetch(e.request).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(isVendor ? 'harbin-trip-vendor' : CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit || (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error()));
      return hit || net;
    })
  );
});
