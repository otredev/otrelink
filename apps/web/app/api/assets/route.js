import { getDb } from '@/lib/db';
import { config } from '@/lib/config';
import { handler, json, error, requireVerifiedUser, rateLimit } from '@/lib/http';
import { publicOrigin } from '@/lib/origin';

// Allowed uploads: type -> max size and a "magic bytes" check of the real content.
const TYPES = {
  'image/png': { max: () => config.maxUploadBytes },
  'image/jpeg': { max: () => config.maxUploadBytes },
  'image/webp': { max: () => config.maxUploadBytes },
  'image/gif': { max: () => config.maxUploadBytes },
  'image/avif': { max: () => config.maxUploadBytes },
  'application/pdf': { max: () => config.maxPdfBytes, magic: (buf) => buf.subarray(0, 1024).includes(Buffer.from('%PDF-')) },
};

const cleanName = (name) => String(name || '').replace(/[^\w.\- ()]+/g, '_').slice(0, 120);

// Upload an image or PDF (multipart field "file"). Returns an absolute URL.
export const POST = handler(async (req) => {
  const user = await requireVerifiedUser();
  await rateLimit(req, 'upload', 60, 60 * 60 * 1000);
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return error(400, 'missing_file');
  const type = TYPES[file.type];
  if (!type) return error(415, 'unsupported_type');
  if (file.size > type.max()) return error(413, 'file_too_large', { max: type.max() });

  const data = Buffer.from(await file.arrayBuffer());
  if (type.magic && !type.magic(data)) return error(415, 'unsupported_type');

  const db = await getDb();
  const name = cleanName(file.name);
  const { id, storage } = await db.assets.create({ userId: user.id, mime: file.type, data, name });
  // Files in R2 are served by the public page (MEDIA_URL); the others by this app.
  const url = storage === 'r2' && config.mediaUrl ? `${config.mediaUrl}/${id}` : `${publicOrigin(req)}/api/assets/${id}`;
  return json({ id, url, name, size: data.length, type: file.type }, { status: 201 });
});
