import { NextResponse } from 'next/server';
import { safeUrl } from '@otrelink/core';
import { getDb } from '@/lib/db';
import { ownerPlan } from '@/lib/plans';
import { handler, corsHeaders, rateLimit } from '@/lib/http';

// Footer → Explore: the 10 most visited pages (last 30 days) whose owners turned on
// "Show my page in Explore". Published only, never pages with the sensitive content warning,
// nor of banned or unconfirmed accounts. Worked out at most every 10 minutes.
//   GET ?exclude=<pageId>  (the page the visitor is on)  → { pages: [{ slug, title, avatar }] }
const TTL = 10 * 60e3;
const KEY = Symbol.for('otrelink.explore');

async function topPages(db) {
  const cached = globalThis[KEY];
  if (cached && Date.now() - cached.at < TTL) return cached.list;
  const candidates = await db.pages.listForExplore();
  const views = candidates.length ? await db.events.viewCounts(candidates.map((p) => p.id), new Date(Date.now() - 30 * 864e5)) : {};
  const list = [];
  for (const p of candidates.sort((a, b) => (views[b.id] || 0) - (views[a.id] || 0))) {
    if (list.length >= 11) break; // one spare, in case the visitor is on one of them
    if (!(await ownerPlan(db, p))) continue;
    list.push({ id: p.id, slug: p.slug, title: p.profile?.title || `@${p.slug}`, avatar: safeUrl(p.profile?.avatar, { allowRelative: false }) || '' });
  }
  globalThis[KEY] = { at: Date.now(), list };
  return list;
}

export const GET = handler(async (req) => {
  await rateLimit(req, 'explore', 60, 60 * 1000);
  const exclude = new URL(req.url).searchParams.get('exclude') || '';
  const list = (await topPages(await getDb())).filter((p) => p.id !== exclude).slice(0, 10);
  return NextResponse.json(
    { pages: list.map(({ slug, title, avatar }) => ({ slug, title, avatar })) },
    { headers: { ...corsHeaders(req), 'Cache-Control': 'public, max-age=300' } },
  );
});

export const OPTIONS = (req) => new Response(null, { status: 204, headers: corsHeaders(req) });
