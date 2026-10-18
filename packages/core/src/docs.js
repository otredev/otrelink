// Reference data for the public /docs page (Custom CSS section).
// Keep it next to the renderer so class names are documented where they are defined.

/** Simplified DOM of a rendered page. */
export const pageStructure = `div.ol-root.ol-layout-{classic|hero|left}.ol-enter-{animation}   [data-mode="live|preview"]
├─ div.ol-bg                         ← wallpaper layer (fixed, behind everything)
├─ main.ol-main                      ← centered content column
│  ├─ header.ol-profile
│  │  ├─ img.ol-avatar.ol-avatar-{circle|rounded|square}   (span.ol-avatar.ol-zoom > img when zoomed)
│  │  ├─ h1.ol-title                 ← (+ svg verified badge)
│  │  ├─ p.ol-bio
│  │  └─ nav.ol-socials.ol-socials-top.ol-socials-{plain|filled|outline}
│  │     └─ a.ol-social
│  ├─ section.ol-blocks
│  │  └─ div.ol-block.ol-b-{type}    [data-block-id] [data-block-type]
│  │     └─ …block content (a.ol-btn, .ol-card, .ol-frame…)
│  ├─ nav.ol-socials.ol-socials-bottom   ← when icons are set to "bottom"
│  └─ footer.ol-footer
└─ div.ol-gate                       ← sensitive-content warning (if enabled)`;

/** Main elements you can target. */
export const cssElements = [
  { selector: '.ol-root', description: 'The whole page. All variables live here; prefix your selectors with it.' },
  { selector: '.ol-bg', description: 'Wallpaper layer. Fixed behind the content; some wallpapers use ::before / ::after.' },
  { selector: '.ol-main', description: 'Content column (max width, padding).' },
  { selector: '.ol-profile', description: 'Header with avatar, title, bio and top social icons.' },
  { selector: '.ol-avatar', description: 'Profile picture (img) or the initial placeholder (div).' },
  { selector: '.ol-title', description: 'Your name / page title (h1).' },
  { selector: '.ol-bio', description: 'Bio paragraph under the title.' },
  { selector: '.ol-socials', description: 'Row of social icons. Also .ol-socials-top / .ol-socials-bottom.' },
  { selector: '.ol-social', description: 'One social icon link.' },
  { selector: '.ol-blocks', description: 'Container of all blocks (flex column, gap = --ol-gap).' },
  { selector: '.ol-block', description: 'Wrapper of every block. Add .ol-b-{type} to target a block type.' },
  { selector: '.ol-btn', description: 'Every button-like element (links, contact, share, save contact).' },
  { selector: '.ol-btn-title / .ol-btn-sub', description: 'Button main text / subtitle.' },
  { selector: '.ol-btn-thumb / .ol-btn-icon', description: 'Button thumbnail image / icon.' },
  { selector: '.ol-card', description: 'Card surface used by text (when “Show on a card”), FAQ, countdown…' },
  { selector: '.ol-frame', description: 'Wrapper of embedded players and maps (YouTube, Spotify, Google Maps…).' },
  { selector: '.ol-embed-title', description: 'Optional title shown above videos, maps and FAQs.' },
  { selector: '.ol-footer', description: 'Footer: “Create your own Otrelink” (.ol-footer-cta) and the link rows (.ol-footer-row).' },
  { selector: '.ol-gate', description: 'Sensitive-content overlay.' },
];

/** Modifier classes and attributes. */
export const cssModifiers = [
  { selector: '.ol-root.ol-layout-classic | -hero | -left', description: 'Header layout chosen in Style → Header. Note: no space after .ol-root.' },
  { selector: '.ol-root[data-mode="preview"]', description: 'Only in the dashboard preview. [data-mode="live"] = public page, [data-mode="export"] = downloaded website.' },
  { selector: '.ol-avatar-circle | -rounded | -square', description: 'Avatar shape.' },
  { selector: '.ol-zoom', description: 'Frame around a zoomed image (Adjust → Zoom). It takes the image classes (e.g. span.ol-avatar.ol-zoom > img).' },
  { selector: '.ol-avatar-natural', description: 'Profile picture with Adjust → Original shape (height follows the image).' },
  { selector: '.ol-socials-plain | -filled | -outline', description: 'Social icons style.' },
  { selector: '.ol-btn.has-media', description: 'Button that has a thumbnail or an icon.' },
  { selector: '.ol-anim-{pulse|shake|wobble|bounce|glow}', description: 'Block with an attention animation.' },
  { selector: '.ol-enter', description: 'Elements that play the entrance animation (staggered).' },
  { selector: '[data-block-id="…"]', description: 'One specific block. Copy it from the block in Links → Animation & schedule.' },
  { selector: '[data-block-type="link"]', description: 'All blocks of a type (same as .ol-b-link).' },
];

/** Ready-to-paste examples. */
export const cssRecipes = [
  {
    title: 'Uppercase buttons with letter spacing',
    css: `.ol-root .ol-btn {\n  text-transform: uppercase;\n  letter-spacing: .08em;\n  font-size: .9em;\n}`,
  },
  {
    title: 'Glowing avatar ring',
    css: `.ol-root .ol-avatar {\n  box-shadow: 0 0 0 4px #fff, 0 0 30px 6px #a855f7;\n}`,
  },
  {
    title: 'Gradient title text',
    css: `.ol-root .ol-title {\n  background: linear-gradient(90deg, #f472b6, #a855f7, #22d3ee);\n  -webkit-background-clip: text;\n  background-clip: text;\n  color: transparent;\n}`,
  },
  {
    title: 'Highlight one specific block',
    css: `/* Copy the selector from the block: Links → Animation & schedule */\n.ol-root [data-block-id="b_xxxxxx"] .ol-btn {\n  background: #facc15;\n  color: #111;\n  transform: scale(1.03);\n}`,
  },
  {
    title: 'Two links per row',
    css: `.ol-root .ol-blocks {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n}\n/* Keep headers, text and media full width */\n.ol-root .ol-block:not(.ol-b-link) {\n  grid-column: 1 / -1;\n}`,
  },
  {
    title: 'Hide the subtitle on small screens',
    css: `@media (max-width: 420px) {\n  .ol-root .ol-btn-sub { display: none; }\n}`,
  },
  {
    title: 'Bigger social icons with brand hover',
    css: `.ol-root .ol-social svg {\n  width: 30px;\n  height: 30px;\n}\n.ol-root .ol-social:hover {\n  opacity: .7;\n  transform: scale(1.15);\n}`,
  },
  {
    title: 'Different look only on the public page',
    css: `/* Not applied in the dashboard preview */\n.ol-root[data-mode="live"] .ol-main {\n  padding-top: 80px;\n}`,
  },
];
