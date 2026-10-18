import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { config } from '@/lib/config';
import { legalInfo } from '@/lib/legal';
import { sendEmail } from '@/lib/notify';
import { handler, corsHeaders, rateLimit, readJson } from '@/lib/http';

// Footer → Report: a visitor reports a page. Saved for review and emailed to the contact
// address of the legal pages (LEGAL_CONTACT_EMAIL) when email sending is set up.
//   POST { pageId, reason, message?, email? }
const REPORT_REASONS = ['spam', 'scam', 'impersonation', 'hate', 'adult', 'violence', 'illegal', 'copyright', 'other'];

export const POST = handler(async (req) => {
  const headers = corsHeaders(req);
  const reply = (body, status = 200) => NextResponse.json(body, { status, headers });
  await rateLimit(req, 'page-report', 5, 60 * 60 * 1000);
  const body = await readJson(req);
  const reason = String(body?.reason || '');
  if (!REPORT_REASONS.includes(reason)) return reply({ error: 'invalid_reason' }, 400);
  const message = String(body?.message || '').replace(/\r\n?/g, '\n').trim().slice(0, 1000);
  const email = String(body?.email || '').trim().slice(0, 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({ error: 'invalid_email' }, 400);
  if (reason === 'other' && !message) return reply({ error: 'message_required' }, 400);

  const db = await getDb();
  const page = await db.pages.findById(String(body?.pageId || ''));
  if (!page?.settings?.published) return reply({ error: 'not_found' }, 404);
  const report = await db.reports.create({ pageId: page.id, slug: page.slug, ownerId: page.userId, reason, message, email });

  const to = legalInfo().email;
  if (to) {
    const link = `${config.pageUrl}/${page.slug}`;
    await sendEmail({
      to,
      subject: `Report: /${page.slug} (${reason})`,
      text: `A visitor reported the page ${link}\n\nReason: ${reason}\n${message ? `Message: ${message}\n` : ''}${email ? `Reply to: ${email}\n` : ''}\nReport id: ${report.id}`,
    }).catch(() => {});
  }
  return reply({ ok: true });
});

export const OPTIONS = (req) => new Response(null, { status: 204, headers: corsHeaders(req) });
