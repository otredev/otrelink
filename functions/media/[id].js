// Cloudflare Pages Function: /media/<id>
// Serves files uploaded to Otrelink (images, PDFs) straight from the R2 bucket, bound to
// this Pages project as MEDIA (Settings → Bindings → R2 bucket). Files never change, so
// browsers keep them for a year. ?download=1 downloads instead of opening.
export async function onRequest({ request, params, env }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  const id = String(params.id || '').toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(id) || !env.MEDIA) return new Response('Not found', { status: 404 });

  const ranged = request.headers.has('range');
  const obj = await env.MEDIA.get(`assets/${id}`, { onlyIf: request.headers, ...(ranged ? { range: request.headers } : {}) });
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('ETag', obj.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  const download = new URL(request.url).searchParams.has('download');
  const ext = headers.get('content-type') === 'application/pdf' ? '.pdf' : '';
  const name = String(obj.customMetadata?.name || `file-${id.slice(0, 8)}${ext}`).replace(/["\\\r\n]/g, '');
  headers.set('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${name}"`);

  // If-None-Match / If-Modified-Since matched: the browser's copy is current.
  if (!('body' in obj)) return new Response(null, { status: 304, headers });
  if (ranged && obj.range) {
    const { offset = 0, length = obj.size - offset } = obj.range;
    headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${obj.size}`);
    headers.set('Content-Length', String(length));
    return new Response(request.method === 'HEAD' ? null : obj.body, { status: 206, headers });
  }
  headers.set('Content-Length', String(obj.size));
  return new Response(request.method === 'HEAD' ? null : obj.body, { headers });
}
