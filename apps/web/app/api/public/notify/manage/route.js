import { NextResponse } from 'next/server';
import { sanitizeTopics } from '@otrelink/core';
import { getDb } from '@/lib/db';
import { handler, corsHeaders, rateLimit, readJson } from '@/lib/http';

// A subscribed visitor checks, changes or ends their subscription. The browser's
// push endpoint (a long secret URL only that browser knows) identifies them.
//   POST { pageId, endpoint, action: 'status' | 'topics' | 'unsubscribe', topics? }
export const POST = handler(async (req) => {
  const headers = corsHeaders(req);
  const reply = (body, status = 200) => NextResponse.json(body, { status, headers });
  await rateLimit(req, 'notify-manage', 120, 60 * 60 * 1000);
  const body = await readJson(req);
  const endpoint = String(body?.endpoint || '');
  if (!/^https:\/\//.test(endpoint)) return reply({ error: 'invalid_subscription' }, 400);
  const db = await getDb();
  const page = await db.pages.findById(String(body?.pageId || ''));
  const sub = page ? await db.subscribers.findByEndpoint(page.id, endpoint) : null;
  if (body.action === 'unsubscribe') {
    if (sub) await db.subscribers.remove(sub.id);
    return reply({ ok: true, subscribed: false });
  }
  if (!sub) return reply({ ok: true, subscribed: false });
  if (body.action === 'topics') {
    const next = await db.subscribers.update(sub.id, { topics: sanitizeTopics(body.topics, page.notify) });
    return reply({ ok: true, subscribed: true, topics: next.topics });
  }
  return reply({ ok: true, subscribed: true, topics: sub.topics || [] });
});

export const OPTIONS = (req) => new Response(null, { status: 204, headers: corsHeaders(req) });
