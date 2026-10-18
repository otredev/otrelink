import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTENTION_PAUSE_CSS,
  blockTypes, themes, wallpapers, buttonStyles, fonts, socials,
  createDefaultPage, sanitizePage, sanitizeSlug, renderPage, applyTheme, newBlock, defaultDesign,
  designCss, resolveDesign, cssVariables, cssElements,
} from '../src/index.js';

test('every block type renders with its defaults', () => {
  for (const mod of blockTypes.list()) {
    const page = createDefaultPage({ slug: 'demo' });
    page.blocks = [newBlock(mod.type)];
    const { html } = renderPage(sanitizePage(page), { mode: 'preview' });
    assert.ok(html.includes(`ol-b-${mod.type}`), mod.type);
  }
});

test('every theme and wallpaper renders', () => {
  for (const t of themes.list()) {
    const page = createDefaultPage({ slug: 'demo' });
    page.design = applyTheme(page.design, t.id);
    const clean = sanitizePage(page);
    assert.equal(clean.design.theme, t.id);
    assert.ok(renderPage(clean).css.length > 100);
  }
  for (const w of wallpapers.list()) {
    const page = createDefaultPage({ slug: 'demo' });
    page.design.wallpaper = { type: w.id };
    assert.equal(sanitizePage(page).design.wallpaper.type, w.id);
  }
});

test('user content is escaped and unsafe urls removed', () => {
  const page = createDefaultPage({ slug: 'demo' });
  page.profile.title = '<script>alert(1)</script>';
  page.blocks = [{ id: 'x', type: 'link', enabled: true, data: { title: '"><img src=x onerror=alert(1)>', url: 'javascript:alert(1)' } }];
  page.design.customCss = '</style><script>alert(1)</script>';
  const clean = sanitizePage(page);
  assert.equal(clean.blocks[0].data.url, '');
  const { html, css } = renderPage(clean);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!css.includes('</style'));
});

test('urls are normalized', () => {
  const clean = sanitizePage({ blocks: [{ type: 'link', data: { title: 'a', url: 'instagram.com/me' } }] });
  assert.equal(clean.blocks[0].data.url, 'https://instagram.com/me');
});

test('unknown block types are kept but not rendered', () => {
  const clean = sanitizePage({ blocks: [{ id: 'z', type: 'removed-type', enabled: true, data: { a: 1 } }] });
  assert.equal(clean.blocks.length, 1);
  assert.ok(!renderPage(clean).html.includes('removed-type'));
});

test('scheduled blocks are hidden live, shown in preview', () => {
  const b = newBlock('link', { title: 'Later', url: 'https://a.com' });
  b.options.showFrom = new Date(Date.now() + 86400000).toISOString();
  const page = sanitizePage({ ...createDefaultPage({ slug: 'demo' }), blocks: [b] });
  assert.ok(!renderPage(page, { mode: 'live' }).html.includes('Later'));
  assert.ok(renderPage(page, { mode: 'preview' }).html.includes('Later'));
});

test('slugs', () => {
  assert.equal(sanitizeSlug('@OtreBeh'), 'otrebeh');
  assert.equal(sanitizeSlug('api'), '');
  assert.equal(sanitizeSlug('ab'), '');
});

test('registries are populated', () => {
  assert.ok(buttonStyles.list().length >= 6 && fonts.list().length >= 10 && socials.list().length >= 30);
  assert.equal(defaultDesign().wallpaper.type, 'solid');
});

test('header layout styles target the root element', () => {
  for (const layout of ['hero', 'left']) {
    const page = createDefaultPage({ slug: 'demo' });
    page.design.headerLayout = layout;
    const { html, css } = renderPage(sanitizePage(page));
    assert.ok(html.includes(`class="ol-root ol-layout-${layout}`), `root has ol-layout-${layout}`);
    // The layout class sits on .ol-root itself, so it must be ".ol-root.ol-layout-x", never ".ol-root .ol-layout-x".
    assert.ok(css.includes(`.ol-root.ol-layout-${layout}`), `css for ${layout}`);
    assert.ok(!css.includes(`.ol-root .ol-layout-`), 'no descendant layout selectors');
  }
});

test('docs: every CSS variable written by designCss is documented (and vice versa)', () => {
  const written = [...designCss(resolveDesign({ accentColor: '#111111', accentTextColor: '#ffffff' })).matchAll(/(--ol-[\w-]+):/g)].map((m) => m[1]);
  const documented = cssVariables.map((v) => v.name);
  assert.deepEqual([...documented].sort(), [...written].sort());
});

test('docs: documented class names exist in the rendered output', () => {
  const page = createDefaultPage({ slug: 'demo' });
  page.blocks = blockTypes.list().map((m) => newBlock(m.type));
  const { html, css } = renderPage(sanitizePage(page), { mode: 'preview' });
  const all = html + css;
  const firstClass = (sel) => sel.match(/\.(ol-[\w-]+)/)?.[1];
  for (const mod of blockTypes.list()) {
    assert.ok(Array.isArray(mod.cssClasses) && mod.cssClasses.length, `${mod.type} documents its classes`);
    for (const c of mod.cssClasses) assert.ok(all.includes(firstClass(c.selector)), `${mod.type}: ${c.selector}`);
  }
  for (const e of cssElements) {
    const cls = firstClass(e.selector);
    if (cls && cls !== 'ol-gate') assert.ok(all.includes(cls), e.selector);
  }
});

import {
  moveBlock, canMoveInto, findBlock, parentIdOf, flattenBlocks, isContainerType, MAX_DEPTH, cloneBlock,
} from '../src/index.js';

test('collections hold any block, including other collections', () => {
  const inner = newBlock('collection', { title: 'Inner', layout: 'grid' });
  const outer = newBlock('collection', { title: 'Outer' });
  outer.children = [newBlock('video', { url: 'https://youtu.be/dQw4w9WgXcQ' }), inner, newBlock('text', { text: 'hi' })];
  const page = sanitizePage({ ...createDefaultPage({ slug: 'demo' }), blocks: [outer] });
  assert.equal(page.blocks[0].children.length, 3);
  assert.equal(page.blocks[0].children[1].children.length, 2); // default links of the inner collection
  const { html } = renderPage(page);
  assert.ok(html.includes('ol-b-video') && html.includes('Inner') && html.includes('ol-col-card')); // links as cards inside a grid
});

test('old collections (data.items) become link blocks', () => {
  const page = sanitizePage({ blocks: [{ id: 'c', type: 'collection', data: { title: 'Old', items: [{ id: 'x1', title: 'A', url: 'https://a.com', image: '' }, { id: 'x2', title: 'B', url: 'https://b.com' }] } }] });
  const kids = page.blocks[0].children;
  assert.deepEqual(kids.map((k) => [k.type, k.data.title, k.data.url]), [['link', 'A', 'https://a.com/'], ['link', 'B', 'https://b.com/']]);
  assert.equal(page.blocks[0].data.items, undefined);
});

test('nesting depth is limited and children are dropped from non-containers', () => {
  let deep = newBlock('collection');
  for (let i = 0; i < MAX_DEPTH + 3; i++) { const c = newBlock('collection'); c.children = [deep]; deep = c; }
  const page = sanitizePage({ blocks: [deep, { ...newBlock('link', { title: 'x', url: 'https://x.com' }), children: [newBlock('text')] }] });
  let depth = 0;
  for (let b = page.blocks[0]; b?.children?.length; b = b.children.find((c) => c.type === 'collection')) depth++;
  assert.ok(depth <= MAX_DEPTH - 1);
  assert.equal(page.blocks[1].children, undefined);
});

test('moving blocks in and out of collections', () => {
  const a = newBlock('link', { title: 'A', url: 'https://a.com' });
  const col = newBlock('collection');
  let blocks = [a, col];
  blocks = moveBlock(blocks, a.id, col.id, 0, isContainerType);
  assert.equal(parentIdOf(blocks, a.id), col.id);
  assert.equal(blocks.length, 1);
  blocks = moveBlock(blocks, a.id, null, 0, isContainerType);
  assert.equal(parentIdOf(blocks, a.id), null);
  // a collection can't go inside itself or into a link
  assert.equal(canMoveInto(blocks, col.id, col.id, isContainerType), false);
  assert.equal(canMoveInto(blocks, col.id, a.id, isContainerType), false);
  // duplicate gives new ids to every descendant
  const copy = cloneBlock(findBlock(blocks, col.id));
  const ids = new Set(flattenBlocks(blocks).map((b) => b.id));
  assert.ok(flattenBlocks([copy]).every((b) => !ids.has(b.id)));
});

import { computeSlots, zonedToUtc, bookableDays, icsCalendar } from '../src/index.js';

const bookingData = (extra = {}) => ({
  timezone: 'America/Caracas', // UTC-4, no DST
  services: [{ id: 's1', name: 'Cut', duration: '60' }],
  hours: [{ id: 'h', day: 'mon', from: '09:00', to: '12:00' }],
  slotStep: 'service', buffer: '0', minNotice: '0', maxDays: 30, ...extra,
});
const NOW = new Date('2026-10-01T12:00:00Z'); // a Thursday

test('booking: slots follow business hours in the block time zone', () => {
  const slots = computeSlots({ data: bookingData(), serviceId: 's1', date: '2026-10-05', now: NOW });
  assert.deepEqual(slots, ['2026-10-05T13:00:00.000Z', '2026-10-05T14:00:00.000Z', '2026-10-05T15:00:00.000Z']);
  assert.deepEqual(computeSlots({ data: bookingData(), serviceId: 's1', date: '2026-10-06', now: NOW }), []); // Tuesday: closed
});

test('booking: existing bookings, buffer and minimum notice remove slots', () => {
  const taken = [{ start: '2026-10-05T14:00:00.000Z', end: '2026-10-05T15:00:00.000Z' }];
  assert.deepEqual(computeSlots({ data: bookingData(), serviceId: 's1', date: '2026-10-05', bookings: taken, now: NOW }), ['2026-10-05T13:00:00.000Z', '2026-10-05T15:00:00.000Z']);
  assert.deepEqual(computeSlots({ data: bookingData({ buffer: '15' }), serviceId: 's1', date: '2026-10-05', bookings: taken, now: NOW }), []);
  const nearNow = new Date('2026-10-05T12:30:00Z');
  assert.deepEqual(computeSlots({ data: bookingData({ minNotice: '2' }), serviceId: 's1', date: '2026-10-05', now: nearNow }), ['2026-10-05T15:00:00.000Z']);
});

test('booking: DST-aware conversion and bookable days', () => {
  // New York: EDT (UTC-4) in October, EST (UTC-5) in December.
  assert.equal(zonedToUtc('2026-10-05', 9 * 60, 'America/New_York').toISOString(), '2026-10-05T13:00:00.000Z');
  assert.equal(zonedToUtc('2026-12-07', 9 * 60, 'America/New_York').toISOString(), '2026-12-07T14:00:00.000Z');
  const days = bookableDays(bookingData({ maxDays: 14 }), NOW);
  assert.deepEqual(days, ['2026-10-05', '2026-10-12']);
});

test('booking: ics has the event and alarms', () => {
  const ics = icsCalendar([{ uid: 'x@o', start: '2026-10-05T13:00:00Z', end: '2026-10-05T14:00:00Z', title: 'Cut, wash', alarms: [60] }]);
  assert.ok(ics.includes('DTSTART:20261005T130000Z') && ics.includes('SUMMARY:Cut\\, wash') && ics.includes('TRIGGER:-PT60M'));
});

// ── Survey ───────────────────────────────────────────────────────────────
import { validateAnswers, responsesCsv, summarizeResponses } from '../src/index.js';

const QS = [
  { id: 'a', label: 'Name', type: 'short', required: true },
  { id: 'b', label: 'Where', type: 'single', options: 'Instagram\nTikTok', required: false },
  { id: 'c', label: 'Topics', type: 'multiple', options: 'Art\nMusic\nTech' },
  { id: 'd', label: 'Rate', type: 'rating', required: true },
  { id: 'e', label: 'Email', type: 'email' },
];

test('survey: answers are validated against the questions', () => {
  const ok = validateAnswers(QS, { a: ' Ana ', b: 'TikTok', c: ['Tech', 'Art', 'Tech'], d: '4', e: '', x: 'ignored' });
  assert.deepEqual(ok.errors, []);
  assert.deepEqual(ok.answers.map((a) => a.value), ['Ana', 'TikTok', ['Art', 'Tech'], 4, '']);
  const bad = validateAnswers(QS, { a: '', b: 'Facebook', c: ['Cooking'], d: 9, e: 'nope' });
  assert.deepEqual(bad.errors.map((e) => e.id), ['a', 'b', 'c', 'd', 'e']);
});

test('survey: csv and summary', () => {
  const responses = [
    { createdAt: '2026-10-02T10:00:00Z', answers: validateAnswers(QS, { a: '=cmd', b: 'TikTok', c: ['Art'], d: 5 }).answers },
    { createdAt: '2026-10-01T10:00:00Z', answers: validateAnswers(QS, { a: 'Luis, "L"', b: 'Instagram', c: ['Art', 'Music'], d: 3 }).answers },
  ];
  const csv = responsesCsv(QS, responses);
  assert.ok(csv.startsWith('﻿Date,Name,Where,Topics,Rate,Email'));
  assert.ok(csv.includes("'=cmd") && csv.includes('"Luis, ""L"""') && csv.includes('"Art, Music"') && csv.includes('5/5'));
  const sum = summarizeResponses(QS, responses);
  assert.deepEqual(sum.find((s) => s.id === 'c').counts, { Art: 2, Music: 1, Tech: 0 });
  assert.equal(sum.find((s) => s.id === 'd').average, 4);
});

test('survey: renders every question type', () => {
  const page = createDefaultPage({ slug: 'demo' });
  const b = newBlock('survey');
  b.data.questions = ['short', 'long', 'single', 'multiple', 'dropdown', 'rating', 'scale', 'yesno', 'email', 'number', 'date']
    .map((type, i) => ({ id: `q${i}`, label: `Q<${type}>`, type, options: 'One\nTwo', hint: '', required: i === 0 }));
  page.blocks = [b];
  const { html } = renderPage(sanitizePage(page), { mode: 'live' });
  for (const t of ['short', 'long', 'rating', 'scale', 'date']) assert.ok(html.includes(`data-type="${t}"`), t);
  assert.ok(html.includes('Q&lt;short&gt;') && !html.includes('Q<short>'));
  const exp = renderPage(sanitizePage(page), { mode: 'export', liveUrl: 'https://x.io/demo' }).html;
  assert.ok(exp.includes('https://x.io/demo') && !exp.includes('<form'));
});

test('booking: private fields (meeting link) are removed from public blocks', async () => {
  const { stripPrivateFields } = await import('../src/index.js');
  const blocks = [{ id: 'c', type: 'collection', data: {}, children: [{ id: 'b', type: 'booking', data: { meetingUrl: 'https://meet.google.com/abc', buttonLabel: 'Book' } }] }];
  const out = stripPrivateFields(blocks);
  assert.equal(out[0].children[0].data.meetingUrl, undefined);
  assert.equal(out[0].children[0].data.buttonLabel, 'Book');
  assert.equal(blocks[0].children[0].data.meetingUrl, 'https://meet.google.com/abc'); // original untouched
});

test('reviews: renders a button + card, and links to the live page in exports', async () => {
  const { starsHtml } = await import('../src/blocks/reviews.js');
  const page = createDefaultPage({ slug: 'demo' });
  page.blocks = [newBlock('reviews', { title: 'What <clients> say' })];
  const { html } = renderPage(sanitizePage(page), { mode: 'live' });
  assert.ok(html.includes('class="ol-reviews"') && html.includes('class="ol-card ol-rev"') && !html.includes('<clients>'));
  const exp = renderPage(sanitizePage(page), { mode: 'export', liveUrl: 'https://x.io/demo' }).html;
  assert.ok(exp.includes('https://x.io/demo') && !exp.includes('ol-rev"'));
  assert.ok(starsHtml(4.5).includes('width:90%'));
});

test('image adjustments: sanitized and applied to avatar, thumbnails, image block and wallpaper', () => {
  const page = createDefaultPage({ slug: 'demo' });
  page.profile.avatar = 'https://x.io/a.jpg';
  page.profile.avatarAdjust = { x: 30, y: 200, zoom: 150, fit: 'cover' };
  page.blocks = [
    newBlock('link', { title: 'L', url: 'https://x.io', thumbnail: 'https://x.io/t.jpg', thumbnailAdjust: { x: 10, y: 90, zoom: 100, fit: 'contain' } }),
    newBlock('image', { image: 'https://x.io/i.jpg', ratio: '1 / 1', adjust: { x: 50, y: 20, zoom: 200, fit: 'cover' } }),
  ];
  page.design.wallpaper = { type: 'image', image: 'https://x.io/bg.jpg', adjust: { x: 40, y: 60, zoom: 120, fit: 'cover' } };
  const clean = sanitizePage(page);
  assert.deepEqual(clean.profile.avatarAdjust, { x: 30, y: 100, zoom: 150, fit: 'cover' });
  const { html, css } = renderPage(clean, { mode: 'live' });
  assert.ok(html.includes('<span class="ol-avatar ol-avatar-circle ol-zoom"><img src="https://x.io/a.jpg"'));
  assert.ok(html.includes('transform:scale(1.5);transform-origin:30% 100%'));
  assert.ok(html.includes('class="ol-btn-thumb" src="https://x.io/t.jpg"') && html.includes('object-fit:contain;object-position:10% 90%'));
  assert.ok(html.includes('<span class="ol-image-frame" style="aspect-ratio:1 / 1">'));
  assert.ok(css.includes('40% 60%/cover') && css.includes('scale(1.2)'));
});

test('embed: plain iframes are rebuilt, other code is sandboxed, both can be a button', async () => {
  const { parseEmbed } = await import('../src/blocks/embed.js');
  assert.equal(parseEmbed('<iframe src="javascript:alert(1)"></iframe>'), null);
  const yt = parseEmbed('<iframe width="560" height="315" src="https://www.youtube.com/embed/x?a=1&amp;b=2" title="YT" allow="autoplay; encrypted-media" onload="evil()"></iframe>');
  assert.deepEqual(yt, { kind: 'iframe', src: 'https://www.youtube.com/embed/x?a=1&b=2', allow: 'autoplay; encrypted-media', title: 'YT', width: 560, height: 315 });

  const page = createDefaultPage({ slug: 'demo' });
  page.blocks = [
    newBlock('embed', { code: '<iframe width="560" height="315" src="https://www.youtube.com/embed/x" onload="evil()"></iframe>' }),
    newBlock('embed', { code: '<div id="w"></div><script src="https://widget.example/w.js"></script>', display: 'button', buttonLabel: 'Book a call' }),
    newBlock('map', { address: 'Caracas', display: 'button' }),
  ];
  const { html } = renderPage(sanitizePage(page), { mode: 'live' });
  assert.ok(html.includes('aspect-ratio:560 / 315') && !html.includes('evil'));
  assert.ok(html.includes('sandbox="allow-scripts') && !html.includes('allow-same-origin') && !html.includes('<script src="https://widget'));
  assert.ok(html.includes('srcdoc="&lt;!doctype html&gt;'));
  assert.ok(html.includes('<details class="ol-toggle"') && html.includes('Book a call') && html.includes('See on the map'));
});

test('plans: legacy users are Pro, Free locks features, Business limits are editable', async () => {
  const { resolvePlan, allowsBlock, allowsWallpaper, allowsSection, countLockedBlocks, stripLockedBlocks, sanitizeLimits } = await import('../src/index.js');
  const legacy = resolvePlan({ id: 'u' });
  assert.equal(legacy.id, 'pro'); assert.equal(legacy.maxPages, 10);
  const free = resolvePlan({ plan: 'free' });
  assert.equal(free.maxPages, 1);
  assert.ok(!allowsBlock(free, 'booking') && !allowsBlock(free, 'embed') && allowsBlock(free, 'link') && allowsBlock(free, 'collection'));
  assert.ok(!allowsWallpaper(free, 'image') && !allowsWallpaper(free, 'video') && allowsWallpaper(free, 'gradient'));
  assert.ok(!allowsSection(free, 'agenda') && allowsSection(free, 'analytics') && allowsSection(free, 'settings'));
  const biz = resolvePlan({ plan: 'business', limits: sanitizeLimits({ maxPages: '25', features: { booking: false, junk: true } }) });
  assert.equal(biz.maxPages, 25); assert.ok(!allowsBlock(biz, 'booking') && allowsBlock(biz, 'reviews'));
  const blocks = [{ type: 'link' }, { type: 'collection', children: [{ type: 'survey' }, { type: 'embed' }] }, { type: 'booking' }];
  assert.equal(countLockedBlocks(blocks, free), 3);
  assert.deepEqual(JSON.parse(JSON.stringify(stripLockedBlocks(blocks, free))), [{ type: 'link' }, { type: 'collection', children: [] }]);
  assert.equal(resolvePlan(null).id, 'free');
});

// ── Booking: special dates ─────────────────────────────────────────────
test('booking: closed days, blocked hours and special hours', () => {
  const rules = [
    { id: 'a', from: '2026-10-12', to: '2026-10-12', kind: 'closed', ranges: [] },
    { id: 'b', from: '2026-10-05', to: '2026-10-05', kind: 'block', ranges: [{ from: '10:00', to: '11:00' }] },
    { id: 'c', from: '2026-10-10', to: '2026-10-10', kind: 'open', ranges: [{ from: '15:00', to: '17:00' }] }, // a Saturday
  ];
  const data = bookingData({ dateRules: rules, maxDays: 14 });
  assert.deepEqual(computeSlots({ data, serviceId: 's1', date: '2026-10-05', now: NOW }), ['2026-10-05T13:00:00.000Z', '2026-10-05T15:00:00.000Z']);
  assert.deepEqual(computeSlots({ data, serviceId: 's1', date: '2026-10-12', now: NOW }), []);
  assert.deepEqual(computeSlots({ data, serviceId: 's1', date: '2026-10-10', now: NOW }), ['2026-10-10T19:00:00.000Z', '2026-10-10T20:00:00.000Z']);
  assert.deepEqual(bookableDays(data, NOW), ['2026-10-05', '2026-10-10']);
  // A day fully blocked is not offered.
  const full = bookingData({ maxDays: 14, dateRules: [{ id: 'x', from: '2026-10-05', to: '2026-10-05', kind: 'block', ranges: [{ from: '09:00', to: '12:00' }] }] });
  assert.deepEqual(bookableDays(full, NOW), ['2026-10-12']);
});

test('booking: daily limit and midnight end', () => {
  const taken = [{ start: '2026-10-05T13:00:00.000Z', end: '2026-10-05T14:00:00.000Z' }];
  assert.deepEqual(computeSlots({ data: bookingData({ maxPerDay: '1' }), serviceId: 's1', date: '2026-10-05', bookings: taken, now: NOW }), []);
  const late = bookingData({ hours: [{ id: 'h', day: 'mon', from: '22:00', to: '00:00' }] });
  assert.equal(computeSlots({ data: late, serviceId: 's1', date: '2026-10-05', now: NOW }).length, 2);
});

test('booking: date rules are sanitized and notes stay private', async () => {
  const { sanitizeBlock, stripPrivateFields } = await import('../src/index.js');
  const b = sanitizeBlock({ id: 'k', type: 'booking', data: { dateRules: [
    { from: '2026-02-30', kind: 'closed' }, { from: '2026-12-26', to: '2026-12-24', kind: 'nope', note: 'Family' },
    { from: '2026-11-02', kind: 'block', ranges: [{ from: '12:00', to: '13:00' }, { from: 'x', to: '1' }] },
  ] } });
  assert.equal(b.data.dateRules.length, 2);
  assert.deepEqual([b.data.dateRules[0].from, b.data.dateRules[0].to, b.data.dateRules[0].kind], ['2026-12-26', '2026-12-26', 'closed']);
  assert.equal(b.data.dateRules[1].ranges.length, 1);
  const pub = stripPrivateFields([b])[0];
  assert.equal(pub.data.dateRules[0].note, undefined);
  assert.equal(b.data.dateRules[0].note, 'Family');
});

// ── Banner ──────────────────────────────────────────────────────────────
test('banner: renders a link with escaped text, image and button', async () => {
  const { blockTypes, sanitizeBlock } = await import('../src/index.js');
  const mod = blockTypes.get('banner');
  const b = sanitizeBlock({ id: 'bn', type: 'banner', data: { title: 'Sale <b>', url: 'shop.com', buttonLabel: 'Shop', image: 'https://x.co/a.jpg', ratio: '3 / 1', align: 'center' } });
  const html = mod.render(b.data, { blockId: 'bn' });
  assert.ok(html.startsWith('<a class="ol-banner al-center at-bottom has-image"'));
  assert.ok(html.includes('href="https://shop.com/"') && html.includes('Sale &lt;b&gt;') && html.includes('ol-banner-btn') && html.includes('aspect-ratio:3 / 1'));
  const plain = mod.render(sanitizeBlock({ id: 'c', type: 'banner', data: { url: 'javascript:alert(1)', buttonLabel: 'x' } }).data, { blockId: 'c' });
  assert.ok(plain.startsWith('<div') && !plain.includes('javascript') && !plain.includes('ol-banner-btn'));
});

test('design: color scheme follows the dashboard colors', async () => {
  const { colorSchemeOf, designCss, resolveDesign } = await import('../src/index.js');
  assert.equal(colorSchemeOf({ surfaceTextColor: '#17171f' }), 'light');
  assert.equal(colorSchemeOf({ surfaceTextColor: '#f5f5f5' }), 'dark');
  assert.ok(designCss(resolveDesign({})).includes('color-scheme:'));
});

// ── Catalog ─────────────────────────────────────────────────────────────
test('catalog: prices, discount, stock, WhatsApp order and plan lock', async () => {
  const { blockTypes, sanitizeBlock, resolvePlan, allowsBlock } = await import('../src/index.js');
  const { formatMoney, salePrice } = await import('../src/blocks/catalog.js');
  assert.equal(formatMoney(1234.5, { currency: '$' }), '$1,234.50');
  assert.equal(formatMoney(1234.5, { currency: '€', currencyPosition: 'after', numberFormat: 'comma' }), '1.234,50 €');
  assert.equal(formatMoney(40, { currency: 'Bs.' }), 'Bs. 40');
  assert.equal(salePrice({ price: 50, discount: 20 }), 40);
  const b = sanitizeBlock({ id: 'c', type: 'catalog', data: { display: 'always', whatsapp: '+58 412-555', products: [
    { name: 'Mug <x>', price: 50, discount: 20, stock: '3' },
    { name: 'Shirt', price: 10, stock: '0', url: 'shop.com/shirt' },
    { name: 'Hat', price: 0, stock: '' },
  ] } });
  const html = blockTypes.get('catalog').render(b.data, { blockId: 'c' });
  assert.ok(html.includes('Mug &lt;x&gt;') && html.includes('$40') && html.includes('<s class="ol-cat-old">$50</s>') && html.includes('-20%'));
  assert.ok(html.includes('Only 3 left') && html.includes('Sold out') && html.includes('https://wa.me/58412555?text='));
  assert.ok(html.includes('aria-disabled="true"') && !html.includes('href="https://shop.com/shirt"'));
  assert.equal(allowsBlock(resolvePlan({ plan: 'free' }), 'catalog'), false);
  assert.equal(allowsBlock(resolvePlan({ plan: 'pro' }), 'catalog'), true);
  const btn = blockTypes.get('catalog').render(sanitizeBlock({ id: 'd', type: 'catalog', data: {} }).data, { blockId: 'd' });
  assert.ok(btn.startsWith('<details class="ol-toggle ol-cat-toggle"'));
});

// ── Themes, button styles and per-block style ───────────────────────────
test('new themes and button styles are registered', async () => {
  const { themes, buttonStyles, applyTheme, resolveDesign, renderPage, createDefaultPage, sanitizePage } = await import('../src/index.js');
  for (const id of ['cel', 'punk', 'art-pop', 'dark', '3d']) assert.ok(themes.get(id), id);
  for (const id of ['3d', 'cel', 'pop', 'punk', 'soft-ui', 'double', 'sticker', 'dashed']) assert.ok(buttonStyles.get(id), id);
  const page = sanitizePage(createDefaultPage({ slug: 'x', title: 'X' }));
  page.design = applyTheme(resolveDesign({}), 'punk');
  assert.ok(renderPage(page).css.includes('clip-path:polygon'));
});

test('glass opacity and blur become CSS variables', async () => {
  const { designCss, resolveDesign } = await import('../src/index.js');
  const css = designCss(resolveDesign({ buttonStyle: 'glass', buttonGlassOpacity: 40, buttonGlassBlur: 6 }));
  assert.ok(css.includes('--ol-glass-alpha:40%') && css.includes('--ol-glass-blur:6px'));
});

test('a block can have its own style', async () => {
  const { renderPage, createDefaultPage, sanitizePage, hasBlockStyle } = await import('../src/index.js');
  const page = sanitizePage(createDefaultPage({ slug: 'x', title: 'X' }));
  page.blocks[0].options = { ...page.blocks[0].options, stButtonStyle: 'glass', stGlassOpacity: '50', stButtonColor: '#ff0000', stTextColor: 'bad' };
  const clean = sanitizePage(page);
  const o = clean.blocks[0].options;
  assert.equal(o.stButtonColor, '#ff0000');
  assert.equal(o.stTextColor, undefined); // invalid colors are dropped
  assert.ok(hasBlockStyle(o) && !hasBlockStyle(clean.blocks[1]?.options || {}));
  const { html, css } = renderPage(clean);
  assert.ok(html.includes('ol-styled ol-bs-glass') && html.includes('--ol-btn-bg:#ff0000') && html.includes('--ol-glass-alpha:50%'));
  assert.ok(css.includes('.ol-root .ol-bs-glass.ol-styled .ol-btn{'));
});

test('copy block and content protection', async () => {
  const { blockTypes, sanitizeBlock, renderPage, createDefaultPage, sanitizePage } = await import('../src/index.js');
  const b = sanitizeBlock({ id: 'c1', type: 'copy', data: { title: 'Copy code', text: 'SAVE"20<' } });
  const html = blockTypes.get('copy').render(b.data, { blockId: 'c1' });
  assert.ok(html.includes('data-copy="SAVE&quot;20&lt;"') && html.includes('<button type="button" class="ol-btn has-media ol-copybtn"'));
  const page = sanitizePage({ ...createDefaultPage({ slug: 'x', title: 'X' }), settings: { noSelect: true, noRightClick: true } });
  const r = renderPage(page);
  assert.ok(r.html.includes('ol-noselect ol-nomenu') && r.css.includes('.ol-root.ol-noselect{'));
  assert.ok(!renderPage(sanitizePage(createDefaultPage({ slug: 'y', title: 'Y' }))).html.includes('ol-noselect'));
});

test('block style shows only the options that affect the block', async () => {
  const { blockStyleFieldsFor, blockStyleOf, blockStyleGroups } = await import('../src/index.js');
  const keys = (b) => blockStyleFieldsFor(b).map((f) => f.key);
  assert.ok(!keys({ type: 'link' }).includes('stSurfaceColor'));
  assert.ok(!keys({ type: 'text', data: {} }).includes('stButtonStyle'));
  assert.ok(keys({ type: 'text', data: { card: true } }).includes('stSurfaceColor'));
  assert.ok(keys({ type: 'catalog', data: { display: 'button' } }).includes('stButtonStyle'));
  assert.ok(!keys({ type: 'catalog', data: { display: 'always' } }).includes('stButtonStyle'));
  assert.deepEqual(keys({ type: 'header' }), ['stTextColor']);
  // Leftover values of other groups are ignored when rendering.
  const link = { type: 'link', options: { stSurfaceColor: '#ff0000' } };
  assert.equal(blockStyleOf(link.options, blockStyleGroups(link)), null);
});

test('social icons can show at the top and the bottom', async () => {
  const { renderPage, createDefaultPage, sanitizePage, resolveDesign } = await import('../src/index.js');
  const page = sanitizePage({ ...createDefaultPage({ slug: 'x', title: 'X' }), socials: [{ id: 's', platform: 'instagram', url: 'https://instagram.com/x' }] });
  const count = (pos) => { page.design = resolveDesign({ ...page.design, socialsPosition: pos }); return (renderPage(page).html.match(/instagram\.com\/x/g) || []).length; };
  assert.equal(count('top'), 1);
  assert.equal(count('bottom'), 1);
  assert.equal(count('both'), 2);
  assert.equal(sanitizePage({ ...page, design: { ...page.design, socialsPosition: 'both' } }).design.socialsPosition, 'both');
});

test('block text color reaches captions (inherited text)', async () => {
  const { renderPage, createDefaultPage, sanitizePage, blockStyleFieldsFor } = await import('../src/index.js');
  const page = sanitizePage(createDefaultPage({ slug: 'x', title: 'X' }));
  page.blocks = [{ id: 'g', type: 'gallery', enabled: true, data: { items: [{ id: 'i', image: 'https://x.co/a.jpg', caption: 'Hi' }] }, options: { stTextColor: '#ff0000' } }];
  const r = renderPage(sanitizePage(page));
  assert.ok(r.html.includes('--ol-text-color:#ff0000') && r.css.includes('.ol-root .ol-styled{color:var(--ol-text-color)}'));
  assert.ok(blockStyleFieldsFor({ type: 'gallery', data: { items: [{ caption: 'Hi' }] } }).some((f) => f.key === 'stTextColor'));
  assert.ok(!blockStyleFieldsFor({ type: 'gallery', data: { items: [{ caption: '' }] } }).some((f) => f.key === 'stTextColor'));
});

test('blocks that can never be clicked are known', async () => {
  const { blockTracksClicks } = await import('../src/index.js');
  assert.equal(blockTracksClicks({ type: 'text', data: {} }), false);
  assert.equal(blockTracksClicks({ type: 'header', data: {} }), false);
  assert.equal(blockTracksClicks({ type: 'link', data: {} }), true);
  assert.equal(blockTracksClicks({ type: 'image', data: { url: '' } }), false);
  assert.equal(blockTracksClicks({ type: 'image', data: { url: 'https://x.co' } }), true);
  assert.equal(blockTracksClicks({ type: 'map', data: { display: 'always' } }), false);
  assert.equal(blockTracksClicks({ type: 'collection', data: { mode: 'button' } }), true);
});

test('open status follows weekly hours, overnight ranges and days off', async () => {
  const { openStatus } = await import('../src/index.js');
  const d = { timezone: 'America/Caracas', hours: [{ day: 'tue', from: '18:00', to: '02:00' }, { day: 'wed', from: '11:00', to: '15:00' }], dateRules: [] };
  // Tue 2026-10-06 19:30 Caracas (UTC-4) → open until 02:00 Wed.
  let s = openStatus(d, new Date('2026-10-06T23:30:00Z'));
  assert.equal(s.open, true);
  assert.deepEqual(s.closesAt, { date: '2026-10-07', min: 120 });
  // Wed 01:00 → still open (tail of Tuesday).
  assert.equal(openStatus(d, new Date('2026-10-07T05:00:00Z')).open, true);
  // Wed 03:00 → closed, opens Wed 11:00.
  s = openStatus(d, new Date('2026-10-07T07:00:00Z'));
  assert.equal(s.open, false);
  assert.deepEqual(s.opensAt, { date: '2026-10-07', min: 660 });
  // A day off on Wednesday moves the next opening to the next Tuesday.
  s = openStatus({ ...d, dateRules: [{ from: '2026-10-07', to: '2026-10-07', kind: 'closed' }] }, new Date('2026-10-07T07:00:00Z'));
  assert.deepEqual(s.opensAt, { date: '2026-10-13', min: 1080 });
});

test('Open / Closed block: the Today override wins', async () => {
  const { statusInfo, newBlock } = await import('../src/index.js');
  const b = newBlock('status');
  assert.equal(statusInfo(b.data, { today: { status: 'closed' } }).open, false);
  assert.equal(statusInfo(b.data, { today: { status: 'open' } }).text, 'Open now');
});

test('route stops and today location', async () => {
  const { currentStop, locationNow, newBlock } = await import('../src/index.js');
  const stops = [{ id: 'a', day: 'daily', place: 'Plaza', from: '11:00', to: '15:00' }, { id: 'b', day: 'tue', place: 'Campus', from: '17:00', to: '23:00' }];
  // Tue 18:00 Caracas.
  const now = new Date('2026-10-06T22:00:00Z');
  assert.equal(currentStop(stops, 'America/Caracas', now).id, 'b');
  // Tue 08:00 → next stop today.
  assert.equal(currentStop(stops, 'America/Caracas', new Date('2026-10-06T12:00:00Z')).id, 'a');
  const loc = newBlock('location').data;
  loc.timezone = 'America/Caracas';
  const route = { id: 'r', type: 'route', enabled: true, data: { stops, timezone: 'America/Caracas' } };
  // A location set yesterday is not shown: the route is used.
  const old = { place: 'Old spot', placeAt: '2026-10-05T15:00:00Z' };
  assert.equal(locationNow(loc, { blocks: [route], today: old }, now).place, 'Campus');
  assert.equal(locationNow(loc, { blocks: [route], today: { place: 'Park', placeAt: '2026-10-06T20:00:00Z' } }, now).place, 'Park');
});

test('catalog orders are priced from the block', async () => {
  const { priceCart, parseExtras, productKey } = await import('../src/index.js');
  assert.deepEqual(parseExtras('Cheese = 1.50\nBacon +2\nNo onion\nSalsa 0,75'), [
    { name: 'Cheese', price: 1.5 }, { name: 'Bacon', price: 2 }, { name: 'No onion', price: 0 }, { name: 'Salsa', price: 0.75 },
  ]);
  const d = { products: [
    { id: 'a', name: 'Burger', price: 10, discount: 10, extras: 'Cheese = 1.5', stock: '' },
    { id: 'b', name: 'Cola', price: 2, stock: '0' },
    { id: 'c', name: 'Fries', price: 3, stock: '' },
  ] };
  const r = priceCart(d, [{ id: 'a', qty: 2, extras: [0, 0, 5] }, { id: 'c', qty: 1, price: 0 }], { blockId: 'k' });
  assert.equal(r.lines[0].unit, 10.5);
  assert.equal(r.total, 24);
  assert.equal(priceCart(d, [{ id: 'b', qty: 1 }]).error, 'sold_out');
  assert.equal(priceCart(d, [{ id: 'c', qty: 1 }], { blockId: 'k', today: { soldOut: [productKey('k', 'c')] } }).error, 'sold_out');
  assert.equal(priceCart(d, [{ id: 'c', qty: 0 }]).error, 'invalid_qty');
  assert.equal(priceCart(d, [{ id: 'zz', qty: 1 }]).error, 'unknown_product');
  assert.equal(priceCart(d, []).error, 'empty');
});

test('today state, plan features and loyalty codes are cleaned', async () => {
  const { sanitizeToday, stripLockedFeatures, parseCardCode, formatCardCode } = await import('../src/index.js');
  const t = sanitizeToday({ status: 'bogus', lat: '95', lon: '-66.9', until: '25:00', soldOut: ['a', 'a', 3], ordersPaused: 'yes' });
  assert.equal(t.status, 'auto');
  assert.equal(t.lat, null);
  assert.equal(t.lon, -66.9);
  assert.equal(t.until, '');
  assert.deepEqual(t.soldOut, ['a', '3']);
  assert.equal(t.ordersPaused, false);
  const page = { settings: { translateButton: true }, blocks: [{ type: 'catalog', data: { ordering: 'pickup' } }] };
  const free = stripLockedFeatures(page, { features: {} });
  assert.equal(free.blocks[0].data.ordering, 'links');
  assert.equal(free.settings.translateButton, false);
  assert.equal(stripLockedFeatures(page, { features: { orders: true, translate: true } }).blocks[0].data.ordering, 'pickup');
  assert.equal(parseCardCode('OLCARD:K7Q2MX'), 'K7Q2MX');
  assert.equal(parseCardCode('k7q-2mx'), 'K7Q2MX');
  assert.equal(parseCardCode('K7Q2M0'), '');
  assert.equal(formatCardCode('K7Q2MX'), 'K7Q-2MX');
});

test('translate switch is rendered with the page language', async () => {
  const { renderPage, createDefaultPage, sanitizePage } = await import('../src/index.js');
  const page = sanitizePage({ ...createDefaultPage({ slug: 'x' }), settings: { language: 'es', translateButton: true } });
  const r = renderPage(page);
  assert.ok(r.html.includes('lang="es"') && r.html.includes('data-ol-lang="en"') && r.html.includes('translate="no"'));
  assert.ok(renderPage(page, { mode: 'export' }).html.includes('data-ol-lang')); // exported sites switch language too
  assert.ok(!renderPage(sanitizePage({ ...page, settings: { language: 'es' } })).html.includes('data-ol-lang'));
});

test('code block: language from the file name, lines and colors', async () => {
  const { codeLanguage, parseLineList, splitHtmlLines, highlight, renderPage, createDefaultPage, sanitizePage } = await import('../src/index.js');
  assert.equal(codeLanguage({ language: 'auto', filename: 'README.md' }), 'markdown');
  assert.equal(codeLanguage({ language: 'auto', filename: 'schema.sql' }), 'sql');
  assert.equal(codeLanguage({ language: 'css', filename: 'x.sql' }), 'css');
  assert.deepEqual([...parseLineList('2, 5-6 x')], [2, 5, 6]);
  const { html } = await highlight('/* a\nb */ SELECT 1;', 'sql');
  const lines = splitHtmlLines(html);
  assert.equal(lines.length, 2);
  assert.ok(lines.every((l) => (l.match(/<span/g) || []).length === (l.match(/<\/span>/g) || []).length));
  const page = sanitizePage({ ...createDefaultPage({ slug: 'x' }), blocks: [{ type: 'code', data: { code: '<b>\tx</b>\n\n', marked: '1' } }] });
  assert.equal(page.blocks[0].data.code, '<b>\tx</b>');
  const r = renderPage(page);
  assert.ok(r.html.includes('&lt;b&gt;  x&lt;/b&gt;') && r.html.includes('is-marked') && r.html.includes('translate="no"'));
});

test('HTML block runs in a sandbox and is a Pro feature', async () => {
  const { renderPage, createDefaultPage, sanitizePage, htmlBlockDoc, allowsBlock, PLANS, resolveDesign } = await import('../src/index.js');
  const page = sanitizePage({ ...createDefaultPage({ slug: 'x' }), blocks: [{ type: 'html', data: { html: '<p>Hi</p>', js: 'x("</script><b>")', css: 'p{color:red}</style>' } }] });
  const r = renderPage(page);
  assert.ok(/<iframe [^>]*sandbox="allow-scripts[^"]*"/.test(r.html) && !/sandbox="[^"]*allow-same-origin/.test(r.html));
  assert.ok(!r.html.includes('<p>Hi</p>')); // never inline: only escaped inside srcdoc
  const doc = htmlBlockDoc(page.blocks[0].data, { id: 'b', design: resolveDesign({}) });
  assert.ok(doc.includes('<\\/script><b>') && doc.includes('<\\/style>') && doc.includes(':root{--ol-btn-bg'));
  assert.equal(allowsBlock(PLANS.free, 'html'), false);
  assert.equal(allowsBlock(PLANS.pro, 'html'), true);
});

test('navigation menu lists sections and gives them anchors', async () => {
  const { navItems, navSlug, renderPage, createDefaultPage, sanitizePage } = await import('../src/index.js');
  assert.equal(navSlug('Nuestro Menú!'), 'nuestro-menu');
  const blocks = [
    { id: 'h1', type: 'header', data: { text: 'Menu' } },
    { id: 'l1', type: 'link', data: { title: 'Instagram', url: 'https://x.co' } },
    { id: 'h2', type: 'header', data: { text: 'Menu' } },
    { id: 'l2', type: 'link', data: { title: 'Shop', url: 'https://x.co' }, options: { navLabel: 'Our shop' } },
    { id: 'h3', type: 'header', enabled: false, data: { text: 'Hidden' } },
  ];
  const page = sanitizePage({ ...createDefaultPage({ slug: 'x' }), blocks, settings: { navMenu: true } });
  assert.deepEqual(navItems(page).map((n) => [n.label, n.anchor]), [['Menu', 'menu'], ['Menu', 'menu-2'], ['Our shop', 'our-shop']]);
  assert.equal(navItems({ ...page, settings: { ...page.settings, navItems: 'all' } }).length, 4);
  const r = renderPage(page);
  assert.ok(r.html.includes('class="ol-nav-btn"') && r.html.includes('id="menu-2"') && r.html.includes('href="#our-shop"'));
  assert.ok(!renderPage(sanitizePage({ ...page, settings: {} })).html.includes('ol-nav-btn'));
});

test('plan features are grouped; Code block and events are Pro/Business, and Business can turn them off', async () => {
  const { groupedFeatures, PLAN_FEATURES, PLANS, allowsBlock, resolvePlan } = await import('../src/index.js');
  const groups = groupedFeatures();
  assert.deepEqual(groups.flatMap((g) => g.features.map((f) => f.key)).sort(), Object.keys(PLAN_FEATURES).sort());
  assert.equal(allowsBlock(PLANS.free, 'code'), false);
  assert.equal(allowsBlock(PLANS.free, 'events'), false);
  assert.equal(allowsBlock(PLANS.pro, 'code'), true);
  assert.equal(allowsBlock(PLANS.pro, 'events'), true);
  assert.equal(allowsBlock(PLANS.free, 'html'), false);
  assert.equal(allowsBlock(resolvePlan({ plan: 'business', limits: { features: { code: false } } }), 'code'), false);
});

test('ES / EN switch can live inside the navigation menu', async () => {
  const { renderPage, createDefaultPage, sanitizePage } = await import('../src/index.js');
  const base = { ...createDefaultPage({ slug: 'x' }), blocks: [{ type: 'header', data: { text: 'Menu' } }] };
  const inMenu = renderPage(sanitizePage({ ...base, settings: { translateButton: true, translatePlace: 'menu', navMenu: true } })).html;
  assert.ok(inMenu.includes('ol-lang-inmenu') && !inMenu.includes('<nav class="ol-lang'));
  // Without the navigation menu it stays in the corner.
  const corner = renderPage(sanitizePage({ ...base, settings: { translateButton: true, translatePlace: 'menu' } })).html;
  assert.ok(corner.includes('<nav class="ol-lang') && !corner.includes('ol-nav-btn'));
  // Menu on but no sections: the menu still opens, with just the language.
  const onlyLang = renderPage(sanitizePage({ ...base, blocks: [], settings: { translateButton: true, translatePlace: 'menu', navMenu: true } })).html;
  assert.ok(onlyLang.includes('ol-nav-btn') && onlyLang.includes('ol-lang-inmenu') && !onlyLang.includes('Back to top'));
});

test('events: dates, ranges, hours and past events', async () => {
  const { formatEventDate, formatEventTime, visibleEvents, renderPage, createDefaultPage, sanitizePage } = await import('../src/index.js');
  const now = Date.parse('2026-10-08T15:00:00Z');
  const d = { dateFormat: 'long', showYear: 'auto', timeFormat: 'auto', timezone: 'UTC' };
  const sp = (s) => s.replace(/[\u2009\u202f]/g, ' ');
  assert.equal(formatEventDate({ date: '2026-10-10' }, d, { now }), 'Saturday, October 10');
  assert.equal(sp(formatEventDate({ date: '2026-10-10', kind: 'range', endDate: '2026-10-12' }, { ...d, dateFormat: 'short' }, { now })), 'Oct 10 – 12');
  assert.equal(formatEventDate({ date: '2027-01-02' }, { ...d, dateFormat: 'short' }, { now }), 'Jan 2, 2027');
  assert.equal(formatEventDate({ date: '2026-10-10' }, { ...d, dateFormat: 'dayMonth' }, { locale: 'es', now }), '10 de octubre');
  assert.equal(sp(formatEventTime({ from: '19:00', to: '22:30' }, { timeFormat: '24h' })), '19:00 – 22:30');
  assert.equal(formatEventTime({ allDay: true, from: '19:00' }, d), '');
  const events = [
    { id: 'a', title: 'Old', date: '2026-10-01' },
    { id: 'b', title: 'Fair', date: '2026-10-07', kind: 'range', endDate: '2026-10-09' },
    { id: 'c', title: 'Show', date: '2026-10-20', from: '20:00' },
  ];
  assert.deepEqual(visibleEvents({ ...d, events, past: 'hide' }, now).map((e) => e.id), ['b', 'c']);
  assert.equal(visibleEvents({ ...d, events, past: 'hide' }, now)[0].now, true);
  assert.deepEqual(visibleEvents({ ...d, events, past: 'end' }, now).map((e) => e.id), ['b', 'c', 'a']);
  for (const layout of ['banners', 'carousel', 'grid', 'calendar']) {
    const page = sanitizePage({ ...createDefaultPage({ slug: 'x' }), blocks: [{ type: 'events', data: { ...d, layout, events } }] });
    const r = renderPage(page, { now });
    assert.ok(r.html.includes(`ol-events is-${layout}`), layout);
  }
});

test('map block: Google color filters and styled maps', async () => {
  const { renderPage, createDefaultPage, sanitizePage, styledMapDoc } = await import('../src/index.js');
  const pt = { lat: 48.8584, lon: 2.2945, query: 'Eiffel Tower' };
  const page = sanitizePage({ ...createDefaultPage({ slug: 'x' }), blocks: [
    { type: 'map', data: { address: 'Eiffel Tower', googleStyle: 'grayscale' } },
    { type: 'map', data: { address: 'Eiffel Tower', provider: 'styled', mapStyle: 'dark', point: pt } },
    { type: 'map', data: { address: 'Eiffel Tower', provider: 'styled', point: { lat: 'x', lon: 2 } } },
  ] });
  assert.deepEqual(page.blocks[2].data.point, {});
  const html = renderPage(page).html;
  assert.ok(html.includes('style="filter:grayscale(1)"'));
  assert.ok(/<iframe sandbox="allow-scripts[^"]*" srcdoc=/.test(html) && !/sandbox="[^"]*allow-same-origin/.test(html));
  assert.equal((html.match(/maps\.google\.com\/maps\?q=/g) || []).length, 2); // no point yet: falls back to Google Maps
  const doc = styledMapDoc({ point: pt, mapStyle: 'dark', zoom: 14, markerLabel: '</script><b>' }, { color: '#ff0000' });
  assert.ok(doc.includes('World_Dark_Gray_Base') && doc.includes('World_Dark_Gray_Reference') && doc.includes('integrity="sha256-') && doc.includes('#ff0000') && !doc.includes('</script><b>'));
});

test('invoices: totals, money and cleaning', async () => {
  const { sanitizeInvoice, invoiceTotals, invoiceMoney, invoiceCode, PLANS, allowsSection } = await import('../src/index.js');
  const inv = sanitizeInvoice({ status: 'bogus', items: [{ description: 'A', qty: 2, price: 150 }, { description: 'Credit', qty: 1, price: -20 }, { description: '', price: 0 }], discount: 10, taxRate: 16, client: { name: 'Ana', email: 'bad' } });
  assert.equal(inv.status, 'draft');
  assert.equal(inv.client.email, '');
  const t = invoiceTotals(inv);
  assert.equal(t.lines.length, 2);
  assert.deepEqual([t.subtotal, t.discount, t.tax, t.total], [280, 28, 40.32, 292.32]);
  assert.equal(invoiceMoney(-25, { currency: '$' }), '-$25');
  assert.equal(invoiceMoney(1234.5, { currency: '€', currencyPosition: 'after', numberFormat: 'comma' }), '1.234,50 €');
  assert.equal(invoiceCode('INV-', 7), 'INV-0007');
  assert.equal(allowsSection(PLANS.free, 'invoices'), false);
  assert.equal(allowsSection(PLANS.pro, 'invoices'), true);
});

test('24 templates in two versions (Classic + v2 Experimental) build valid pages', async () => {
  const { TEMPLATES, TEMPLATE_CATEGORIES, TEMPLATE_VERSIONS, buildTemplatePage, renderPage, blockTypes, themes } = await import('../src/index.js');
  assert.equal(TEMPLATES.length, 48);
  assert.equal(new Set(TEMPLATES.map((t) => t.id)).size, 48);
  assert.deepEqual(TEMPLATE_VERSIONS.map((v) => v.id), [1, 2]);
  for (const t of TEMPLATES.filter((x) => x.version === 2)) {
    assert.equal(t.family, t.id);
    assert.ok(TEMPLATES.some((o) => o.id === `${t.id}-v1` && o.family === t.id && o.version === 1), t.id);
  }
  assert.ok(!buildTemplatePage('musician-v1').design.customCss.includes('ol-sv'), 'v1 has no scroll reveal');
  assert.ok(buildTemplatePage('musician').design.customCss.includes('ol-sv'));
  for (const t of TEMPLATES) {
    assert.ok(TEMPLATE_CATEGORIES.includes(t.category) && themes.has(t.theme), t.id);
    const page = buildTemplatePage(t.id);
    assert.ok(page.blocks.length > 1 && page.blocks.every((b) => blockTypes.has(b.type)), t.id);
    assert.ok(renderPage({ id: 'x', slug: 'x', ...page }).html.includes('ol-root'), t.id);
  }
  assert.equal(buildTemplatePage('nope'), null);
});

test('page accent color (Cards & surfaces) reaches catalog buttons, overridable per block', async () => {
  const { designCss, resolveDesign, defaultDesign, renderPage, newBlock } = await import('../src/index.js');
  const plain = designCss(resolveDesign(defaultDesign()));
  assert.ok(!plain.includes('--ol-accent'), 'no accent var when empty');
  const { sanitizePage } = await import('../src/index.js');
  const d = sanitizePage({ profile: { title: 'x' }, blocks: [], socials: [], design: { ...defaultDesign(), accentColor: '#E11D48', accentTextColor: '#ffffff' } }).design;
  assert.equal(d.accentColor, '#e11d48');
  assert.equal(sanitizePage({ profile: { title: 'x' }, blocks: [], socials: [], design: { accentColor: 'nope' } }).design.accentColor, '');
  const css = designCss(d);
  assert.ok(css.includes('--ol-accent:#e11d48;') && css.includes('--ol-accent-fg:#ffffff;'));
  const cat = newBlock('catalog', { display: 'always', products: [{ id: 'p1', name: 'Taco', price: 3, url: 'https://example.com' }] });
  cat.options = { ...cat.options, stAccentColor: '#00ff00' };
  const r = renderPage({ id: 'x', slug: 'x', profile: { title: 'x' }, socials: [], blocks: [cat], design: d });
  assert.ok(r.css.includes('.ol-cat-buy{') && /\.ol-cat-buy\{[^}]*var\(--ol-accent,var\(--ol-surface-fg\)\)/.test(r.css));
  assert.ok(r.html.includes('--ol-accent:#00ff00'), 'block override');
});

test('API access (tokens & MCP) is Business only, and the admin can turn it off', async () => {
  const { resolvePlan, PLANS, groupedFeatures, sanitizeLimits } = await import('../src/index.js');
  assert.equal(PLANS.free.features.api, false);
  assert.equal(PLANS.pro.features.api, false);
  assert.equal(resolvePlan({ id: 'legacy' }).features.api, false);
  assert.equal(resolvePlan({ plan: 'business' }).features.api, true);
  assert.equal(resolvePlan({ plan: 'business', limits: sanitizeLimits({ features: { api: false } }) }).features.api, false);
  // Pro keeps every other feature except the Business-only ones (API, push notifications to visitors).
  assert.ok(Object.entries(PLANS.pro.features).every(([k, v]) => ['api', 'notifications'].includes(k) || v));
  const g = groupedFeatures().find((x) => x.id === 'integrations');
  assert.deepEqual(g.features, [{ key: 'api', label: 'API tokens & MCP', free: false, business: true }]);
});

test('color palettes: presets are readable, apply recolors without touching fonts or shapes', async () => {
  const { palettes, applyPalette, paletteFromColor, sanitizePalette, sanitizePaletteList, contrastRatio, applyTheme, defaultDesign, sanitizePage, MAX_CUSTOM_PALETTES } = await import('../src/index.js');
  assert.ok(palettes.list().length >= 20);
  for (const pal of palettes.list()) {
    const d = applyPalette(applyTheme(defaultDesign(), 'air'), pal.id);
    assert.ok(contrastRatio(d.titleColor, pal.colors.bg) >= 4.5, `${pal.id} text`);
    assert.ok(contrastRatio(d.textColor, pal.colors.bg) >= 3, `${pal.id} muted text`);
    assert.ok(contrastRatio(d.surfaceTextColor, pal.colors.surface) >= 4.5, `${pal.id} cards`);
    assert.ok(contrastRatio(d.buttonTextColor, d.buttonColor) >= 3, `${pal.id} buttons`);
    assert.ok(contrastRatio(d.accentTextColor, d.accentColor) >= 3, `${pal.id} accent`);
  }
  // Keeps fonts, button style, background type; changes colors of each background type.
  const luxe = applyTheme(defaultDesign(), 'luxe');
  const d = applyPalette(luxe, 'ocean-breeze');
  assert.equal(d.titleFont, luxe.titleFont);
  assert.equal(d.buttonStyle, 'double');
  assert.equal(d.wallpaper.type, luxe.wallpaper.type);
  assert.equal(d.wallpaper.from, '#eef8fb');
  assert.equal(d.palette, 'ocean-breeze');
  assert.equal(applyPalette({ wallpaper: { type: 'pattern', bg: '#000', fg: '#111' } }, 'mint').wallpaper.bg, '#effbf6');
  assert.equal(applyPalette({ wallpaper: { type: 'aurora' } }, 'royal').wallpaper.c1, '#c77dff');
  assert.equal(applyPalette({ wallpaper: { type: 'solid' } }, 'nope').wallpaper.color, undefined, 'unknown id: unchanged');
  // Card transparency is kept.
  assert.equal(applyPalette({ surfaceColor: '#ffffff26', wallpaper: { type: 'solid' } }, 'midnight').surfaceColor, '#141b3326');
  // Saved in the page design.
  const page = sanitizePage({ design: d });
  assert.equal(page.design.palette, 'ocean-breeze');
  // From one color, light and dark.
  for (const mode of ['light', 'dark']) {
    const g = paletteFromColor('#e11d48', mode);
    const x = applyPalette(defaultDesign(), g);
    assert.ok(contrastRatio(x.titleColor, g.colors.bg) >= 4.5, mode);
    assert.equal(g.dark, mode === 'dark');
  }
  // Custom palettes.
  assert.equal(sanitizePalette({ colors: { bg: 'red' } }), null);
  const c = sanitizePalette({ name: 'Mine\n', colors: { bg: '#FFF', text: '#111', primary: '#f00' } });
  assert.deepEqual([c.name, c.colors.bg, c.colors.accent], ['Mine', '#ffffff', '#ff0000']);
  assert.ok(c.colors.bg2 && c.colors.surface);
  const many = Array.from({ length: 40 }, (_, i) => ({ id: `p${i}`, colors: { bg: '#fff', text: '#000', primary: '#00f' } }));
  assert.equal(sanitizePaletteList([...many, many[0]]).length, MAX_CUSTOM_PALETTES);
});

test('motion: more entrances, per-block entrance, speed, background motion, press, hovers and attention', async () => {
  const { entranceAnimations, attentionAnimations, backgroundMotions, buttonHovers, renderPage, sanitizePage, createDefaultPage, newBlock, designCss, resolveDesign } = await import('../src/index.js');
  assert.ok(entranceAnimations.list().length >= 15);
  assert.ok(attentionAnimations.list().length >= 15);
  assert.ok(buttonHovers.list().length >= 12);
  for (const id of ['breathe', 'pan', 'flow', 'hue', 'parallax']) assert.ok(backgroundMotions.has(id), id);
  const base = createDefaultPage({ slug: 'mo' });
  const link = newBlock('link', { title: 'A', url: 'https://a.example' });
  link.options.enter = 'pop';
  const hidden = newBlock('link', { title: 'B', url: 'https://b.example' });
  hidden.options.enter = 'none';
  const plain = newBlock('link', { title: 'C', url: 'https://c.example' });
  const page = sanitizePage({ ...base, blocks: [link, hidden, plain], design: { ...base.design, entrance: 'rise', entranceSpeed: 'slow', backgroundMotion: 'breathe', buttonPress: true } });
  assert.equal(page.blocks[0].options.enter, 'pop');
  const { html, css } = renderPage(page);
  assert.match(html, /class="ol-root[^"]*ol-enter-rise[^"]*ol-bgm-breathe[^"]*ol-press/);
  assert.match(html, new RegExp(`class="ol-block ol-b-link ol-enter ol-in-pop"[^>]*data-block-id="${link.id}"`));
  assert.match(html, new RegExp(`class="ol-block ol-b-link"[^>]*data-block-id="${hidden.id}"`));
  assert.match(html, new RegExp(`class="ol-block ol-b-link ol-enter"[^>]*data-block-id="${plain.id}"`));
  assert.ok(css.includes('@keyframes ol-in-rise') && css.includes('@keyframes ol-in-pop') && css.includes('ol-bgm-breathe') && css.includes('.ol-press'));
  assert.ok(css.includes('var(--ol-enter-speed,1)'));
  assert.ok(designCss(resolveDesign(page.design)).includes('--ol-enter-speed:1.6;'));
  // "Flow" only with gradient backgrounds; nothing moves in the dashboard preview (animate off).
  const flowSolid = renderPage(sanitizePage({ ...page, design: { ...page.design, backgroundMotion: 'flow' } }));
  assert.ok(!flowSolid.html.includes('ol-bgm-flow'));
  const flowGrad = renderPage(sanitizePage({ ...page, design: { ...page.design, backgroundMotion: 'flow', wallpaper: { type: 'gradient' } } }));
  assert.ok(flowGrad.html.includes('ol-bgm-flow'));
  const preview = renderPage(page, { mode: 'preview' });
  assert.ok(!preview.html.includes('ol-in-pop') && !preview.html.includes('ol-bgm-breathe'));
  // New attention animation CSS is included when used.
  const shiny = newBlock('link', { title: 'S', url: 'https://s.example' });
  shiny.options.animation = 'shine';
  assert.ok(renderPage(sanitizePage({ ...base, blocks: [shiny] })).css.includes('@keyframes ol-shine'));
});

test('referrals: campaigns by dates, rewards only for Pro, limits, masks and month allocation', async () => {
  const { sanitizeCampaign, activeCampaign, campaignActive, rewardFor, referralStats, pendingMonths, allocateMonths, makeReferralCode, cleanReferralCode, sameMailbox, maskEmail } = await import('../src/index.js');
  assert.equal(sanitizeCampaign({ startsAt: '2026-10-10', endsAt: '2026-10-01' }), null);
  const c = sanitizeCampaign({ name: 'Fall\n', startsAt: '2026-10-01', endsAt: '2026-10-31', freeMonths: 40, maxPerReferrer: -2 });
  assert.deepEqual([c.name, c.freeMonths, c.maxPerReferrer, c.endsAt], ['Fall', 12, 0, '2026-10-31T23:59:59.999Z']);
  assert.ok(campaignActive(c, new Date('2026-10-31T20:00:00Z')));
  assert.ok(!campaignActive(c, new Date('2026-11-01T00:00:01Z')));
  assert.ok(!campaignActive({ ...c, enabled: false }, new Date('2026-10-15')));
  const big = { ...c, id: 'b', freeMonths: 3 };
  assert.equal(activeCampaign([{ ...c, id: 'a', freeMonths: 1 }, big], new Date('2026-10-15')).id, 'b');
  assert.equal(activeCampaign([big], new Date('2027-01-01')), null);

  assert.deepEqual(rewardFor({ referrer: { plan: 'pro' }, campaign: big }), { status: 'rewarded', months: 3, kind: 'credit' });
  assert.deepEqual(rewardFor({ referrer: {}, campaign: big }), { status: 'rewarded', months: 3, kind: 'credit' }, 'legacy accounts are Pro');
  assert.deepEqual(rewardFor({ referrer: { plan: 'free' }, campaign: big }), { status: 'rewarded', months: 1, kind: 'pro-trial' }, 'Free → 1 month of Pro');
  assert.equal(rewardFor({ referrer: { plan: 'free' }, campaign: { ...big, freeUserMonths: 2 } }).months, 2);
  assert.equal(c.freeUserMonths, 1);
  assert.equal(rewardFor({ referrer: { plan: 'business' }, campaign: big }).reason, 'not_pro');
  assert.equal(rewardFor({ referrer: { plan: 'pro' }, campaign: null }).reason, 'no_campaign');
  assert.equal(rewardFor({ referrer: { plan: 'pro', banned: true }, campaign: big }).reason, 'banned');
  assert.equal(rewardFor({ referrer: { plan: 'pro' }, campaign: { ...big, maxPerReferrer: 2 }, rewardedInCampaign: 2 }).reason, 'limit');

  const list = [
    { id: '1', status: 'rewarded', months: 2, appliedMonths: 1, qualifiedAt: '2026-10-02' },
    { id: '2', status: 'rewarded', months: 3, appliedMonths: 0, qualifiedAt: '2026-10-05' },
    { id: '3', status: 'qualified', months: 0 },
    { id: '4', status: 'pending' },
  ];
  assert.equal(pendingMonths(list), 4);
  assert.equal(pendingMonths([...list, { id: '5', status: 'rewarded', kind: 'pro-trial', months: 1 }]), 4, 'Pro months given to Free accounts are not credit');
  assert.deepEqual(referralStats(list), { signedUp: 4, subscribed: 3, monthsEarned: 5, monthsApplied: 1, monthsPending: 4 });
  assert.deepEqual(allocateMonths(list, 2), [{ id: '1', appliedMonths: 2 }, { id: '2', appliedMonths: 1 }]);
  assert.deepEqual(allocateMonths(list, 10), [{ id: '1', appliedMonths: 2 }, { id: '2', appliedMonths: 3 }]);

  assert.match(makeReferralCode(), /^[A-HJKMNP-Z2-9]{8}$/);
  assert.equal(cleanReferralCode(' ab7k-2qxm '), 'AB7K2QXM');
  assert.ok(sameMailbox('Ana.Ruiz+x@gmail.com', 'anaruiz@googlemail.com'));
  assert.ok(!sameMailbox('ana@empresa.com', 'ana2@empresa.com'));
  assert.equal(maskEmail('juana@gmail.com'), 'ju***@gmail.com');
  assert.equal(maskEmail('a@b.co'), 'a***@b.co');
  const { extendProTrial } = await import('../src/index.js');
  const now = new Date('2026-10-09T12:00:00Z');
  assert.equal(extendProTrial(null, 1, now), '2026-11-09T12:00:00.000Z');
  assert.equal(extendProTrial('2026-11-09T12:00:00.000Z', 1, now), '2026-12-09T12:00:00.000Z', 'stacks');
  assert.equal(extendProTrial('2026-01-01T00:00:00.000Z', 1, now), '2026-11-09T12:00:00.000Z', 'expired → from now');
});

test('attention animations pause while a collapsible block is open', () => {
  const page = { title: 'T', profile: { name: 'A' }, design: {}, blocks: [
    { id: 'v', type: 'vcard', enabled: true, data: { name: 'Ana' }, options: { animation: 'pulse' } },
  ] };
  const { css, html } = renderPage(page, { animate: true });
  assert.ok(html.includes('ol-anim-pulse'));
  assert.ok(css.includes(ATTENTION_PAUSE_CSS));
  const plain = renderPage({ ...page, blocks: [{ ...page.blocks[0], options: {} }] }, { animate: true });
  assert.ok(!plain.css.includes(ATTENTION_PAUSE_CSS));
});

test('second language: owner translations are cleaned, applied by id and switchable', async () => {
  const { sanitizePage, localizePage, renderPage, translationProgress, resolveLanguage, pickLanguage, pruneTranslations } = await import('../src/index.js');
  const raw = {
    profile: { title: 'Taco Truck', bio: 'Best tacos' }, socials: [], design: {}, settings: { language: 'en', translateButton: true },
    blocks: [
      { id: 'b1', type: 'link', enabled: true, data: { title: 'Menu', url: 'https://x.co' } },
      { id: 'c1', type: 'collection', enabled: true, data: { title: 'More' }, children: [
        { id: 'f1', type: 'faq', enabled: true, data: { items: [{ id: 'i1', question: 'Open?', answer: 'Yes' }, { id: 'i2', question: 'Where?', answer: 'Here' }] } },
      ] },
      { id: 'k1', type: 'catalog', enabled: true, data: { products: [{ id: 'p1', name: 'Taco', price: 3, extras: 'Cheese = 1.5\nBacon = 2' }] } },
    ],
    translations: {
      es: {
        profile: { title: 'Camión de tacos', junk: 'x' },
        blocks: { b1: { title: 'Menú', url: 'https://evil.example' }, f1: { items: { i1: { question: '¿Abierto?' }, zz: { question: 'x' } } },
          k1: { products: { p1: { name: 'Taco ES', extras: 'Queso = 9\nTocino = 9' } } }, gone: { title: 'x' } },
      },
      en: { profile: { title: 'only the other language is kept' } },
    },
  };
  const page = { ...raw, ...sanitizePage(raw) };
  assert.deepEqual(Object.keys(page.translations), ['es']);
  assert.equal(page.translations.es.blocks.b1.url, undefined); // URLs are not translatable
  assert.equal(page.translations.es.blocks.gone, undefined); // unknown blocks dropped
  assert.deepEqual(Object.keys(page.translations.es.blocks.f1.items), ['i1']); // unknown list items dropped
  const es = localizePage(page, 'es');
  assert.equal(es.profile.title, 'Camión de tacos');
  assert.equal(es.profile.bio, 'Best tacos'); // empty translation keeps the original
  assert.equal(es.blocks[1].children[0].data.items[0].question, '¿Abierto?');
  assert.equal(es.blocks[1].children[0].data.items[1].question, 'Where?');
  assert.equal(es.blocks[2].data.products[0].extras, 'Queso = 1.5\nTocino = 2'); // extras keep the original prices
  assert.equal(localizePage(page, 'en'), page);
  assert.ok(renderPage(page, { lang: 'es' }).html.includes('Menú'));
  assert.ok(!renderPage({ ...page, settings: { language: 'en' } }, { lang: 'es' }).html.includes('Menú')); // switched off
  assert.equal(resolveLanguage(page, 'fr'), 'en');
  const prog = translationProgress(page);
  assert.ok(prog.done === 5 && prog.total > prog.done, JSON.stringify(prog));
  const win = { location: { search: '?lang=es' }, navigator: { languages: ['en-US'] } };
  assert.equal(pickLanguage(page, win), 'es');
  assert.equal(pickLanguage(page, { location: { search: '' }, navigator: { languages: ['es-VE', 'en'] } }), 'es');
  assert.equal(pickLanguage(page, { location: { search: '' }, navigator: { languages: ['fr'] } }), 'en');
  assert.deepEqual(Object.keys(pruneTranslations(page.translations, [page.blocks[0]]).es.blocks), ['b1']);
});

test('push notifications: sign-up config, topics, broadcasts, repeats and payload', async () => {
  const { sanitizeNotifyConfig, publicNotifyConfig, sanitizeTopics, sanitizeBroadcast, broadcastErrors, nextOccurrence, pushPayload, allowsBlock, allowsSection, PLANS } = await import('../src/index.js');
  const cfg = sanitizeNotifyConfig({ enabled: 1, title: '  Deals\nfirst ', topics: [{ id: 'deals', label: 'Deals' }, { id: 'deals', label: 'Dup' }, { label: '' }, { id: 'ev<>', label: 'Events' }] });
  assert.equal(cfg.title, 'Deals first');
  assert.deepEqual(cfg.topics.map((t) => t.id), ['deals', 'ev']);
  assert.equal(publicNotifyConfig({ enabled: false }), null);
  assert.deepEqual(sanitizeTopics(['deals', 'nope', 'deals'], cfg), ['deals']);

  const b = sanitizeBroadcast({ title: 'Hi {page}', body: 'x', url: 'javascript:alert(1)', image: 'https://img.example/a.jpg',
    actions: [{ label: 'Go', url: 'https://a.example' }, { label: 'Bad', url: 'ftp://x' }, { label: 'Three', url: 'https://c.example' }, { label: 'Four', url: 'https://d.example' }],
    schedule: { mode: 'at', sendAt: '2030-01-01T10:00:00Z', repeat: 'weekly', tz: 'Not/AZone' } });
  assert.equal(b.url, '');
  assert.equal(b.actions.length, 2);
  assert.equal(b.schedule.tz, 'UTC');
  assert.deepEqual(broadcastErrors(b, { now: Date.parse('2029-12-01') }), []);
  assert.ok(broadcastErrors(sanitizeBroadcast({ schedule: { mode: 'at', sendAt: '2000-01-01' } })).includes('send_at_past'));
  assert.equal(sanitizeBroadcast({ schedule: { mode: 'now', repeat: 'daily' } }).schedule.repeat, 'none');

  // 9:00 in New York stays 9:00 across the DST change (Nov 1 2026).
  const first = '2026-10-31T13:00:00.000Z'; // 9:00 EDT
  const next = nextOccurrence(first, 'daily', 'America/New_York');
  assert.equal(next, '2026-11-01T14:00:00.000Z'); // 9:00 EST
  assert.equal(nextOccurrence('2026-01-31T12:00:00.000Z', 'monthly', 'UTC'), '2026-02-28T12:00:00.000Z');
  assert.equal(nextOccurrence(first, 'weekly', 'UTC', '2026-11-03T00:00:00.000Z'), '');
  assert.equal(nextOccurrence(first, 'none'), '');

  const page = { id: 'p1', slug: 'bakery', profile: { title: 'Sweet', avatar: 'https://img.example/me.png' } };
  const es = sanitizeBroadcast({ title: 'Hi {page}', body: 'B', es: { title: 'Hola {page}', body: 'C' } });
  assert.equal(pushPayload(es, page, { lang: 'es', pageUrl: 'https://otrelink.pages.dev/' }).title, 'Hola Sweet');
  const p = pushPayload(es, page, { pageUrl: 'https://otrelink.pages.dev/', campaignId: 'c1' });
  assert.equal(p.title, 'Hi Sweet');
  assert.equal(p.url, 'https://otrelink.pages.dev/bakery');
  assert.equal(p.tag, 'ol-p1-c1');

  assert.equal(allowsBlock(PLANS.free, 'notify'), false);
  assert.equal(allowsSection(PLANS.pro, 'notify'), false); // Business only
  assert.equal(allowsBlock(PLANS.pro, 'notify'), false);
  assert.equal(allowsSection(PLANS.business, 'notify'), true);
});
