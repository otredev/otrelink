// Cloudflare Pages Function: /sitemap.xml
// Lists every page search engines may show (published, not sensitive, not hidden from
// search), from the API (/api/public/sitemap). Cached for an hour. Submit it in Google
// Search Console as "sitemap.xml". Needs the VITE_API_URL variable.
const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function onRequestGet({ request, env }) {
  const api = String(env.VITE_API_URL || '').replace(/\/$/, '');
  const origin = new URL(request.url).origin;
  let pages = [];
  if (api) {
    try {
      const res = await fetch(`${api}/api/public/sitemap`, { headers: { Accept: 'application/json' }, cf: { cacheTtl: 3600, cacheEverything: true } });
      if (res.ok) pages = (await res.json()).pages || [];
    } catch { /* an empty sitemap is still valid */ }
  }
  const body = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + pages.filter((p) => /^[\w.-]{1,60}$/.test(p.slug || '')).map((p) => {
      const day = /^\d{4}-\d{2}-\d{2}/.test(p.updatedAt || '') ? `<lastmod>${p.updatedAt.slice(0, 10)}</lastmod>` : '';
      return `  <url><loc>${xml(`${origin}/${p.slug}`)}</loc>${day}</url>`;
    }).join('\n')
    + '\n</urlset>\n';
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
