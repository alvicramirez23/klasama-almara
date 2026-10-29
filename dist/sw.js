/* ============================================================================
   KLASAMA SERVICE WORKER
   ──────────────────────────────────────────────────────────────────────────
   Purpose: make the app work offline. Static assets are cached on first use,
   and navigation requests fall back to the cached index.html when the network
   is unavailable.

   API hosts are explicitly bypassed so AI/email traffic is never cached.

   IMPORTANT: bump CACHE_VERSION on every release, to match the app version.
   ============================================================================ */

const CACHE_VERSION = 'v1.8.3-klasama-20261029';
const CACHE = `klasama-${CACHE_VERSION}`;

/* Hosts that must NEVER be cached. Add new API endpoints here. */
const API_HOSTS = new Set([
  'generativelanguage.googleapis.com',
  'api.web3forms.com',
  'image.pollinations.ai',
  'api.kavel.ai'
]);

/* Precache the app shell, local font, templates, and vendor libraries so
   the complete classroom workspace is available after installation. */
const PRECACHE = [
  './assets/pro.css',
  './assets/pro.css?v=1.7.0',
  './assets/Inter-Variable.ttf',
  './assets/OFL-Inter.txt',
  './assets/Baskerville.ttf',
  './assets/OFL-Baskerville.txt',

  './assets/typography.css',
  './assets/typography.css?v=1.7.0',

  './assets/brand-theme.js',
  './assets/klasama-current-192.png',
  './assets/klasama-current-512.png',
  './assets/klasama-app-icon.svg',
  './assets/theme-init.js',
  './assets/klasama-mark-light.svg',
  './assets/klasama-mark-sepia.svg',
  './assets/klasama-mark-dark.svg',
  './assets/klasama-mark-navy.svg',
  './assets/klasama-mark-deped-green.svg',
  './assets/klasama-mark-noir.svg',
  './assets/klasama-mark-white.svg',
  './assets/app.css',
  './assets/app.js',
  './assets/klasama-mark.svg',
  './assets/klasama.css',
  './assets/klasama.css?v=klasama-1.2.0',
  './cert-template.png',
  './cert-template1.png',
  './cert-template2.png',
  './cert-template3.png',
  './icon/author.png',
  './icon/author.svg',
  './icon/deped.webp',
  './icon/qr.svg',
  './index.html',
  './workspace.html',
  './assets/landing.css',
  './assets/ui-font.js',
  './assets/glass.css',
  './assets/theme-palettes.css',
  './assets/theme-palettes.css?v=1.8.3',
  './assets/glass.css?v=1.3.0',
  './manifest.webmanifest',
  './vendor/LICENSE-peerjs.txt',
  './vendor/jsQR.js',
  './vendor/mammoth.browser.min.js',
  './vendor/pdf.min.js',
  './vendor/pdf.worker.min.js',
  './vendor/peerjs.min.js',
  './vendor/pptxgen.bundle.js',
  './vendor/qrcode.min.js',
  './vendor/xlsx.full.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('klasama-') && k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only GET requests are cacheable
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // API traffic: always live, never cached
  if (API_HOSTS.has(url.hostname)) return;

  // Don't intercept cross-origin traffic we don't own
  if (url.origin !== self.location.origin) return;

  // Navigations: network first, cache fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (!res.ok) return res;
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(url.pathname.endsWith('/workspace.html') ? './workspace.html' : './index.html').then(r => r || caches.match('./'))
        )
    );
    return;
  }

  // Static assets: cache-first, with background refresh
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});