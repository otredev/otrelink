import { after } from 'next/server';
import { allowsSection } from '@otrelink/core';
import { handler, json, error, readJson, requireOwnedPage } from '@/lib/http';
import { getDb } from '@/lib/db';
import { pushConfigured } from '@/lib/notify';
import { prepareBroadcast, runDueBroadcasts, toOwnerBroadcast } from '@/lib/broadcast';

// Create a notification: send now, or schedule it (once or repeating).
export const POST = handler(async (req, { params }) => {
  const { user, db, page } = await requireOwnedPage((await params).id);
  // user.plan is already resolved (lib/auth.js publicUser).
  if (!allowsSection(user.plan, 'notify')) return error(403, 'plan_required', { feature: 'notifications' });
  if (!pushConfigured()) return error(503, 'push_not_configured');
  const b = await prepareBroadcast(db, page, await readJson(req));
  const saved = await db.broadcasts.create({ ...b, pageId: page.id, userId: user.id, status: 'scheduled', stats: {} });
  // "Send now": start right after answering (the cron would pick it up within a minute anyway).
  if (b.schedule.mode === 'now') after(async () => { await runDueBroadcasts(await getDb(), { budgetMs: 55e3 }); });
  return json({ broadcast: toOwnerBroadcast(saved) }, { status: 201 });
});
