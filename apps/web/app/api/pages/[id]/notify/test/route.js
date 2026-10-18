import { sanitizeBroadcast, pushPayload } from '@otrelink/core';
import { handler, json, error, readJson, requireOwnedPage } from '@/lib/http';
import { config } from '@/lib/config';
import { pushConfigured, pushToUser } from '@/lib/notify';

// Preview a notification on my own devices (the ones with dashboard notifications on).
export const POST = handler(async (req, { params }) => {
  const { user, page } = await requireOwnedPage((await params).id);
  if (!pushConfigured()) return error(503, 'push_not_configured');
  const body = await readJson(req);
  const b = sanitizeBroadcast(body);
  if (!b.title || !b.body) return error(400, 'title_required');
  const p = pushPayload(b, page, { lang: body?.lang === 'es' ? 'es' : 'en', pageUrl: config.pageUrl, campaignId: 'test' });
  const r = await pushToUser(user.id, { title: p.title, body: p.body, url: `/dashboard/${page.id}#notify`, tag: `ol-test-${page.id}` });
  return json(r);
});
