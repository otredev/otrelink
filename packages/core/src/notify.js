// ─────────────────────────────────────────────────────────────
//  PUSH NOTIFICATIONS TO VISITORS
//  Visitors of a page subscribe (button block, link or QR → consent → browser
//  permission) and the owner sends them notifications from the dashboard:
//  now or scheduled, once or repeating, to everyone or to some topics.
//  Shared by the API (validation, sending), the dashboard and the public page.
//
//  page.notify = { enabled, title, text, topics: [{ id, label }] }   (sanitizeNotifyConfig)
//  campaign    = { title, body, image, url, actions, topics, es, schedule, ttlHours } (sanitizeBroadcast)
// ─────────────────────────────────────────────────────────────
import { safeUrl, uid } from './util/html.js';

/** Bump when the consent text shown to visitors changes (stored with each subscription). */
export const NOTIFY_CONSENT_VERSION = '2026-10-18';

export const NOTIFY_LIMITS = {
  topics: 6,
  titleMax: 60,
  bodyMax: 180,
  actions: 2,
  actionLabelMax: 24,
  /** Notifications a page can send per day (scheduled repeats count too). */
  sendsPerDay: 10,
};

export const NOTIFY_REPEATS = [
  { value: 'none', label: 'Once' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
];

const line = (v, max) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const text = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const httpsUrl = (v) => { const u = safeUrl(v, { allowRelative: false }); return /^https?:/.test(u) ? u : ''; };
const iso = (v) => { const d = new Date(v || ''); return Number.isNaN(d.getTime()) ? '' : d.toISOString(); };
const validTz = (tz) => { try { return tz && Intl.DateTimeFormat('en', { timeZone: tz }) && String(tz).slice(0, 64); } catch { return ''; } };

export const defaultNotifyConfig = () => ({
  enabled: false,
  title: 'Get notified',
  text: 'Discounts, news and events, straight to your phone. You can turn them off anytime.',
  topics: [],
});

/** Owner settings of the sign-up screen. */
export function sanitizeNotifyConfig(input) {
  const c = input && typeof input === 'object' ? input : {};
  const d = defaultNotifyConfig();
  const seen = new Set();
  const topics = (Array.isArray(c.topics) ? c.topics : [])
    .map((t) => ({ id: line(t?.id, 24).replace(/[^\w-]/g, '') || uid('t'), label: line(t?.label, 30) }))
    .filter((t) => t.label && !seen.has(t.id) && seen.add(t.id))
    .slice(0, NOTIFY_LIMITS.topics);
  return {
    enabled: Boolean(c.enabled),
    title: line(c.title, 60) || d.title,
    text: text(c.text, 240) || d.text,
    topics,
  };
}

/** What the public page gets (nothing when sign-ups are off). */
export const publicNotifyConfig = (config) => {
  const c = sanitizeNotifyConfig(config);
  return c.enabled ? { title: c.title, text: c.text, topics: c.topics } : null;
};

/** Topics a visitor picked, limited to the page's topics. Empty = everything. */
export function sanitizeTopics(list, config) {
  const ids = new Set(sanitizeNotifyConfig(config).topics.map((t) => t.id));
  return [...new Set((Array.isArray(list) ? list : []).map(String))].filter((id) => ids.has(id));
}

/** Starting points for the message composer. */
export const NOTIFY_TEMPLATES = [
  { id: 'discount', label: 'Discount', title: '20% off today only', body: 'Show this notification at the counter or use the code SAVE20.' },
  { id: 'event', label: 'Event', title: 'See you on Saturday', body: 'Doors open at 8 pm. Tap to see the details and get your ticket.' },
  { id: 'news', label: 'News', title: 'Something new is here', body: 'We just added it to our page. Tap to take a look.' },
  { id: 'product', label: 'New product', title: 'Fresh out of the oven', body: 'Our new seasonal special is ready. Come try it before it runs out.' },
  { id: 'reminder', label: 'Reminder', title: 'Last chance', body: 'The offer ends tonight at midnight.' },
];

/**
 * A notification the owner writes. schedule.mode 'now' sends right away; 'at' at sendAt.
 * repeat sends it again every day/week/month (in the owner's time zone) until repeatUntil.
 */
export function sanitizeBroadcast(input) {
  const c = input && typeof input === 'object' ? input : {};
  const s = c.schedule && typeof c.schedule === 'object' ? c.schedule : {};
  const actions = (Array.isArray(c.actions) ? c.actions : [])
    .map((a) => ({ label: line(a?.label, NOTIFY_LIMITS.actionLabelMax), url: httpsUrl(a?.url) }))
    .filter((a) => a.label && a.url)
    .slice(0, NOTIFY_LIMITS.actions);
  const es = c.es && typeof c.es === 'object' && (line(c.es.title, 1) || line(c.es.body, 1))
    ? { title: line(c.es.title, NOTIFY_LIMITS.titleMax), body: text(c.es.body, NOTIFY_LIMITS.bodyMax) } : null;
  const mode = s.mode === 'at' ? 'at' : 'now';
  const repeat = NOTIFY_REPEATS.some((r) => r.value === s.repeat) && mode === 'at' ? s.repeat : 'none';
  return {
    title: line(c.title, NOTIFY_LIMITS.titleMax),
    body: text(c.body, NOTIFY_LIMITS.bodyMax),
    image: httpsUrl(c.image),
    url: httpsUrl(c.url),
    actions,
    topics: [...new Set((Array.isArray(c.topics) ? c.topics : []).map((t) => line(t, 24)).filter(Boolean))].slice(0, NOTIFY_LIMITS.topics),
    es,
    schedule: {
      mode,
      sendAt: mode === 'at' ? iso(s.sendAt) : '',
      repeat,
      repeatUntil: repeat !== 'none' ? iso(s.repeatUntil) : '',
      tz: validTz(s.tz) || 'UTC',
    },
    ttlHours: Math.min(72, Math.max(1, Math.round(Number(c.ttlHours) || 24))),
  };
}

/** Problems that stop a campaign from being saved: [] when it's fine. */
export function broadcastErrors(c, { now = Date.now() } = {}) {
  const errors = [];
  if (!c.title) errors.push('title_required');
  if (!c.body) errors.push('body_required');
  if (c.schedule.mode === 'at') {
    if (!c.schedule.sendAt) errors.push('send_at_required');
    else if (new Date(c.schedule.sendAt).getTime() < now - 60e3) errors.push('send_at_past');
    else if (new Date(c.schedule.sendAt).getTime() > now + 366 * 864e5) errors.push('send_at_too_far');
  }
  if (c.schedule.repeatUntil && c.schedule.sendAt && c.schedule.repeatUntil < c.schedule.sendAt) errors.push('repeat_until_before_start');
  return errors;
}

// ── Time zones ─────────────────────────────────────────────────
/** Wall-clock parts of a date in a time zone. */
function partsIn(date, tz) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, Number(x.value)]));
  return { y: p.year, m: p.month, d: p.day, h: p.hour % 24, mi: p.minute, s: p.second };
}

/** The instant when the clock in `tz` shows y-m-d h:mi. */
function zonedTime(y, m, d, h, mi, tz) {
  let t = Date.UTC(y, m - 1, d, h, mi);
  for (let i = 0; i < 3; i++) {
    const p = partsIn(new Date(t), tz);
    const shown = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi);
    const wanted = Date.UTC(y, m - 1, d, h, mi);
    if (shown === wanted) break;
    t += wanted - shown;
  }
  return new Date(t);
}

/**
 * Next time a repeating campaign goes out after `fromIso`, at the same local time
 * in its time zone (so 9:00 stays 9:00 across daylight saving changes). '' = no more.
 */
export function nextOccurrence(fromIso, repeat, tz = 'UTC', untilIso = '') {
  if (!fromIso || !repeat || repeat === 'none') return '';
  const zone = validTz(tz) || 'UTC';
  const p = partsIn(new Date(fromIso), zone);
  let { y, m, d } = p;
  if (repeat === 'daily') d += 1;
  else if (repeat === 'weekly') d += 7;
  else if (repeat === 'monthly') {
    m += 1;
    if (m > 12) { m = 1; y += 1; }
    d = Math.min(d, new Date(Date.UTC(y, m, 0)).getUTCDate()); // 31 → last day of a shorter month
  } else return '';
  // Normalize day overflow (e.g. Jan 35 → Feb 4).
  const n = new Date(Date.UTC(y, m - 1, d));
  const next = zonedTime(n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate(), p.h, p.mi, zone).toISOString();
  return untilIso && next > untilIso ? '' : next;
}

// ── The notification itself ────────────────────────────────────
const fill = (s, page) => String(s || '').replaceAll('{page}', page?.profile?.title || page?.slug || '');

/**
 * Payload sent to a subscriber's browser (read by the page's service worker).
 * lang 'es' uses the Spanish version when the campaign has one.
 */
export function pushPayload(campaign, page, { lang = 'en', pageUrl = '', campaignId = '' } = {}) {
  const es = lang === 'es' && campaign.es?.title ? campaign.es : null;
  const home = pageUrl ? `${pageUrl.replace(/\/$/, '')}/${page.slug}` : '';
  return {
    title: fill(es?.title || campaign.title, page).slice(0, 80),
    body: fill(es?.body || campaign.body, page).slice(0, 240),
    icon: safeUrl(page?.profile?.avatar, { allowRelative: false }) || '',
    image: campaign.image || '',
    url: campaign.url || home,
    actions: (campaign.actions || []).map((a, i) => ({ action: `a${i}`, title: a.label, url: a.url })),
    tag: `ol-${page.id}-${campaignId}`,
    cid: campaignId,
    pid: page.id,
  };
}
