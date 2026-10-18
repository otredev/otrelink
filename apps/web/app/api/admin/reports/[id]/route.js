import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { handler, json, error, readJson } from '@/lib/http';

// Admin: act on a report.
//   { action: 'dismiss' }                  → nothing wrong with the page
//   { action: 'resolve' }                  → handled (e.g. the owner fixed it, or you banned them)
//   { action: 'unpublish' }                → take the page offline and resolve every open report about it
//   { action: 'republish' }                → put the page back online (the report stays as it is)
//   { action: 'reopen' }                   → back to open
// An optional `note` (only admins see it) is saved with the report.
export const PATCH = handler(async (req, { params }) => {
  requireAdmin(req);
  const { id } = await params;
  const db = await getDb();
  const report = await db.reports.findById(String(id));
  if (!report) return error(404, 'not_found');
  const body = await readJson(req);
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 1000) : undefined;
  const at = new Date().toISOString();
  const withNote = (p) => (note === undefined ? p : { ...p, note });
  const page = await db.pages.findById(report.pageId);

  switch (body?.action) {
    case 'dismiss':
      return json({ report: await db.reports.update(report.id, withNote({ status: 'dismissed', resolution: 'dismissed', reviewedAt: at })) });
    case 'resolve':
      return json({ report: await db.reports.update(report.id, withNote({ status: 'resolved', resolution: report.resolution === 'unpublished' ? 'unpublished' : 'resolved', reviewedAt: at })) });
    case 'reopen':
      return json({ report: await db.reports.update(report.id, withNote({ status: 'open', reviewedAt: null })) });
    case 'unpublish': {
      if (!page) return error(404, 'page_deleted');
      await db.pages.update(page.id, { settings: { ...page.settings, published: false } });
      const others = await db.reports.updateMany({ pageId: page.id, status: 'open' }, { status: 'resolved', resolution: 'unpublished', reviewedAt: at });
      const updated = await db.reports.update(report.id, withNote({ status: 'resolved', resolution: 'unpublished', reviewedAt: at }));
      return json({ report: updated, resolvedOthers: Math.max(0, others - (report.status === 'open' ? 1 : 0)) });
    }
    case 'republish': {
      if (!page) return error(404, 'page_deleted');
      await db.pages.update(page.id, { settings: { ...page.settings, published: true } });
      return json({ report: note === undefined ? report : await db.reports.update(report.id, { note }) });
    }
    default:
      return error(400, 'invalid_action');
  }
});
