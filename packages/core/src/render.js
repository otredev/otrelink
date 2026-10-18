// Renderer: page document -> HTML + CSS.
// Used by the public page (vanilla) and by the dashboard live preview, so
// both always look exactly the same.

import { adjustedImg } from './util/image.js';
import { blockTypes, blockStyleOf, blockStyleGroups } from './blocks/index.js';
import { buttonStyles, buttonHovers, scopedButtonCss } from './buttons/index.js';
import { wallpapers } from './wallpapers/index.js';
import { attentionAnimations, entranceAnimations, backgroundMotions, PRESS_CSS, ATTENTION_PAUSE_CSS } from './animations.js';
import { googleFontsHref } from './fonts.js';
import { designCss, resolveDesign, colorSchemeOf } from './design.js';
import { socialHref, socialIcon, socials } from './socials.js';
import { esc, safeUrl, miniMarkdown } from './util/html.js';
import { verifiedSvg, icon } from './icons.js';
import { navItems } from './nav.js';
import { flattenBlocks } from './tree.js';
import { PAGE_LANGUAGES, pageLanguage, otherLanguage, localizePage, resolveLanguage, rememberLanguage } from './translate.js';

const BASE_CSS = `
.ol-root{position:relative;min-height:100%;font-family:var(--ol-body-font);font-size:var(--ol-body-size);color:var(--ol-text-color);-webkit-font-smoothing:antialiased;isolation:isolate}
.ol-root *,.ol-root *::before,.ol-root *::after{box-sizing:border-box}
.ol-root iframe{color-scheme:light}
.ol-root .ol-styled{color:var(--ol-text-color)}
.ol-root.ol-noselect{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.ol-root.ol-noselect :is(input,textarea,select,[contenteditable]){-webkit-user-select:text;user-select:text}
.ol-root.ol-noselect img,.ol-root.ol-nomenu img{-webkit-user-drag:none;-webkit-touch-callout:none}
.ol-root .ol-bg{position:fixed;inset:0;z-index:-1;overflow:hidden}
.ol-root .ol-main{max-width:var(--ol-max-width);margin:0 auto;padding:var(--ol-pad-top) 16px 40px;display:flex;flex-direction:column;min-height:100vh;min-height:100dvh}
.ol-root .ol-profile{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;margin-bottom:24px}
.ol-root .ol-avatar{width:var(--ol-avatar-size);height:var(--ol-avatar-size);object-fit:cover;border:var(--ol-avatar-bw) solid var(--ol-avatar-bc);margin-bottom:8px;flex-shrink:0;display:grid;place-items:center;font-size:calc(var(--ol-avatar-size)*.4);font-weight:700;background:color-mix(in srgb,var(--ol-title-color) 12%,transparent);color:var(--ol-title-color);font-family:var(--ol-title-font)}
.ol-root img.ol-avatar-natural{height:auto}
.ol-root .ol-zoom{overflow:hidden}.ol-root .ol-zoom>img{display:block;width:100%;height:100%}
.ol-root .ol-avatar-circle{border-radius:50%}.ol-root .ol-avatar-rounded{border-radius:22%}.ol-root .ol-avatar-square{border-radius:4px}
.ol-root .ol-title{margin:0;font-family:var(--ol-title-font);font-size:var(--ol-title-size);font-weight:var(--ol-title-weight);color:var(--ol-title-color);line-height:1.2;display:inline-flex;align-items:center;gap:6px;overflow-wrap:anywhere}
.ol-root .ol-title svg{color:#3b82f6;font-size:.8em;flex-shrink:0}
.ol-root .ol-bio{margin:0;line-height:1.5;max-width:46ch;opacity:.92}
.ol-root .ol-bio a{color:inherit}
.ol-root.ol-layout-hero .ol-avatar{width:100%;height:auto;aspect-ratio:4/3;border-radius:var(--ol-surface-radius);margin-bottom:16px;font-size:64px}
.ol-root.ol-layout-left .ol-profile{align-items:flex-start;text-align:left}
.ol-root .ol-socials{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:10px}
.ol-root.ol-layout-left .ol-profile .ol-socials{justify-content:flex-start}
.ol-root .ol-socials-bottom{margin:28px 0 0}
.ol-root .ol-social{color:var(--ol-social-color);display:inline-grid;place-items:center;transition:transform .15s,opacity .15s;text-decoration:none}
.ol-root .ol-social svg{width:var(--ol-social-size);height:var(--ol-social-size)}
.ol-root .ol-social:hover{transform:translateY(-2px)}
.ol-root .ol-socials-filled .ol-social{background:var(--ol-social-color);color:var(--ol-social-fg,#fff);padding:9px;border-radius:50%}
.ol-root .ol-socials-outline .ol-social{border:1.5px solid var(--ol-social-color);padding:8px;border-radius:50%}
.ol-root .ol-blocks{display:flex;flex-direction:column;gap:var(--ol-gap)}
.ol-root .ol-btn{display:flex;align-items:center;gap:12px;width:100%;min-height:var(--ol-btn-h);padding:8px 16px;border-radius:var(--ol-btn-radius);text-decoration:none;font:inherit;font-weight:600;text-align:var(--ol-btn-align);text-transform:var(--ol-btn-transform);cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,background .18s,color .18s,opacity .18s;position:relative;-webkit-tap-highlight-color:transparent}
.ol-root .ol-btn-label{flex:1;display:flex;flex-direction:column;min-width:0;overflow-wrap:anywhere}
.ol-root .ol-btn-sub{font-weight:400;font-size:.85em;opacity:.8;text-transform:none}
.ol-root .ol-btn-thumb{width:calc(var(--ol-btn-h) - 16px);height:calc(var(--ol-btn-h) - 16px);border-radius:calc(var(--ol-btn-radius)*.6);object-fit:cover;flex-shrink:0;margin-left:-8px}
.ol-root .ol-btn-icon{display:inline-grid;place-items:center;width:28px;flex-shrink:0}
.ol-root .ol-btn-spacer{width:28px;flex-shrink:0}
.ol-root .ol-btn.has-media .ol-btn-thumb+.ol-btn-label+.ol-btn-spacer{width:calc(var(--ol-btn-h) - 24px)}
.ol-root .ol-btn-disabled{opacity:.5;cursor:default}
.ol-root .ol-card{background:var(--ol-surface);color:var(--ol-surface-fg);border-radius:var(--ol-surface-radius);padding:14px 16px}
.ol-root .ol-frame{width:100%;border-radius:var(--ol-surface-radius);overflow:hidden;background:color-mix(in srgb,var(--ol-text-color) 8%,transparent)}
.ol-root .ol-frame iframe{width:100%;height:100%;border:0;display:block}
.ol-root .ol-toggle>summary{list-style:none}.ol-root .ol-toggle>summary::-webkit-details-marker{display:none}
.ol-root .ol-toggle-chevron{transition:transform .2s}.ol-root .ol-toggle[open]>summary .ol-toggle-chevron{transform:rotate(180deg)}
.ol-root .ol-toggle-body{margin-top:8px;animation:ol-toggle-in .2s ease}
@keyframes ol-toggle-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
.ol-root .ol-embed-title{margin:0 0 8px;font-weight:600;text-align:center}
.ol-root .ol-footer{margin-top:auto;padding:48px 0 8px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center}
.ol-root .ol-footer-cta{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 24px;border-radius:999px;background:var(--ol-surface);color:var(--ol-surface-fg);font-size:16px;font-weight:600;text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.ol-root .ol-footer-links{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--ol-text-color)}
.ol-root .ol-footer-row{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:2px 6px}
.ol-root .ol-footer-row>span{opacity:.55}
.ol-root .ol-footer-row a,.ol-root .ol-footer-row button{color:inherit;font:inherit;text-decoration:none;background:none;border:0;padding:4px 2px;cursor:pointer;opacity:.85}
.ol-root .ol-footer-row a:focus-visible,.ol-root .ol-footer-row button:focus-visible,.ol-root .ol-footer-cta:focus-visible{outline:2px solid currentColor;outline-offset:2px;border-radius:6px}
@media (hover:hover){.ol-root .ol-footer-row a:hover,.ol-root .ol-footer-row button:hover{opacity:1;text-decoration:underline}}
.ol-root .ol-block-scheduled{opacity:.45;outline:1px dashed currentColor;outline-offset:3px;border-radius:var(--ol-btn-radius)}
.ol-root .ol-gate{position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:24px;background:rgba(0,0,0,.55);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
.ol-root .ol-gate div{background:#fff;color:#111;border-radius:20px;padding:24px;max-width:340px;text-align:center;font-family:system-ui,sans-serif}
.ol-root .ol-gate p{margin:0 0 16px;line-height:1.5}
.ol-root .ol-gate button{font:inherit;font-weight:600;border:0;border-radius:999px;padding:12px 22px;background:#111;color:#fff;cursor:pointer}
.ol-root .ol-lang{position:absolute;top:12px;right:12px;z-index:5;display:inline-flex;padding:3px;gap:2px;border-radius:999px;background:var(--ol-surface);box-shadow:0 2px 10px rgba(0,0,0,.12)}
.ol-root .ol-lang[hidden]{display:none}
.ol-root .ol-lang button{position:relative;font:600 12px/1 system-ui,sans-serif;letter-spacing:.03em;border:0;border-radius:999px;padding:6px 10px;background:transparent;color:var(--ol-surface-fg);opacity:.7;cursor:pointer}
.ol-root .ol-lang button[aria-pressed="true"]{background:var(--ol-surface-fg);color:var(--ol-surface);opacity:1}
.ol-root.has-nav-right .ol-lang{right:auto;left:12px}
.ol-root .ol-navmenu{position:fixed;top:12px;z-index:30;font-family:var(--ol-body-font)}
.ol-root .ol-navmenu-left{left:max(12px,calc(50% - var(--ol-max-width)/2 - 4px))}
.ol-root .ol-navmenu-right{right:max(12px,calc(50% - var(--ol-max-width)/2 - 4px))}
.ol-root .ol-nav-btn{width:42px;height:42px;border-radius:50%;border:0;display:grid;place-items:center;cursor:pointer;background:var(--ol-surface);color:var(--ol-surface-fg);box-shadow:0 4px 16px rgba(0,0,0,.18);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);transition:transform .15s}
.ol-root .ol-nav-btn:active{transform:scale(.94)}
.ol-root .ol-nav-panel{position:absolute;top:50px;width:min(290px,calc(100vw - 24px));max-height:min(70vh,560px);overflow:auto;border-radius:18px;padding:8px;background:var(--ol-surface);color:var(--ol-surface-fg);box-shadow:0 18px 50px -12px rgba(0,0,0,.45);transform-origin:top left;animation:ol-nav-in .16s ease-out}
.ol-root .ol-navmenu-right .ol-nav-panel{right:0;transform-origin:top right}
.ol-root .ol-nav-panel[hidden]{display:none}
@keyframes ol-nav-in{from{opacity:0;transform:scale(.96) translateY(-4px)}}
.ol-root .ol-nav-title{margin:6px 10px 6px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.55}
.ol-root .ol-nav-list{list-style:none;margin:0;padding:0}
.ol-root .ol-nav-list a{display:block;padding:10px 12px;border-radius:12px;text-decoration:none;color:inherit;font-weight:600;font-size:15px;line-height:1.3}
.ol-root .ol-nav-list a.is-sub{padding-left:26px;font-weight:500;font-size:14px;opacity:.85}
.ol-root .ol-nav-list a:hover,.ol-root .ol-nav-list a:focus-visible{background:color-mix(in srgb,var(--ol-surface-fg) 8%,transparent);outline:none}
.ol-root .ol-nav-list a[aria-current="true"]{background:var(--ol-surface-fg);color:var(--ol-surface)}
.ol-root .ol-nav-top{display:flex;align-items:center;gap:8px;margin-top:4px;padding:10px 12px;border-top:1px solid color-mix(in srgb,var(--ol-surface-fg) 12%,transparent);text-decoration:none;color:inherit;font-size:13px;font-weight:600;opacity:.75}
.ol-root .ol-block[id]{scroll-margin-top:70px}
.ol-root .ol-nav-lang{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:4px;padding:8px 6px 6px 12px;border-top:1px solid color-mix(in srgb,var(--ol-surface-fg) 12%,transparent);font-size:13px;font-weight:600}
.ol-root .ol-nav-lang>span{display:inline-flex;align-items:center;gap:8px;opacity:.75}
.ol-root .ol-nav-list+.ol-nav-lang{margin-top:4px}
.ol-root .ol-nav-title+.ol-nav-lang{border-top:0;margin-top:0}
.ol-root .ol-lang.ol-lang-inmenu{position:static;box-shadow:none;background:color-mix(in srgb,var(--ol-surface-fg) 8%,transparent)}
.ol-root.has-nav .ol-main{padding-top:max(var(--ol-pad-top),66px)}
@media (prefers-reduced-motion:reduce){.ol-root *{animation:none!important;transition:none!important}}
`;

function isScheduledOut(block, now) {
  const { showFrom, showUntil } = block.options || {};
  if (showFrom && new Date(showFrom).getTime() > now) return true;
  if (showUntil && new Date(showUntil).getTime() < now) return true;
  return false;
}

function renderSocials(page, d, position) {
  // 'both' shows the icons under the profile and again at the end of the page.
  if ((d.socialsPosition !== position && d.socialsPosition !== 'both') || !page.socials?.length) return '';
  const items = page.socials
    .filter((s) => socials.has(s.platform) && s.url)
    .map((s) => {
      const p = socials.get(s.platform);
      const href = safeUrl(socialHref(s.platform, s.url), { allowRelative: false });
      if (!href) return '';
      const brandColor = d.socialsStyle === 'brand' ? ` style="color:${p.color}"` : '';
      const target = /^https?:/.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a class="ol-social" href="${esc(href)}"${target} aria-label="${esc(p.label)}" data-ol-track="social:${esc(s.platform)}"${brandColor}>${socialIcon(s.platform)}</a>`;
    })
    .join('');
  const style = d.socialsStyle === 'brand' ? 'plain' : d.socialsStyle;
  return items ? `<nav class="ol-socials ol-socials-${position} ol-socials-${style}${position === 'bottom' ? ' ol-enter' : ''}" aria-label="Social links">${items}</nav>` : '';
}

function renderProfile(page, d) {
  const p = page.profile || {};
  let avatar = '';
  if (d.avatarShape !== 'hidden') {
    const shape = `ol-avatar ol-avatar-${d.avatarShape}`;
    const src = safeUrl(p.avatar);
    const adj = p.avatarAdjust;
    avatar = src
      ? adjustedImg({ src, alt: p.title, cls: `${shape}${adj?.fit === 'natural' ? ' ol-avatar-natural' : ''}`, adj })
      : `<div class="${shape}" aria-hidden="true">${esc((p.title || '?').replace(/^@/, '').charAt(0).toUpperCase())}</div>`;
  }
  const badge = p.verified ? verifiedSvg : '';
  return `<header class="ol-profile ol-enter">${avatar}`
    + `${p.title ? `<h1 class="ol-title">${esc(p.title)}${badge}</h1>` : ''}`
    + `${p.bio ? `<p class="ol-bio">${miniMarkdown(p.bio)}</p>` : ''}`
    + `${renderSocials(page, d, 'top')}</header>`;
}

// ── Page footer ────────────────────────────────────────────────
// "Create your own Otrelink" button, then Cookies · Report · Privacy (always: visitors' data is
// processed by Otrelink, so its notices must be one tap away) and Explore · About this account.
// Report, Explore and About open sheets in the public page app (apps/page/src/footer.js);
// static exports have no app, so they keep only the links.
// settings.hideFooter hides the Otrelink button and Explore; the legal links stay.
const FOOTER_TEXT = {
  en: { cta: 'Create your own Otrelink', cookies: 'Cookies', report: 'Report', privacy: 'Privacy', explore: 'Explore', about: 'About this account' },
  es: { cta: 'Crea tu propio Otrelink', cookies: 'Cookies', report: 'Denunciar', privacy: 'Privacidad', explore: 'Explorar', about: 'Sobre esta cuenta' },
};

function renderFooter(page, lang, opts = {}) {
  const t = FOOTER_TEXT[lang === 'es' ? 'es' : 'en'];
  // Legal pages live in the Otrelink app (legalUrl); footerUrl is where "Create your own" goes.
  const legal = String(opts.legalUrl || opts.footerUrl || '').replace(/\/$/, '');
  const branded = !page.settings?.hideFooter;
  const sheets = opts.mode !== 'export';
  const link = (href, label) => `<a href="${esc(href)}" target="_blank" rel="noopener">${label}</a>`;
  const sheet = (kind, label) => `<button type="button" data-ol-footer="${kind}" aria-haspopup="dialog">${label}</button>`;
  const row = (items, label) => `<nav class="ol-footer-row" aria-label="${label}">${items.filter(Boolean).join('<span aria-hidden="true">·</span>')}</nav>`;
  return '<footer class="ol-footer ol-enter">'
    + (branded ? `<a class="ol-footer-cta" href="${esc(opts.footerUrl || '/')}" target="_blank" rel="noopener">${t.cta}</a>` : '')
    + '<div class="ol-footer-links">'
    + row([link(`${legal}/cookies`, t.cookies), sheets && sheet('report', t.report), link(`${legal}/privacy`, t.privacy)], 'Legal')
    + (sheets ? row([branded && sheet('explore', t.explore), sheet('about', t.about)], 'Otrelink') : '')
    + '</div></footer>';
}

/**
 * Render a page.
 * @param {object} page   page document
 * @param {object} opts   { mode: 'live' | 'preview' | 'export', animate: boolean, now: number, footerUrl: string, legalUrl: string }
 * @returns {{ html: string, css: string, fontsHref: string }}
 */
export function renderPage(rawPage, opts = {}) {
  // Second language: render the owner's translation when `opts.lang` asks for it.
  const lang = resolveLanguage(rawPage, opts.lang);
  const page = localizePage(rawPage, lang);
  const mode = opts.mode || 'live';
  const now = opts.now ?? Date.now();
  const animate = opts.animate ?? mode !== 'preview';
  const d = resolveDesign(page.design);
  const usedTypes = new Set();
  const usedAnims = new Set();
  const usedEntrances = new Set(); // entrance animations chosen by single blocks
  const usedBlockButtons = new Set(); // button styles used by blocks with their own style
  // Navigation menu: blocks it lists get an id to jump to (and to link to: page#section).
  const nav = navItems(page, (b) => b.enabled && blockTypes.has(b.type) && (mode === 'preview' || !isScheduledOut(b, now)));
  const anchors = new Map(nav.map((n) => [n.id, ['app', 'root'].includes(n.anchor) ? `${n.anchor}-section` : n.anchor]));

  // Renders a list of blocks. Containers (collections) get their rendered
  // children in ctx.children, plus ctx.container for children to adapt their look.
  const renderBlocks = (blocks, depth, container) => (blocks || [])
    .map((block) => {
      const mod = blockTypes.get(block.type);
      if (!mod || !block.enabled) return '';
      const scheduledOut = isScheduledOut(block, now);
      if (scheduledOut && mode !== 'preview') return '';
      usedTypes.add(mod.type);
      const anim = block.options?.animation && block.options.animation !== 'none' ? block.options.animation : '';
      if (anim) usedAnims.add(anim);
      const ctx = { blockId: block.id, design: d, page, mode, depth, container, apiBase: opts.apiBase ?? '', liveUrl: opts.liveUrl || '', now };
      if (mod.container) {
        const me = { type: mod.type, id: block.id, layout: block.data?.layout };
        ctx.children = (block.children || [])
          .map((child) => ({ block: child, html: renderBlocks([child], depth + 1, me) }))
          .filter((c) => c.html);
      }
      let inner;
      try {
        inner = mod.render(block.data || {}, ctx);
      } catch (err) {
        console.error(`[otrelink] block "${block.type}" failed to render`, err);
        return '';
      }
      // A block's own style: CSS variables on its wrapper (+ a class for its button style).
      const own = blockStyleOf(block.options, blockStyleGroups(block));
      if (own?.buttonStyle) usedBlockButtons.add(`${own.buttonStyle}:${depth}`);
      // Entrance: the page's (top-level blocks), or the block's own (any level), or none.
      const ownEnter = animate && block.options?.enter && entranceAnimations.has(block.options.enter) ? block.options.enter : '';
      if (ownEnter && ownEnter !== 'none') usedEntrances.add(ownEnter);
      const enters = ownEnter ? ownEnter !== 'none' : depth === 0;
      const cls = ['ol-block', `ol-b-${mod.type}`, enters && 'ol-enter', ownEnter && ownEnter !== 'none' && `ol-in-${ownEnter}`, anim && `ol-anim-${anim}`, scheduledOut && 'ol-block-scheduled',
        own && 'ol-styled', own?.buttonStyle && `ol-bs-${own.buttonStyle}`].filter(Boolean).join(' ');
      const style = own?.vars ? ` style="${esc(own.vars)}"` : '';
      const anchor = anchors.get(block.id);
      return `<div class="${cls}"${anchor ? ` id="${esc(anchor)}"` : ''} data-block-id="${esc(block.id)}" data-block-type="${esc(mod.type)}"${style}>${inner}</div>`;
    })
    .join('');
  const blocksHtml = renderBlocks(page.blocks, 0, null);

  const wp = wallpapers.resolve(d.wallpaper.type);
  const footer = renderFooter(page, lang, opts);
  const gate = page.settings?.sensitive
    ? `<div class="ol-gate" role="dialog" aria-modal="true"><div><p>${esc(page.settings.sensitiveMessage)}</p><button type="button" data-ol-gate>Continue</button></div></div>`
    : '';

  const entrance = animate && d.entrance !== 'none' ? `ol-enter-${d.entrance}` : '';
  let bgMotion = animate && d.backgroundMotion && d.backgroundMotion !== 'none' ? backgroundMotions.get(d.backgroundMotion) : null;
  // Some motions only suit some backgrounds (e.g. "Flow" needs a gradient).
  if (bgMotion?.wallpapers && !bgMotion.wallpapers.includes(d.wallpaper.type)) bgMotion = null;
  const motionCls = [bgMotion && `ol-bgm-${bgMotion.id}`, d.buttonPress && 'ol-press'].filter(Boolean).join(' ');
  const protect = [page.settings?.noSelect && 'ol-noselect', page.settings?.noRightClick && 'ol-nomenu'].filter(Boolean).join(' ');
  // Language switch: the page's own language and the owner's translation (see translate.js).
  const source = pageLanguage(rawPage);
  const langButtons = `${[source, otherLanguage(source)].map((l) => `<button type="button" data-ol-lang="${l}" lang="${l}" aria-pressed="${l === lang}" title="${esc(PAGE_LANGUAGES[l].label)}">${PAGE_LANGUAGES[l].short}</button>`).join('')}`;
  // ES / EN in the corner, or inside the navigation menu (Settings → Second language → Show the ES / EN switch).
  const langInMenu = page.settings?.translateButton && page.settings?.translatePlace === 'menu' && page.settings?.navMenu;
  const langSwitch = page.settings?.translateButton && !langInMenu
    ? `<nav class="ol-lang notranslate" aria-label="Language" translate="no">${langButtons}</nav>`
    : '';
  const navRight = page.settings?.navPosition === 'right';
  const showNav = nav.length > 0 || langInMenu;
  const navHtml = showNav
    ? `<div class="ol-navmenu ol-navmenu-${navRight ? 'right' : 'left'}">`
      + `<button type="button" class="ol-nav-btn" aria-expanded="false" aria-controls="ol-nav-panel" aria-label="Menu">${icon('menu', 20)}</button>`
      + `<nav class="ol-nav-panel" id="ol-nav-panel" aria-label="Sections" hidden><p class="ol-nav-title">${esc(page.profile?.title || 'Menu')}</p>`
      + (nav.length ? `<ul class="ol-nav-list">${nav.map((n) => `<li><a href="#${esc(anchors.get(n.id))}" data-ol-nav="${esc(n.id)}"${n.depth ? ' class="is-sub"' : ''}>${esc(n.label)}</a></li>`).join('')}</ul>` : '')
      + (langInMenu ? `<div class="ol-nav-lang"><span>${icon('globe', 15)}Language</span><div class="ol-lang ol-lang-inmenu notranslate" role="group" aria-label="Language" translate="no">${langButtons}</div></div>` : '')
      + (nav.length ? `<a href="#" class="ol-nav-top" data-ol-nav="top">${icon('arrowUp', 15)}Back to top</a>` : '')
      + '</nav></div>'
    : '';
  const html = `<div class="ol-root ol-layout-${d.headerLayout} ${entrance}${motionCls ? ` ${motionCls}` : ''}${protect ? ` ${protect}` : ''}${showNav ? ` has-nav${navRight ? ' has-nav-right' : ''}` : ''}" data-mode="${mode}" lang="${lang}">`
    + `<div class="ol-bg" aria-hidden="true">${wp.html ? wp.html(d.wallpaper) : ''}</div>${langSwitch}${navHtml}`
    + `<main class="ol-main">${renderProfile(page, d)}<section class="ol-blocks">${blocksHtml}</section>${renderSocials(page, d, 'bottom')}${footer}</main>`
    + `${gate}</div>`;

  const css = [
    BASE_CSS,
    designCss(d),
    wp.css(d.wallpaper, '.ol-root .ol-bg'),
    buttonStyles.resolve(d.buttonStyle).css,
    buttonHovers.resolve(d.buttonHover).css,
    entrance ? entranceAnimations.resolve(d.entrance).css : '',
    ...[...usedEntrances].filter((e) => !entrance || e !== d.entrance).map((e) => entranceAnimations.get(e)?.css || ''),
    bgMotion?.css || '',
    d.buttonPress ? PRESS_CSS : '',
    ...[...usedTypes].map((t) => blockTypes.get(t).css || ''),
    ...[...usedAnims].map((a) => attentionAnimations.get(a)?.css || ''),
    usedAnims.size ? ATTENTION_PAUSE_CSS : '',
    // Deeper blocks repeat .ol-styled so a block inside a styled collection wins over it.
    ...[...usedBlockButtons].map((k) => { const [id, depth] = k.split(':'); return scopedButtonCss(id, `.ol-bs-${id}${'.ol-styled'.repeat(Number(depth) + 1)}`); }),
    d.customCss || '',
  ].join('\n');

  return { html, css, fontsHref: googleFontsHref([d.titleFont, d.bodyFont]) };
}

/**
 * Render a page into a DOM container and wire up behavior.
 * Works in any document (main page or the dashboard's preview iframe).
 * @param {Element} container
 * @param {object} page
 * @param {object} opts  renderPage options + { onTrack(blockId, href), interceptLinks: boolean }
 * @returns {() => void} cleanup function
 */
export function mountPage(container, page, opts = {}) {
  const { html, css, fontsHref } = renderPage(page, opts);
  const fonts = fontsHref ? `<link rel="stylesheet" href="${esc(fontsHref)}">` : '';
  container.innerHTML = `${fonts}<style>${css}</style>${html}`;
  return hydratePage(container, page, opts);
}

/**
 * Tell the browser the page has its own colors, so its dark mode (e.g. Chrome
 * "auto dark" on Android) never repaints it. "only light" opts out of forced
 * darkening; a dark design declares "dark".
 */
export function applyColorScheme(doc, scheme) {
  if (!doc?.documentElement) return;
  const value = scheme === 'dark' ? 'dark' : 'only light';
  doc.documentElement.style.colorScheme = value;
  let meta = doc.querySelector('meta[name="color-scheme"]');
  if (!meta) {
    meta = doc.createElement('meta');
    meta.name = 'color-scheme';
    doc.head?.prepend(meta);
  }
  meta.content = value;
  // Dark-mode extensions (Dark Reader) skip pages with this tag.
  if (!doc.querySelector('meta[name="darkreader-lock"]')) {
    const lock = doc.createElement('meta');
    lock.name = 'darkreader-lock';
    doc.head?.append(lock);
  }
}

/**
 * Add browser behavior to an already rendered page: entrance animation
 * stagger, block behaviors (countdown, copy buttons, carousels…), the
 * sensitive-content gate and click tracking.
 * Used by mountPage() and by exported static sites (HTML is pre-rendered).
 * @returns {() => void} cleanup function
 */
export function hydratePage(container, rawPage, opts = {}) {
  const lang = resolveLanguage(rawPage, opts.lang);
  const page = localizePage(rawPage, lang);
  // The dashboard preview lives inside the dashboard document: it must not change it.
  if (opts.colorScheme !== false) applyColorScheme(container.ownerDocument, colorSchemeOf(resolveDesign(page.design)));
  if (opts.mode === 'live' && container.ownerDocument?.documentElement) container.ownerDocument.documentElement.lang = lang;
  const cleanups = [];
  // Stagger entrance animations (Style → Layout & motion → Delay between blocks).
  const design = resolveDesign(page.design);
  const step = Number.isFinite(Number(design.entranceStagger)) ? Number(design.entranceStagger) : 55;
  const entering = [...container.querySelectorAll('.ol-enter')];
  entering.forEach((el, i) => { el.style.animationDelay = `${Math.min(i, 14) * step}ms`; });
  const win = container.ownerDocument?.defaultView;
  const reduceMotion = win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // Animate on scroll: blocks below the fold wait (paused on their first frame) until
  // they reach the screen. Checked on scroll, so fast scrolls and jumps reveal them too.
  if (design.entranceOnScroll && !reduceMotion && win && entering.length) {
    const edge = () => (win.innerHeight || 800) * 0.92;
    let waiting = entering.filter((el) => el.getBoundingClientRect().top > edge());
    for (const el of waiting) el.style.animationPlayState = 'paused';
    let raf = 0;
    const reveal = () => {
      raf = 0;
      let n = 0;
      waiting = waiting.filter((el) => {
        if (el.getBoundingClientRect().top > edge()) return true;
        // Blocks that appear together still come in one after another.
        el.style.animationDelay = `${Math.min(n++, 6) * step}ms`;
        el.style.animationPlayState = 'running';
        return false;
      });
      if (!waiting.length) stop();
    };
    const onScroll = () => { if (!raf) raf = win.requestAnimationFrame(reveal); };
    const stop = () => { win.removeEventListener('scroll', onScroll); win.removeEventListener('resize', onScroll); if (raf) win.cancelAnimationFrame(raf); };
    if (waiting.length) {
      win.addEventListener('scroll', onScroll, { passive: true });
      win.addEventListener('resize', onScroll, { passive: true });
      cleanups.push(stop);
    }
  }
  // Background parallax: --ol-scroll goes 0 → 1 while scrolling down.
  if (container.querySelector('.ol-bgm-parallax') && !reduceMotion && win) {
    const root = container.querySelector('.ol-root') || container;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = win.requestAnimationFrame(() => {
        raf = 0;
        const doc = win.document.documentElement;
        const max = Math.max(1, doc.scrollHeight - win.innerHeight);
        root.style.setProperty('--ol-scroll', String(Math.min(1, Math.max(0, win.scrollY / max)).toFixed(3)));
      });
    };
    win.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    cleanups.push(() => { win.removeEventListener('scroll', onScroll); if (raf) win.cancelAnimationFrame(raf); });
  }

  // Per-block browser behavior.
  const byId = new Map(flattenBlocks(page.blocks).map((b) => [b.id, b]));
  for (const el of container.querySelectorAll('[data-block-id]')) {
    const mod = blockTypes.get(el.dataset.blockType);
    const block = byId.get(el.dataset.blockId);
    if (mod?.hydrate && block) {
      try { mod.hydrate(el, block.data, { blockId: block.id, mode: opts.mode, page, apiBase: opts.apiBase ?? '' }); } catch (err) { console.error(err); }
    }
  }

  const onClick = (e) => {
    const gateBtn = e.target.closest('[data-ol-gate]');
    if (gateBtn) { gateBtn.closest('.ol-gate')?.remove(); return; }
    const el = e.target.closest('[data-ol-track]');
    if (!el) {
      if (opts.interceptLinks && e.target.closest('a[href]')) e.preventDefault();
      return;
    }
    opts.onTrack?.(el.dataset.olTrack, el.getAttribute('href') || '');
    if (opts.interceptLinks && el.tagName === 'A') e.preventDefault();
  };
  container.addEventListener('click', onClick);

  // Content protection (Settings): no right-click menu, no dragging text or images.
  // Form fields keep their menu so visitors can still paste.
  const root = container.querySelector('.ol-root');
  const field = (t) => t?.closest?.('input,textarea,select,[contenteditable]');
  const onMenu = (e) => { if (!field(e.target)) e.preventDefault(); };
  const onDrag = (e) => { if (!field(e.target)) e.preventDefault(); };
  const noMenu = root?.classList.contains('ol-nomenu');
  const noDrag = root?.classList.contains('ol-noselect') || noMenu;
  if (noMenu) container.addEventListener('contextmenu', onMenu);
  if (noDrag) container.addEventListener('dragstart', onDrag);
  const stopNav = setupNav(container, opts);
  const stop = () => {
    for (const fn of cleanups) fn();
    stopLang();
    stopNav();
    container.removeEventListener('click', onClick);
    container.removeEventListener('contextmenu', onMenu);
    container.removeEventListener('dragstart', onDrag);
  };
  // ES / EN switch: render the page again in the other language, in place.
  let inner = null;
  const stopLang = setupLanguage(container, lang, (next) => {
    rememberLanguage(rawPage, next, win);
    if (opts.onLanguage) { opts.onLanguage(next); return; }
    stop();
    inner = mountPage(container, rawPage, { ...opts, lang: next, animate: false });
    opts.onLanguageChange?.(next);
  });
  return () => (inner ? inner() : stop());
}

/** Wire the ES / EN buttons. `onPick(lang)` runs when another language is chosen. */
function setupLanguage(container, current, onPick) {
  const navs = [...container.querySelectorAll('.ol-root .ol-lang')];
  if (!navs.length) return () => {};
  const onClick = (e) => {
    const b = e.target.closest('[data-ol-lang]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    if (b.dataset.olLang !== current) onPick(b.dataset.olLang);
  };
  navs.forEach((n) => n.addEventListener('click', onClick));
  return () => navs.forEach((n) => n.removeEventListener('click', onClick));
}

/** Navigation menu: open / close, jump to a section, mark the section on screen. */
function setupNav(container, opts) {
  const menu = container.querySelector('.ol-navmenu');
  if (!menu) return () => {};
  const doc = container.ownerDocument;
  const win = doc.defaultView;
  const btn = menu.querySelector('.ol-nav-btn');
  const panel = menu.querySelector('.ol-nav-panel');
  const links = [...panel.querySelectorAll('a[data-ol-nav]:not([data-ol-nav="top"])')];
  const reduce = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const setOpen = (open) => {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.innerHTML = icon(open ? 'close' : 'menu', 20);
    if (open) (panel.querySelector('[aria-current="true"]') || links[0])?.focus({ preventScroll: true });
  };
  const target = (id) => container.querySelector(`[data-block-id="${CSS.escape(id)}"]`);
  const go = (id) => {
    const behavior = reduce ? 'auto' : 'smooth';
    if (id === 'top') win.scrollTo({ top: 0, behavior });
    else target(id)?.scrollIntoView({ behavior, block: 'start' });
    // Shareable link to the section (only on the real page).
    if (opts.mode === 'live') {
      const a = id === 'top' ? '' : links.find((l) => l.dataset.olNav === id)?.getAttribute('href') || '';
      try { win.history.replaceState(null, '', a || win.location.pathname + win.location.search); } catch { /* sandboxed */ }
    }
  };
  const onClick = (e) => {
    if (e.target.closest('.ol-nav-btn')) { setOpen(panel.hidden); return; }
    const a = e.target.closest('a[data-ol-nav]');
    if (a) { e.preventDefault(); setOpen(false); go(a.dataset.olNav); }
  };
  const onDoc = (e) => { if (!panel.hidden && !menu.contains(e.target)) setOpen(false); };
  const onKey = (e) => { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); btn.focus(); } };
  // The section on screen is marked in the menu.
  let raf = 0;
  const onScroll = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const line = win.innerHeight * 0.3;
      let current = null;
      for (const l of links) { const el = target(l.dataset.olNav); if (el && el.getBoundingClientRect().top <= line) current = l; }
      links.forEach((l) => l.setAttribute('aria-current', String(l === current)));
    });
  };
  menu.addEventListener('click', onClick);
  doc.addEventListener('pointerdown', onDoc);
  doc.addEventListener('keydown', onKey);
  win.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  // page#section opens at that section.
  if (opts.mode === 'live' && win.location.hash.length > 1) {
    const l = links.find((x) => x.getAttribute('href') === decodeURIComponent(win.location.hash));
    if (l) setTimeout(() => target(l.dataset.olNav)?.scrollIntoView({ block: 'start' }), 300);
  }
  return () => {
    menu.removeEventListener('click', onClick);
    doc.removeEventListener('pointerdown', onDoc);
    doc.removeEventListener('keydown', onKey);
    win.removeEventListener('scroll', onScroll);
  };
}
