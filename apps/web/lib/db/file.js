// JSON file driver — zero setup, for local development and small installs.
// Data lives in apps/web/data/db.json, uploads in apps/web/data/assets/.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DIR, 'db.json');
const ASSETS = path.join(DIR, 'assets');

export async function createFileDriver() {
  await fs.mkdir(ASSETS, { recursive: true });
  let state = { users: [], pages: [], events: [], assets: [], bookings: [], push: [], responses: [], reviews: [], orders: [], cards: [], invoices: [], payments: [], tokens: [], referrals: [], referralCampaigns: [], consents: [], subscribers: [], broadcasts: [], reports: [] };
  try { state = { ...state, ...JSON.parse(await fs.readFile(FILE, 'utf8')) }; } catch { /* first run */ }

  let writing = Promise.resolve();
  const persist = () => {
    writing = writing.then(() => fs.writeFile(FILE + '.tmp', JSON.stringify(state)).then(() => fs.rename(FILE + '.tmp', FILE)));
    return writing;
  };
  const clone = (v) => (v ? structuredClone(v) : null);
  const now = () => new Date().toISOString();
  // Push subscriber wants everything (no topics), or the broadcast is for everyone, or they share a topic.
  const topicMatch = (s, topics) => !topics.length || !s.topics?.length || s.topics.some((t) => topics.includes(t));

  return {
    name: 'file',
    users: {
      findByEmail: async (email) => clone(state.users.find((u) => u.email === email)),
      findById: async (id) => clone(state.users.find((u) => u.id === id)),
      findByCalendarToken: async (token) => clone(state.users.find((u) => token && u.calendarToken === token)),
      update: async (id, patch) => {
        const u = state.users.find((x) => x.id === id);
        if (!u) return null;
        Object.assign(u, patch);
        await persist();
        return clone(u);
      },
      create: async (user) => {
        const doc = { id: crypto.randomUUID(), createdAt: now(), ...user };
        state.users.push(doc);
        await persist();
        return clone(doc);
      },
      findBySubscription: async (id) => clone(state.users.find((u) => id && u.billing?.subscriptionId === id)),
      findByReferralCode: async (code) => clone(state.users.find((u) => code && u.referralCode === code)),
      // Username reserved by an account that hasn't confirmed its email (until its link expires).
      findByPendingSlug: async (slug) => clone(state.users.find((u) => slug && u.pendingSlug === slug && u.verifyExpires > now())),
      findByVerifyToken: async (hash) => clone(state.users.find((u) => hash && u.verifyTokenHash === hash)),
      findByEmailChangeToken: async (hash) => clone(state.users.find((u) => hash && u.emailChangeTokenHash === hash)),
      // Cancelled subscriptions whose paid period is over (still on Pro).
      // Free accounts given Pro by a referral, whose free time is over.
      listProTrialEnded: async (nowIso) => clone(state.users.filter((u) => u.plan === 'pro' && u.proTrial?.until && u.proTrial.until <= nowIso)),
      listBillingEnded: async (nowIso) => clone(state.users.filter((u) => u.plan === 'pro' && u.billing?.status === 'canceled'
        && !u.billing.downgraded && u.billing.endsAt && u.billing.endsAt <= nowIso)),
      // Admin: search + filters. plan 'pro' includes accounts from before plans (no plan field).
      list: async ({ q = '', plan = '', status = '', skip = 0, limit = 50 } = {}) => {
        const s = q.trim().toLowerCase();
        const rows = state.users
          .filter((u) => (!s || u.email.includes(s) || (u.name || '').toLowerCase().includes(s))
            && (!plan || (u.plan || 'pro') === plan)
            && (!status || (status === 'banned' ? u.banned : status === 'paying' ? ['active', 'past_due'].includes(u.billing?.status) : !u.banned)))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return { users: clone(rows.slice(skip, skip + limit)), total: rows.length };
      },
      stats: async (sinceIso) => {
        const byPlan = { free: 0, pro: 0, business: 0 };
        let banned = 0; let paying = 0; const byProvider = { stripe: 0, paypal: 0 }; const signups = {};
        for (const u of state.users) {
          byPlan[u.plan || 'pro'] = (byPlan[u.plan || 'pro'] || 0) + 1;
          if (u.banned) banned++;
          if (['active', 'past_due'].includes(u.billing?.status)) { paying++; byProvider[u.billing.provider] = (byProvider[u.billing.provider] || 0) + 1; }
          if (u.createdAt >= sinceIso) { const d = u.createdAt.slice(0, 10); signups[d] = (signups[d] || 0) + 1; }
        }
        return { total: state.users.length, byPlan, banned, paying, byProvider, signups, pages: state.pages.length };
      },
      // Delete an account and everything it owns.
      remove: async (id) => {
        const pageIds = new Set(state.pages.filter((p) => p.userId === id).map((p) => p.id));
        const assetIds = state.assets.filter((a) => a.userId === id).map((a) => a.id);
        for (const a of assetIds) await fs.rm(path.join(ASSETS, a), { force: true });
        state.users = state.users.filter((u) => u.id !== id);
        state.pages = state.pages.filter((p) => p.userId !== id);
        state.assets = state.assets.filter((a) => a.userId !== id);
        state.push = state.push.filter((p) => p.userId !== id);
        state.payments = state.payments.filter((p) => p.userId !== id);
        state.tokens = state.tokens.filter((t) => t.userId !== id);
        state.referrals = state.referrals.filter((r) => r.referrerId !== id && r.refereeId !== id);
        for (const k of ['events', 'bookings', 'responses', 'reviews', 'orders', 'cards', 'invoices', 'subscribers', 'broadcasts']) state[k] = state[k].filter((x) => !pageIds.has(x.pageId));
        await persist();
      },
    },
    pages: {
      listByUser: async (userId) => clone(state.pages.filter((p) => p.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
      countByUser: async (userId) => state.pages.filter((p) => p.userId === userId).length,
      findById: async (id) => clone(state.pages.find((p) => p.id === id)),
      findBySlug: async (slug) => clone(state.pages.find((p) => p.slug === slug)),
      listForExplore: async () => clone(state.pages.filter((p) => p.settings?.published && p.settings?.explore && !p.settings?.sensitive)
        .map((p) => ({ id: p.id, slug: p.slug, userId: p.userId, profile: { title: p.profile?.title || '', avatar: p.profile?.avatar || '' } }))),
      create: async (page) => {
        if (state.pages.some((p) => p.slug === page.slug)) throw Object.assign(new Error('slug_taken'), { code: 'slug_taken' });
        const doc = { id: crypto.randomUUID(), createdAt: now(), updatedAt: now(), ...page };
        state.pages.push(doc);
        await persist();
        return clone(doc);
      },
      update: async (id, patch) => {
        const i = state.pages.findIndex((p) => p.id === id);
        if (i < 0) return null;
        if (patch.slug && state.pages.some((p) => p.slug === patch.slug && p.id !== id)) {
          throw Object.assign(new Error('slug_taken'), { code: 'slug_taken' });
        }
        state.pages[i] = { ...state.pages[i], ...patch, updatedAt: now() };
        await persist();
        return clone(state.pages[i]);
      },
      remove: async (id) => {
        state.pages = state.pages.filter((p) => p.id !== id);
        await persist();
      },
    },
    events: {
      insert: async (ev) => {
        state.events.push({ ...ev, ts: now() });
        // Keep the file small: drop events older than 180 days.
        if (state.events.length % 500 === 0) {
          const cutoff = new Date(Date.now() - 180 * 864e5).toISOString();
          state.events = state.events.filter((e) => e.ts >= cutoff);
        }
        await persist();
      },
      viewCounts: async (pageIds, since) => {
        const ids = new Set(pageIds); const s = since.toISOString(); const counts = {};
        for (const e of state.events) if (e.type === 'view' && ids.has(e.pageId) && e.ts >= s) counts[e.pageId] = (counts[e.pageId] || 0) + 1;
        return counts;
      },
      listForPage: async (pageId, since) => {
        const s = since.toISOString();
        return state.events.filter((e) => e.pageId === pageId && e.ts >= s);
      },
      removeForPage: async (pageId) => {
        state.events = state.events.filter((e) => e.pageId !== pageId);
        await persist();
      },
    },
    bookings: {
      create: async (b) => {
        if (b.slotKey && state.bookings.some((x) => x.slotKey === b.slotKey)) throw Object.assign(new Error('slot_taken'), { code: 'slot_taken' });
        const doc = { id: crypto.randomUUID(), createdAt: now(), remindersSent: [], ...b };
        state.bookings.push(doc);
        await persist();
        return clone(doc);
      },
      findById: async (id) => clone(state.bookings.find((b) => b.id === id)),
      list: async ({ pageId, blockId, userId, from, to, statuses, desc = false, limit = 500 } = {}) => clone(state.bookings
        .filter((b) => (!pageId || b.pageId === pageId) && (!blockId || b.blockId === blockId) && (!userId || b.userId === userId)
          && (!from || b.start >= from) && (!to || b.start < to) && (!statuses || statuses.includes(b.status)))
        .sort((a, b) => (desc ? b.start.localeCompare(a.start) : a.start.localeCompare(b.start)))
        .slice(0, limit)),
      update: async (id, patch) => {
        const i = state.bookings.findIndex((b) => b.id === id);
        if (i < 0) return null;
        const next = { ...state.bookings[i], ...patch, updatedAt: now() };
        if (next.slotKey === null) delete next.slotKey;
        if (next.slotKey && state.bookings.some((x) => x.id !== id && x.slotKey === next.slotKey)) throw Object.assign(new Error('slot_taken'), { code: 'slot_taken' });
        state.bookings[i] = next;
        await persist();
        return clone(next);
      },
    },
    // Rate-limit counters (memory only: the file driver is for one local server).
    limits: (() => {
      const m = new Map();
      const sweep = () => { const t = Date.now(); for (const [k, v] of m) if (v.exp <= t) m.delete(k); };
      return {
        hit: async (id, expiresAt) => {
          if (m.size > 5000) sweep();
          const e = m.get(id);
          if (!e || e.exp <= Date.now()) { m.set(id, { n: 1, exp: expiresAt.getTime() }); return 1; }
          return ++e.n;
        },
        get: async (id) => { const e = m.get(id); return e && e.exp > Date.now() ? e.n : 0; },
      };
    })(),
    // Survey responses (newest first in lists).
    responses: {
      create: async (r) => {
        const doc = { id: crypto.randomUUID(), createdAt: now(), ...r };
        state.responses.push(doc);
        await persist();
        return clone(doc);
      },
      findById: async (id) => clone(state.responses.find((r) => r.id === id)),
      list: async ({ pageId, blockId, limit = 500 } = {}) => clone(state.responses
        .filter((r) => r.pageId === pageId && (!blockId || r.blockId === blockId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)),
      count: async ({ pageId, blockId }) => state.responses.filter((r) => r.pageId === pageId && (!blockId || r.blockId === blockId)).length,
      remove: async (id) => {
        state.responses = state.responses.filter((r) => r.id !== id);
        await persist();
      },
      removeMany: async ({ pageId, blockId }) => {
        state.responses = state.responses.filter((r) => !(r.pageId === pageId && (!blockId || r.blockId === blockId)));
        await persist();
      },
    },
    // Reviews (newest first in lists).
    reviews: {
      create: async (r) => {
        const doc = { id: crypto.randomUUID(), createdAt: now(), reply: '', ...r };
        state.reviews.push(doc);
        await persist();
        return clone(doc);
      },
      findById: async (id) => clone(state.reviews.find((r) => r.id === id)),
      list: async ({ pageId, blockId, statuses, before, limit = 50 } = {}) => clone(state.reviews
        .filter((r) => r.pageId === pageId && (!blockId || r.blockId === blockId) && (!statuses || statuses.includes(r.status)) && (!before || r.createdAt < before))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)),
      count: async ({ pageId, blockId, status }) => state.reviews.filter((r) => r.pageId === pageId && (!blockId || r.blockId === blockId) && (!status || r.status === status)).length,
      stats: async ({ pageId, blockId }) => {
        const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const r of state.reviews) if (r.pageId === pageId && r.blockId === blockId && r.status === 'published') dist[r.rating]++;
        return dist;
      },
      update: async (id, patch) => {
        const i = state.reviews.findIndex((r) => r.id === id);
        if (i < 0) return null;
        state.reviews[i] = { ...state.reviews[i], ...patch, updatedAt: now() };
        await persist();
        return clone(state.reviews[i]);
      },
      remove: async (id) => {
        state.reviews = state.reviews.filter((r) => r.id !== id);
        await persist();
      },
      removeMany: async ({ pageId }) => {
        state.reviews = state.reviews.filter((r) => r.pageId !== pageId);
        await persist();
      },
    },
    // Pickup orders (newest first in lists).
    orders: {
      create: async (o) => {
        const doc = { id: crypto.randomUUID(), createdAt: now(), ...o };
        state.orders.push(doc);
        // Keep the file small: drop orders older than 180 days.
        if (state.orders.length % 200 === 0) {
          const cutoff = new Date(Date.now() - 180 * 864e5).toISOString();
          state.orders = state.orders.filter((x) => x.createdAt >= cutoff);
        }
        await persist();
        return clone(doc);
      },
      findById: async (id) => clone(state.orders.find((o) => o.id === id)),
      list: async ({ pageId, userId, statuses, since, limit = 100 } = {}) => clone(state.orders
        .filter((o) => (!pageId || o.pageId === pageId) && (!userId || o.userId === userId) && (!statuses || statuses.includes(o.status)) && (!since || o.createdAt >= since))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)),
      count: async ({ pageId, statuses, since }) => state.orders.filter((o) => o.pageId === pageId && (!statuses || statuses.includes(o.status)) && (!since || o.createdAt >= since)).length,
      update: async (id, patch) => {
        const i = state.orders.findIndex((o) => o.id === id);
        if (i < 0) return null;
        state.orders[i] = { ...state.orders[i], ...patch, updatedAt: now() };
        await persist();
        return clone(state.orders[i]);
      },
      removeMany: async ({ pageId }) => {
        state.orders = state.orders.filter((o) => o.pageId !== pageId);
        await persist();
      },
    },
    // Invoices made by page owners (newest number first in lists).
    invoices: {
      create: async (inv) => {
        if (state.invoices.some((x) => x.pageId === inv.pageId && x.number === inv.number)) throw Object.assign(new Error('number_taken'), { code: 'number_taken' });
        const doc = { id: crypto.randomUUID(), createdAt: now(), updatedAt: now(), ...inv };
        state.invoices.push(doc);
        await persist();
        return clone(doc);
      },
      findById: async (id) => clone(state.invoices.find((x) => x.id === id)),
      list: async ({ pageId, status, limit = 300 } = {}) => clone(state.invoices
        .filter((x) => x.pageId === pageId && (!status || x.status === status))
        .sort((a, b) => b.number - a.number)
        .slice(0, limit)),
      maxNumber: async (pageId) => state.invoices.filter((x) => x.pageId === pageId).reduce((m, x) => Math.max(m, x.number || 0), 0),
      update: async (id, patch) => {
        const i = state.invoices.findIndex((x) => x.id === id);
        if (i < 0) return null;
        state.invoices[i] = { ...state.invoices[i], ...patch, updatedAt: now() };
        await persist();
        return clone(state.invoices[i]);
      },
      remove: async (id) => {
        state.invoices = state.invoices.filter((x) => x.id !== id);
        await persist();
      },
      removeMany: async ({ pageId }) => {
        state.invoices = state.invoices.filter((x) => x.pageId !== pageId);
        await persist();
      },
    },
    // Acceptance of the Terms and Privacy Policy (proof of consent: kept when an account is deleted).
    subscribers: {
      upsert: async ({ pageId, endpoint, ...fields }) => {
        let s = state.subscribers.find((x) => x.pageId === pageId && x.endpoint === endpoint);
        if (s) Object.assign(s, fields, { updatedAt: now() });
        else { s = { id: crypto.randomUUID(), pageId, endpoint, createdAt: now(), updatedAt: now(), ...fields }; state.subscribers.push(s); }
        await persist();
        return clone(s);
      },
      findById: async (id) => clone(state.subscribers.find((x) => x.id === String(id))),
      findByEndpoint: async (pageId, endpoint) => clone(state.subscribers.find((x) => x.pageId === pageId && x.endpoint === endpoint)),
      update: async (id, patch) => {
        const s = state.subscribers.find((x) => x.id === id);
        if (!s) return null;
        Object.assign(s, patch, { updatedAt: now() });
        await persist();
        return clone(s);
      },
      remove: async (id) => { state.subscribers = state.subscribers.filter((x) => x.id !== id); await persist(); },
      removeByEndpoint: async (endpoint) => { state.subscribers = state.subscribers.filter((x) => x.endpoint !== endpoint); await persist(); },
      removeMany: async ({ pageId }) => { state.subscribers = state.subscribers.filter((x) => x.pageId !== pageId); await persist(); },
      count: async ({ pageId, topics = [] }) => state.subscribers.filter((x) => x.pageId === pageId && topicMatch(x, topics)).length,
      summary: async (pageId) => clone(state.subscribers.filter((x) => x.pageId === pageId).map(({ id, topics, source, lang, createdAt }) => ({ id, topics, source, lang, createdAt }))),
      batch: async ({ pageId, topics = [], after = '', limit = 500 }) => clone(state.subscribers
        .filter((x) => x.pageId === pageId && (!after || x.id > after) && topicMatch(x, topics))
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, limit)
        .map(({ id, endpoint, keys, lang }) => ({ id, endpoint, keys, lang }))),
    },
    broadcasts: {
      create: async (b) => {
        const doc = { id: crypto.randomUUID(), createdAt: now(), updatedAt: now(), ...b };
        state.broadcasts.push(doc);
        await persist();
        return clone(doc);
      },
      findById: async (id) => clone(state.broadcasts.find((x) => x.id === String(id))),
      list: async ({ pageId, limit = 50 }) => clone(state.broadcasts.filter((x) => x.pageId === pageId)
        .sort((a, b) => (b.sendAt || '').localeCompare(a.sendAt || '') || b.createdAt.localeCompare(a.createdAt)).slice(0, limit)),
      update: async (id, patch) => {
        const b = state.broadcasts.find((x) => x.id === id);
        if (!b) return null;
        Object.assign(b, patch, { updatedAt: now() });
        await persist();
        return clone(b);
      },
      remove: async (id) => { state.broadcasts = state.broadcasts.filter((x) => x.id !== id); await persist(); },
      removeMany: async ({ pageId }) => { state.broadcasts = state.broadcasts.filter((x) => x.pageId !== pageId); await persist(); },
      countBetween: async ({ pageId, from, to, exceptId = '' }) => state.broadcasts
        .filter((x) => x.pageId === pageId && x.status !== 'canceled' && x.id !== exceptId && x.sendAt >= from && x.sendAt < to).length,
      claimDue: async (nowIso, staleIso) => {
        const b = state.broadcasts
          .filter((x) => (x.status === 'scheduled' && x.sendAt <= nowIso) || (x.status === 'sending' && (x.lockedAt || '') < staleIso))
          .sort((x, y) => x.sendAt.localeCompare(y.sendAt))[0];
        if (!b) return null;
        Object.assign(b, { status: 'sending', lockedAt: nowIso });
        await persist();
        return clone(b);
      },
      incClicks: async (id) => {
        const b = state.broadcasts.find((x) => x.id === String(id));
        if (b) { b.stats = { ...(b.stats || {}), clicks: (b.stats?.clicks || 0) + 1 }; await persist(); }
      },
    },
    // Visitors' reports about a page (footer → Report).
    reports: {
      create: async (r) => {
        state.reports ||= [];
        const doc = { id: crypto.randomUUID(), createdAt: now(), status: 'open', ...r };
        state.reports.push(doc);
        await persist();
        return clone(doc);
      },
      list: async ({ status = '', pageId = '', limit = 200 } = {}) => clone((state.reports || []).filter((r) => (!status || r.status === status) && (!pageId || r.pageId === pageId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)),
      findById: async (id) => clone((state.reports || []).find((r) => r.id === id)),
      update: async (id, patch) => {
        const r = (state.reports || []).find((x) => x.id === id);
        if (!r) return null;
        Object.assign(r, patch, { updatedAt: now() });
        await persist();
        return clone(r);
      },
      updateMany: async ({ pageId, status }, patch) => {
        const list = (state.reports || []).filter((r) => r.pageId === pageId && r.status === status);
        for (const r of list) Object.assign(r, patch, { updatedAt: now() });
        await persist();
        return list.length;
      },
      counts: async () => (state.reports || []).reduce((c, r) => ({ ...c, [r.status]: (c[r.status] || 0) + 1 }), {}),
    },
    consents: {
      record: async (c) => {
        const doc = { id: crypto.randomUUID(), createdAt: now(), ...c };
        state.consents.push(doc);
        await persist();
        return clone(doc);
      },
      listByUser: async (userId) => clone(state.consents.filter((x) => x.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    },
    // Subscription payments to Otrelink (Stripe / PayPal), shown as invoices to the user.
    payments: {
      // Same provider payment id twice (webhook retries) → the first one is kept.
      record: async (p) => {
        const found = state.payments.find((x) => x.provider === p.provider && x.providerId === p.providerId);
        if (found) return clone(found);
        const number = state.payments.reduce((m, x) => Math.max(m, x.number || 0), 0) + 1;
        const doc = { id: crypto.randomUUID(), createdAt: now(), number, ...p };
        state.payments.push(doc);
        await persist();
        return clone(doc);
      },
      findById: async (id) => clone(state.payments.find((x) => x.id === id)),
      update: async (id, patch) => {
        const p = state.payments.find((x) => x.id === id);
        if (!p) return null;
        Object.assign(p, patch);
        await persist();
        return clone(p);
      },
      listByUser: async (userId) => clone(state.payments.filter((x) => x.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    },
    // Referral program: who invited whom, and the campaigns that give free months.
    referrals: {
      create: async (r) => {
        // One referral per new account.
        const found = state.referrals.find((x) => x.refereeId === r.refereeId);
        if (found) return clone(found);
        const doc = { id: crypto.randomUUID(), createdAt: now(), status: 'pending', months: 0, appliedMonths: 0, ...r };
        state.referrals.push(doc);
        await persist();
        return clone(doc);
      },
      findByReferee: async (refereeId) => clone(state.referrals.find((r) => r.refereeId === refereeId)),
      listByReferrer: async (referrerId) => clone(state.referrals.filter((r) => r.referrerId === referrerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
      countRewarded: async ({ referrerId, campaignId }) => state.referrals.filter((r) => r.referrerId === referrerId && r.campaignId === campaignId && r.status === 'rewarded').length,
      update: async (id, patch) => {
        const r = state.referrals.find((x) => x.id === id);
        if (!r) return null;
        Object.assign(r, patch, { updatedAt: now() });
        await persist();
        return clone(r);
      },
      list: async ({ status = '', limit = 200 } = {}) => clone(state.referrals.filter((r) => !status || r.status === status)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)),
    },
    referralCampaigns: {
      list: async () => clone([...state.referralCampaigns].sort((a, b) => b.startsAt.localeCompare(a.startsAt))),
      findById: async (id) => clone(state.referralCampaigns.find((c) => c.id === id)),
      create: async (c) => {
        const doc = { id: crypto.randomUUID(), createdAt: now(), ...c };
        state.referralCampaigns.push(doc);
        await persist();
        return clone(doc);
      },
      update: async (id, patch) => {
        const c = state.referralCampaigns.find((x) => x.id === id);
        if (!c) return null;
        Object.assign(c, patch, { updatedAt: now() });
        await persist();
        return clone(c);
      },
      remove: async (id) => {
        const before = state.referralCampaigns.length;
        state.referralCampaigns = state.referralCampaigns.filter((c) => c.id !== id);
        await persist();
        return state.referralCampaigns.length < before;
      },
    },
    // Personal API tokens (only the hash is stored).
    tokens: {
      create: async (t) => {
        const doc = { id: crypto.randomUUID(), createdAt: now(), lastUsedAt: null, ...t };
        state.tokens.push(doc);
        await persist();
        return clone(doc);
      },
      findByHash: async (hash) => clone(state.tokens.find((t) => hash && t.hash === hash)),
      listByUser: async (userId) => clone(state.tokens.filter((t) => t.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
      countByUser: async (userId) => state.tokens.filter((t) => t.userId === userId).length,
      touch: async (id) => {
        const t = state.tokens.find((x) => x.id === id);
        if (!t) return;
        t.lastUsedAt = now();
        await persist();
      },
      remove: async (id, userId) => {
        const before = state.tokens.length;
        state.tokens = state.tokens.filter((t) => !(t.id === id && t.userId === userId));
        if (state.tokens.length === before) return false;
        await persist();
        return true;
      },
    },
    // Loyalty cards.
    cards: {
      create: async (c) => {
        if (state.cards.some((x) => x.pageId === c.pageId && x.code === c.code)) throw Object.assign(new Error('code_taken'), { code: 'code_taken' });
        const doc = { id: crypto.randomUUID(), createdAt: now(), updatedAt: now(), ...c };
        state.cards.push(doc);
        await persist();
        return clone(doc);
      },
      findById: async (id) => clone(state.cards.find((c) => c.id === id)),
      findByCode: async (pageId, code) => clone(state.cards.find((c) => c.pageId === pageId && c.code === code)),
      list: async ({ pageId, blockId, q = '', limit = 50 } = {}) => {
        const s = q.trim().toLowerCase();
        const code = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
        return clone(state.cards
          .filter((c) => c.pageId === pageId && (!blockId || c.blockId === blockId) && (!s || (c.name || '').toLowerCase().includes(s) || c.code.includes(code)))
          .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt))
          .slice(0, limit));
      },
      count: async ({ pageId, blockId }) => state.cards.filter((c) => c.pageId === pageId && (!blockId || c.blockId === blockId)).length,
      update: async (id, patch) => {
        const i = state.cards.findIndex((c) => c.id === id);
        if (i < 0) return null;
        state.cards[i] = { ...state.cards[i], ...patch, updatedAt: now() };
        await persist();
        return clone(state.cards[i]);
      },
      removeMany: async ({ pageId }) => {
        state.cards = state.cards.filter((c) => c.pageId !== pageId);
        await persist();
      },
    },
    push: {
      save: async (userId, sub) => {
        state.push = state.push.filter((p) => p.endpoint !== sub.endpoint);
        state.push.push({ userId, endpoint: sub.endpoint, keys: sub.keys, createdAt: now() });
        await persist();
      },
      listByUser: async (userId) => clone(state.push.filter((p) => p.userId === userId)),
      remove: async (endpoint) => {
        state.push = state.push.filter((p) => p.endpoint !== endpoint);
        await persist();
      },
    },
    assets: {
      // storage: 'r2' = the bytes live in Cloudflare R2 (lib/db/with-r2.js), only the details here.
      create: async ({ id = crypto.randomUUID().replace(/-/g, ''), userId, mime, data, name = '', size, storage = 'db' }) => {
        if (storage === 'db') await fs.writeFile(path.join(ASSETS, id), data);
        state.assets.push({ id, userId, mime, name, size: size ?? data.length, storage, createdAt: now() });
        await persist();
        return { id };
      },
      findById: async (id) => {
        const meta = state.assets.find((a) => a.id === id);
        if (!meta) return null;
        if (meta.storage === 'r2') return clone(meta);
        const data = await fs.readFile(path.join(ASSETS, id)).catch(() => null);
        return data ? { ...meta, data } : null;
      },
      listByUser: async (userId) => state.assets.filter((a) => a.userId === userId).map((a) => ({ id: a.id, storage: a.storage || 'db' })),
      remove: async (id) => {
        state.assets = state.assets.filter((a) => a.id !== id);
        await fs.rm(path.join(ASSETS, id), { force: true });
        await persist();
      },
    },
  };
}
