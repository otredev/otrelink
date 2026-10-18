// Push notifications from a page owner to the page's subscribers.
// A "broadcast" is saved as scheduled (sendAt = now for "Send now") and sent by
// runDueBroadcasts(): right after it is created and from the cron every minute.
// Repeating broadcasts schedule their next occurrence when one goes out.
import {
  sanitizeBroadcast, broadcastErrors, nextOccurrence, pushPayload, sanitizeNotifyConfig,
  NOTIFY_LIMITS, allowsSection,
} from '@otrelink/core';
import { config } from './config.js';
import { webPushClient } from './notify.js';
import { ownerPlan } from './plans.js';
import { HttpError } from './http.js';

const BATCH = 500;
const PARALLEL = 25;
const STALE_MS = 10 * 60e3; // a send that stopped (server restart) is picked up again after 10 min

const dayRange = (iso) => {
  const d = new Date(iso);
  const from = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return { from: from.toISOString(), to: new Date(from.getTime() + 864e5).toISOString() };
};

/** Shape sent to the dashboard. */
export const toOwnerBroadcast = (b) => ({
  id: b.id, status: b.status, title: b.title, body: b.body, image: b.image, url: b.url, actions: b.actions || [],
  topics: b.topics || [], es: b.es || null, schedule: b.schedule, ttlHours: b.ttlHours, sendAt: b.sendAt,
  seriesId: b.seriesId || b.id, occurrence: b.occurrence || 1,
  stats: { targeted: 0, sent: 0, failed: 0, removed: 0, clicks: 0, ...(b.stats || {}) },
  error: b.error || '', createdAt: b.createdAt, sentAt: b.sentAt || '',
});

/** Validate a broadcast from the dashboard. Throws 400 with the problems found. */
export async function prepareBroadcast(db, page, input, { exceptId = '' } = {}) {
  const b = sanitizeBroadcast(input);
  const topics = new Set(sanitizeNotifyConfig(page.notify).topics.map((t) => t.id));
  b.topics = b.topics.filter((t) => topics.has(t));
  const errors = broadcastErrors(b);
  if (errors.length) throw Object.assign(new HttpError(400, errors[0]), { errors });
  const sendAt = b.schedule.mode === 'at' ? b.schedule.sendAt : new Date().toISOString();
  const used = await db.broadcasts.countBetween({ pageId: page.id, ...dayRange(sendAt), exceptId });
  if (used >= NOTIFY_LIMITS.sendsPerDay) throw new HttpError(429, 'daily_limit');
  return { ...b, sendAt };
}

/** Count and group a page's subscribers for the dashboard. */
export async function subscriberStats(db, page) {
  const list = await db.subscribers.summary(page.id);
  const byTopic = {}; const bySource = {}; const byLang = {};
  const since = Date.now() - 30 * 864e5;
  const days = {};
  for (const s of list) {
    for (const t of s.topics || []) byTopic[t] = (byTopic[t] || 0) + 1;
    if (!s.topics?.length) byTopic._all = (byTopic._all || 0) + 1;
    bySource[s.source || 'button'] = (bySource[s.source || 'button'] || 0) + 1;
    byLang[s.lang || 'en'] = (byLang[s.lang || 'en'] || 0) + 1;
    if (new Date(s.createdAt).getTime() >= since) { const d = s.createdAt.slice(0, 10); days[d] = (days[d] || 0) + 1; }
  }
  return { total: list.length, byTopic, bySource, byLang, last30: Object.values(days).reduce((a, n) => a + n, 0), days };
}

/** Send one broadcast to every matching subscriber, in batches. */
export async function sendBroadcast(db, b) {
  const fail = (error) => db.broadcasts.update(b.id, { status: 'failed', error, lockedAt: null });
  const push = webPushClient();
  if (!push) return fail('push_not_configured');
  const page = await db.pages.findById(b.pageId);
  if (!page) return fail('page_deleted');
  const plan = await ownerPlan(db, page);
  if (!plan || !allowsSection(plan, 'notify')) return fail('plan_required');

  const stats = { targeted: 0, sent: 0, failed: 0, removed: 0, clicks: b.stats?.clicks || 0 };
  const payloads = {};
  const payloadFor = (lang) => {
    const key = lang === 'es' ? 'es' : 'en';
    payloads[key] ||= JSON.stringify(pushPayload(b, page, { lang: key, pageUrl: config.pageUrl, campaignId: b.id }));
    return payloads[key];
  };
  const options = { TTL: (b.ttlHours || 24) * 3600, urgency: 'normal' };

  let after = '';
  for (;;) {
    const subs = await db.subscribers.batch({ pageId: page.id, topics: b.topics || [], after, limit: BATCH });
    if (!subs.length) break;
    after = subs[subs.length - 1].id;
    stats.targeted += subs.length;
    for (let i = 0; i < subs.length; i += PARALLEL) {
      await Promise.all(subs.slice(i, i + PARALLEL).map(async (s) => {
        try {
          await push.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payloadFor(s.lang), options);
          stats.sent++;
        } catch (err) {
          stats.failed++;
          // 404/410: the visitor turned notifications off or cleared the browser.
          if (err?.statusCode === 404 || err?.statusCode === 410) { stats.removed++; await db.subscribers.removeByEndpoint(s.endpoint); }
        }
      }));
    }
    await db.broadcasts.update(b.id, { stats, lockedAt: new Date().toISOString() });
    if (subs.length < BATCH) break;
  }

  await db.broadcasts.update(b.id, { status: 'sent', stats, sentAt: new Date().toISOString(), lockedAt: null });

  // Repeating: schedule the next one (it shows up in the list as its own entry).
  const next = nextOccurrence(b.sendAt, b.schedule?.repeat, b.schedule?.tz, b.schedule?.repeatUntil);
  if (next) {
    const { id, createdAt, updatedAt, stats: _s, sentAt, lockedAt, error, ...rest } = b;
    await db.broadcasts.create({ ...rest, status: 'scheduled', sendAt: next, seriesId: b.seriesId || b.id, occurrence: (b.occurrence || 1) + 1, stats: {} });
  }
  return stats;
}

/** Send every broadcast that is due, until `budgetMs` runs out. → number sent */
export async function runDueBroadcasts(db, { budgetMs = 45e3 } = {}) {
  const start = Date.now();
  let n = 0;
  while (Date.now() - start < budgetMs) {
    const now = new Date();
    const b = await db.broadcasts.claimDue(now.toISOString(), new Date(now.getTime() - STALE_MS).toISOString());
    if (!b) break;
    try { await sendBroadcast(db, b); n++; } catch (err) {
      console.error('[otrelink] broadcast failed', b.id, err);
      await db.broadcasts.update(b.id, { status: 'failed', error: 'internal_error', lockedAt: null });
    }
  }
  return n;
}

/** A page that accepts push sign-ups right now (published, owner's plan, turned on, keys set), or null. */
export async function publicNotifyPage(db, pageId) {
  const page = await db.pages.findById(String(pageId || ''));
  if (!page?.settings?.published || !sanitizeNotifyConfig(page.notify).enabled || !webPushClient()) return null;
  const plan = await ownerPlan(db, page);
  return plan && allowsSection(plan, 'notify') ? page : null;
}

/** A browser PushSubscription from a request, cleaned, or null. */
export function readSubscription(s) {
  const endpoint = String(s?.endpoint || '');
  const keys = s?.keys || {};
  if (!/^https:\/\/[^\s]+$/.test(endpoint) || endpoint.length > 1000 || !keys.p256dh || !keys.auth) return null;
  return { endpoint, keys: { p256dh: String(keys.p256dh).slice(0, 200), auth: String(keys.auth).slice(0, 100) } };
}
