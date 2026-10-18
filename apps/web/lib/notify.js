// Notifications: Web Push (to the owner's devices) and email (to visitors).
// Both are optional and switch on with environment variables:
//   Push:  VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
//   Email: RESEND_API_KEY, EMAIL_FROM
import webpush from 'web-push';
import { config } from './config.js';
import { getDb } from './db/index.js';

let vapidReady = false;
export const pushConfigured = () => Boolean(config.vapidPublicKey && config.vapidPrivateKey);

function setupPush() {
  if (!vapidReady && pushConfigured()) {
    webpush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey);
    vapidReady = true;
  }
  return vapidReady;
}

/**
 * Send a notification to every device the user enabled.
 * payload: { title, body, url, tag }
 */
export async function pushToUser(userId, payload) {
  if (!setupPush()) return { sent: 0, devices: 0 };
  const db = await getDb();
  const subs = await db.push.listByUser(userId);
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload), { TTL: 6 * 3600, urgency: 'high' });
      sent++;
    } catch (err) {
      // 404/410: the device unsubscribed or the browser data was cleared.
      if (err?.statusCode === 404 || err?.statusCode === 410) await db.push.remove(s.endpoint);
      else console.warn('[otrelink] push failed', err?.statusCode, err?.body || err?.message);
    }
  }));
  return { sent, devices: subs.length };
}

/** The configured web-push client, or null when VAPID keys are missing. */
export const webPushClient = () => (setupPush() ? webpush : null);

export const emailConfigured = () => Boolean(config.resendApiKey && config.emailFrom);

/** Send an email with Resend (https://resend.com). Returns false when email is not set up. */
export async function sendEmail({ to, subject, text, html, ics }) {
  if (!emailConfigured() || !to) return false;
  const body = { from: config.emailFrom, to: [to], subject, text, ...(html ? { html } : {}) };
  if (ics) body.attachments = [{ filename: 'appointment.ics', content: Buffer.from(ics).toString('base64') }];
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.warn('[otrelink] email failed', res.status, await res.text().catch(() => ''));
    return res.ok;
  } catch (err) {
    console.warn('[otrelink] email failed', err?.message);
    return false;
  }
}
