import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { handler, corsHeaders, rateLimit } from '@/lib/http';

// Pages for the public sitemap (functions/sitemap.xml.js on Cloudflare Pages):
// published, not marked sensitive, not "Hide from search engines", and whose owner
// isn't banned or unconfirmed. Worked out at most once an hour.
//   GET → { pages: [{ slug, updatedAt }] }
const TTL = 60 * 60e3;
const KEY = Symbol.for('otrelink.sitemap');

async function sitemapPages(db) {
  const cached = globalThis[KEY];
  if (cached && Date.now() - cached.at < TTL) return cached.list;
  const pages = await db.pages.listForSitemap();
  const owners = new Map();
  for (const id of new Set(pages.map((p) => p.userId))) {
    const u = id ? await db.users.findById(id) : null;
    owners.set(id, Boolean(u && !u.banned && u.emailVerified !== false));
  }
  const list = pages.filter((p) => owners.get(p.userId)).map((p) => ({ slug: p.slug, updatedAt: p.updatedAt || '' }));
  globalThis[KEY] = { at: Date.now(), list };
  return list;
}

export const GET = handler(async (req) => {
  await rateLimit(req, 'sitemap', 30, 60 * 1000);
  return NextResponse.json({ pages: await sitemapPages(await getDb()) }, { headers: { ...corsHeaders(req), 'Cache-Control': 'public, max-age=3600' } });
});

export const OPTIONS = (req) => new Response(null, { status: 204, headers: corsHeaders(req) });
