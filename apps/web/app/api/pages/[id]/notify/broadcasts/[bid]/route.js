import { handler, json, error, readJson, requireOwnedPage } from '@/lib/http';
import { prepareBroadcast, toOwnerBroadcast } from '@/lib/broadcast';

async function load(params) {
  const { id, bid } = await params;
  const { db, page } = await requireOwnedPage(id);
  const b = await db.broadcasts.findById(bid);
  return { db, page, b: b && b.pageId === page.id ? b : null };
}

// Edit a scheduled notification, or cancel it: { action: 'cancel' } (stops a repeating series too).
export const PATCH = handler(async (req, { params }) => {
  const { db, page, b } = await load(params);
  if (!b) return error(404, 'not_found');
  if (b.status !== 'scheduled') return error(409, 'already_sent');
  const body = await readJson(req);
  if (body?.action === 'cancel') return json({ broadcast: toOwnerBroadcast(await db.broadcasts.update(b.id, { status: 'canceled' })) });
  const next = await prepareBroadcast(db, page, { ...body, schedule: { ...body?.schedule, mode: 'at' } }, { exceptId: b.id });
  return json({ broadcast: toOwnerBroadcast(await db.broadcasts.update(b.id, next)) });
});

// Remove a notification from the list (a scheduled one is canceled by removing it).
export const DELETE = handler(async (_req, { params }) => {
  const { db, b } = await load(params);
  if (!b) return error(404, 'not_found');
  if (b.status === 'sending') return error(409, 'sending');
  await db.broadcasts.remove(b.id);
  return json({ ok: true });
});
