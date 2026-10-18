// Page helpers shared by API routes.
import { sanitizePage, sanitizeToday, stripPrivateFields, stripLockedBlocks, stripLockedFeatures, allowsWallpaper, resolveDesign, pruneTranslations, allowsSection, publicNotifyConfig } from '@otrelink/core';
import { config } from './config.js';
import { pushConfigured } from './notify.js';

/** Shape returned to the dashboard. */
export const toDashboardPage = (p) => ({
  id: p.id, slug: p.slug, profile: p.profile, socials: p.socials, blocks: p.blocks,
  // New design options get their default values on pages saved before they existed.
  design: resolveDesign(p.design || {}), settings: p.settings, translations: p.translations || {}, createdAt: p.createdAt, updatedAt: p.updatedAt,
  today: sanitizeToday(p.today),
});

/**
 * Shape returned to the public page app (no owner info).
 * `plan` = the owner's plan: blocks and backgrounds it doesn't include are not
 * shown (e.g. after a downgrade to Free).
 * `live: false` (static export) leaves out push notifications, which need the page app.
 */
export const toPublicPage = (p, plan, { live = true } = {}) => {
  let clean = sanitizePage(p);
  if (plan) clean = stripLockedFeatures(clean, plan);
  let blocks = onlyEnabled(clean.blocks);
  let { design } = clean;
  // Push sign-ups: plan includes them, the owner turned them on and the server has VAPID keys.
  const notify = live && pushConfigured() && (!plan || allowsSection(plan, 'notify')) ? publicNotifyConfig(p.notify) : null;
  if (!notify) blocks = withoutType(blocks, 'notify');
  if (plan) {
    blocks = stripLockedBlocks(blocks, plan);
    if (!allowsWallpaper(plan, design.wallpaper?.type)) {
      design = { ...design, wallpaper: { type: 'solid', color: design.wallpaper?.color || '#222222' } };
    }
  }
  return {
    id: p.id,
    slug: p.slug,
    ...clean,
    design,
    // Hide disabled blocks (at any depth) from the public payload entirely.
    // Private fields (e.g. a meeting link) never reach visitors through the page data.
    blocks: stripPrivateFields(blocks),
    // Only the second language of blocks visitors can see, and only when it is on.
    translations: clean.settings.translateButton ? pruneTranslations(clean.translations, blocks) : {},
    // Live state from the dashboard "Today" tab (location, open/closed, sold out).
    today: sanitizeToday(p.today),
    notify: notify ? { ...notify, vapidKey: config.vapidPublicKey } : null,
  };
};

function withoutType(blocks, type) {
  return blocks.filter((b) => b.type !== type).map((b) => (b.children ? { ...b, children: withoutType(b.children, type) } : b));
}

function onlyEnabled(blocks) {
  return blocks.filter((b) => b.enabled).map((b) => (b.children ? { ...b, children: onlyEnabled(b.children) } : b));
}
