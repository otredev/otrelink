// MongoDB driver (official driver, no ODM). Documents use string UUIDs as _id
// and are returned with `id` instead of `_id`.
import crypto from 'node:crypto';
import { MongoClient, Binary } from 'mongodb';
import { config } from '../config.js';

const out = (doc) => {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
};

export async function createMongoDriver() {
  if (!config.mongoUri) throw new Error('MONGODB_URI is not set');
  const client = new MongoClient(config.mongoUri, { maxPoolSize: 10 });
  await client.connect();
  const db = client.db(config.mongoDb);
  const users = db.collection('users');
  const pages = db.collection('pages');
  const events = db.collection('events');
  const assets = db.collection('assets');
  const bookings = db.collection('bookings');
  const pushSubs = db.collection('push_subscriptions');
  const responses = db.collection('survey_responses');
  const reviews = db.collection('reviews');
  const orders = db.collection('orders');
  const cards = db.collection('loyalty_cards');
  const invoices = db.collection('invoices');
  const payments = db.collection('payments');
  const consents = db.collection('consents');
  const reports = db.collection('page_reports');
  const counters = db.collection('counters');
  const limits = db.collection('rate_limits');
  const tokens = db.collection('api_tokens');
  const referrals = db.collection('referrals');
  const campaigns = db.collection('referral_campaigns');
  const subscribers = db.collection('notify_subscribers');
  const broadcasts = db.collection('notify_broadcasts');

  console.log(`[otrelink] MongoDB connected (database "${config.mongoDb}")`);

  // Index problems (e.g. old data in the same database) must not take the app down.
  const indexes = [
    [users, { email: 1 }, { unique: true }],
    [pages, { slug: 1 }, { unique: true }],
    [pages, { userId: 1 }, {}],
    [events, { pageId: 1, ts: -1 }, {}],
    // Analytics events expire after 180 days.
    [events, { ts: 1 }, { expireAfterSeconds: 180 * 86400 }],
    [assets, { userId: 1 }, {}],
    // One active booking per block and start time (slotKey is removed on cancel).
    [bookings, { slotKey: 1 }, { unique: true, sparse: true }],
    [bookings, { pageId: 1, start: 1 }, {}],
    [bookings, { start: 1 }, {}],
    [pushSubs, { endpoint: 1 }, { unique: true }],
    [pushSubs, { userId: 1 }, {}],
    [users, { calendarToken: 1 }, { sparse: true }],
    [users, { 'billing.subscriptionId': 1 }, { sparse: true }],
    [users, { createdAt: -1 }, {}],
    [responses, { pageId: 1, blockId: 1, createdAt: -1 }, {}],
    [reviews, { pageId: 1, blockId: 1, status: 1, createdAt: -1 }, {}],
    [orders, { pageId: 1, status: 1, createdAt: -1 }, {}],
    // Orders are kept 180 days (createdAtDate is a Date copy of createdAt for the TTL).
    [orders, { createdAtDate: 1 }, { expireAfterSeconds: 180 * 86400 }],
    [cards, { pageId: 1, code: 1 }, { unique: true }],
    [cards, { pageId: 1, updatedAt: -1 }, {}],
    [invoices, { pageId: 1, number: 1 }, { unique: true }],
    [payments, { provider: 1, providerId: 1 }, { unique: true }],
    [payments, { userId: 1, createdAt: -1 }, {}],
    [consents, { userId: 1, createdAt: -1 }, {}],
    // Push notifications to visitors: one subscription per page and browser.
    [subscribers, { pageId: 1, endpoint: 1 }, { unique: true }],
    [subscribers, { endpoint: 1 }, {}],
    [broadcasts, { pageId: 1, createdAt: -1 }, {}],
    [broadcasts, { status: 1, sendAt: 1 }, {}],
    // Rate-limit counters delete themselves when their window ends.
    [limits, { expiresAt: 1 }, { expireAfterSeconds: 0 }],
    [users, { verifyTokenHash: 1 }, { sparse: true }],
    [users, { pendingSlug: 1 }, { sparse: true }],
    [tokens, { hash: 1 }, { unique: true }],
    [users, { referralCode: 1 }, { unique: true, sparse: true }],
    [users, { 'proTrial.until': 1 }, { sparse: true }],
    [referrals, { refereeId: 1 }, { unique: true }],
    [referrals, { referrerId: 1, createdAt: -1 }, {}],
    [referrals, { createdAt: -1 }, {}],
    [tokens, { userId: 1, createdAt: -1 }, {}],
  ];
  const results = await Promise.allSettled(indexes.map(([col, keys, opts]) => col.createIndex(keys, opts)));
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`[otrelink] Could not create index ${JSON.stringify(indexes[i][1])} on "${indexes[i][0].collectionName}":`, r.reason?.message);
    }
  });

  const dupe = (err) => {
    if (err?.code === 11000) throw Object.assign(new Error('slug_taken'), { code: 'slug_taken' });
    throw err;
  };

  return {
    name: 'mongo',
    users: {
      findByEmail: async (email) => out(await users.findOne({ email })),
      findById: async (id) => out(await users.findOne({ _id: id })),
      findByCalendarToken: async (token) => (token ? out(await users.findOne({ calendarToken: token })) : null),
      update: async (id, patch) => out(await users.findOneAndUpdate({ _id: id }, { $set: patch }, { returnDocument: 'after' })),
      create: async (user) => {
        const doc = { _id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...user };
        await users.insertOne(doc);
        return out(doc);
      },
      findBySubscription: async (id) => (id ? out(await users.findOne({ 'billing.subscriptionId': id })) : null),
      findByReferralCode: async (code) => (code ? out(await users.findOne({ referralCode: code })) : null),
      // Username reserved by an account that hasn't confirmed its email (until its link expires).
      findByPendingSlug: async (slug) => (slug ? out(await users.findOne({ pendingSlug: slug, verifyExpires: { $gt: new Date().toISOString() } })) : null),
      findByVerifyToken: async (hash) => (hash ? out(await users.findOne({ verifyTokenHash: hash })) : null),
      findByEmailChangeToken: async (hash) => (hash ? out(await users.findOne({ emailChangeTokenHash: hash })) : null),
      // Cancelled subscriptions whose paid period is over (still on Pro).
      listProTrialEnded: async (nowIso) => (await users.find({ plan: 'pro', 'proTrial.until': { $lte: nowIso } }).limit(500).toArray()).map(out),
      listBillingEnded: async (nowIso) => (await users.find({
        plan: 'pro', 'billing.status': 'canceled', 'billing.downgraded': { $ne: true }, 'billing.endsAt': { $lte: nowIso },
      }).limit(500).toArray()).map(out),
      // Admin: search + filters. plan 'pro' includes accounts from before plans (no plan field).
      list: async ({ q = '', plan = '', status = '', skip = 0, limit = 50 } = {}) => {
        const and = [];
        const s = q.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (s) and.push({ $or: [{ email: { $regex: s } }, { name: { $regex: s, $options: 'i' } }] });
        if (plan === 'pro') and.push({ $or: [{ plan: 'pro' }, { plan: { $exists: false } }] });
        else if (plan) and.push({ plan });
        if (status === 'banned') and.push({ banned: true });
        else if (status === 'paying') and.push({ 'billing.status': { $in: ['active', 'past_due'] } });
        else if (status === 'active') and.push({ banned: { $ne: true } });
        const q2 = and.length ? { $and: and } : {};
        const [rows, total] = await Promise.all([
          users.find(q2, { projection: { passwordHash: 0 } }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
          users.countDocuments(q2),
        ]);
        return { users: rows.map(out), total };
      },
      stats: async (sinceIso) => {
        const [facet] = await users.aggregate([{ $facet: {
          plans: [{ $group: { _id: { $ifNull: ['$plan', 'pro'] }, n: { $sum: 1 } } }],
          banned: [{ $match: { banned: true } }, { $count: 'n' }],
          paying: [{ $match: { 'billing.status': { $in: ['active', 'past_due'] } } }, { $group: { _id: '$billing.provider', n: { $sum: 1 } } }],
          signups: [{ $match: { createdAt: { $gte: sinceIso } } }, { $group: { _id: { $substr: ['$createdAt', 0, 10] }, n: { $sum: 1 } } }],
          total: [{ $count: 'n' }],
        } }]).toArray();
        const byPlan = { free: 0, pro: 0, business: 0 };
        for (const r of facet.plans) byPlan[r._id] = r.n;
        const byProvider = { stripe: 0, paypal: 0 };
        for (const r of facet.paying) byProvider[r._id] = r.n;
        return {
          total: facet.total[0]?.n || 0, byPlan, banned: facet.banned[0]?.n || 0,
          paying: facet.paying.reduce((s, r) => s + r.n, 0), byProvider,
          signups: Object.fromEntries(facet.signups.map((r) => [r._id, r.n])),
          pages: await pages.estimatedDocumentCount(),
        };
      },
      // Delete an account and everything it owns.
      remove: async (id) => {
        const pageIds = (await pages.find({ userId: id }, { projection: { _id: 1 } }).toArray()).map((p) => p._id);
        await Promise.all([
          pages.deleteMany({ userId: id }), assets.deleteMany({ userId: id }), pushSubs.deleteMany({ userId: id }),
          events.deleteMany({ pageId: { $in: pageIds } }), bookings.deleteMany({ pageId: { $in: pageIds } }),
          responses.deleteMany({ pageId: { $in: pageIds } }), reviews.deleteMany({ pageId: { $in: pageIds } }),
          orders.deleteMany({ pageId: { $in: pageIds } }), cards.deleteMany({ pageId: { $in: pageIds } }),
          invoices.deleteMany({ pageId: { $in: pageIds } }), payments.deleteMany({ userId: id }),
          subscribers.deleteMany({ pageId: { $in: pageIds } }), broadcasts.deleteMany({ pageId: { $in: pageIds } }),
          tokens.deleteMany({ userId: id }),
          referrals.deleteMany({ $or: [{ referrerId: id }, { refereeId: id }] }),
        ]);
        await users.deleteOne({ _id: id });
      },
    },
    pages: {
      listByUser: async (userId) => (await pages.find({ userId }).sort({ updatedAt: -1 }).toArray()).map(out),
      countByUser: async (userId) => pages.countDocuments({ userId }),
      findById: async (id) => out(await pages.findOne({ _id: id })),
      findBySlug: async (slug) => out(await pages.findOne({ slug })),
      /** Published pages search engines may list (sitemap): not sensitive, not hidden from search. */
      listForSitemap: async () => (await pages.find({ 'settings.published': true, 'settings.sensitive': { $ne: true }, 'settings.noIndex': { $ne: true } }, { projection: { slug: 1, userId: 1, updatedAt: 1 } }).limit(50000).toArray()).map(out),
      /** Published pages that opted in to Explore (not sensitive): the fields Explore shows. */
      listForExplore: async () => (await pages.find({ 'settings.published': true, 'settings.explore': true, 'settings.sensitive': { $ne: true } }, { projection: { slug: 1, userId: 1, 'profile.title': 1, 'profile.avatar': 1 } }).limit(5000).toArray()).map(out),
      create: async (page) => {
        const ts = new Date().toISOString();
        const doc = { _id: crypto.randomUUID(), createdAt: ts, updatedAt: ts, ...page };
        await pages.insertOne(doc).catch(dupe);
        return out(doc);
      },
      update: async (id, patch) => {
        const res = await pages
          .findOneAndUpdate({ _id: id }, { $set: { ...patch, updatedAt: new Date().toISOString() } }, { returnDocument: 'after' })
          .catch(dupe);
        return out(res);
      },
      remove: async (id) => { await pages.deleteOne({ _id: id }); },
    },
    events: {
      insert: async (ev) => { await events.insertOne({ ...ev, ts: new Date() }); },
      listForPage: async (pageId, since) =>
        (await events.find({ pageId, ts: { $gte: since } }, { projection: { _id: 0 } }).limit(200000).toArray())
          .map((e) => ({ ...e, ts: e.ts.toISOString() })),
      removeForPage: async (pageId) => { await events.deleteMany({ pageId }); },
      /** Views per page since a date, for the given pages: { pageId: count }. */
      viewCounts: async (pageIds, since) => Object.fromEntries((await events.aggregate([
        { $match: { pageId: { $in: pageIds }, type: 'view', ts: { $gte: since } } },
        { $group: { _id: '$pageId', n: { $sum: 1 } } },
      ]).toArray()).map((r) => [r._id, r.n])),
    },
    bookings: {
      create: async (b) => {
        const doc = { _id: crypto.randomUUID(), createdAt: new Date().toISOString(), remindersSent: [], ...b };
        await bookings.insertOne(doc).catch((err) => { if (err?.code === 11000) throw Object.assign(new Error('slot_taken'), { code: 'slot_taken' }); throw err; });
        return out(doc);
      },
      findById: async (id) => out(await bookings.findOne({ _id: id })),
      list: async ({ pageId, blockId, userId, from, to, statuses, desc = false, limit = 500 } = {}) => {
        const q = {};
        if (pageId) q.pageId = pageId;
        if (blockId) q.blockId = blockId;
        if (userId) q.userId = userId;
        if (statuses) q.status = { $in: statuses };
        if (from || to) q.start = { ...(from ? { $gte: from } : {}), ...(to ? { $lt: to } : {}) };
        return (await bookings.find(q).sort({ start: desc ? -1 : 1 }).limit(limit).toArray()).map(out);
      },
      update: async (id, patch) => {
        const set = { ...patch, updatedAt: new Date().toISOString() };
        const unset = {};
        if (patch.slotKey === null) { delete set.slotKey; unset.slotKey = ''; }
        const res = await bookings
          .findOneAndUpdate({ _id: id }, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { returnDocument: 'after' })
          .catch((err) => { if (err?.code === 11000) throw Object.assign(new Error('slot_taken'), { code: 'slot_taken' }); throw err; });
        return out(res);
      },
    },
    responses: {
      create: async (r) => {
        const doc = { _id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...r };
        await responses.insertOne(doc);
        return out(doc);
      },
      findById: async (id) => out(await responses.findOne({ _id: id })),
      list: async ({ pageId, blockId, limit = 500 } = {}) =>
        (await responses.find({ pageId, ...(blockId ? { blockId } : {}) }).sort({ createdAt: -1 }).limit(limit).toArray()).map(out),
      count: async ({ pageId, blockId }) => responses.countDocuments({ pageId, ...(blockId ? { blockId } : {}) }),
      remove: async (id) => { await responses.deleteOne({ _id: id }); },
      removeMany: async ({ pageId, blockId }) => { await responses.deleteMany({ pageId, ...(blockId ? { blockId } : {}) }); },
    },
    limits: {
      hit: async (id, expiresAt) => {
        const doc = await limits.findOneAndUpdate(
          { _id: id }, { $inc: { n: 1 }, $setOnInsert: { expiresAt } }, { upsert: true, returnDocument: 'after' },
        );
        return doc?.n ?? 1;
      },
      get: async (id) => (await limits.findOne({ _id: id }))?.n || 0,
    },
    reviews: {
      create: async (r) => {
        const doc = { _id: crypto.randomUUID(), createdAt: new Date().toISOString(), reply: '', ...r };
        await reviews.insertOne(doc);
        return out(doc);
      },
      findById: async (id) => out(await reviews.findOne({ _id: id })),
      list: async ({ pageId, blockId, statuses, before, limit = 50 } = {}) => {
        const q = { pageId };
        if (blockId) q.blockId = blockId;
        if (statuses) q.status = { $in: statuses };
        if (before) q.createdAt = { $lt: before };
        return (await reviews.find(q).sort({ createdAt: -1 }).limit(limit).toArray()).map(out);
      },
      count: async ({ pageId, blockId, status }) => reviews.countDocuments({ pageId, ...(blockId ? { blockId } : {}), ...(status ? { status } : {}) }),
      stats: async ({ pageId, blockId }) => {
        const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const rows = await reviews.aggregate([{ $match: { pageId, blockId, status: 'published' } }, { $group: { _id: '$rating', n: { $sum: 1 } } }]).toArray();
        for (const r of rows) if (r._id in dist) dist[r._id] = r.n;
        return dist;
      },
      update: async (id, patch) => out(await reviews.findOneAndUpdate({ _id: id }, { $set: { ...patch, updatedAt: new Date().toISOString() } }, { returnDocument: 'after' })),
      remove: async (id) => { await reviews.deleteOne({ _id: id }); },
      removeMany: async ({ pageId }) => { await reviews.deleteMany({ pageId }); },
    },
    orders: {
      create: async (o) => {
        const created = new Date();
        const doc = { _id: crypto.randomUUID(), createdAt: created.toISOString(), createdAtDate: created, ...o };
        await orders.insertOne(doc);
        const { createdAtDate, ...rest } = doc;
        return out(rest);
      },
      findById: async (id) => out(await orders.findOne({ _id: id }, { projection: { createdAtDate: 0 } })),
      list: async ({ pageId, userId, statuses, since, limit = 100 } = {}) => {
        const q = {};
        if (pageId) q.pageId = pageId;
        if (userId) q.userId = userId;
        if (statuses) q.status = { $in: statuses };
        if (since) q.createdAt = { $gte: since };
        return (await orders.find(q, { projection: { createdAtDate: 0 } }).sort({ createdAt: -1 }).limit(limit).toArray()).map(out);
      },
      count: async ({ pageId, statuses, since }) => orders.countDocuments({ pageId, ...(statuses ? { status: { $in: statuses } } : {}), ...(since ? { createdAt: { $gte: since } } : {}) }),
      update: async (id, patch) => out(await orders.findOneAndUpdate({ _id: id }, { $set: { ...patch, updatedAt: new Date().toISOString() } }, { returnDocument: 'after', projection: { createdAtDate: 0 } })),
      removeMany: async ({ pageId }) => { await orders.deleteMany({ pageId }); },
    },
    invoices: {
      create: async (inv) => {
        const t = new Date().toISOString();
        const doc = { _id: crypto.randomUUID(), createdAt: t, updatedAt: t, ...inv };
        await invoices.insertOne(doc).catch((err) => { if (err?.code === 11000) throw Object.assign(new Error('number_taken'), { code: 'number_taken' }); throw err; });
        return out(doc);
      },
      findById: async (id) => out(await invoices.findOne({ _id: id })),
      list: async ({ pageId, status, limit = 300 } = {}) =>
        (await invoices.find({ pageId, ...(status ? { status } : {}) }).sort({ number: -1 }).limit(limit).toArray()).map(out),
      maxNumber: async (pageId) => (await invoices.find({ pageId }, { projection: { number: 1 } }).sort({ number: -1 }).limit(1).next())?.number || 0,
      update: async (id, patch) => out(await invoices.findOneAndUpdate({ _id: id }, { $set: { ...patch, updatedAt: new Date().toISOString() } }, { returnDocument: 'after' })),
      remove: async (id) => { await invoices.deleteOne({ _id: id }); },
      removeMany: async ({ pageId }) => { await invoices.deleteMany({ pageId }); },
    },
    // Visitors subscribed to a page's push notifications.
    subscribers: {
      /** One per page + browser endpoint: subscribing again refreshes it (same id). */
      upsert: async ({ pageId, endpoint, ...fields }) => {
        const ts = new Date().toISOString();
        const doc = await subscribers.findOneAndUpdate(
          { pageId, endpoint },
          { $set: { ...fields, updatedAt: ts }, $setOnInsert: { _id: crypto.randomUUID(), pageId, endpoint, createdAt: ts } },
          { upsert: true, returnDocument: 'after' },
        );
        return out(doc);
      },
      findById: async (id) => out(await subscribers.findOne({ _id: String(id) })),
      findByEndpoint: async (pageId, endpoint) => out(await subscribers.findOne({ pageId, endpoint })),
      update: async (id, patch) => out(await subscribers.findOneAndUpdate({ _id: id }, { $set: { ...patch, updatedAt: new Date().toISOString() } }, { returnDocument: 'after' })),
      remove: async (id) => { await subscribers.deleteOne({ _id: id }); },
      removeByEndpoint: async (endpoint) => { await subscribers.deleteMany({ endpoint }); },
      removeMany: async ({ pageId }) => { await subscribers.deleteMany({ pageId }); },
      count: async ({ pageId, topics = [] }) => subscribers.countDocuments({ pageId, ...(topics.length ? { $or: [{ topics: { $size: 0 } }, { topics: { $in: topics } }] } : {}) }),
      /** Light fields of every subscriber of a page, for the dashboard stats. */
      summary: async (pageId) => (await subscribers.find({ pageId }, { projection: { topics: 1, source: 1, lang: 1, createdAt: 1 } }).limit(200000).toArray()).map(out),
      /** Next batch for sending, in id order: subscribers with no topic (= all) or one of `topics`. */
      batch: async ({ pageId, topics = [], after = '', limit = 500 }) => (await subscribers.find({
        pageId,
        ...(after ? { _id: { $gt: after } } : {}),
        ...(topics.length ? { $or: [{ topics: { $size: 0 } }, { topics: { $in: topics } }] } : {}),
      }, { projection: { endpoint: 1, keys: 1, lang: 1 } }).sort({ _id: 1 }).limit(limit).toArray()).map(out),
    },
    // Notifications the owner sends to subscribers (now or scheduled).
    broadcasts: {
      create: async (b) => {
        const ts = new Date().toISOString();
        const doc = { _id: crypto.randomUUID(), createdAt: ts, updatedAt: ts, ...b };
        await broadcasts.insertOne(doc);
        return out(doc);
      },
      findById: async (id) => out(await broadcasts.findOne({ _id: String(id) })),
      list: async ({ pageId, limit = 50 }) => (await broadcasts.find({ pageId }).sort({ sendAt: -1, createdAt: -1 }).limit(limit).toArray()).map(out),
      update: async (id, patch) => out(await broadcasts.findOneAndUpdate({ _id: id }, { $set: { ...patch, updatedAt: new Date().toISOString() } }, { returnDocument: 'after' })),
      remove: async (id) => { await broadcasts.deleteOne({ _id: id }); },
      removeMany: async ({ pageId }) => { await broadcasts.deleteMany({ pageId }); },
      /** Not canceled, going out between two instants (daily limit). */
      countBetween: async ({ pageId, from, to, exceptId = '' }) => broadcasts.countDocuments({ pageId, status: { $ne: 'canceled' }, sendAt: { $gte: from, $lt: to }, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }),
      /** Take one due broadcast (or one stuck mid-send) so only one worker sends it. */
      claimDue: async (nowIso, staleIso) => out(await broadcasts.findOneAndUpdate(
        { $or: [{ status: 'scheduled', sendAt: { $lte: nowIso } }, { status: 'sending', lockedAt: { $lt: staleIso } }] },
        { $set: { status: 'sending', lockedAt: nowIso } },
        { sort: { sendAt: 1 }, returnDocument: 'after' },
      )),
      incClicks: async (id) => { await broadcasts.updateOne({ _id: String(id) }, { $inc: { 'stats.clicks': 1 } }); },
    },
    // Acceptance of the Terms and Privacy Policy (proof of consent: kept when an account is deleted).
    // Visitors' reports about a page (footer → Report).
    reports: {
      create: async (r) => {
        const doc = { _id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: 'open', ...r };
        await reports.insertOne(doc);
        return out(doc);
      },
      list: async ({ status = '', pageId = '', limit = 200 } = {}) => (await reports.find({ ...(status ? { status } : {}), ...(pageId ? { pageId } : {}) }).sort({ createdAt: -1 }).limit(limit).toArray()).map(out),
      findById: async (id) => out(await reports.findOne({ _id: String(id) })),
      update: async (id, patch) => out(await reports.findOneAndUpdate({ _id: String(id) }, { $set: { ...patch, updatedAt: new Date().toISOString() } }, { returnDocument: 'after' })),
      updateMany: async ({ pageId, status }, patch) => (await reports.updateMany({ pageId, status }, { $set: { ...patch, updatedAt: new Date().toISOString() } })).modifiedCount,
      counts: async () => Object.fromEntries((await reports.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]).toArray()).map((r) => [r._id, r.n])),
    },
    consents: {
      record: async (c) => {
        const doc = { _id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...c };
        await consents.insertOne(doc);
        return out(doc);
      },
      listByUser: async (userId) => (await consents.find({ userId }).sort({ createdAt: -1 }).limit(100).toArray()).map(out),
    },
    payments: {
      record: async (p) => {
        const found = await payments.findOne({ provider: p.provider, providerId: p.providerId });
        if (found) return out(found);
        const c = await counters.findOneAndUpdate({ _id: 'payments' }, { $inc: { n: 1 } }, { upsert: true, returnDocument: 'after' });
        const doc = { _id: crypto.randomUUID(), createdAt: new Date().toISOString(), number: c?.n || 1, ...p };
        try { await payments.insertOne(doc); } catch (err) {
          if (err?.code === 11000) return out(await payments.findOne({ provider: p.provider, providerId: p.providerId }));
          throw err;
        }
        return out(doc);
      },
      findById: async (id) => out(await payments.findOne({ _id: id })),
      update: async (id, patch) => out(await payments.findOneAndUpdate({ _id: id }, { $set: patch }, { returnDocument: 'after' })),
      listByUser: async (userId) => (await payments.find({ userId }).sort({ createdAt: -1 }).limit(200).toArray()).map(out),
    },
    referrals: {
      create: async (r) => {
        const doc = { _id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: 'pending', months: 0, appliedMonths: 0, ...r };
        try { await referrals.insertOne(doc); } catch (err) {
          if (err?.code === 11000) return out(await referrals.findOne({ refereeId: r.refereeId }));
          throw err;
        }
        return out(doc);
      },
      findByReferee: async (refereeId) => out(await referrals.findOne({ refereeId })),
      listByReferrer: async (referrerId) => (await referrals.find({ referrerId }).sort({ createdAt: -1 }).limit(500).toArray()).map(out),
      countRewarded: async ({ referrerId, campaignId }) => referrals.countDocuments({ referrerId, campaignId, status: 'rewarded' }),
      update: async (id, patch) => out(await referrals.findOneAndUpdate({ _id: id }, { $set: { ...patch, updatedAt: new Date().toISOString() } }, { returnDocument: 'after' })),
      list: async ({ status = '', limit = 200 } = {}) => (await referrals.find(status ? { status } : {}).sort({ createdAt: -1 }).limit(limit).toArray()).map(out),
    },
    referralCampaigns: {
      list: async () => (await campaigns.find({}).sort({ startsAt: -1 }).limit(200).toArray()).map(out),
      findById: async (id) => out(await campaigns.findOne({ _id: id })),
      create: async (c) => {
        const doc = { _id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...c };
        await campaigns.insertOne(doc);
        return out(doc);
      },
      update: async (id, patch) => out(await campaigns.findOneAndUpdate({ _id: id }, { $set: { ...patch, updatedAt: new Date().toISOString() } }, { returnDocument: 'after' })),
      remove: async (id) => (await campaigns.deleteOne({ _id: id })).deletedCount === 1,
    },
    tokens: {
      create: async (t) => {
        const doc = { _id: crypto.randomUUID(), createdAt: new Date().toISOString(), lastUsedAt: null, ...t };
        await tokens.insertOne(doc);
        return out(doc);
      },
      findByHash: async (hash) => (hash ? out(await tokens.findOne({ hash })) : null),
      listByUser: async (userId) => (await tokens.find({ userId }).sort({ createdAt: -1 }).limit(100).toArray()).map(out),
      countByUser: async (userId) => tokens.countDocuments({ userId }),
      touch: async (id) => { await tokens.updateOne({ _id: id }, { $set: { lastUsedAt: new Date().toISOString() } }); },
      remove: async (id, userId) => (await tokens.deleteOne({ _id: id, userId })).deletedCount === 1,
    },
    cards: {
      create: async (c) => {
        const t = new Date().toISOString();
        const doc = { _id: crypto.randomUUID(), createdAt: t, updatedAt: t, ...c };
        await cards.insertOne(doc).catch((err) => { if (err?.code === 11000) throw Object.assign(new Error('code_taken'), { code: 'code_taken' }); throw err; });
        return out(doc);
      },
      findById: async (id) => out(await cards.findOne({ _id: id })),
      findByCode: async (pageId, code) => out(await cards.findOne({ pageId, code })),
      list: async ({ pageId, blockId, q = '', limit = 50 } = {}) => {
        const query = { pageId };
        if (blockId) query.blockId = blockId;
        const s = q.trim();
        if (s) {
          const code = s.toUpperCase().replace(/[\s-]/g, '').replace(/[^A-Z0-9]/g, '');
          const rx = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          query.$or = [{ name: { $regex: rx, $options: 'i' } }, ...(code ? [{ code: { $regex: code } }] : [])];
        }
        return (await cards.find(query).sort({ updatedAt: -1 }).limit(limit).toArray()).map(out);
      },
      count: async ({ pageId, blockId }) => cards.countDocuments({ pageId, ...(blockId ? { blockId } : {}) }),
      update: async (id, patch) => out(await cards.findOneAndUpdate({ _id: id }, { $set: { ...patch, updatedAt: new Date().toISOString() } }, { returnDocument: 'after' })),
      removeMany: async ({ pageId }) => { await cards.deleteMany({ pageId }); },
    },
    push: {
      save: async (userId, sub) => {
        await pushSubs.updateOne({ endpoint: sub.endpoint }, { $set: { userId, keys: sub.keys, createdAt: new Date().toISOString() } }, { upsert: true });
      },
      listByUser: async (userId) => (await pushSubs.find({ userId }).toArray()).map(({ _id, ...p }) => p),
      remove: async (endpoint) => { await pushSubs.deleteOne({ endpoint }); },
    },
    assets: {
      // storage: 'r2' = the bytes live in Cloudflare R2 (lib/db/with-r2.js), only the details here.
      create: async ({ id = crypto.randomUUID().replace(/-/g, ''), userId, mime, data, name = '', size, storage = 'db' }) => {
        await assets.insertOne({ _id: id, userId, mime, name, size: size ?? data.length, storage, ...(storage === 'db' ? { data: new Binary(data) } : {}), createdAt: new Date() });
        return { id };
      },
      findById: async (id) => {
        const doc = await assets.findOne({ _id: id });
        if (!doc) return null;
        return { id: doc._id, userId: doc.userId, mime: doc.mime, name: doc.name || '', size: doc.size, storage: doc.storage || 'db', ...(doc.data ? { data: Buffer.from(doc.data.buffer) } : {}) };
      },
      listByUser: async (userId) => (await assets.find({ userId }, { projection: { _id: 1, storage: 1 } }).toArray()).map((d) => ({ id: d._id, storage: d.storage || 'db' })),
      remove: async (id) => { await assets.deleteOne({ _id: id }); },
    },
  };
}
