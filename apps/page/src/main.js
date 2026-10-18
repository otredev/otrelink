// Otrelink public page. Plain JavaScript: fetch the page, render it with the
// shared renderer from @otrelink/core, and send analytics beacons.
import { mountPage, resolveDesign, pickLanguage, localizePage } from '@otrelink/core';
import { getGeo, visitContext, privacyMode } from './geo.js';
import { setupNotify, addAppLinks } from './notify.js';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const HOME = import.meta.env.VITE_HOME_URL || API;
const app = document.getElementById('app');

// Slug from /username, /@username or ?u=username
function getSlug() {
  const q = new URLSearchParams(location.search).get('u');
  if (q) return q;
  // Ignore the base path (e.g. "/otrelink/" on GitHub Pages).
  const base = import.meta.env.BASE_URL || '/';
  const path = location.pathname.startsWith(base) ? location.pathname.slice(base.length) : location.pathname;
  return decodeURIComponent(path.split('/').filter(Boolean)[0] || '').replace(/^@/, '');
}

function visitorId() {
  // No stored ID where consent would be needed (EEA/UK/CH) or with Global Privacy Control.
  if (privacyMode()) return '';
  try {
    let id = localStorage.getItem('ol_v');
    if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('ol_v', id); }
    return id;
  } catch { return ''; }
}

// Location (when it arrives) and time context go with every event.
let geo = null;
const geoReady = getGeo().then((g) => { geo = g; return g; });

function track(pageId, payload) {
  const body = JSON.stringify({ pageId, visitor: visitorId(), ...visitContext(), ...(geo || {}), ...payload });
  const url = `${API}/api/public/track`;
  // sendBeacon survives navigation; text/plain avoids a CORS preflight.
  if (navigator.sendBeacon?.(url, new Blob([body], { type: 'text/plain' }))) return;
  fetch(url, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
}

function setMeta(page) {
  const title = page.settings.seoTitle || page.profile.title || `@${page.slug}`;
  const desc = page.settings.seoDescription || page.profile.bio || '';
  const image = page.settings.ogImage || page.profile.avatar || '';
  document.title = title;
  const set = (sel, v) => document.querySelector(sel)?.setAttribute('content', v);
  set('meta[name="description"]', desc);
  set('meta[property="og:title"]', title);
  set('meta[property="og:description"]', desc);
  set('meta[property="og:image"]', image);
  // Browser chrome color follows the wallpaper when it's a plain color.
  const d = resolveDesign(page.design);
  const color = d.wallpaper.color || d.wallpaper.bg || d.wallpaper.from;
  if (color) {
    const m = document.createElement('meta');
    m.name = 'theme-color';
    m.content = color.slice(0, 7);
    document.head.append(m);
    document.body.style.background = color;
  }
}

function showState(title, text) {
  app.innerHTML = `<div class="ol-state"><div><h1>${title}</h1><p>${text}</p><a href="${HOME}">Create your own page</a></div></div>`;
}

async function main() {
  const slug = getSlug();
  if (!slug) return showState('Otrelink', 'Add a username to the URL, like /yourname.');
  try {
    const res = await fetch(`${API}/api/public/${encodeURIComponent(slug)}`);
    if (res.status === 404) return showState('Page not found', `There's no page at /${slug} yet.`);
    if (!res.ok) throw new Error(String(res.status));
    const { page } = await res.json();
    // Second language: ?lang=, the visitor's last choice or their browser's language.
    let lang = pickLanguage(page, window);
    setMeta(localizePage(page, lang));
    mountPage(app, page, {
      mode: 'live',
      lang,
      // The ES / EN switch re-renders in place; keep the tab title in that language.
      onLanguageChange: (l) => { lang = l; setMeta(localizePage(page, l)); },
      footerUrl: HOME,
      apiBase: API, // used by blocks that talk to the server (Booking)
      onTrack: (target) => track(page.id, { type: 'click', target }),
    });
    // Push notifications: sign-up sheet (button block, ?subscribe link or QR).
    if (page.notify) {
      addAppLinks(page);
      setupNotify({ page, api: API, getLang: () => lang, privacyUrl: `${API}/privacy` });
    }
    // The visit waits up to 3 s for the location; it is sent anyway if the visitor leaves first.
    let sent = false;
    const sendView = () => { if (!sent) { sent = true; track(page.id, { type: 'view', referrer: document.referrer }); } };
    Promise.race([geoReady, new Promise((r) => setTimeout(r, 3000))]).then(sendView);
    addEventListener('pagehide', sendView, { once: true });
  } catch (err) {
    console.error(err);
    showState('Something went wrong', 'The page could not be loaded. Refresh to try again.');
  }
}

main();
