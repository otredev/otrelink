// Reminders. Call this every minute (or every 5) from cron-job.org:
//   URL:     https://YOUR-APP/api/cron/reminders
//   Header:  Authorization: Bearer <CRON_SECRET>      (or ?key=<CRON_SECRET>)
// It finds appointments whose reminder time has arrived and sends a push to
// the owner (and an email to the visitor when email is configured), and sends
// the scheduled push notifications of pages to their subscribers.
import { REMINDER_PRESETS, findBlock } from '@otrelink/core';
import { getDb } from '@/lib/db';
import { config } from '@/lib/config';
import { pushToUser } from '@/lib/notify';
import { whenText, emailVisitor } from '@/lib/bookings';
import { handler, json, error } from '@/lib/http';
import { downgradeEnded } from '@/lib/billing';
import { endProTrials } from '@/lib/referrals';
import { runDueBroadcasts } from '@/lib/broadcast';

const LONGEST = Math.max(...Object.values(REMINDER_PRESETS).flatMap((p) => p.minutes), 0);

const inText = (min) => (min >= 1440 ? `in ${Math.round(min / 1440)} day${min >= 2880 ? 's' : ''}`
  : min >= 60 ? `in ${Math.round(min / 60)} hour${min >= 120 ? 's' : ''}` : `in ${Math.max(1, Math.round(min))} min`);

async function run(req) {
  const key = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || new URL(req.url).searchParams.get('key');
  if (!config.cronSecret || key !== config.cronSecret) return error(401, 'unauthorized');

  const db = await getDb();
  const now = Date.now();
  const upcoming = await db.bookings.list({
    from: new Date(now).toISOString(),
    to: new Date(now + (LONGEST + 5) * 60e3).toISOString(),
    statuses: ['pending', 'confirmed'],
    limit: 2000,
  });

  const pages = new Map();
  let sent = 0;
  for (const b of upcoming) {
    // Use the block's current reminder setting.
    if (!pages.has(b.pageId)) pages.set(b.pageId, await db.pages.findById(b.pageId));
    const page = pages.get(b.pageId);
    const block = page && findBlock(page.blocks || [], b.blockId);
    const preset = REMINDER_PRESETS[block?.data?.reminders] || REMINDER_PRESETS['1d1h'];
    const done = new Set(b.remindersSent || []);
    const due = preset.minutes.filter((m) => !done.has(m) && now >= new Date(b.start).getTime() - m * 60e3);
    if (!due.length) continue;

    // If the cron was down and several reminders are due, send only the closest one.
    const minutesLeft = (new Date(b.start).getTime() - now) / 60e3;
    await Promise.allSettled([
      pushToUser(b.userId, {
        title: `Appointment ${inText(minutesLeft)}`,
        body: `${b.name} · ${b.serviceName} · ${whenText(b)}`,
        url: `/dashboard/${b.pageId}#agenda`,
        tag: `reminder-${b.id}`,
      }),
      emailVisitor('reminder', b, page),
    ]);
    await db.bookings.update(b.id, { remindersSent: [...done, ...due] });
    sent++;
  }
  // Cancelled subscriptions whose paid period ended go back to their previous plan.
  const downgraded = await downgradeEnded(db, new Date(now)).catch((err) => { console.error('[otrelink] downgrade failed:', err); return 0; });
  // Free Pro given by referrals that has ended → back to Free.
  const trialsEnded = await endProTrials(db, new Date(now)).catch((err) => { console.error('[otrelink] free Pro end failed:', err); return 0; });
  // Push notifications to page visitors that are due (scheduled, repeating, or a send that stopped).
  const broadcasts = await runDueBroadcasts(db, { budgetMs: 40e3 }).catch((err) => { console.error('[otrelink] broadcasts failed:', err); return 0; });
  return json({ ok: true, checked: upcoming.length, reminded: sent, downgraded, trialsEnded, broadcasts, at: new Date(now).toISOString() });
}

export const GET = handler(run);
export const POST = handler(run);
