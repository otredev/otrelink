import { sanitizeNotifyConfig, NOTIFY_LIMITS, NOTIFY_TEMPLATES, NOTIFY_REPEATS } from '@otrelink/core';
import { handler, json, readJson, requireOwnedPage } from '@/lib/http';
import { pushConfigured } from '@/lib/notify';
import { subscriberStats, toOwnerBroadcast } from '@/lib/broadcast';

// Push notifications of one of my pages: sign-up settings, subscribers and sent/scheduled notifications.
export const GET = handler(async (_req, { params }) => {
  const { db, page } = await requireOwnedPage((await params).id);
  const [stats, list] = await Promise.all([subscriberStats(db, page), db.broadcasts.list({ pageId: page.id, limit: 100 })]);
  return json({
    config: sanitizeNotifyConfig(page.notify),
    stats,
    broadcasts: list.map(toOwnerBroadcast),
    pushReady: pushConfigured(),
    limits: NOTIFY_LIMITS,
    templates: NOTIFY_TEMPLATES,
    repeats: NOTIFY_REPEATS,
  });
});

// Save the sign-up settings: { enabled, title, text, topics: [{ id, label }] }
export const PUT = handler(async (req, { params }) => {
  const { db, page } = await requireOwnedPage((await params).id);
  const notify = sanitizeNotifyConfig(await readJson(req));
  await db.pages.update(page.id, { notify });
  return json({ config: notify });
});
