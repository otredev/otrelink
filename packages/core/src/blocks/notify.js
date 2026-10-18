// Notifications block: a button that lets visitors subscribe to the page's push
// notifications (discounts, news, events). The sign-up screen, topics and the
// messages themselves are set in the dashboard → Notifications.
// The button only asks the page to open its sign-up screen ("ol:notify" event);
// the public page app does the rest (consent, browser permission, saving).
import { esc } from '../util/html.js';
import { icon } from '../icons.js';

export default {
  type: 'notify',
  label: 'Notifications',
  description: 'Visitors subscribe to your push notifications: discounts, news, events.',
  icon: 'bell',
  category: 'Contact',
  cssClasses: [
    { selector: '.ol-notifybtn', description: 'The subscribe button (.is-on once the visitor is subscribed)' },
  ],
  fields: [
    { key: 'title', type: 'text', label: 'Button text', required: true, max: 80, default: 'Get notifications', placeholder: 'Get our deals first' },
    { key: 'subtitle', type: 'text', label: 'Subtitle', max: 120, default: 'Discounts, news and events', placeholder: 'No spam, turn off anytime' },
    { key: 'onLabel', type: 'text', label: 'Text once subscribed', max: 60, default: 'You’re subscribed', help: 'Shown to visitors who already subscribed. Tapping it lets them change topics or unsubscribe.' },
  ],
  summary: (d) => d.title || 'Notifications',
  render(d, ctx) {
    return `<button type="button" class="ol-btn has-media ol-notifybtn" data-ol-notify="${esc(ctx.blockId)}" data-mode="${esc(ctx.mode)}" data-on="${esc(d.onLabel || 'You’re subscribed')}" data-ol-track="${esc(ctx.blockId)}">`
      + `<span class="ol-btn-icon ol-notifybtn-icon">${icon('bell', 20)}</span>`
      + `<span class="ol-btn-label"><span class="ol-btn-title">${esc(d.title)}</span>`
      + (d.subtitle ? `<span class="ol-btn-sub">${esc(d.subtitle)}</span>` : '')
      + '</span><span class="ol-btn-spacer"></span><span class="ol-notifybtn-status" role="status" aria-live="polite"></span></button>';
  },
  hydrate(el, _data, ctx) {
    const btn = el.querySelector('.ol-notifybtn');
    if (!btn) return;
    const doc = el.ownerDocument;
    btn.addEventListener('click', () => {
      if (ctx.mode === 'preview') {
        const sub = btn.querySelector('.ol-btn-sub');
        const status = btn.querySelector('.ol-notifybtn-status');
        status.textContent = 'Visitors subscribe here on your published page.';
        if (sub) { const old = sub.textContent; sub.textContent = status.textContent; setTimeout(() => { sub.textContent = old; }, 2200); }
        return;
      }
      doc.dispatchEvent(new CustomEvent('ol:notify', { detail: { blockId: ctx.blockId, source: 'button' } }));
    });
  },
  css: `.ol-root .ol-notifybtn{-webkit-appearance:none;appearance:none;margin:0}
.ol-root .ol-notifybtn-status{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.ol-root .ol-notifybtn.is-on .ol-notifybtn-icon{opacity:.85}`,
};
