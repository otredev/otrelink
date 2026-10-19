// Cloudflare Pages Function: /robots.txt — everything may be crawled; points to the sitemap.
// Generated so the sitemap address follows the domain the site is served from.
export function onRequestGet({ request }) {
  const origin = new URL(request.url).origin;
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' },
  });
}
