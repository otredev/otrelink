// Server helpers for invoices: owner invoices (dashboard → Invoices) and
// Otrelink's own subscription invoices (payments), both printed as PDF.
import crypto from 'node:crypto';
import {
  sanitizeInvoiceSettings, invoiceTotals, invoiceCode, invoiceMoney, INVOICE_WORDS,
} from '@otrelink/core';
import { config } from './config.js';

/** Invoice settings of a page (business details), with the page's title and picture as defaults. */
export function pageInvoicing(page) {
  const s = sanitizeInvoiceSettings(page.invoicing || {});
  return {
    ...s,
    businessName: s.businessName || page.profile?.title || page.slug,
    logo: s.logo || page.profile?.avatar || '',
  };
}

/** Language of a page's invoices. */
export const invoiceLang = (page, s) => (s.language === 'en' || s.language === 'es' ? s.language : page.settings?.language === 'es' ? 'es' : 'en');

/** Logo bytes for the PDF: only files uploaded to Otrelink (PNG or JPG). */
export async function loadLogo(db, url) {
  const m = String(url || '').match(/\/(?:api\/assets|media)\/([a-f0-9]{32})/);
  if (!m) return null;
  const a = await db.assets.findById(m[1]).catch(() => null);
  if (!a?.data) return null;
  const type = a.mime === 'image/png' ? 'png' : a.mime === 'image/jpeg' || a.mime === 'image/jpg' ? 'jpg' : null;
  return type ? { bytes: new Uint8Array(a.data), type } : null;
}

export const newInvoiceToken = () => crypto.randomBytes(20).toString('hex');

/** The PDF document of an owner invoice. */
export async function ownerInvoiceDoc(db, page, inv) {
  const s = pageInvoicing(page);
  const lang = invoiceLang(page, s);
  const w = INVOICE_WORDS[lang];
  const t = invoiceTotals(inv);
  const money = (n) => invoiceMoney(n, inv.money);
  const pct = (n) => `${Number(n).toLocaleString(lang === 'es' ? 'es' : 'en-US', { maximumFractionDigits: 2 })}%`;
  const totals = [{ label: w.subtotal, value: money(t.subtotal) }];
  if (t.discount) totals.push({ label: `${w.discount} (${pct(inv.discount)})`, value: `-${money(t.discount)}` });
  if (Number(inv.taxRate)) totals.push({ label: `${inv.taxLabel || 'Tax'} (${pct(inv.taxRate)})`, value: money(t.tax) });
  totals.push({ label: inv.status === 'paid' ? w.total : w.balance, value: money(t.total), strong: true });
  return {
    lang,
    color: s.color,
    code: inv.code,
    status: inv.status,
    issueDate: inv.issueDate,
    dueDate: inv.status === 'paid' ? '' : inv.dueDate,
    paidDate: inv.paidAt,
    seller: {
      name: s.businessName,
      lines: [s.address, s.taxId && `${w.taxId}: ${s.taxId}`, s.email, s.phone, s.website],
      logo: await loadLogo(db, s.logo),
    },
    client: {
      name: inv.client?.name,
      lines: [inv.client?.address, inv.client?.taxId && `${w.taxId}: ${inv.client.taxId}`, inv.client?.email, inv.client?.phone],
    },
    lines: t.lines,
    totals,
    notes: inv.notes,
    footer: inv.footer || s.footer,
    money,
  };
}

/** What the dashboard gets. */
export const toOwnerInvoice = (inv) => {
  const t = invoiceTotals(inv);
  const { token, userId, ...rest } = inv;
  return { ...rest, total: t.total, hasLink: Boolean(token) };
};

// ── Otrelink subscription invoices ───────────────────────────
export const billingSeller = () => ({
  name: config.billingCompanyName,
  lines: String(config.billingCompanyDetails || '').split(/\\n|\n/).map((l) => l.trim()).filter(Boolean),
});

/** "OTR-000012" */
export const paymentCode = (p) => `${config.billingInvoicePrefix}${String(p.number).padStart(6, '0')}`;

export async function paymentInvoiceDoc(db, user, p, lang = 'en') {
  const w = INVOICE_WORDS[lang] || INVOICE_WORDS.en;
  const money = (n) => `${new Intl.NumberFormat(lang === 'es' ? 'es' : 'en-US', { style: 'currency', currency: (p.currency || 'USD').toUpperCase() }).format(n)}`;
  const period = p.periodStart && p.periodEnd
    ? `${new Intl.DateTimeFormat(lang === 'es' ? 'es' : 'en-US', { dateStyle: 'medium', timeZone: 'UTC' }).formatRange(new Date(p.periodStart), new Date(p.periodEnd))}`
    : '';
  const what = lang === 'es' ? 'Otrelink Pro — suscripción mensual' : 'Otrelink Pro — monthly subscription';
  const description = `${what}${period ? `\n${w.period}: ${period}` : ''}`;
  return {
    lang,
    color: '#7c3aed',
    code: paymentCode(p),
    status: p.refunded ? 'void' : 'paid',
    issueDate: p.createdAt,
    paidDate: p.createdAt,
    seller: billingSeller(),
    client: { name: user.name || user.email, lines: [user.name ? user.email : ''] },
    meta: [[w.method, p.provider === 'paypal' ? 'PayPal' : lang === 'es' ? 'Tarjeta (Stripe)' : 'Card (Stripe)']],
    lines: [{ description, qty: 1, price: p.amount, amount: p.amount }],
    totals: [{ label: w.total, value: money(p.amount), strong: true }],
    notes: '',
    footer: config.billingFooter,
    money,
  };
}

export { invoiceCode };
