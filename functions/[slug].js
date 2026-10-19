// Cloudflare Pages Function: /<slug>  (one path segment, e.g. /otrebeh)
// Link previews (WhatsApp, iMessage, X, Facebook, LinkedIn, Slack…) don't run JavaScript,
// so the page's title, description and image are written into the HTML here, before it
// is sent: the app shell (index.html) + this page's data from the API (cached 5 min).
// Needs the VITE_API_URL variable (the same one the build uses).
// Anything that isn't a page (a file such as /sw.js or /favicon.svg) passes through untouched.

const SECURITY_HEADERS = {
  // Same as public/_headers, which Cloudflare doesn't apply to Function responses.
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'; upgrade-insecure-requests",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), usb=(), serial=(), bluetooth=(), browsing-topics=()',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

const httpsUrl = (v) => (/^https:\/\/[^\s"'<>]+$/i.test(String(v || '')) ? String(v) : '');
const clip = (v, n) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, n);

async function loadPage(api, slug, request) {
  try {
    const res = await fetch(`${api}/api/public/${encodeURIComponent(slug)}`, {
      headers: {
        Accept: 'application/json',
        // The API rate-limits per visitor: pass the visitor's IP instead of Cloudflare's.
        'X-Forwarded-For': request.headers.get('CF-Connecting-IP') || '',
      },
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (res.status === 404) return { missing: true };
    if (!res.ok) return {};
    return { page: (await res.json()).page };
  } catch {
    return {};
  }
}

export async function onRequestGet({ request, params, env, next }) {
  const slug = String(params.slug || '');
  // Files (sw.js, favicon.svg, 404.html…) and anything that can't be a page.
  if (!slug || slug.includes('.') || !/^[\w-]{1,60}$/.test(slug)) return next();
  // Google Search Console check (public/google3d948c8e4fd24b20.html): Cloudflare Pages serves
  // it without the extension, which looks like a slug.
  if (slug === 'google3d948c8e4fd24b20') return next();

  const api = String(env.VITE_API_URL || '').replace(/\/$/, '');
  const shell = await env.ASSETS.fetch(new URL('/', request.url));
  if (!api || !shell.ok) return shell;

  const { page, missing } = await loadPage(api, slug.toLowerCase(), request);
  const headers = new Headers(shell.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate');

  // Unknown or unpublished page: the app shows its "not found" screen; crawlers get a real 404.
  if (missing) return new Response(shell.body, { status: 404, headers });
  if (!page) return new Response(shell.body, { status: shell.status, headers });

  const s = page.settings || {};
  const p = page.profile || {};
  const title = clip(s.seoTitle || p.title || `@${page.slug}`, 90);
  const desc = clip(s.seoDescription || p.bio || '', 200);
  // Pages marked as sensitive don't show a picture in previews.
  const image = s.sensitive ? '' : httpsUrl(s.ogImage) || httpsUrl(p.avatar);
  const url = `${new URL(request.url).origin}/${page.slug}`;

  const meta = { description: desc, 'og:title': title, 'og:description': desc, 'og:image': image };
  const extra = [
    // "Hide from search engines" (Settings): tell crawlers not to list the page.
    ...(s.noIndex ? [['name', 'robots', 'noindex']] : []),
    ['property', 'og:url', url], ['property', 'og:type', 'profile'], ['property', 'og:site_name', 'Otrelink'],
    ['name', 'twitter:title', title], ['name', 'twitter:description', desc],
    ...(image ? [['name', 'twitter:image', image], ['property', 'og:image:alt', title]] : []),
  ];
  const attr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  const html = new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(title); } })
    .on('meta[name="description"], meta[property^="og:"]', {
      element(el) {
        const key = el.getAttribute('property') || el.getAttribute('name');
        if (key in meta) el.setAttribute('content', meta[key]);
      },
    })
    .on('meta[name="twitter:card"]', { element(el) { el.setAttribute('content', image ? 'summary_large_image' : 'summary'); } })
    .on('head', {
      element(el) {
        el.append(extra.map(([k, n, v]) => `<meta ${k}="${n}" content="${attr(v)}">`).join('')
          + `<link rel="canonical" href="${attr(url)}">`, { html: true });
      },
    })
    .transform(new Response(shell.body, { status: 200, headers }));
  return html;
}
