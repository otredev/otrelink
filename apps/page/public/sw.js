// Otrelink public page — service worker for push notifications from page owners.
// Registered as /sw.js?api=<Otrelink API origin> by src/notify.js. No caching.
const API = new URL(self.location.href).searchParams.get('api') || '';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data ? event.data.text() : '' }; }
  const actions = Array.isArray(d.actions) ? d.actions.slice(0, 2) : [];
  event.waitUntil(self.registration.showNotification(d.title || 'New notification', {
    body: d.body || '',
    icon: d.icon || '/favicon.svg',
    image: d.image || undefined,
    tag: d.tag || undefined,
    renotify: Boolean(d.tag),
    actions: actions.map((a) => ({ action: a.action, title: a.title })),
    data: { url: d.url || '/', cid: d.cid || '', actions },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const action = (data.actions || []).find((a) => a.action === event.action);
  const url = new URL((action && action.url) || data.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    // Count the tap (only a number per notification; nothing about the visitor).
    if (API && data.cid && data.cid !== 'test') {
      fetch(`${API}/api/public/notify/click`, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ c: data.cid }), headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
    }
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const same = tabs.find((t) => t.url === url);
    if (same) return same.focus();
    return self.clients.openWindow(url);
  })());
});
