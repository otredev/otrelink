// Footer sheets on the public page: Report, Explore and About this account.
// The footer buttons are rendered by @otrelink/core (data-ol-footer="report|explore|about");
// one listener on the document opens the right sheet, so it keeps working after the page
// re-renders (ES / EN switch).

const T = {
  en: {
    close: 'Close', explore: 'Explore', exploreSub: 'The most visited Otrelink pages', loading: 'Loading…',
    empty: 'No pages to show yet.', error: 'Couldn’t load this. Please try again.',
    about: 'About this account', since: (d) => `On Otrelink since ${d}`, verified: 'Verified',
    report: 'Report this page', reportSub: 'Tell us what’s wrong. Reports are confidential: the page owner doesn’t see who sent them.',
    details: 'Details', detailsHint: 'Optional, unless you chose “Something else”.', email: 'Your email', emailHint: 'Optional, only if you want an answer.',
    send: 'Send report', sending: 'Sending…', thanks: 'Thanks. We’ll review this page and act if it breaks our Terms.', pick: 'Choose a reason.',
    needDetails: 'Tell us a bit more in Details.', badEmail: 'That email doesn’t look right.', tooMany: 'Too many reports from this connection. Try again later.',
    reasons: {
      spam: 'Spam or misleading', scam: 'Scam or fraud', impersonation: 'Pretending to be someone else', hate: 'Hate speech or harassment',
      adult: 'Adult content', violence: 'Violence or dangerous content', illegal: 'Illegal goods or activity', copyright: 'Copyright or trademark', other: 'Something else',
    },
  },
  es: {
    close: 'Cerrar', explore: 'Explorar', exploreSub: 'Las páginas de Otrelink más visitadas', loading: 'Cargando…',
    empty: 'Aún no hay páginas para mostrar.', error: 'No se pudo cargar. Inténtalo de nuevo.',
    about: 'Sobre esta cuenta', since: (d) => `En Otrelink desde ${d}`, verified: 'Verificada',
    report: 'Denunciar esta página', reportSub: 'Cuéntanos qué pasa. Las denuncias son confidenciales: el dueño de la página no ve quién las envió.',
    details: 'Detalles', detailsHint: 'Opcional, salvo si eliges “Otro motivo”.', email: 'Tu correo', emailHint: 'Opcional, solo si quieres respuesta.',
    send: 'Enviar denuncia', sending: 'Enviando…', thanks: 'Gracias. Revisaremos esta página y actuaremos si incumple nuestros Términos.', pick: 'Elige un motivo.',
    needDetails: 'Cuéntanos un poco más en Detalles.', badEmail: 'Ese correo no parece válido.', tooMany: 'Demasiadas denuncias desde esta conexión. Inténtalo más tarde.',
    reasons: {
      spam: 'Spam o engañoso', scam: 'Estafa o fraude', impersonation: 'Se hace pasar por otra persona', hate: 'Odio o acoso',
      adult: 'Contenido para adultos', violence: 'Violencia o contenido peligroso', illegal: 'Productos o actividades ilegales', copyright: 'Derechos de autor o marca', other: 'Otro motivo',
    },
  },
};

const CSS = `.olf-back{position:fixed;inset:0;z-index:2147483000;background:rgba(10,10,16,.45);display:flex;align-items:flex-end;justify-content:center;padding:12px;animation:olf-in .2s ease}
.olf{width:100%;max-width:440px;max-height:calc(100dvh - 24px);overflow:auto;background:#fff;color:#17171f;border-radius:24px;padding:20px 20px 18px;font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-sizing:border-box;animation:olf-up .25s cubic-bezier(.2,.8,.2,1)}
.olf *{box-sizing:border-box}.olf-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}
.olf h2{font-size:18px;line-height:1.25;margin:0}.olf-sub{margin:4px 0 0;color:#5a5a68;font-size:14px}
.olf-x{flex:none;width:36px;height:36px;border:0;border-radius:50%;background:#f1f1f4;color:#17171f;font-size:20px;line-height:1;cursor:pointer}
.olf-list{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.olf-item{display:flex;align-items:center;gap:12px;padding:8px;border-radius:14px;color:inherit;text-decoration:none}
.olf-item:hover,.olf-item:focus-visible{background:#f4f4f7}
.olf-av{width:44px;height:44px;border-radius:50%;object-fit:cover;flex:none;background:#ececf1;display:grid;place-items:center;font-weight:700;color:#5a5a68}
.olf-name{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.olf-slug{display:block;font-size:13px;color:#6a6a78}
.olf-rank{width:20px;flex:none;text-align:center;font-size:13px;font-weight:700;color:#8a8a96}
.olf-about{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;padding:8px 0 4px}
.olf-about .olf-av{width:84px;height:84px;font-size:28px}.olf-badge{display:inline-block;font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px;background:#eef2ff;color:#3b4bd8}
.olf form{display:grid;gap:12px}.olf fieldset{border:0;margin:0;padding:0;display:grid;gap:6px}
.olf-opt{display:flex;gap:10px;align-items:center;padding:10px 12px;border:1px solid #e3e3ea;border-radius:14px;cursor:pointer;font-size:14px}
.olf-opt:has(input:checked){border-color:#17171f;background:#f6f6f8}.olf-opt input{width:18px;height:18px;margin:0;accent-color:#17171f}
.olf label.olf-field{display:grid;gap:4px;font-size:14px;font-weight:600}.olf small{font-weight:400;color:#6a6a78}
.olf textarea,.olf input[type=email]{width:100%;font:15px system-ui,sans-serif;padding:10px 12px;border:1px solid #d9d9e1;border-radius:12px;color:#17171f;background:#fff}
.olf textarea{min-height:84px;resize:vertical}
.olf-btn{display:flex;width:100%;min-height:48px;align-items:center;justify-content:center;border:0;border-radius:999px;background:#17171f;color:#fff;font:600 15px system-ui,sans-serif;cursor:pointer}
.olf-btn[disabled]{opacity:.5;cursor:not-allowed}.olf-msg{margin:0;font-size:14px}.olf-msg.is-err{color:#b42318}.olf-center{text-align:center;color:#5a5a68;padding:16px 0}
@keyframes olf-in{from{opacity:0}}@keyframes olf-up{from{transform:translateY(24px);opacity:0}}
@media (prefers-reduced-motion:reduce){.olf-back,.olf{animation:none}}`;

const BASE = import.meta.env.BASE_URL || '/';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const avatar = (src, name) => (src
  ? `<img class="olf-av" src="${esc(src)}" alt="" loading="lazy">`
  : `<span class="olf-av" aria-hidden="true">${esc((name || '?').trim().charAt(0).toUpperCase())}</span>`);

function openSheet(title, sub, closeLabel) {
  if (!document.getElementById('olf-css')) {
    const st = document.createElement('style'); st.id = 'olf-css'; st.textContent = CSS; document.head.append(st);
  }
  const back = document.createElement('div');
  back.className = 'olf-back';
  back.innerHTML = `<div class="olf" role="dialog" aria-modal="true" aria-labelledby="olf-title"><div class="olf-head"><div><h2 id="olf-title">${esc(title)}</h2>${sub ? `<p class="olf-sub">${esc(sub)}</p>` : ''}</div><button type="button" class="olf-x" aria-label="${esc(closeLabel)}">×</button></div><div class="olf-body"></div></div>`;
  const prevFocus = document.activeElement;
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey); prevFocus?.focus?.(); };
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  back.querySelector('.olf-x').addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.append(back);
  back.querySelector('.olf-x').focus();
  return { body: back.querySelector('.olf-body'), close };
}

export function setupFooter({ page, api, getLang }) {
  const t = () => T[getLang() === 'es' ? 'es' : 'en'];
  const name = page.profile?.title || `@${page.slug}`;

  const explore = async () => {
    const tx = t();
    const { body } = openSheet(tx.explore, tx.exploreSub, tx.close);
    body.innerHTML = `<p class="olf-center">${tx.loading}</p>`;
    try {
      const r = await fetch(`${api}/api/public/explore?exclude=${encodeURIComponent(page.id)}`);
      if (!r.ok) throw new Error(String(r.status));
      const { pages = [] } = await r.json();
      body.innerHTML = pages.length
        ? `<ol class="olf-list">${pages.map((p, i) => `<li><a class="olf-item" href="${esc(`${BASE}${encodeURIComponent(p.slug)}`)}"><span class="olf-rank">${i + 1}</span>${avatar(p.avatar, p.title)}<span style="min-width:0"><span class="olf-name">${esc(p.title)}</span><span class="olf-slug">@${esc(p.slug)}</span></span></a></li>`).join('')}</ol>`
        : `<p class="olf-center">${tx.empty}</p>`;
    } catch {
      body.innerHTML = `<p class="olf-center">${tx.error}</p>`;
    }
  };

  const about = () => {
    const tx = t();
    const { body } = openSheet(tx.about, '', tx.close);
    let since = '';
    if (/^\d{4}-\d{2}$/.test(page.since || '')) {
      const [y, m] = page.since.split('-').map(Number);
      since = new Intl.DateTimeFormat(getLang() === 'es' ? 'es' : 'en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 15)));
    }
    body.innerHTML = `<div class="olf-about">${avatar(page.profile?.avatar, name)}<h3 style="margin:6px 0 0;font-size:18px">${esc(name)}</h3><span class="olf-slug">@${esc(page.slug)}</span>`
      + (page.profile?.verified ? `<span class="olf-badge">✓ ${tx.verified}</span>` : '')
      + (since ? `<p class="olf-sub">${esc(tx.since(since))}</p>` : '')
      + '</div>';
  };

  const report = () => {
    const tx = t();
    const { body, close } = openSheet(tx.report, tx.reportSub, tx.close);
    body.innerHTML = `<form novalidate><fieldset>${Object.entries(tx.reasons).map(([k, label]) => `<label class="olf-opt"><input type="radio" name="reason" value="${k}"> ${esc(label)}</label>`).join('')}</fieldset>`
      + `<label class="olf-field">${tx.details} <small>${tx.detailsHint}</small><textarea name="message" maxlength="1000"></textarea></label>`
      + `<label class="olf-field">${tx.email} <small>${tx.emailHint}</small><input type="email" name="email" maxlength="200" autocomplete="email"></label>`
      + `<p class="olf-msg" role="status"></p><button type="submit" class="olf-btn">${tx.send}</button></form>`;
    const form = body.querySelector('form');
    const msg = (text, err) => { const m = form.querySelector('.olf-msg'); m.textContent = text; m.classList.toggle('is-err', Boolean(err)); };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      if (!data.reason) return msg(tx.pick, true);
      if (data.reason === 'other' && !String(data.message || '').trim()) return msg(tx.needDetails, true);
      const btn = form.querySelector('.olf-btn');
      btn.disabled = true; btn.textContent = tx.sending; msg('');
      try {
        const r = await fetch(`${api}/api/public/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pageId: page.id, ...data }) });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(r.status === 429 ? tx.tooMany : j.error === 'invalid_email' ? tx.badEmail : j.error === 'message_required' ? tx.needDetails : tx.error);
        }
        body.innerHTML = `<p class="olf-msg">${esc(tx.thanks)}</p><button type="button" class="olf-btn" style="margin-top:14px">${tx.close}</button>`;
        body.querySelector('button').addEventListener('click', close);
      } catch (err) {
        btn.disabled = false; btn.textContent = tx.send; msg(err.message || tx.error, true);
      }
    });
  };

  const open = { explore, about, report };
  document.addEventListener('click', (e) => {
    const btn = e.target.closest?.('[data-ol-footer]');
    if (!btn || !open[btn.dataset.olFooter]) return;
    e.preventDefault();
    open[btn.dataset.olFooter]();
  });
}
