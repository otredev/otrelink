'use client';
// Browser-side API helper.

export class ApiError extends Error {
  constructor(status, code, data = {}) { super(code); this.status = status; this.code = code; this.data = data; }
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: form || (body ? JSON.stringify(body) : undefined),
    credentials: 'same-origin',
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error || 'request_failed', data || {});
  return data;
}

const MESSAGES = {
  invalid_email: 'Enter a valid email address.',
  weak_password: 'Use at least 8 characters for your password.',
  invalid_slug: 'Use 3–30 letters, numbers, dots, dashes or underscores.',
  email_taken: 'An account with this email already exists. Log in instead.',
  terms_required: 'Please accept the Terms of Service and the Privacy Policy to create your account.',
  slug_taken: 'That username is taken. Try another one.',
  invalid_credentials: 'Email or password is incorrect.',
  wrong_password: 'Your current password is not correct.',
  same_password: 'The new password is the same as the current one.',
  password_too_long: 'Use at most 200 characters for your password.',
  same_email: 'That is already your email.',
  email_in_use: 'Another account already uses that email.',
  confirm_email_mismatch: 'Type your email exactly to confirm.',
  cancel_failed: 'We couldn’t cancel your subscription, so nothing was deleted. Try again or contact us.',
  too_many_requests: 'Too many attempts. Wait a minute and try again.',
  page_limit: 'You reached the maximum number of pages.',
  api_not_in_plan: 'API tokens are part of the Business plan.',
  token_limit: 'You reached the maximum number of API tokens. Revoke one to create another.',
  token_not_found: 'That token no longer exists.',
  invalid_token: 'The API token is not valid.',
  token_expired: 'The API token expired. Create a new one.',
  token_read_only: 'This token is read-only.',
  token_route_not_allowed: 'API tokens can’t be used for this.',
  file_too_large: 'That file is too large.',
  unsupported_type: 'That file type is not supported here.',
  unauthorized: 'Your session expired. Log in again.',
  not_enough_stamps: 'This card doesn’t have enough stamps for the reward yet.',
  nothing_to_undo: 'There is nothing to undo on this card.',
  card_not_found: 'No card with that code on this page.',
  plan_required: 'Your plan doesn’t include this. See Plans to upgrade.',
  account_banned: 'This account is suspended. Contact support if you think this is a mistake.',
  already_subscribed: 'You already have an active subscription.',
  stripe_not_configured: 'Card payments are not available yet.',
  paypal_not_configured: 'PayPal is not available yet.',
  email_not_verified: 'Confirm your email first. Check your inbox for the link.',
  email_not_configured: 'Email sending is not set up on the server.',
  email_failed: 'The email could not be sent. Try again in a few minutes.',
  payment_provider_error: 'The payment service didn’t respond. Try again in a minute.',
  push_not_configured: 'Push notifications aren’t set up on the server yet.',
  daily_limit: 'You reached the daily limit of notifications for this page.',
};

export function errorMessage(err) {
  if (err?.code === 'too_many_requests' && err.data?.retryAfter) {
    const min = Math.ceil(err.data.retryAfter / 60);
    return `Too many attempts. Try again in ${min} minute${min === 1 ? '' : 's'}.`;
  }
  if (err?.code === 'file_too_large' && err.data?.max) return `That file is too large. The limit is ${Math.round(err.data.max / 1048576)} MB.`;
  if (err?.code === 'page_limit') return `Your plan allows ${err.data?.limit ?? 1} page${err.data?.limit === 1 ? '' : 's'}. See Plans to create more.`;
  if (err?.code === 'internal_error') return 'The server had a problem. Try again in a moment.';
  return MESSAGES[err?.code] || 'Something went wrong. Try again.';
}

/** Resize an image file in the browser before uploading (keeps GIFs as-is). */
export async function prepareImage(file, maxSize = 1600) {
  if (file.type === 'image/gif' || !file.type.startsWith('image/')) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 600 * 1024) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.86));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' }) : file;
}

export async function uploadImage(file, maxSize) {
  const form = new FormData();
  form.append('file', await prepareImage(file, maxSize));
  return api('/api/assets', { method: 'POST', form });
}

/** Upload any allowed file (images are resized first). Returns { url, name, size, type }. */
export async function uploadFile(file, maxSize) {
  const form = new FormData();
  form.append('file', file.type.startsWith('image/') ? await prepareImage(file, maxSize) : file);
  return api('/api/assets', { method: 'POST', form });
}
