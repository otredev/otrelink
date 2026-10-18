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
  // In R2: send the browser to the public copy (no file traffic through this server).
  if (asset.storage === 'r2' && !asset.data) {
    if (config.mediaUrl) {
      return new Response(null, { status: 302, headers: { Location: `${config.mediaUrl}/${id}${download ? '?download=1' : ''}`, 'Cache-Control': 'public, max-age=86400' } });
    }
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
