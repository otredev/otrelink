// The page document: shape, defaults and sanitizing.
//
// page = {
//   slug, profile: { title, bio, avatar, verified },
//   socials: [{ id, platform, url }],
//   blocks:  [{ id, type, enabled, data: {...}, options: { animation, showFrom, showUntil }, children?: [...] }],
//            (children only on container types such as Collection, nested up to MAX_DEPTH)
//   design:  { theme, ...design fields, wallpaper: { type, ...wallpaper fields } },
//   settings:{ published, language, translateButton, seoTitle, seoDescription, ogImage, hideFooter, explore, noSelect, noRightClick, sensitive, sensitiveMessage }
//   translations: { es: { profile, settings, blocks: { [blockId]: {...} } } } — the second language (translate.js)
//   today:   { status, place, address, lat, lon, note, until, placeAt, soldOut, ordersPaused, updatedAt }
//            set from the dashboard "Today" panel, saved apart from the rest (see sanitizeToday)
// }

import { blockTypes, commonBlockFields, blockStyleFields } from './blocks/index.js';
import { socials } from './socials.js';
import { themes } from './themes.js';
import { defaultsFor, sanitizeFields } from './fields.js';
import { defaultDesign, resolveDesign, sanitizeDesign } from './design.js';
import { uid } from './util/html.js';
import { MAX_DEPTH } from './tree.js';
import { sanitizeTranslations } from './translate.js';

export const profileFields = [
  { key: 'title', type: 'text', label: 'Title', max: 60, default: '' },
  { key: 'bio', type: 'textarea', label: 'Bio', max: 300, default: '' },
  { key: 'avatar', type: 'image', label: 'Profile picture', default: '' },
  { key: 'avatarAdjust', type: 'imageAdjust', label: 'Adjust picture', image: 'avatar', frame: 'circle', fits: ['cover', 'contain', 'natural'], showIf: { key: 'avatar', truthy: true } },
  { key: 'verified', type: 'toggle', label: 'Show verified badge', default: false },
];

export const settingsFields = [
  { key: 'published', type: 'toggle', label: 'Page is public', default: true, help: 'When off, only you can see it in the dashboard.' },
  { key: 'navMenu', type: 'toggle', label: 'Navigation menu', default: false,
    help: 'A menu button that jumps to the sections of your page. Handy for long pages.' },
  { key: 'navItems', type: 'select', label: 'Menu shows', default: 'headers', showIf: { key: 'navMenu', truthy: true }, options: [
    { value: 'headers', label: 'Header blocks' }, { value: 'all', label: 'Every block with a title' },
  ], help: 'Any block can also get its own menu entry: open it → Animation & schedule → Menu label.' },
  { key: 'navPosition', type: 'select', label: 'Menu button', default: 'left', showIf: { key: 'navMenu', truthy: true }, options: [
    { value: 'left', label: 'Top left' }, { value: 'right', label: 'Top right' },
  ] },
  { key: 'language', type: 'select', label: 'Page language', default: 'en', options: [{ value: 'en', label: 'English' }, { value: 'es', label: 'Español' }],
    help: 'The language your page is written in.' },
  { key: 'translateButton', type: 'toggle', label: 'Second language (ES / EN)', default: false,
    help: 'Write your page in the other language too: each block gets a “Translation” section. Visitors switch with the ES / EN button; texts you leave empty show in the original language.' },
  { key: 'translatePlace', type: 'select', label: 'Show the ES / EN switch', default: 'corner', showIf: { key: 'translateButton', truthy: true }, options: [
    { value: 'corner', label: 'In the top corner' }, { value: 'menu', label: 'Inside the navigation menu' },
  ], help: 'Inside the menu needs “Navigation menu” on; otherwise it stays in the corner.' },
  { key: 'seoTitle', type: 'text', label: 'SEO title', max: 70, help: 'Browser tab and search results. Defaults to your title.' },
  { key: 'seoDescription', type: 'textarea', label: 'SEO description', max: 200 },
  { key: 'ogImage', type: 'image', label: 'Sharing image', help: 'Shown when your link is shared on social media.' },
  { key: 'hideFooter', type: 'toggle', label: 'Hide the Otrelink button in the footer', default: false,
    help: 'Hides “Create your own Otrelink” and Explore. The Cookies, Report and Privacy links always stay.' },
  { key: 'explore', type: 'toggle', label: 'Show my page in Explore', default: false,
    help: 'Explore, in the footer of every Otrelink page, lists the 10 most visited pages that turned this on. Pages with the sensitive content warning are never listed.' },
  { key: 'noSelect', type: 'toggle', label: 'Block text selection', default: false,
    help: 'Visitors can’t select or drag text and images on your page (forms still work). It makes copying harder, not impossible.' },
  { key: 'noRightClick', type: 'toggle', label: 'Block right-click', default: false,
    help: 'Turns off the right-click menu (and the long-press menu on images) on your page.' },
  { key: 'sensitive', type: 'toggle', label: 'Sensitive content warning', default: false, help: 'Visitors must confirm before seeing the page.' },
  { key: 'sensitiveMessage', type: 'text', label: 'Warning message', default: 'This page may contain sensitive content.', showIf: { key: 'sensitive', truthy: true } },
];

export const RESERVED_SLUGS = new Set([
  'api', 'admin', 'dashboard', 'login', 'register', 'logout', 'settings', 'static', 'assets', 'public',
  'about', 'help', 'support', 'privacy', 'terms', 'www', 'app', 'otrelink', '_next', 'favicon.ico',
]);

/** Returns a clean slug or '' if invalid. */
export function sanitizeSlug(slug) {
  const s = String(slug || '').trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9._-]/g, '');
  if (s.length < 3 || s.length > 30 || RESERVED_SLUGS.has(s) || /^[._-]|[._-]$/.test(s)) return '';
  return s;
}

/** A new block with default values. */
/** Block types that can hold other blocks (declared with `container: true`). */
export const isContainerType = (type) => Boolean(blockTypes.get(type)?.container);

/** A new block with default values. Containers may come with sample children. */
export function newBlock(type, data = {}) {
  const mod = blockTypes.get(type);
  if (!mod) throw new Error(`Unknown block type "${type}"`);
  const block = {
    id: uid('b'),
    type,
    enabled: true,
    data: { ...defaultsFor(mod.fields), ...data },
    options: defaultsFor(commonBlockFields),
  };
  if (mod.container) block.children = mod.defaultChildren ? mod.defaultChildren(newBlock) : [];
  return block;
}

/** Deep copy of a block with new ids (used by "Duplicate"). */
export function cloneBlock(block) {
  return {
    ...structuredClone(block),
    id: uid('b'),
    ...(block.children ? { children: block.children.map(cloneBlock) } : {}),
  };
}

const MAX_BLOCKS = 300;

/** Block options: animation, schedule and the block's own style (only non-empty style values are kept). */
function sanitizeOptions(input = {}) {
  const options = sanitizeFields(commonBlockFields, input);
  const style = sanitizeFields(blockStyleFields, input);
  for (const [k, v] of Object.entries(style)) if (v !== '') options[k] = v;
  return options;
}

/**
 * Sanitize one block (and its children, for containers).
 * `state.count` limits the total number of blocks in a page.
 */
export function sanitizeBlock(b, depth = 0, state = { count: 0 }) {
  if (!b || typeof b !== 'object' || state.count >= MAX_BLOCKS) return null;
  state.count++;
  const id = String(b.id || '').slice(0, 40) || uid('b');
  let mod = blockTypes.get(b.type);
  const options = sanitizeOptions(b.options);
  if (!mod) {
    // Type was removed from the registry: keep the data untouched (hidden on the page)
    // so re-adding the module brings it back.
    const json = JSON.stringify({ data: b.data ?? {}, children: b.children });
    if (json.length > 50000) return null;
    const keep = JSON.parse(json);
    return { id, type: String(b.type).slice(0, 40), enabled: Boolean(b.enabled), data: keep.data, options, ...(keep.children ? { children: keep.children } : {}) };
  }
  // Modules can upgrade old data (e.g. collections that stored links in data.items).
  if (mod.migrate) b = mod.migrate(b, newBlock) || b;
  const block = { id, type: mod.type, enabled: b.enabled !== false, data: sanitizeFields(mod.fields, b.data || {}), options };
  if (mod.container) {
    const kids = Array.isArray(b.children) && depth < MAX_DEPTH - 1 ? b.children : [];
    block.children = kids.map((c) => sanitizeBlock(c, depth + 1, state)).filter(Boolean);
  }
  return block;
}

/**
 * Remove fields declared `private: true` (e.g. a booking's meeting link) from
 * blocks sent to visitors. The server hands them out only when appropriate.
 */
export function stripPrivateFields(blocks = []) {
  return blocks.map((b) => {
    const fields = blockTypes.get(b.type)?.fields || [];
    const priv = fields.filter((f) => f.private).map((f) => f.key);
    let data = priv.length ? Object.fromEntries(Object.entries(b.data || {}).filter(([k]) => !priv.includes(k))) : b.data;
    // Private keys inside list items (e.g. the note of a closed day).
    for (const f of fields.filter((x) => x.privateItemKeys && Array.isArray(data?.[x.key]))) {
      data = { ...data, [f.key]: data[f.key].map((it) => Object.fromEntries(Object.entries(it).filter(([k]) => !f.privateItemKeys.includes(k)))) };
    }
    return { ...b, data, ...(b.children ? { children: stripPrivateFields(b.children) } : {}) };
  });
}

export function sanitizeSocials(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((s) => s && socials.has(s.platform))
    .slice(0, 30)
    .map((s) => ({ id: String(s.id || '').slice(0, 40) || uid('s'), platform: s.platform, url: String(s.url || '').trim().slice(0, 500) }));
}

/** Sanitize the whole block tree. */
export function sanitizeBlocks(blocks) {
  const state = { count: 0 };
  return (Array.isArray(blocks) ? blocks : []).map((b) => sanitizeBlock(b, 0, state)).filter(Boolean);
}

/** Sanitize the editable content of a page (everything except owner/slug/ids). */
export function sanitizePage(input = {}) {
  const blocks = sanitizeBlocks(input.blocks);
  const settings = sanitizeFields(settingsFields, input.settings || {});
  return {
    profile: sanitizeFields(profileFields, input.profile || {}),
    socials: sanitizeSocials(input.socials),
    blocks,
    design: sanitizeDesign(resolveDesign(input.design || {})),
    settings,
    // The owner's texts in the second language (see translate.js).
    translations: sanitizeTranslations(input.translations, { blocks, language: settings.language, profileFields, settingsFields }),
  };
}

/** Apply a theme: start from defaults, apply the theme preset, keep custom CSS. */
export function applyTheme(design, themeId) {
  const theme = themes.get(themeId);
  if (!theme) return design;
  const base = defaultDesign();
  return resolveDesign({
    ...base,
    ...theme.design,
    wallpaper: { ...theme.design.wallpaper },
    entrance: design.entrance ?? base.entrance,
    customCss: design.customCss ?? '',
    theme: theme.id,
  });
}

/** Content for a brand-new page. */
export function createDefaultPage({ slug, title }) {
  const design = applyTheme(defaultDesign(), 'air');
  return {
    slug,
    profile: { title: title || `@${slug}`, bio: 'Welcome to my page ✨', avatar: '', verified: false },
    socials: [],
    blocks: [
      newBlock('link', { title: 'My first link', url: 'https://example.com' }),
      newBlock('text', { text: 'Edit this page from your **Otrelink** dashboard.' }),
    ],
    design,
    settings: defaultsFor(settingsFields),
  };
}

// ── Today (dashboard "Today" panel) ──────────────────────────
export const TODAY_STATUSES = ['auto', 'open', 'closed'];
const coord = (v, max) => { const n = Number(v); return v !== null && v !== '' && v !== undefined && Number.isFinite(n) && Math.abs(n) <= max ? Math.round(n * 1e5) / 1e5 : null; };
const oneLine = (v, max) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
const iso = (v) => (v && !Number.isNaN(new Date(v).getTime()) ? new Date(v).toISOString() : '');

/** Clean the "Today" state: live location, open/closed override, sold-out products, paused orders. */
export function sanitizeToday(input) {
  const t = input && typeof input === 'object' ? input : {};
  return {
    status: TODAY_STATUSES.includes(t.status) ? t.status : 'auto',
    place: oneLine(t.place, 80),
    address: oneLine(t.address, 200),
    lat: coord(t.lat, 90),
    lon: coord(t.lon, 180),
    note: oneLine(t.note, 160),
    until: /^([01]\d|2[0-3]):[0-5]\d$/.test(t.until || '') ? t.until : '',
    placeAt: iso(t.placeAt), // when the location was set (it is shown until the end of that day)
    soldOut: Array.isArray(t.soldOut) ? [...new Set(t.soldOut.map((x) => String(x).slice(0, 40)).filter(Boolean))].slice(0, 300) : [],
    ordersPaused: t.ordersPaused === true,
    updatedAt: iso(t.updatedAt),
  };
}
