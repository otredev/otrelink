import { getDb } from '@/lib/db';
import { handler, rateLimit } from '@/lib/http';

// The page's service worker reports a tap on a notification: { c: broadcastId }.
// Only a counter goes up; nothing about the visitor is stored.
export const POST = handler(async (req) => {
  await rateLimit(req, 'notify-click', 120, 60 * 60 * 1000);
  let id = '';
  try { id = String(JSON.parse(await req.text())?.c || ''); } catch { /* ignore */ }
  if (/^[\w-]{8,64}$/.test(id)) await (await getDb()).broadcasts.incClicks(id);
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
});
