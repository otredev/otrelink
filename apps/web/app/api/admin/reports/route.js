import { getDb } from '@/lib/db';
import { config } from '@/lib/config';
import { requireAdmin } from '@/lib/admin';
import { handler, json } from '@/lib/http';

// Admin: visitors' reports about pages (footer → Report), newest first, with the page and
// its owner. GET ?status=open|resolved|dismissed|all  (default open)
const STATUSES = ['open', 'resolved', 'dismissed'];

export const GET = handler(async (req) => {
  requireAdmin(req);
  const db = await getDb();
  const want = new URL(req.url).searchParams.get('status') || 'open';
  const status = STATUSES.includes(want) ? want : '';
  const [list, counts] = await Promise.all([db.reports.list({ status, limit: 300 }), db.reports.counts()]);
  const pages = new Map(); const owners = new Map();
  const pageOf = async (id) => { if (!pages.has(id)) pages.set(id, await db.pages.findById(id)); return pages.get(id); };
  const ownerOf = async (id) => { if (id && !owners.has(id)) owners.set(id, await db.users.findById(id)); return owners.get(id); };
  // How many reports each page has in total (shown as "3 reports").
  const all = status ? await db.reports.list({ limit: 2000 }) : list;
  const perPage = all.reduce((m, r) => m.set(r.pageId, (m.get(r.pageId) || 0) + 1), new Map());
  const reports = await Promise.all(list.map(async (r) => {
    const page = await pageOf(r.pageId);
    const owner = await ownerOf(page?.userId || r.ownerId);
    return {
      id: r.id, status: r.status, reason: r.reason, message: r.message || '', email: r.email || '',
      createdAt: r.createdAt, updatedAt: r.updatedAt || null, note: r.note || '', resolution: r.resolution || '',
      page: page
        ? { id: page.id, slug: page.slug, title: page.profile?.title || '', published: Boolean(page.settings?.published), url: `${config.pageUrl}/${page.slug}`, reports: perPage.get(page.id) || 1 }
        : { id: r.pageId, slug: r.slug, title: '', deleted: true, reports: perPage.get(r.pageId) || 1 },
      owner: owner ? { id: owner.id, email: owner.email, banned: Boolean(owner.banned) } : null,
    };
  }));
  return json({ reports, counts: { open: 0, resolved: 0, dismissed: 0, ...counts } });
});
