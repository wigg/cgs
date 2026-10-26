/*
 * sw.js, lets Svendsen Sounds work without a network (on the track, in a tunnel, at the pits).
 * The page itself is fetched from the network when there is one and from the saved copy when there is not.
 * Everything else (sounds, styles, map code) is served from the saved copy at once and refreshed in the background.
 * Map pictures from other sites are not saved.
 */
var VERSION = 'svs-v49';

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.add('index.html').catch(function () {}); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function put(req, res) {
  if (!res || res.status !== 200 || res.type === 'opaque') return;
  var copy = res.clone();
  caches.open(VERSION).then(function (c) { return c.put(req, copy); }).catch(function () { /* no room: fine */ });
}

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (req.headers.get('range')) return;
  var isPage = req.mode === 'navigate' || /\.html?$/.test(url.pathname) || url.pathname.slice(-1) === '/';
  if (isPage) {
    e.respondWith(fetch(req).then(function (res) { put(req, res); return res; }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (m) { return m || caches.match('index.html'); });
    }));
    return;
  }
  e.respondWith(caches.match(req).then(function (hit) {
    var net = fetch(req).then(function (res) { put(req, res); return res; }).catch(function () { return hit; });
    return hit || net;
  }));
});
