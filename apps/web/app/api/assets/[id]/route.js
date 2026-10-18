import { getDb } from '@/lib/db';
import { config } from '@/lib/config';
import { handler, error } from '@/lib/http';

// Serve an uploaded file. PDFs open in the browser; add ?download=1 to download.
export const GET = handler(async (req, { params }) => {
  const { id } = await params;
  if (!/^[a-f0-9]{32}$/.test(id)) return error(404, 'not_found');
  const db = await getDb();
  const download = new URL(req.url).searchParams.has('download');
  let asset = await (db.assets.findMeta || db.assets.findById)(id);
  if (!asset) return error(404, 'not_found');
  // Files in R2 are served only by the public page (MEDIA_URL/<id>), not here.
  // Without MEDIA_URL, uploads use this address, so this app serves them from R2 itself.
  if (asset.storage === 'r2' && !asset.data) {
    if (config.mediaUrl) return error(404, 'not_found');
    asset = await db.assets.findById(id);
    if (!asset?.data) return error(404, 'not_found');
  }

  const ext = asset.mime === 'application/pdf' ? '.pdf' : '';
  const name = (asset.name || `file-${id.slice(0, 8)}${ext}`).replace(/"/g, '');
  return new Response(asset.data, {
    headers: {
      'Content-Type': asset.mime,
      'Content-Length': String(asset.data.length),
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${name}"`,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
