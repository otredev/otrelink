'use client';
// Notifications: visitors subscribe to the page's push notifications (button block,
// link or QR) and the owner sends them messages now or on a schedule.
import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Bell, Copy, Check, Download, Plus, Trash2, Send, CalendarClock, Repeat, X, Loader2, Users, MousePointerClick, Smartphone, AlertTriangle } from 'lucide-react';
import { newBlock, NOTIFY_LIMITS } from '@otrelink/core';
import { api, errorMessage } from '@/lib/client';
import { Panel, Button, Input, Textarea, Select, Toggle, IconButton, cx } from '@/components/ui';
import ImageField from '@/components/fields/ImageField';
import { NotificationsCard } from './AgendaSection';

const pad = (n) => String(n).padStart(2, '0');
/** "2026-10-20T09:00" in local time, for <input type="datetime-local"> */
const localInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const when = (iso) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');
const TZ = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
const hasNotifyBlock = (blocks = []) => blocks.some((b) => b.type === 'notify' || hasNotifyBlock(b.children));

const STATUS = {
  scheduled: ['Scheduled', 'bg-accent-soft text-accent-ink'],
  sending: ['Sending…', 'bg-soft text-ink'],
  sent: ['Sent', 'bg-teal/15 text-teal'],
  canceled: ['Canceled', 'bg-soft text-muted'],
  failed: ['Not sent', 'bg-danger/10 text-danger'],
};
const FAIL_REASONS = {
  push_not_configured: 'Push isn’t set up on the server.',
  plan_required: 'Your plan no longer includes notifications.',
  page_deleted: 'The page was deleted.',
};
const ERRORS = {
  title_required: 'Write a title.',
  body_required: 'Write the message.',
  send_at_required: 'Choose when to send it.',
  send_at_past: 'That time has already passed.',
  send_at_too_far: 'Schedule it within the next year.',
  repeat_until_before_start: '“Repeat until” is before the first send.',
  daily_limit: `You can send up to ${NOTIFY_LIMITS.sendsPerDay} notifications per day from one page.`,
  push_not_configured: 'Push notifications aren’t set up on the server yet.',
  already_sent: 'That notification already went out.',
};
const err = (e) => ERRORS[e?.code] || errorMessage(e);

const emptyDraft = () => ({
  title: '', body: '', image: '', link: 'page', url: '', actions: [], topics: [], es: { title: '', body: '' }, showEs: false,
  mode: 'now', sendAt: localInput(new Date(Date.now() + 3600e3)), repeat: 'none', repeatUntil: '', ttlHours: 24,
});

export default function NotifySection({ ed }) {
  const { page } = ed;
  const [data, setData] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const load = useCallback(async () => {
    try { setData(await api(`/api/pages/${page.id}/notify`)); setLoadErr(''); } catch (e) { setLoadErr(err(e)); }
  }, [page.id]);
  useEffect(() => { load(); }, [load]);
  // Sends in progress: check again until they finish.
  useEffect(() => {
    if (!data?.broadcasts?.some((b) => b.status === 'sending' || (b.status === 'scheduled' && new Date(b.sendAt) <= new Date()))) return undefined;
    const t = setTimeout(load, 4000);
    return () => clearTimeout(t);
  }, [data, load]);

  const [draft, setDraft] = useState(emptyDraft);

  if (loadErr) return <div className="space-y-5"><Header /><p className="text-sm text-danger" role="alert">{loadErr}</p></div>;
  if (!data) return <div className="space-y-5"><Header /><p className="text-sm text-muted">Loading…</p></div>;

  return (
    <div className="space-y-5">
      <Header />
      {!data.pushReady && (
        <div className="flex gap-3 rounded-2xl bg-danger/10 text-danger px-4 py-3 text-sm" role="alert">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>Push notifications aren’t set up on the server: the <code>VAPID_PUBLIC_KEY</code> and <code>VAPID_PRIVATE_KEY</code> variables are missing. Visitors can’t subscribe until they are set.</span>
        </div>
      )}
      <SignupPanel ed={ed} config={data.config} onSaved={(config) => setData((d) => ({ ...d, config }))} />
      <StatsPanel stats={data.stats} config={data.config} />
      <Composer ed={ed} data={data} draft={draft} setDraft={setDraft} onCreated={load} />
      <HistoryPanel page={page} list={data.broadcasts} repeats={data.repeats} onChange={load}
        onDuplicate={(b) => { setDraft(fromBroadcast(b)); document.getElementById('notify-compose')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} />
      <NotificationsCard />
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Notifications</h1>
      <p className="text-sm text-muted mt-1">Visitors subscribe from your page, a link or a QR code. Send them discounts, news and event reminders, now or on a schedule.</p>
    </div>
  );
}

// ── Sign-up settings, link and QR ───────────────────────────────
function SignupPanel({ ed, config, onSaved }) {
  const { page } = ed;
  const [c, setC] = useState(config);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => setC(config), [config]);
  const dirty = JSON.stringify(c) !== JSON.stringify(config);
  const slug = ed.savedSlug || page.slug;
  const base = `${ed.pageUrl}/${slug}`;

  const save = async (next = c) => {
    setBusy(true); setMsg('');
    try { const r = await api(`/api/pages/${page.id}/notify`, { method: 'PUT', body: next }); onSaved(r.config); setMsg('Saved'); setTimeout(() => setMsg(''), 1500); } catch (e) { setMsg(err(e)); } finally { setBusy(false); }
  };
  const topic = (i, label) => setC((x) => ({ ...x, topics: x.topics.map((t, j) => (j === i ? { ...t, label } : t)) }));
  const blockOnPage = hasNotifyBlock(page.blocks);

  return (
    <Panel title="Sign-up" description="What visitors see before they allow notifications. They must tick a consent box; you can change this text anytime.">
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-soft px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Let visitors subscribe</p>
          <p className="text-xs text-muted">{c.enabled ? 'On: your button, link and QR code work.' : 'Off: the button is hidden and the link does nothing.'}</p>
        </div>
        <Toggle checked={c.enabled} label="Let visitors subscribe" onChange={(v) => { const next = { ...c, enabled: v }; setC(next); save(next); }} />
      </div>

      <div className="grid gap-3 mt-4">
        <label className="block">
          <span className="block text-[13px] font-semibold mb-1.5">Title</span>
          <Input value={c.title} maxLength={60} onChange={(e) => setC({ ...c, title: e.target.value })} />
        </label>
        <label className="block">
          <span className="block text-[13px] font-semibold mb-1.5">Text</span>
          <Textarea value={c.text} maxLength={240} className="min-h-20" onChange={(e) => setC({ ...c, text: e.target.value })} />
        </label>
        <div>
          <span className="block text-[13px] font-semibold mb-1">Topics <span className="font-normal text-muted">(optional)</span></span>
          <p className="text-xs text-muted mb-2">Visitors pick what they want to hear about, and you choose who gets each notification. Without topics, everyone gets everything.</p>
          <div className="space-y-2">
            {c.topics.map((t, i) => (
              <div key={t.id} className="flex gap-2">
                <Input value={t.label} maxLength={30} placeholder="Discounts" aria-label={`Topic ${i + 1}`} onChange={(e) => topic(i, e.target.value)} />
                <IconButton label="Remove topic" className="mt-1" onClick={() => setC({ ...c, topics: c.topics.filter((_, j) => j !== i) })}><Trash2 size={16} /></IconButton>
              </div>
            ))}
            {c.topics.length < NOTIFY_LIMITS.topics && (
              <Button size="sm" onClick={() => setC({ ...c, topics: [...c.topics, { id: `t${Date.now().toString(36)}`, label: '' }] })}><Plus size={15} /> Add topic</Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={() => save()} disabled={busy || !dirty}>{busy ? <Loader2 size={16} className="animate-spin" /> : null} Save sign-up</Button>
          {msg && <span className="text-sm text-muted" role="status">{msg}</span>}
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-line/70 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Button on your page</p>
            <p className="text-xs text-muted">{blockOnPage ? 'Your page has a Notifications button.' : 'Add a Notifications button so visitors find it. Save the page afterwards.'}</p>
          </div>
          {!blockOnPage && <Button size="sm" onClick={() => ed.set((p) => ({ ...p, blocks: [...p.blocks, newBlock('notify')] }))}><Plus size={15} /> Add the button</Button>}
        </div>
        <ShareLink label="Sign-up link" help="Share it in your bio, WhatsApp or email: it opens your page with the sign-up ready." url={`${base}?subscribe`} />
        <ShareLink label="QR code" help="Print it on your counter, menu or flyers. Scans are counted apart from the link." url={`${base}?subscribe=qr`} qr slug={slug} />
      </div>
    </Panel>
  );
}

function ShareLink({ label, help, url, qr, slug }) {
  const [copied, setCopied] = useState(false);
  const [png, setPng] = useState('');
  const [svg, setSvg] = useState('');
  useEffect(() => {
    if (!qr) return;
    QRCode.toDataURL(url, { margin: 2, width: 1024, color: { dark: '#17171f' } }).then(setPng).catch(() => {});
    QRCode.toString(url, { type: 'svg', margin: 2, color: { dark: '#17171f' } }).then((s) => setSvg(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`)).catch(() => {});
  }, [qr, url]);
  const dl = 'inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-line text-[13px] font-semibold bg-panel hover:border-ink/30';
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start">
      {qr && (png ? <img src={png} alt={`QR code for ${url}`} className="size-28 rounded-2xl border border-line" /> : <div className="size-28 rounded-2xl bg-soft" />)}
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted">{help}</p>
        <Input readOnly value={url} onFocus={(e) => e.target.select()} aria-label={label} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy link'}
          </Button>
          {png && <a href={png} download={`${slug}-notifications-qr.png`} className={dl}><Download size={15} /> PNG</a>}
          {svg && <a href={svg} download={`${slug}-notifications-qr.svg`} className={dl}><Download size={15} /> SVG (print)</a>}
        </div>
      </div>
    </div>
  );
}

// ── Subscribers ─────────────────────────────────────────────────
function StatsPanel({ stats, config }) {
  const topicLabel = (id) => (id === '_all' ? 'Everything' : config.topics.find((t) => t.id === id)?.label || 'Removed topic');
  const src = { button: 'Button', link: 'Link', qr: 'QR code' };
  const Row = ({ label, n }) => (
    <li className="flex items-center gap-3 text-sm">
      <span className="flex-1 min-w-0 truncate">{label}</span>
      <span className="w-24 h-1.5 rounded-full bg-soft overflow-hidden"><span className="block h-full bg-accent" style={{ width: `${stats.total ? Math.round((n / stats.total) * 100) : 0}%` }} /></span>
      <span className="w-10 text-right tabular-nums font-semibold">{n}</span>
    </li>
  );
  return (
    <Panel title="Subscribers">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-soft p-4"><p className="text-xs text-muted inline-flex items-center gap-1.5"><Users size={14} /> Total</p><p className="font-display text-3xl font-extrabold tabular-nums">{stats.total}</p></div>
        <div className="rounded-2xl bg-soft p-4"><p className="text-xs text-muted">New in the last 30 days</p><p className="font-display text-3xl font-extrabold tabular-nums">{stats.last30}</p></div>
      </div>
      {stats.total > 0 && (
        <div className="grid sm:grid-cols-2 gap-5 mt-5">
          <div><p className="text-xs font-semibold text-muted mb-2">Where they subscribed</p><ul className="space-y-1.5">{Object.entries(stats.bySource).map(([k, n]) => <Row key={k} label={src[k] || k} n={n} />)}</ul></div>
          {config.topics.length > 0 && <div><p className="text-xs font-semibold text-muted mb-2">Topics</p><ul className="space-y-1.5">{Object.entries(stats.byTopic).map(([k, n]) => <Row key={k} label={topicLabel(k)} n={n} />)}</ul></div>}
        </div>
      )}
      {stats.total === 0 && <p className="text-sm text-muted mt-4">No subscribers yet. Turn on sign-ups and share your link or QR code.</p>}
    </Panel>
  );
}

// ── Composer ────────────────────────────────────────────────────
const fromBroadcast = (b) => ({
  ...emptyDraft(), title: b.title, body: b.body, image: b.image || '', link: b.url ? 'custom' : 'page', url: b.url || '',
  actions: b.actions || [], topics: b.topics || [], es: b.es || { title: '', body: '' }, showEs: Boolean(b.es), ttlHours: b.ttlHours || 24,
});

function toPayload(d) {
  const sendAt = d.mode === 'at' && d.sendAt ? new Date(d.sendAt).toISOString() : '';
  const until = d.mode === 'at' && d.repeat !== 'none' && d.repeatUntil ? new Date(`${d.repeatUntil}T23:59:59`).toISOString() : '';
  return {
    title: d.title, body: d.body, image: d.image, url: d.link === 'custom' ? d.url : '', actions: d.actions.filter((a) => a.label && a.url),
    topics: d.topics, es: d.showEs ? d.es : null, ttlHours: Number(d.ttlHours),
    schedule: { mode: d.mode, sendAt, repeat: d.mode === 'at' ? d.repeat : 'none', repeatUntil: until, tz: TZ },
  };
}

function Composer({ ed, data, draft: d, setDraft, onCreated }) {
  const { page } = ed;
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null); // [ok, text]
  const set = (patch) => setDraft((x) => ({ ...x, ...patch }));
  const topics = data.config.topics;
  const audience = useMemo(() => {
    if (!d.topics.length) return data.stats.total;
    // Subscribers with no topic get everything; the rest is an upper estimate (people can pick several).
    return Math.min(data.stats.total, (data.stats.byTopic._all || 0) + d.topics.reduce((n, t) => n + (data.stats.byTopic[t] || 0), 0));
  }, [d.topics, data.stats]);
  const ready = d.title.trim() && d.body.trim() && (d.link !== 'custom' || /^https?:\/\//.test(d.url));

  const test = async () => {
    setBusy('test'); setMsg(null);
    try {
      const r = await api(`/api/pages/${page.id}/notify/test`, { method: 'POST', body: toPayload(d) });
      setMsg(r.devices ? [true, `Sent to ${r.sent} of your device${r.devices === 1 ? '' : 's'}.`]
        : [false, 'None of your devices has dashboard notifications on. Turn them on below (“Notifications on this device”), or subscribe your phone with your own sign-up link.']);
    } catch (e) { setMsg([false, err(e)]); } finally { setBusy(''); }
  };
  const submit = async () => {
    if (d.mode === 'now' && !window.confirm(`Send “${d.title}” now to ${d.topics.length ? 'up to ' : ''}${audience} subscriber${audience === 1 ? '' : 's'}?`)) return;
    setBusy('send'); setMsg(null);
    try {
      await api(`/api/pages/${page.id}/notify/broadcasts`, { method: 'POST', body: toPayload(d) });
      setMsg([true, d.mode === 'now' ? 'Sending now. Results appear below in a moment.' : `Scheduled for ${when(new Date(d.sendAt).toISOString())}.`]);
      setDraft(emptyDraft());
      onCreated();
    } catch (e) { setMsg([false, err(e)]); } finally { setBusy(''); }
  };

  const label = 'block text-[13px] font-semibold mb-1.5';
  const count = (v, max) => <span className={cx('text-xs tabular-nums', v.length > max - 10 ? 'text-accent-ink' : 'text-muted')}>{v.length}/{max}</span>;

  return (
    <div id="notify-compose">
      <Panel title="New notification" description="Short and specific works best: what, until when, and why tap.">
        <div className="flex flex-wrap gap-1.5 mb-4" aria-label="Start from a template">
          {data.templates.map((t) => (
            <button key={t.id} type="button" onClick={() => set({ title: t.title, body: t.body })} className="h-8 px-3 rounded-full border border-line text-[13px] font-semibold text-muted hover:text-ink cursor-pointer">{t.label}</button>
          ))}
        </div>
        <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-6">
          <div className="space-y-4">
            <label className="block"><span className="flex justify-between"><span className={label}>Title</span>{count(d.title, NOTIFY_LIMITS.titleMax)}</span>
              <Input value={d.title} maxLength={NOTIFY_LIMITS.titleMax} onChange={(e) => set({ title: e.target.value })} placeholder="20% off today only" /></label>
            <label className="block"><span className="flex justify-between"><span className={label}>Message</span>{count(d.body, NOTIFY_LIMITS.bodyMax)}</span>
              <Textarea value={d.body} maxLength={NOTIFY_LIMITS.bodyMax} className="min-h-20" onChange={(e) => set({ body: e.target.value })} placeholder="Show this notification at the counter." /></label>
            <p className="text-xs text-muted -mt-2">Tip: <code>{'{page}'}</code> is replaced with your page name.</p>
            <div><span className={label}>Picture <span className="font-normal text-muted">(optional; Android and computers show it)</span></span>
              <ImageField value={d.image} onChange={(image) => set({ image })} field={{ maxSize: 1200 }} id="notify-image" /></div>
            <div>
              <span className={label}>When tapped, open</span>
              <div className="flex gap-2">
                <Select value={d.link} onChange={(e) => set({ link: e.target.value })} className="sm:w-48"><option value="page">My page</option><option value="custom">Another link</option></Select>
                {d.link === 'custom' && <Input value={d.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://…" />}
              </div>
            </div>
            <div>
              <span className={label}>Buttons <span className="font-normal text-muted">(optional, up to {NOTIFY_LIMITS.actions}; Android and computers)</span></span>
              <div className="space-y-2">
                {d.actions.map((a, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={a.label} maxLength={NOTIFY_LIMITS.actionLabelMax} placeholder="Order now" className="sm:w-40" aria-label={`Button ${i + 1} text`}
                      onChange={(e) => set({ actions: d.actions.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                    <Input value={a.url} placeholder="https://…" aria-label={`Button ${i + 1} link`}
                      onChange={(e) => set({ actions: d.actions.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
                    <IconButton label="Remove button" className="mt-1" onClick={() => set({ actions: d.actions.filter((_, j) => j !== i) })}><X size={16} /></IconButton>
                  </div>
                ))}
                {d.actions.length < NOTIFY_LIMITS.actions && <Button size="sm" onClick={() => set({ actions: [...d.actions, { label: '', url: '' }] })}><Plus size={15} /> Add button</Button>}
              </div>
            </div>
            {topics.length > 0 && (
              <div>
                <span className={label}>Who gets it</span>
                <div className="flex flex-wrap gap-1.5">
                  <Chip on={!d.topics.length} onClick={() => set({ topics: [] })}>Everyone</Chip>
                  {topics.map((t) => <Chip key={t.id} on={d.topics.includes(t.id)} onClick={() => set({ topics: d.topics.includes(t.id) ? d.topics.filter((x) => x !== t.id) : [...d.topics, t.id] })}>{t.label}</Chip>)}
                </div>
                <p className="text-xs text-muted mt-1.5">Subscribers who didn’t pick topics get every notification.</p>
              </div>
            )}
            <div className="rounded-2xl border border-line p-3">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span><span className="text-sm font-semibold">Spanish version</span><span className="block text-xs text-muted">Visitors who subscribed in Spanish get this text instead.</span></span>
                <Toggle checked={d.showEs} label="Spanish version" size="sm" onChange={(showEs) => set({ showEs })} />
              </label>
              {d.showEs && (
                <div className="space-y-2 mt-3">
                  <Input value={d.es.title} maxLength={NOTIFY_LIMITS.titleMax} placeholder="Título" aria-label="Spanish title" onChange={(e) => set({ es: { ...d.es, title: e.target.value } })} />
                  <Textarea value={d.es.body} maxLength={NOTIFY_LIMITS.bodyMax} className="min-h-16" placeholder="Mensaje" aria-label="Spanish message" onChange={(e) => set({ es: { ...d.es, body: e.target.value } })} />
                </div>
              )}
            </div>
            <div>
              <span className={label}>When</span>
              <div className="flex flex-wrap gap-1.5">
                <Chip on={d.mode === 'now'} onClick={() => set({ mode: 'now' })}><Send size={14} /> Now</Chip>
                <Chip on={d.mode === 'at'} onClick={() => set({ mode: 'at' })}><CalendarClock size={14} /> Schedule</Chip>
              </div>
              {d.mode === 'at' && (
                <div className="grid sm:grid-cols-3 gap-2 mt-2">
                  <label className="block sm:col-span-1"><span className="text-xs text-muted">Date and time</span>
                    <Input type="datetime-local" value={d.sendAt} min={localInput(new Date())} onChange={(e) => set({ sendAt: e.target.value })} /></label>
                  <label className="block"><span className="text-xs text-muted">Repeat</span>
                    <Select value={d.repeat} onChange={(e) => set({ repeat: e.target.value })}>{data.repeats.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</Select></label>
                  {d.repeat !== 'none' && <label className="block"><span className="text-xs text-muted">Until (optional)</span>
                    <Input type="date" value={d.repeatUntil} onChange={(e) => set({ repeatUntil: e.target.value })} /></label>}
                </div>
              )}
              {d.mode === 'at' && <p className="text-xs text-muted mt-1.5">Times are in your time zone ({TZ}).</p>}
            </div>
            <label className="block sm:w-64"><span className={label}>Stop trying after</span>
              <Select value={d.ttlHours} onChange={(e) => set({ ttlHours: e.target.value })}>
                <option value={1}>1 hour</option><option value={6}>6 hours</option><option value={24}>1 day</option><option value={72}>3 days</option>
              </Select>
              <span className="block text-xs text-muted mt-1">Phones that are off longer than this won’t get it (useful for same-day offers).</span>
            </label>
          </div>

          <div className="lg:sticky lg:top-20 self-start">
            <p className="text-xs font-semibold text-muted mb-2 inline-flex items-center gap-1.5"><Smartphone size={14} /> Preview</p>
            <div className="rounded-3xl bg-[#e9e9ee] p-3">
              <div className="rounded-2xl bg-white/95 shadow-sm p-3 text-[#17171f]">
                <div className="flex items-center gap-2 text-[11px] text-[#6a6a78]">
                  {page.profile.avatar ? <img src={page.profile.avatar} alt="" className="size-4 rounded" /> : <Bell size={12} />}
                  <span className="truncate">{page.profile.title || page.slug}</span><span className="ml-auto">now</span>
                </div>
                <p className="text-sm font-semibold mt-1.5 break-words">{(d.title || 'Your title').replaceAll('{page}', page.profile.title || page.slug)}</p>
                <p className="text-[13px] text-[#4a4a57] break-words whitespace-pre-line">{(d.body || 'Your message').replaceAll('{page}', page.profile.title || page.slug)}</p>
                {d.image && <img src={d.image} alt="" className="mt-2 w-full aspect-[2/1] object-cover rounded-xl" />}
                {d.actions.some((a) => a.label) && <div className="flex gap-3 mt-2 pt-2 border-t border-[#ececf1]">{d.actions.filter((a) => a.label).map((a, i) => <span key={i} className="text-[12px] font-semibold text-accent-ink">{a.label}</span>)}</div>}
              </div>
            </div>
            <p className="text-xs text-muted mt-2">Each phone shows it in its own style. Pictures and buttons don’t appear on iPhone.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-line/70">
          <Button variant="primary" size="lg" onClick={submit} disabled={!ready || Boolean(busy) || !data.pushReady || (d.mode === 'now' && !data.stats.total)}>
            {busy === 'send' ? <Loader2 size={17} className="animate-spin" /> : d.mode === 'now' ? <Send size={17} /> : <CalendarClock size={17} />}
            {d.mode === 'now' ? `Send to ${d.topics.length ? 'up to ' : ''}${audience} subscriber${audience === 1 ? '' : 's'}` : 'Schedule'}
          </Button>
          <Button size="lg" onClick={test} disabled={!ready || Boolean(busy) || !data.pushReady}>{busy === 'test' ? <Loader2 size={16} className="animate-spin" /> : <Smartphone size={16} />} Send me a test</Button>
          {msg && <p className={cx('text-sm w-full', msg[0] ? 'text-teal' : 'text-danger')} role="status">{msg[1]}</p>}
        </div>
      </Panel>
    </div>
  );
}

function Chip({ on, onClick, children }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cx('inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[13px] font-semibold cursor-pointer border', on ? 'bg-ink text-white border-ink' : 'bg-panel border-line text-muted hover:text-ink')}>
      {children}
    </button>
  );
}

// ── Sent and scheduled ──────────────────────────────────────────
function HistoryPanel({ page, list, repeats, onChange, onDuplicate }) {
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const act = async (b, kind) => {
    if (kind === 'cancel' && !window.confirm(b.schedule?.repeat !== 'none' ? 'Cancel this notification? Later repeats won’t be sent either.' : 'Cancel this notification?')) return;
    setBusy(b.id + kind); setMsg('');
    try {
      if (kind === 'cancel') await api(`/api/pages/${page.id}/notify/broadcasts/${b.id}`, { method: 'PATCH', body: { action: 'cancel' } });
      else await api(`/api/pages/${page.id}/notify/broadcasts/${b.id}`, { method: 'DELETE' });
      onChange();
    } catch (e) { setMsg(err(e)); } finally { setBusy(''); }
  };
  const repeatLabel = (r) => repeats.find((x) => x.value === r)?.label.toLowerCase();
  return (
    <Panel title="Sent and scheduled" description={`Up to ${NOTIFY_LIMITS.sendsPerDay} notifications per day.`}>
      {msg && <p className="text-sm text-danger mb-2" role="alert">{msg}</p>}
      {!list.length ? <p className="text-sm text-muted">Nothing sent yet.</p> : (
        <ul className="divide-y divide-line/70">
          {list.map((b) => {
            const [label, cls] = STATUS[b.status] || [b.status, 'bg-soft'];
            const ctr = b.stats.sent ? Math.round((b.stats.clicks / b.stats.sent) * 100) : 0;
            return (
              <li key={b.id} className="py-3 flex gap-3 items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cx('text-[11px] font-bold px-2 py-0.5 rounded-full', cls)}>{label}</span>
                    <span className="text-xs text-muted">{b.status === 'sent' ? when(b.sentAt || b.sendAt) : when(b.sendAt)}</span>
                    {b.schedule?.repeat && b.schedule.repeat !== 'none' && <span className="text-xs text-muted inline-flex items-center gap-1"><Repeat size={12} /> {repeatLabel(b.schedule.repeat)}{b.occurrence > 1 ? ` · #${b.occurrence}` : ''}</span>}
                  </div>
                  <p className="text-sm font-semibold mt-1 truncate">{b.title}</p>
                  <p className="text-xs text-muted truncate">{b.body}</p>
                  {(b.status === 'sent' || b.status === 'sending') && (
                    <p className="text-xs mt-1 inline-flex flex-wrap gap-3 text-muted">
                      <span className="inline-flex items-center gap-1"><Send size={12} /> {b.stats.sent} delivered</span>
                      <span className="inline-flex items-center gap-1"><MousePointerClick size={12} /> {b.stats.clicks} taps{b.stats.sent ? ` (${ctr}%)` : ''}</span>
                      {b.stats.removed > 0 && <span>{b.stats.removed} unsubscribed devices removed</span>}
                    </p>
                  )}
                  {b.status === 'failed' && <p className="text-xs text-danger mt-1">{FAIL_REASONS[b.error] || 'Something went wrong.'}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => onDuplicate(b)}>Duplicate</Button>
                  {b.status === 'scheduled'
                    ? <Button size="sm" variant="ghost" onClick={() => act(b, 'cancel')} disabled={busy === `${b.id}cancel`}>Cancel</Button>
                    : b.status !== 'sending' && <IconButton label="Remove from the list" onClick={() => act(b, 'delete')} disabled={busy === `${b.id}delete`}><Trash2 size={15} /></IconButton>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
