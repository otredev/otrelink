// Push notification sign-up on the public page.
// Opens from the Notifications block ("ol:notify" event) or from the sign-up link / QR
// (?subscribe, ?subscribe=qr). Steps: consent → browser permission → saved on the server.
// Visitors who already subscribed can change topics or unsubscribe from the same sheet.

const SHARE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Share" style="vertical-align:-3px"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
const T = {
  en: {
    consent: (name) => `I agree to receive push notifications from ${name}. I can turn them off anytime here or in my browser settings.`,
    privacy: 'Privacy', allow: 'Allow notifications', notNow: 'Not now', close: 'Close',
    topics: 'What would you like to hear about?',
    done: (name) => `Done! You’ll get notifications from ${name}.`,
    subscribed: 'You’re subscribed', save: 'Save', saved: 'Saved', unsubscribe: 'Unsubscribe', unsubscribed: 'You won’t get notifications from this page anymore.',
    denied: 'Notifications are blocked for this site. Allow them in your browser settings (the lock or ⓘ icon next to the address), then try again.',
    unsupported: 'This browser can’t receive notifications from web pages. Try Chrome, Edge, Firefox or Safari.',
    iosTitle: 'One step first on iPhone',
    ios: [`Tap the Share button ${SHARE} at the bottom of Safari.`, 'Choose <b>Add to Home Screen</b>.', 'Open the page from your home screen and tap the notifications button again.'],
    error: 'Something went wrong. Please try again.', working: 'One moment…', pickOne: 'Pick at least one topic.',
  },
  es: {
    consent: (name) => `Acepto recibir notificaciones push de ${name}. Puedo desactivarlas cuando quiera aquí o en los ajustes de mi navegador.`,
    privacy: 'Privacidad', allow: 'Permitir notificaciones', notNow: 'Ahora no', close: 'Cerrar',
    topics: '¿Sobre qué quieres recibir avisos?',
    done: (name) => `¡Listo! Recibirás notificaciones de ${name}.`,
    subscribed: 'Estás suscrito', save: 'Guardar', saved: 'Guardado', unsubscribe: 'Cancelar suscripción', unsubscribed: 'Ya no recibirás notificaciones de esta página.',
    denied: 'Las notificaciones están bloqueadas para este sitio. Permítelas en los ajustes del navegador (el candado o el icono ⓘ junto a la dirección) e inténtalo de nuevo.',
    unsupported: 'Este navegador no puede recibir notificaciones de páginas web. Prueba con Chrome, Edge, Firefox o Safari.',
    iosTitle: 'Un paso antes en iPhone',
    ios: [`Toca el botón Compartir ${SHARE} abajo en Safari.`, 'Elige <b>Añadir a pantalla de inicio</b>.', 'Abre la página desde tu pantalla de inicio y vuelve a tocar el botón de notificaciones.'],
    error: 'Algo salió mal. Inténtalo de nuevo.', working: 'Un momento…', pickOne: 'Elige al menos un tema.',
  },
};

const CSS = `.oln-back{position:fixed;inset:0;z-index:2147483000;background:rgba(10,10,16,.45);display:flex;align-items:flex-end;justify-content:center;padding:12px;animation:oln-in .2s ease}
.oln{width:100%;max-width:420px;max-height:calc(100dvh - 24px);overflow:auto;background:#fff;color:#17171f;border-radius:24px;padding:22px 20px 18px;font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-sizing:border-box;animation:oln-up .25s cubic-bezier(.2,.8,.2,1)}
.oln *{box-sizing:border-box}.oln-head{display:flex;gap:12px;align-items:center;margin-bottom:10px}
.oln-av{width:44px;height:44px;border-radius:50%;object-fit:cover;background:#eee;flex:none}
.oln h2{font-size:18px;line-height:1.2;margin:0}.oln p{margin:0 0 12px;color:#4a4a57}.oln small{color:#6a6a78}
.oln-topics{display:grid;gap:6px;margin:4px 0 14px}.oln-topics p{margin:0 0 2px;font-weight:600;color:#17171f;font-size:14px}
.oln-check{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid #e3e3ea;border-radius:14px;cursor:pointer;font-size:14px}
.oln-check input{width:18px;height:18px;margin:1px 0 0;flex:none;accent-color:#17171f}
.oln-consent{border:0;padding:6px 0;margin-bottom:12px;color:#4a4a57;font-size:13px}.oln-consent a{color:inherit}
.oln-btn{display:flex;width:100%;min-height:48px;align-items:center;justify-content:center;border:0;border-radius:999px;background:#17171f;color:#fff;font:600 15px system-ui,sans-serif;cursor:pointer;margin-top:8px}
.oln-btn[disabled]{opacity:.4;cursor:not-allowed}.oln-btn.is-ghost{background:transparent;color:#17171f}
.oln-msg{font-size:14px;margin:10px 0 0;color:#17171f}.oln-msg.is-err{color:#b42318}
.oln ol{margin:6px 0 14px;padding-left:20px;display:grid;gap:8px;color:#17171f}
@keyframes oln-in{from{opacity:0}}@keyframes oln-up{from{transform:translateY(24px);opacity:0}}
@media (prefers-reduced-motion:reduce){.oln-back,.oln{animation:none}}`;

// Sub-path the app is served from ("/" on Cloudflare Pages, "/otrelink/" on GitHub Pages).
const BASE = import.meta.env.BASE_URL || '/';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const keyBytes = (b64) => {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

export function setupNotify({ page, api, getLang, privacyUrl }) {
  const cfg = page.notify;
  if (!cfg) return;
  const name = page.profile?.title || `@${page.slug}`;
  let registration = null;
  let state = { subscribed: false, topics: [] };

  const post = (path, body) => fetch(`${api}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || String(r.status)); return j; });

  const register = async () => {
    registration ||= await navigator.serviceWorker.register(`${BASE}sw.js?api=${encodeURIComponent(api)}`, { scope: BASE });
    await navigator.serviceWorker.ready;
    return registration;
  };
  const currentSub = async () => {
    if (!supported()) return null;
    const reg = await navigator.serviceWorker.getRegistration(BASE);
    return reg ? reg.pushManager.getSubscription() : null;
  };

  // Show "You're subscribed" on the page's buttons.
  const paintButtons = () => {
    document.querySelectorAll('.ol-notifybtn').forEach((btn) => {
      const title = btn.querySelector('.ol-btn-title');
      if (!btn.dataset.off) btn.dataset.off = title?.textContent || '';
      btn.classList.toggle('is-on', state.subscribed);
      if (title) title.textContent = state.subscribed ? btn.dataset.on || title.textContent : btn.dataset.off;
    });
  };

  // Already subscribed? (Also re-saves the subscription if the browser renewed it.)
  const refresh = async () => {
    try {
      const sub = await currentSub();
      if (!sub || Notification.permission !== 'granted') { state = { subscribed: false, topics: [] }; return paintButtons(); }
      const r = await post('/api/public/notify/manage', { pageId: page.id, endpoint: sub.endpoint, action: 'status' });
      state = { subscribed: Boolean(r.subscribed), topics: r.topics || [] };
    } catch { /* keep the button as it is */ }
    paintButtons();
  };

  let source = 'button';
  const open = () => {
    const t = T[getLang() === 'es' ? 'es' : 'en'];
    if (!document.getElementById('oln-css')) {
      const st = document.createElement('style'); st.id = 'oln-css'; st.textContent = CSS; document.head.append(st);
    }
    const back = document.createElement('div');
    back.className = 'oln-back';
    back.innerHTML = '<div class="oln" role="dialog" aria-modal="true" aria-labelledby="oln-title"></div>';
    const box = back.firstChild;
    const prevFocus = document.activeElement;
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey); prevFocus?.focus?.(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    back.addEventListener('click', (e) => { if (e.target === back) close(); });
    document.addEventListener('keydown', onKey);
    document.body.append(back);

    const head = `<div class="oln-head">${page.profile?.avatar ? `<img class="oln-av" src="${esc(page.profile.avatar)}" alt="">` : ''}<h2 id="oln-title">${esc(cfg.title)}</h2></div>`;
    const topicList = (checked) => (cfg.topics?.length ? `<div class="oln-topics"><p>${t.topics}</p>${cfg.topics.map((tp) => `<label class="oln-check"><input type="checkbox" name="topic" value="${esc(tp.id)}"${!checked.length || checked.includes(tp.id) ? ' checked' : ''}> ${esc(tp.label)}</label>`).join('')}</div>` : '');
    const picked = () => [...box.querySelectorAll('input[name=topic]:checked')].map((i) => i.value);
    const allPicked = () => { const p = picked(); return p.length === (cfg.topics?.length || 0) ? [] : p; };
    const msg = (text, err) => { const m = box.querySelector('.oln-msg'); if (m) { m.textContent = text; m.classList.toggle('is-err', Boolean(err)); } };
    const finish = (text) => {
      box.innerHTML = `${head}<p class="oln-msg">${esc(text)}</p><button type="button" class="oln-btn" data-close>${t.close}</button>`;
      box.querySelector('[data-close]').onclick = close;
      box.querySelector('[data-close]').focus();
    };

    if (isIos() && !standalone()) {
      box.innerHTML = `${head}<p><b>${t.iosTitle}</b></p><ol>${t.ios.map((s) => `<li>${s}</li>`).join('')}</ol><button type="button" class="oln-btn" data-close>${t.close}</button>`;
      box.querySelector('[data-close]').onclick = close;
      return;
    }
    if (!supported()) return finish(t.unsupported);
    if (Notification.permission === 'denied') return finish(t.denied);

    if (state.subscribed) {
      box.innerHTML = `${head}<p>✓ ${t.subscribed}</p>${topicList(state.topics)}`
        + (cfg.topics?.length ? `<button type="button" class="oln-btn" data-save>${t.save}</button>` : '')
        + `<button type="button" class="oln-btn is-ghost" data-unsub>${t.unsubscribe}</button><p class="oln-msg" role="status"></p>`;
      box.querySelector('[data-save]')?.addEventListener('click', async () => {
        if (!picked().length) return msg(t.pickOne, true);
        try {
          const sub = await currentSub();
          const r = await post('/api/public/notify/manage', { pageId: page.id, endpoint: sub.endpoint, action: 'topics', topics: allPicked() });
          state.topics = r.topics || []; msg(t.saved);
        } catch { msg(t.error, true); }
      });
      box.querySelector('[data-unsub]').addEventListener('click', async () => {
        try {
          const sub = await currentSub();
          if (sub) await post('/api/public/notify/manage', { pageId: page.id, endpoint: sub.endpoint, action: 'unsubscribe' });
          // The browser subscription is shared by every Otrelink page this visitor follows, so it stays.
          state = { subscribed: false, topics: [] }; paintButtons(); finish(t.unsubscribed);
        } catch { msg(t.error, true); }
      });
      return;
    }

    box.innerHTML = `${head}<p>${esc(cfg.text)}</p>${topicList([])}`
      + `<label class="oln-check oln-consent"><input type="checkbox" data-consent> <span>${esc(t.consent(name))} <a href="${esc(privacyUrl)}" target="_blank" rel="noopener">${t.privacy}</a></span></label>`
      + `<button type="button" class="oln-btn" data-allow disabled>${t.allow}</button><button type="button" class="oln-btn is-ghost" data-close>${t.notNow}</button><p class="oln-msg" role="status"></p>`;
    const allow = box.querySelector('[data-allow]');
    box.querySelector('[data-consent]').addEventListener('change', (e) => { allow.disabled = !e.target.checked; });
    box.querySelector('[data-close]').onclick = close;
    allow.addEventListener('click', async () => {
      if (cfg.topics?.length && !picked().length) return msg(t.pickOne, true);
      allow.disabled = true;
      msg(t.working);
      try {
        // Ask right away: browsers only show the prompt in direct response to a tap.
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return finish(permission === 'denied' ? t.denied : t.error);
        const reg = await register();
        const sub = (await reg.pushManager.getSubscription())
          || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(cfg.vapidKey) });
        const r = await post('/api/public/notify/subscribe', {
          pageId: page.id, subscription: sub.toJSON(), topics: allPicked(), lang: getLang() === 'es' ? 'es' : 'en', source, consent: true,
        });
        state = { subscribed: true, topics: r.topics || [] };
        paintButtons();
        finish(t.done(name));
      } catch (err) {
        console.error(err);
        allow.disabled = false;
        msg(t.error, true);
      }
    });
    box.querySelector('[data-consent]').focus();
  };

  document.addEventListener('ol:notify', () => { source = 'button'; open(); });
  refresh();

  // Sign-up link or QR: /page?subscribe  or  /page?subscribe=qr
  const params = new URLSearchParams(location.search);
  if (params.has('subscribe')) {
    source = params.get('subscribe') === 'qr' ? 'qr' : 'link';
    params.delete('subscribe');
    history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`);
    setTimeout(open, 400);
  }
}

/** Lets visitors add the page to their home screen as its own app (needed for notifications on iPhone). */
export function addAppLinks(page) {
  const add = (attrs) => { const l = document.createElement('link'); Object.assign(l, attrs); document.head.append(l); };
  add({ rel: 'manifest', href: `${BASE}manifest/${encodeURIComponent(page.slug)}.webmanifest` });
  if (page.profile?.avatar) add({ rel: 'apple-touch-icon', href: page.profile.avatar });
  const m = document.createElement('meta');
  m.name = 'apple-mobile-web-app-title';
  m.content = (page.profile?.title || page.slug).slice(0, 30);
  document.head.append(m);
}
