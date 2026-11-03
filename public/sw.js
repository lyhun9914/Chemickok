// 냥신 점괘 service worker: makes the site installable (홈 화면에 추가) on Android browsers that ask for one.
// It stores nothing: pages always come from the network; offline, a page just says so.
const OFFLINE = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>냥신 점괘</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#120906;color:#efe2c2;font-family:system-ui,sans-serif;text-align:center;padding:24px">
<div><div style="font-size:56px">🐾</div><p style="font-size:18px;font-weight:700">인터넷이 끊겼다냥</p><p style="color:#b9a888">연결되면 다시 열어 달라냥.</p></div></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});
