// File storage in Cloudflare R2 (S3-compatible API), for uploaded images and PDFs.
// On when these variables are set: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.
// Requests are signed with AWS Signature V4 using node:crypto (no SDK needed).
// Files are kept under "assets/<id>"; the public page serves them at MEDIA_URL/<id>
// (functions/media/[id].js on Cloudflare Pages, with the bucket bound as MEDIA).
import crypto from 'node:crypto';
import { config } from './config.js';

export const assetKey = (id) => `assets/${id}`;
export const r2Configured = () => Boolean(config.r2.accountId && config.r2.accessKeyId && config.r2.secretAccessKey && config.r2.bucket);

const hmac = (key, s) => crypto.createHmac('sha256', key).update(s).digest();
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
// S3 URI encoding: everything but unreserved characters, "/" kept between segments.
const encodeKey = (key) => key.split('/').map((s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)).join('/');

/** Sign and send one request to R2. */
export async function r2Request(method, key, { body, headers = {}, now = new Date(), creds = config.r2 } = {}) {
  const host = `${creds.accountId}.r2.cloudflarestorage.com`;
  const path = `/${creds.bucket}/${encodeKey(key)}`;
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // 20261018T120000Z
  const day = amzDate.slice(0, 8);
  const payloadHash = sha256(body || '');
  const h = { host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
  for (const [k, v] of Object.entries(headers)) h[k.toLowerCase()] = String(v).trim();
  const names = Object.keys(h).sort();
  const canonical = [method, path, '', names.map((n) => `${n}:${h[n]}\n`).join(''), names.join(';'), payloadHash].join('\n');
  const scope = `${day}/auto/s3/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${creds.secretAccessKey}`, day), 'auto'), 's3'), 'aws4_request');
  const signature = crypto.createHmac('sha256', signingKey).update(toSign).digest('hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${creds.accessKeyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}`;
  const { host: _host, ...send } = h;
  return { url: `https://${host}${path}`, init: { method, headers: { ...send, authorization }, body } };
}

async function call(method, key, opts) {
  const { url, init } = await r2Request(method, key, opts);
  return fetch(url, init);
}

/** Upload a file. name (ASCII) is kept as metadata for downloads. */
export async function r2Put(key, data, { contentType, name = '' } = {}) {
  const headers = { 'content-type': contentType || 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable' };
  if (name) headers['x-amz-meta-name'] = name.replace(/[^\x20-\x7e]/g, '_').slice(0, 120);
  const res = await call('PUT', key, { body: data, headers });
  if (!res.ok) throw new Error(`R2 upload failed: ${res.status} ${await res.text().catch(() => '')}`.slice(0, 300));
}

/** Download a file → Buffer, or null when it doesn't exist. */
export async function r2Get(key) {
  const res = await call('GET', key);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`R2 download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function r2Delete(key) {
  const res = await call('DELETE', key);
  if (!res.ok && res.status !== 404) throw new Error(`R2 delete failed: ${res.status}`);
}
