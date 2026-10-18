// ─────────────────────────────────────────────────────────────
//  BLOCK TYPES REGISTRY
//  Add a block type:    create a file in this folder, import it, add it to the list.
//  Remove a block type: delete it from the list (existing blocks of that type are
//                       simply hidden on public pages; nothing breaks).
//
//  A block module looks like:
//  {
//    type: 'my-block',            unique id stored in the database
//    label, description, icon,    shown in the dashboard "Add" modal
//    category: 'Essentials',      groups blocks in the "Add" modal
//    cssClasses?: [{ selector, description }]  documented on the /docs page
//    fields: [...],               settings (see ../fields.js) -> form + validation
//    summary(data) -> string,     one-line summary in the dashboard list
//    render(data, ctx) -> html,   ESCAPE user values with esc()/safeUrl()
//    css?: string,                included once if the block is used
//    hydrate?(el, data, ctx),     optional browser behavior (timers, buttons...)
//  }
// ─────────────────────────────────────────────────────────────

import { createRegistry } from '../util/registry.js';
import { attentionAnimations, entranceAnimations } from '../animations.js';
import { buttonStyles } from '../buttons/index.js';

import link from './link.js';
import header from './header.js';
import copy from './copy.js';
import text from './text.js';
import image from './image.js';
import banner from './banner.js';
import gallery from './gallery.js';
import video from './video.js';
import music from './music.js';
import map from './map.js';
import contact from './contact.js';
import vcard from './vcard.js';
import faq from './faq.js';
import countdown from './countdown.js';
import divider from './divider.js';
import share from './share.js';
import pdf from './pdf.js';
import collection from './collection.js';
import booking from './booking.js';
import survey from './survey.js';
import reviews from './reviews.js';
import embed from './embed.js';
import catalog from './catalog.js';
import code from './code.js';
import html from './html.js';
import events from './events.js';
import status from './status.js';
import location from './location.js';
import route from './route.js';
import loyalty from './loyalty.js';
import notify from './notify.js';

export const blockTypes = createRegistry('blockTypes', [
  link,
  copy,
  collection,
  header,
  text,
  image,
  banner,
  gallery,
  pdf,
  video,
  embed,
  html,
  code,
  music,
  map,
  contact,
  catalog,
  events,
  status,
  location,
  route,
  loyalty,
  booking,
  survey,
  reviews,
  notify,
  vcard,
  faq,
  countdown,
  divider,
  share,
], 'type');

/** Settings every block has, regardless of type (shown in an "Advanced" area). */
export const commonBlockFields = [
  { key: 'animation', type: 'select', label: 'Attention animation', default: 'none', options: () => attentionAnimations.options() },
  { key: 'enter', type: 'select', label: 'Entrance', default: '', help: 'How this block appears. “Same as the page” uses Style → Layout & motion.',
    options: () => [{ value: '', label: 'Same as the page' }, ...entranceAnimations.options()] },
  { key: 'showFrom', type: 'datetime', label: 'Show from', help: 'Leave empty to show right away.' },
  { key: 'showUntil', type: 'datetime', label: 'Hide after', help: 'Leave empty to never hide.' },
  { key: 'navLabel', type: 'text', label: 'Menu label (optional)', max: 60,
    help: 'Lists this block in the navigation menu (Settings → Navigation menu).' },
];

/**
 * Optional style of one block, on top of the page design (dashboard: block → "Style").
 * Empty values keep the page's style. Stored in block.options with the fields above.
 */
const pageDefault = (label = 'Same as the page') => ({ value: '', label });
export const blockStyleFields = [
  { key: 'stButtonStyle', group: 'button', type: 'select', label: 'Button style', default: '',
    options: () => [pageDefault(), ...buttonStyles.list().map((s) => ({ value: s.id, label: s.label }))] },
  { key: 'stButtonColor', group: 'button', type: 'color', label: 'Button color', default: '', allowEmpty: true },
  { key: 'stButtonTextColor', group: 'button', type: 'color', label: 'Button text', default: '', allowEmpty: true },
  { key: 'stButtonBorderColor', group: 'button', type: 'color', label: 'Border / accent color', default: '', allowEmpty: true },
  { key: 'stButtonShadowColor', group: 'button', type: 'color', label: 'Shadow color', default: '', allowEmpty: true },
  { key: 'stGlassOpacity', group: 'button', type: 'select', label: 'Glass opacity', default: '', showIf: { key: 'stButtonStyle', group: 'button', equals: 'glass' },
    options: [pageDefault(), ...[0, 10, 20, 30, 40, 50, 60, 70, 80].map((n) => ({ value: String(n), label: `${n}%` }))] },
  { key: 'stGlassBlur', group: 'button', type: 'select', label: 'Glass blur', default: '', showIf: { key: 'stButtonStyle', group: 'button', equals: 'glass' },
    options: [pageDefault(), ...[0, 4, 8, 12, 16, 24, 32].map((n) => ({ value: String(n), label: `${n}px` }))] },
  { key: 'stRadius', group: 'radius', type: 'select', label: 'Corner radius', default: '',
    options: [pageDefault(), ...[0, 4, 8, 12, 16, 20, 24, 32].map((n) => ({ value: String(n), label: `${n}px` })), { value: '999', label: 'Pill' }] },
  { key: 'stSurfaceColor', group: 'card', type: 'color', label: 'Card color', default: '', allowEmpty: true, },
  { key: 'stSurfaceTextColor', group: 'card', type: 'color', label: 'Card text color', default: '', allowEmpty: true },
  { key: 'stTextColor', group: 'text', type: 'color', label: 'Text color', default: '', allowEmpty: true, },
  // Highlights inside a block (e.g. the date badges of the Events calendar), apart from the card colors.
  { key: 'stAccentColor', group: 'accent', type: 'color', label: 'Accent color', default: '', allowEmpty: true, help: 'Buy / Order buttons, date badges and the selected day. Empty = the page accent color (Design → Cards & surfaces).' },
  { key: 'stAccentTextColor', group: 'accent', type: 'color', label: 'Accent text color', default: '', allowEmpty: true },
];

/**
 * Which style options affect each block type: 'button' (buttons and the
 * "opens on a button" toggles), 'card' (card background and text), 'text'
 * (text outside cards) and 'radius' (corners). A function gets the block data,
 * for blocks whose look depends on their settings. Types not listed get all.
 */
const showsButton = (d) => d.display === 'button';
const STYLE_GROUPS = {
  link: ['button', 'radius'],
  copy: ['button', 'radius'],
  share: ['button', 'radius'],
  contact: ['button', 'radius'],
  collection: ['button', 'card', 'text', 'radius'], // also styles the blocks inside
  header: ['text'],
  divider: ['text'],
  text: (d) => (d.card ? ['card', 'radius'] : ['text']),
  image: (d) => (d.caption ? ['text', 'radius'] : ['radius']), // text = caption
  gallery: (d) => ((d.items || []).some((i) => i.caption) ? ['text', 'radius'] : ['radius']), // text = captions
  video: (d) => (d.title ? ['text', 'radius'] : ['radius']), // text = title
  music: ['radius'],
  banner: ['radius'],
  embed: (d) => (showsButton(d) ? ['button', 'radius'] : d.title ? ['text', 'radius'] : ['radius']),
  map: (d) => (showsButton(d) || d.directions ? ['button', 'radius'] : d.title ? ['text', 'radius'] : ['radius']),
  pdf: ['button', 'card', 'radius'],
  faq: ['card', 'radius'],
  countdown: ['card', 'radius'],
  catalog: (d) => (showsButton(d) ? ['button', 'card', 'accent', 'radius'] : ['card', 'accent', 'radius']),
  booking: ['button', 'card', 'radius'],
  survey: ['button', 'card', 'radius'],
  reviews: ['button', 'card', 'radius'],
  vcard: ['button', 'card', 'radius'],
  events: ['accent', 'card', 'text', 'radius'],
  html: (d) => (d.background === 'card' ? ['card', 'radius'] : d.title ? ['text', 'radius'] : ['radius']),
  code: (d) => (showsButton(d) ? ['button', 'radius'] : ['radius']),
  status: (d) => (d.style === 'card' ? ['card', 'radius'] : ['card']),
  location: ['card', 'radius'],
  route: ['card', 'radius'],
  loyalty: ['card', 'radius'],
};

/** Style groups that affect a block (see STYLE_GROUPS). */
export function blockStyleGroups(block) {
  const g = STYLE_GROUPS[block?.type];
  if (!g) return ['button', 'card', 'text', 'radius'];  // (accent only for blocks that list it)
  return typeof g === 'function' ? g(block.data || {}) : g;
}

/** The style fields worth showing for a block. */
export function blockStyleFieldsFor(block) {
  const groups = blockStyleGroups(block);
  return blockStyleFields.filter((f) => groups.includes(f.group));
}

/** True when a block has any style of its own. */
export const hasBlockStyle = (options = {}) => blockStyleFields.some((f) => options[f.key] !== undefined && options[f.key] !== '');

/** CSS variables + button style id for a block with its own style. */
export function blockStyleOf(options = {}, groups = ['button', 'card', 'text', 'radius', 'accent']) {
  // Values of groups that don't affect this block (e.g. left from an older setting) are ignored.
  options = Object.fromEntries(Object.entries(options).filter(([k]) => { const f = blockStyleFields.find((x) => x.key === k); return !f || groups.includes(f.group); }));
  if (!hasBlockStyle(options)) return null;
  const vars = [];
  const add = (name, v) => { if (v !== undefined && v !== '') vars.push(`${name}:${v}`); };
  add('--ol-btn-bg', options.stButtonColor);
  add('--ol-btn-fg', options.stButtonTextColor);
  add('--ol-btn-border', options.stButtonBorderColor);
  add('--ol-btn-shadow', options.stButtonShadowColor);
  if (options.stRadius !== '' && options.stRadius !== undefined) {
    add('--ol-btn-radius', `${options.stRadius}px`);
    add('--ol-surface-radius', `${Math.min(Number(options.stRadius), 40)}px`);
  }
  if (options.stGlassOpacity !== '' && options.stGlassOpacity !== undefined) {
    const a = Number(options.stGlassOpacity);
    add('--ol-glass-alpha', `${a}%`);
    add('--ol-glass-edge', `${Math.min(100, Math.round(a * 1.6 + 10))}%`);
  }
  if (options.stGlassBlur !== '' && options.stGlassBlur !== undefined) add('--ol-glass-blur', `${options.stGlassBlur}px`);
  add('--ol-surface', options.stSurfaceColor);
  add('--ol-surface-fg', options.stSurfaceTextColor);
  if (options.stTextColor) { add('--ol-text-color', options.stTextColor); add('--ol-title-color', options.stTextColor); }
  add('--ol-accent', options.stAccentColor);
  add('--ol-accent-fg', options.stAccentTextColor);
  const buttonStyle = buttonStyles.has(options.stButtonStyle) ? options.stButtonStyle : '';
  return { vars: vars.join(';'), buttonStyle };
}

/**
 * Whether a block can ever count clicks (it has a link or a button visitors tap).
 * Text, headers, dividers, FAQ, countdowns and players never do; some blocks
 * only do with certain settings (an image with a link, a map shown as a button…).
 * The dashboard hides the click counter for the others.
 */
const has = (v) => Boolean(v);
const CLICKABLE = {
  text: false, header: false, divider: false, countdown: false, faq: false, music: false, video: false,
  image: (d) => has(d.url),
  banner: (d) => has(d.url),
  gallery: (d) => (d.items || []).some((i) => i.url),
  embed: (d) => d.display === 'button',
  map: (d) => d.display === 'button' || Boolean(d.directions),
  collection: (d) => d.mode === 'button',
  catalog: (d) => d.display === 'button' || has(d.whatsapp) || (d.products || []).some((p) => p.url),
  status: false, loyalty: false,
  code: (d) => d.display === 'button',
  html: false,
  events: (d) => (d.events || []).some((e) => e.url),
  location: (d) => d.directions,
  route: (d) => d.directions,
};
export function blockTracksClicks(block) {
  const rule = CLICKABLE[block?.type];
  if (rule === undefined) return true;
  return typeof rule === 'function' ? rule(block.data || {}) : rule;
}
