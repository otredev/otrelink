// "Download as website": turns a page into a static site (.zip) that opens
// from disk without the server or the database.
//
//   <slug>/index.html   pre-rendered page (works even with JavaScript off)
//   <slug>/style.css    all styles
//   <slug>/script.js    page data + behavior (countdown, copy buttons, carousels…)
//   <slug>/assets/      uploaded images and PDFs
import path from 'node:path';
import { createRequire } from 'node:module';
import { strToU8, zipSync } from 'fflate';
import { renderPage, esc, safeUrl, resolveDesign, colorSchemeOf } from '@otrelink/core';
import { getDb } from './db/index.js';
import { toPublicPage } from './pages.js';

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif', 'application/pdf': 'pdf' };
const ASSET_RE = /(?:https?:\/\/[^\s"'()]+)?\/api\/assets\/([a-f0-9]{32})(?:\?[^\s"'()]*)?/g;

let runtimePromise;
/** Bundle @otrelink/core/standalone into one classic script (cached per process). */
function getRuntime() {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const esbuild = await import('esbuild');
      const require = createRequire(path.join(process.cwd(), 'package.json'));
      const res = await esbuild.build({
        entryPoints: [require.resolve('@otrelink/core/standalone')],
        bundle: true,
        format: 'iife',
        platform: 'browser',
        target: 'es2019',
        minify: true,
        legalComments: 'none',
        write: false,
      });
      return res.outputFiles[0].text;
    })().catch((err) => { runtimePromise = null; throw err; });
  }
  return runtimePromise;
}

/** Find uploaded files used by the page, copy them into assets/ and rewrite the URLs. */
async function collectAssets(page) {
  const db = await getDb();
  let json = JSON.stringify(page);
  const ids = [...new Set([...json.matchAll(ASSET_RE)].map((m) => m[1]))];
  const files = {};
  const map = {};
  for (const id of ids) {
    const asset = await db.assets.findById(id);
    if (!asset) continue;
    const ext = EXT[asset.mime] || 'bin';
    const base = (asset.name || '').replace(/\.[a-z0-9]+$/i, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
    const name = `${base ? `${base}-` : ''}${id.slice(0, 6)}.${ext}`;
    files[`assets/${name}`] = new Uint8Array(asset.data);
    map[id] = `./assets/${name}`;
  }
  json = json.replace(ASSET_RE, (whole, id) => map[id] || whole);
  return { page: JSON.parse(json), files };
}

function indexHtml(page, { html, fontsHref }) {
  const title = page.settings.seoTitle || page.profile.title || `@${page.slug}`;
  const desc = page.settings.seoDescription || page.profile.bio || '';
  const image = safeUrl(page.settings.ogImage || page.profile.avatar);
  const d = resolveDesign(page.design);
  const scheme = colorSchemeOf(d) === 'dark' ? 'dark' : 'only light';
  const bg = (d.wallpaper.color || d.wallpaper.bg || d.wallpaper.from || '#ffffff').slice(0, 7);
  const icon = image || `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="7" fill="#7a2cf0"/></svg>')}`;
  return `<!doctype html>
<html lang="en" style="color-scheme:${scheme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="${scheme}">
<meta name="darkreader-lock">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${image ? `<meta property="og:image" content="${esc(image)}">\n` : ''}<meta name="theme-color" content="${esc(bg)}">
<link rel="icon" href="${esc(icon)}">
${fontsHref ? `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="${esc(fontsHref)}">\n` : ''}<link rel="stylesheet" href="style.css">
</head>
<body style="background:${esc(bg)}">
<div id="app">${html}</div>
<script src="script.js"></script>
</body>
</html>
`;
}

const README = (page, homeUrl) => `${page.profile.title || page.slug} — exported from Otrelink
${'='.repeat(40)}

Open index.html in any browser. No server or database needed.

Files
  index.html   the page
  style.css    styles (edit freely)
  script.js    page data and behavior (countdown, copy buttons, carousels…)
  assets/      your uploaded images and PDFs

Needs an internet connection only for: Google Fonts (falls back to system
fonts offline), embedded videos, music players and maps.

To publish it, upload the whole folder to any static host
(GitHub Pages, Netlify, Vercel, Cloudflare Pages…).

Made with Otrelink — ${homeUrl}
`;

/** Build the .zip for a stored page. Returns { filename, data: Uint8Array }. */
export async function exportSite(storedPage, { homeUrl, liveUrl = '', plan }) {
  const { page, files } = await collectAssets(toPublicPage(storedPage, plan, { live: false }));
  const rendered = renderPage(page, { mode: 'export', footerUrl: homeUrl, liveUrl });
  const runtime = await getRuntime();
  const dir = page.slug;
  const zip = {
    [`${dir}/index.html`]: strToU8(indexHtml(page, rendered)),
    [`${dir}/style.css`]: strToU8(`html,body{margin:0;min-height:100%}\n${rendered.css}`),
    [`${dir}/script.js`]: strToU8(`window.__OTRELINK_PAGE__=${JSON.stringify(page)};\n${runtime}`),
    [`${dir}/README.txt`]: strToU8(README(page, homeUrl)),
  };
  // Images and PDFs are already compressed: store them as-is.
  for (const [name, data] of Object.entries(files)) zip[`${dir}/${name}`] = [data, { level: 0 }];
  return { filename: `${dir}-website.zip`, data: zipSync(zip, { level: 6 }) };
}
