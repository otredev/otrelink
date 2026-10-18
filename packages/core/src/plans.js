// ─────────────────────────────────────────────────────────────
//  PLANS
//  What each plan allows. Shared by the server (enforcement), the dashboard
//  (lock icons, upgrade prompts) and the admin app.
//
//  A user document stores:
//    plan:   'free' | 'pro' | 'business'   (missing = account created before
//            plans existed → treated as Pro, the admin can change it)
//    limits: { maxPages, features: { embed, booking, … } }  (Business only)
// ─────────────────────────────────────────────────────────────

/** Groups of features, in the order the dashboard and the admin show them. */
export const FEATURE_GROUPS = [
  { id: 'content', label: 'Content blocks' },
  { id: 'activity', label: 'Bookings & visitors' },
  { id: 'business', label: 'Shop & food business' },
  { id: 'page', label: 'Page & design' },
  { id: 'integrations', label: 'Integrations' },
];

/**
 * Features that plans can turn on or off. `free: true` = included in Free too
 * (Business plans can still turn it off). `business: true` = only the Business
 * plan has it (not Pro).
 */
export const PLAN_FEATURES = {
  // Content blocks
  code: { label: 'Code block', blocks: ['code'], group: 'content' },
  embed: { label: 'Embeds', blocks: ['embed'], group: 'content' },
  html: { label: 'HTML block', blocks: ['html'], group: 'content' },
  // Bookings & visitors
  events: { label: 'Events calendar', blocks: ['events'], group: 'activity' },
  booking: { label: 'Booking & agenda', blocks: ['booking'], sections: ['agenda'], group: 'activity' },
  reviews: { label: 'Reviews', blocks: ['reviews'], sections: ['reviews'], group: 'activity' },
  survey: { label: 'Surveys', blocks: ['survey'], sections: ['responses'], group: 'activity' },
  notifications: { label: 'Push notifications to visitors', blocks: ['notify'], sections: ['notify'], group: 'activity', business: true },
  // Shop & food business
  catalog: { label: 'Product catalog', blocks: ['catalog'], group: 'business' },
  orders: { label: 'Pickup orders', sections: ['orders'], group: 'business' },
  location: { label: 'Location, route & open status', blocks: ['location', 'route', 'status'], sections: ['today'], group: 'business' },
  loyalty: { label: 'Loyalty cards', blocks: ['loyalty'], sections: ['loyalty'], group: 'business' },
  invoices: { label: 'Invoices (PDF)', sections: ['invoices'], group: 'business' },
  // Page & design
  translate: { label: 'Second language (ES / EN)', group: 'page' },
  mediaWallpaper: { label: 'Photo & video backgrounds', wallpapers: ['image', 'video'], group: 'page' },
  // Integrations
  api: { label: 'API tokens & MCP', group: 'integrations', business: true },
};

/** [{ id, label, features: [{ key, label, free }] }] — for lists grouped by kind. */
export const groupedFeatures = () => FEATURE_GROUPS.map((g) => ({
  ...g,
  features: Object.entries(PLAN_FEATURES).filter(([, f]) => f.group === g.id).map(([key, f]) => ({ key, label: f.label, free: Boolean(f.free), business: Boolean(f.business) })),
})).filter((g) => g.features.length);

const ALL_ON = Object.fromEntries(Object.keys(PLAN_FEATURES).map((k) => [k, true]));
const FREE_ONLY = Object.fromEntries(Object.entries(PLAN_FEATURES).map(([k, f]) => [k, Boolean(f.free)]));
const PRO_ALL = Object.fromEntries(Object.entries(PLAN_FEATURES).map(([k, f]) => [k, !f.business]));

export const PLANS = {
  free: { id: 'free', label: 'Free', price: 0, maxPages: 1, features: FREE_ONLY,
    tagline: 'One page with links, socials and the basic blocks.' },
  pro: { id: 'pro', label: 'Pro', price: 10, maxPages: 10, features: PRO_ALL,
    tagline: 'Up to 10 pages and every page feature.' },
  business: { id: 'business', label: 'Business', price: null, maxPages: 50, features: ALL_ON, custom: true,
    tagline: 'Limits and price made for your team, plus API access.' },
};

export const PLAN_IDS = Object.keys(PLANS);
export const MAX_PAGES_LIMIT = 1000;

/**
 * The plan a user has, with Business limits applied.
 * → { id, label, price, maxPages, features: { embed: bool, … }, custom }
 */
export function resolvePlan(user) {
  const id = PLANS[user?.plan] ? user.plan : user && !user.plan ? 'pro' : 'free';
  const base = PLANS[id];
  if (id !== 'business') return { ...base, features: { ...base.features } };
  const l = user.limits || {};
  const maxPages = Number.isInteger(l.maxPages) ? Math.min(Math.max(l.maxPages, 1), MAX_PAGES_LIMIT) : base.maxPages;
  const features = { ...base.features };
  for (const k of Object.keys(PLAN_FEATURES)) if (typeof l.features?.[k] === 'boolean') features[k] = l.features[k];
  return { ...base, maxPages, features };
}

/** Clean Business limits coming from the admin. */
export function sanitizeLimits(input = {}) {
  const out = {};
  const n = Math.round(Number(input.maxPages));
  if (Number.isFinite(n)) out.maxPages = Math.min(Math.max(n, 1), MAX_PAGES_LIMIT);
  out.features = {};
  for (const k of Object.keys(PLAN_FEATURES)) if (typeof input.features?.[k] === 'boolean') out.features[k] = input.features[k];
  return out;
}

const featureOf = (kind, value) => Object.keys(PLAN_FEATURES).find((k) => PLAN_FEATURES[k][kind]?.includes(value));

/** Feature key that a block type needs (or null if it is always available). */
export const featureForBlock = (type) => featureOf('blocks', type) || null;
export const featureForWallpaper = (type) => featureOf('wallpapers', type) || null;
export const featureForSection = (id) => featureOf('sections', id) || null;

export const allowsBlock = (plan, type) => { const f = featureForBlock(type); return !f || Boolean(plan?.features?.[f]); };
export const allowsWallpaper = (plan, type) => { const f = featureForWallpaper(type); return !f || Boolean(plan?.features?.[f]); };
export const allowsSection = (plan, id) => { const f = featureForSection(id); return !f || Boolean(plan?.features?.[f]); };

/** How many blocks of locked types a page has (at any depth). */
export function countLockedBlocks(blocks = [], plan) {
  let n = 0;
  const walk = (list) => { for (const b of list || []) { if (!allowsBlock(plan, b.type)) n++; if (b.children) walk(b.children); } };
  walk(blocks);
  return n;
}

/** Turn off plan features inside a page the plan doesn't allow (pickup orders, second language). */
export function stripLockedFeatures(page, plan) {
  const orders = Boolean(plan?.features?.orders);
  const fix = (list) => (list || []).map((b) => ({
    ...b,
    ...(b.type === 'catalog' && b.data?.ordering === 'pickup' && !orders ? { data: { ...b.data, ordering: 'links' } } : {}),
    ...(b.children ? { children: fix(b.children) } : {}),
  }));
  return {
    ...page,
    blocks: fix(page.blocks),
    settings: { ...page.settings, ...(plan?.features?.translate ? {} : { translateButton: false }) },
  };
}

/** Remove blocks the plan doesn't allow (used for the public page). */
export function stripLockedBlocks(blocks = [], plan) {
  return blocks.filter((b) => allowsBlock(plan, b.type))
    .map((b) => (b.children ? { ...b, children: stripLockedBlocks(b.children, plan) } : b));
}
