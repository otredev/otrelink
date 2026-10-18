import { defineConfig, loadEnv } from 'vite';
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

// VITE_BASE: sub-path where the site is served.
//   "/" for a custom domain or Render/Netlify, "/otrelink/" for GitHub Pages.
const base = process.env.VITE_BASE || '/';

// Static hosts without rewrites (GitHub Pages) serve 404.html for unknown
// paths like /otrelink/username, so 404.html is a copy of the app.
// Cloudflare Pages (CF_PAGES=1) is left without it: with no 404.html it serves
// index.html with a 200 for every path (SPA mode), which is what we want.
const spaFallback = () => ({
  name: 'otrelink-spa-404',
  apply: 'build',
  closeBundle() {
    if (process.env.CF_PAGES) return;
    const dist = resolve(import.meta.dirname, 'dist');
    copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'));
  },
});

export default defineConfig(({ command, mode }) => {
  // A production build without VITE_API_URL would silently call http://localhost:3000.
  const env = { ...loadEnv(mode, import.meta.dirname, 'VITE_'), ...process.env };
  if (command === 'build' && !env.VITE_API_URL) {
    throw new Error(
      '\n\nVITE_API_URL is not set. The public page needs the URL of the Otrelink app (API), e.g.\n'
      + '  VITE_API_URL=https://your-app.onrender.com\n'
      + 'GitHub Pages: add it in Settings → Secrets and variables → Actions → Variables.\n'
      + 'Cloudflare: add it in the Worker → Settings → Build → Variables and secrets (build variables, not runtime ones).\n'
      + 'Local build: put it in apps/page/.env\n',
    );
  }
  return {
    base,
    appType: 'spa',
    build: { target: 'es2020' },
    plugins: [spaFallback()],
  };
});
