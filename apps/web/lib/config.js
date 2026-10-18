// Central place for environment configuration.

/** Env value without spaces or quotes pasted around it (a common copy-paste slip). */
const clean = (v) => String(v || '').trim().replace(/^(['"])(.*)\1$/, '$2').trim();

export const config = {
  dbDriver: process.env.DB_DRIVER || (process.env.MONGODB_URI ? 'mongo' : 'file'),
  mongoUri: process.env.MONGODB_URI || '',
  mongoDb: process.env.MONGODB_DB || 'otrelink',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
  pageUrl: (process.env.NEXT_PUBLIC_PAGE_URL || 'http://localhost:5173').replace(/\/$/, ''),
  corsOrigins: (process.env.PUBLIC_CORS_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean),
  maxUploadBytes: 3 * 1024 * 1024, // images
  maxPdfBytes: 10 * 1024 * 1024,
  // Uploaded files in Cloudflare R2 (optional; without it they are kept in the database).
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucket: process.env.R2_BUCKET || '',
  },
  // Public address of the files in R2, e.g. https://otrelink.pages.dev/media
  mediaUrl: (process.env.MEDIA_URL || '').replace(/\/$/, ''),
  pagesPerUser: 10,
  // Push notifications (generate keys with: npx web-push generate-vapid-keys)
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  // Secret that cron-job.org sends to /api/cron/reminders
  cronSecret: process.env.CRON_SECRET || '',
  // Optional emails to visitors (https://resend.com)
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || '',
  // Plans & payments
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripePriceId: process.env.STRIPE_PRICE_ID || '', // monthly Pro price (price_…)
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '', // whsec_…
  paypalClientId: clean(process.env.PAYPAL_CLIENT_ID),
  paypalClientSecret: clean(process.env.PAYPAL_CLIENT_SECRET),
  paypalPlanId: clean(process.env.PAYPAL_PLAN_ID), // monthly Pro plan (P-…)
  paypalWebhookId: clean(process.env.PAYPAL_WEBHOOK_ID),
  paypalMode: ['live', 'production'].includes(clean(process.env.PAYPAL_MODE).toLowerCase()) ? 'live' : 'sandbox',
  // Tests only: point the payment APIs at a local mock (leave empty in real use).
  stripeApiBase: (process.env.STRIPE_API_BASE || 'https://api.stripe.com').replace(/\/$/, ''),
  paypalApiBase: (process.env.PAYPAL_API_BASE || '').replace(/\/$/, ''),
  businessContactEmail: process.env.BUSINESS_CONTACT_EMAIL || '',
  // Your details on the subscription invoices users download (Plan page)
  billingCompanyName: process.env.BILLING_COMPANY_NAME || 'Otrelink',
  billingCompanyDetails: process.env.BILLING_COMPANY_DETAILS || '', // address, tax ID… (lines separated by \n)
  billingInvoicePrefix: process.env.BILLING_INVOICE_PREFIX || 'OTR-',
  billingFooter: process.env.BILLING_INVOICE_FOOTER || 'Thank you for using Otrelink!',
  // Key the admin dashboard (Otrelink-Admin) uses to call /api/admin/*
  adminApiKey: process.env.ADMIN_API_KEY || '',
};

if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) console.warn('[otrelink] JWT_SECRET is not set. Set it before deploying!');
  if (!process.env.NEXT_PUBLIC_PAGE_URL) console.warn('[otrelink] NEXT_PUBLIC_PAGE_URL is not set: "View page" links will point to http://localhost:5173');
}
