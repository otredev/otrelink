import { NextResponse } from 'next/server';
import { NOTIFY_CONSENT_VERSION, sanitizeTopics } from '@otrelink/core';
import { getDb } from '@/lib/db';
import { handler, corsHeaders, rateLimit, readJson } from '@/lib/http';
import { publicNotifyPage, readSubscription } from '@/lib/broadcast';

// A visitor subscribes to a page's push notifications (after ticking the consent box
// and allowing notifications in the browser). Subscribing again updates the topics.
//   POST { pageId, subscription: { endpoint, keys }, topics, lang, source, consent: true }
export const POST = handler(async (req) => {
  const headers = corsHeaders(req);
  const reply = (body, status = 200) => NextResponse.json(body, { status, headers });
  await rateLimit(req, 'notify-subscribe', 30, 60 * 60 * 1000);
  const body = await readJson(req);
  if (body?.consent !== true) return reply({ error: 'consent_required' }, 400);
  const sub = readSubscription(body.subscription);
  if (!sub) return reply({ error: 'invalid_subscription' }, 400);
  const db = await getDb();
  const page = await publicNotifyPage(db, body.pageId);
  if (!page) return reply({ error: 'not_found' }, 404);
  const saved = await db.subscribers.upsert({
    pageId: page.id,
    endpoint: sub.endpoint,
    keys: sub.keys,
    topics: sanitizeTopics(body.topics, page.notify),
    lang: body.lang === 'es' ? 'es' : 'en',
    source: ['button', 'link', 'qr'].includes(body.source) ? body.source : 'button',
    consentAt: new Date().toISOString(),
    consentVersion: NOTIFY_CONSENT_VERSION,
  });
  return reply({ ok: true, topics: saved.topics });
});

export const OPTIONS = (req) => new Response(null, { status: 204, headers: corsHeaders(req) });
