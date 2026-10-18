import { sanitizePage, sanitizeSlug, countLockedBlocks, allowsWallpaper, featureForWallpaper } from '@otrelink/core';
import { toDashboardPage } from '@/lib/pages';
import { handler, json, error, readJson, requireOwnedPage } from '@/lib/http';

export const GET = handler(async (_req, { params }) => {
  const { page } = await requireOwnedPage((await params).id);
  return json({ page: toDashboardPage(page) });
});

// Save the whole page (the dashboard edits a draft and saves it in one go).
export const PUT = handler(async (req, { params }) => {
  const { db, page, user } = await requireOwnedPage((await params).id);
  const body = await readJson(req);
  const patch = sanitizePage({ ...page, ...body });

  // Plan limits: you can keep (and edit) what you already have after a
  // downgrade, but you can't add more locked blocks or switch to a locked background.
  const plan = user.plan;
  if (countLockedBlocks(patch.blocks, plan) > countLockedBlocks(sanitizePage(page).blocks, plan)) {
    return error(403, 'plan_required', { feature: 'blocks' });
  }
  const wp = patch.design?.wallpaper?.type;
  if (wp !== page.design?.wallpaper?.type && !allowsWallpaper(plan, wp)) {
    return error(403, 'plan_required', { feature: featureForWallpaper(wp) });
  }

  if (body.slug !== undefined && body.slug !== page.slug) {
    const slug = sanitizeSlug(body.slug);
    if (!slug) return error(400, 'invalid_slug');
    patch.slug = slug;
  }
  try {
    const updated = await db.pages.update(page.id, patch);
    return json({ page: toDashboardPage(updated) });
  } catch (err) {
    if (err.code === 'slug_taken') return error(409, 'slug_taken');
    throw err;
  }
});

export const DELETE = handler(async (_req, { params }) => {
  const { db, page } = await requireOwnedPage((await params).id);
  await db.pages.remove(page.id);
  await db.events.removeForPage(page.id);
  await db.responses.removeMany({ pageId: page.id });
  await db.reviews.removeMany({ pageId: page.id });
  await db.orders.removeMany({ pageId: page.id });
  await db.cards.removeMany({ pageId: page.id });
  await db.invoices.removeMany({ pageId: page.id });
  await db.subscribers.removeMany({ pageId: page.id });
  await db.broadcasts.removeMany({ pageId: page.id });
  return json({ ok: true });
});
