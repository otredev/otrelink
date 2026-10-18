// Cloudflare Pages Function: /manifest/<slug>.webmanifest
// A web app manifest per page, so a visitor can add one page to the home screen as
// its own app. On iPhone that is required to receive push notifications.
// Needs the VITE_API_URL variable (the same one the build uses).
export async function onRequestGet({ params, env }) {
  const slug = String(params.slug || '').replace(/\.webmanifest$/i, '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40);
  if (!slug) return new Response('Not found', { status: 404 });
  const api = String(env.VITE_API_URL || '').replace(/\/$/, '');
  let page = null;
  if (api) {
    try {
      const res = await fetch(`${api}/api/public/${encodeURIComponent(slug)}`, { cf: { cacheTtl: 300, cacheEverything: true } });
      if (res.ok) page = (await res.json()).page;
    } catch { /* fall back to the slug */ }
  }
  const name = (page?.profile?.title || `@${slug}`).slice(0, 45);
  const avatar = /^https:\/\//.test(page?.profile?.avatar || '') ? page.profile.avatar : '';
  const manifest = {
    id: `/${slug}`,
    name,
    short_name: name.slice(0, 15),
    start_url: `/${slug}?app=1`,
    scope: `/${slug}`,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      ...(avatar ? [{ src: avatar, sizes: '512x512', purpose: 'any' }] : []),
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}
