// Generic UI icons (24x24, stroke based) used by block types and the renderer.
// Values are inner SVG markup; use icon(name) to get a full <svg>.

export const iconPaths = {
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  heading: '<path d="M6 4v16M18 4v16M6 12h12"/>',
  text: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  images: '<rect x="7" y="7" width="14" height="14" rx="2"/><path d="M3 15V5a2 2 0 0 1 2-2h10"/><path d="m21 17-4-4-6 6"/>',
  video: '<rect x="2" y="5" width="15" height="14" rx="2"/><path d="m17 10 5-3v10l-5-3z"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  map: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  message: '<path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.7A8.4 8.4 0 1 1 21 11.5z"/>',
  divider: '<path d="M3 12h18"/><path d="M8 6h8M8 18h8" opacity=".4"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="m3 5 1.5 1.5L3 8M3 11l1.5 1.5L3 14M3 17l1.5 1.5L3 20"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M13 10h5M13 14h3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  arrow: '<path d="M7 17 17 7M8 7h9v9"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  star: '<path d="m12 3 2.7 5.6 6.2.9-4.5 4.4 1 6.1L12 17.1 6.6 20l1-6.1L3.1 9.5l6.2-.9z"/>',
  button: '<rect x="3" y="8" width="18" height="8" rx="4"/>',
  spacer: '<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  collection: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5" opacity=".55"/>',
  arrowLeft: '<path d="m15 6-6 6 6 6"/>',
  arrowRight: '<path d="m9 6 6 6-6 6"/>',
  survey: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  embed: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
  bag: '<path d="M6 7h12l1 13H5z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
  truck: '<path d="M2 7h11v9H2z"/><path d="M13 10h4l3 3v3h-7z"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8.5a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H16"/>',
  sign: '<path d="M12 3 8 7M12 3l4 4"/><rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="8" cy="13" r="1.4"/><path d="M12 11v4M16 11v4"/>',
  stamp: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><circle cx="7.5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="16.5" cy="12" r="1.8"/>',
  navigate: '<path d="m3 11 18-8-8 18-2-8z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M17 20h4M20 17v3"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9"/><path d="M12 8S10.5 3 8 4s0 4 4 4zm0 0s1.5-5 4-4 0 4-4 4z"/>',
  banner: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 10h8M6 14h5"/><circle cx="17.5" cy="14" r="1.5"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
};

export const verifiedSvg =
  '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-label="Verified" role="img"><path fill="currentColor" d="m12 1 2.6 2.1 3.3-.3.9 3.2 2.9 1.7-1.2 3.1 1.2 3.1-2.9 1.7-.9 3.2-3.3-.3L12 23l-2.6-2.1-3.3.3-.9-3.2-2.9-1.7 1.2-3.1-1.2-3.1 2.9-1.7.9-3.2 3.3.3z" opacity=".95"/><path d="m8 12 3 3 5-6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function icon(name, size = 20) {
  const p = iconPaths[name] || iconPaths.link;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}
