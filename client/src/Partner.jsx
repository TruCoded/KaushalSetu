import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import gsap from 'gsap';
import { useApp } from './ctx.jsx';
import { listenVoice, voiceReady } from './speech.js';
import { LANGS, speechCode } from './langs.js';
import Pitch from './Pitch.jsx';
import { Created } from './Auth.jsx';

// Text box with a 🎤: the partner says the worker's name or mobile number. The server cleans it up
// ("my name is Rani Devi" -> "Rani Devi", "nine eight one two..." -> 9812345678) and the partner can still type or fix it.
function VoiceField({ id, kind, value, onChange, required }) {
  const { t, lang, api, speak } = useApp();
  const [on, setOn] = useState(false), [note, setNote] = useState('');
  const phone = kind === 'phone';
  const go = async () => {
    if (!(await voiceReady())) { setNote(t('noMic')); return; }
    setOn(true); setNote('');
    try {
      const text = await listenVoice({ speech: speechCode(lang), lang }).promise;
      if (!text) setNote(t('noSpeech'));
      else {
        const r = await api('/voice/field', { method: 'POST', body: { kind, text, lang } });
        onChange(r.value);
        if (!r.valid) setNote(t(phone ? 'phoneRetry' : 'nameRetry'));
        else if (phone) speak(r.value.split('').join(', '), lang); // read the digits back so the partner can check
      }
    } catch (e) { setNote(e.code === 'not-allowed' ? t('micDenied') : t('noSpeech')); }
    setOn(false);
  };
  return (
    <>
      <div className="micin">
        <input id={id} required={required} value={value} lang={lang}
          {...(phone ? { inputMode: 'numeric', pattern: '\\d{10}', maxLength: 10, autoComplete: 'off' } : { autoComplete: 'off' })}
          onChange={(e) => onChange(phone ? e.target.value.replace(/\D/g, '') : e.target.value)} />
        {phone && value.length === 10 && <button type="button" className="mic" onClick={() => speak(value.split('').join(', '), lang)} aria-label={t('listen')}>🔊</button>}
        <button type="button" className={'mic' + (on ? ' on' : '')} onClick={go} aria-label={t('speakField')}>🎤</button>
      </div>
      {note && <p className="err" role="status" style={{ marginTop: -6 }}>{note}</p>}
    </>
  );
}

// Dashboard of a Community Partner: register a worker in three steps (details -> speak for the worker -> hand over the password).
function Register({ list, load }) {
  const { t, api, lang } = useApp();
  const [step, setStep] = useState('details'), [f, setF] = useState({ name: '', phone: '', wlang: lang, agreed: false });
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false), [created, setCreated] = useState(null);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  async function next(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (f.name.trim().length < 2) throw new Error(t('nameShort'));
      const c = await api('/voice/partner/check', { method: 'POST', body: { phone: f.phone } });
      if (!c.valid) throw new Error(t('phone10'));
      if (c.exists) throw new Error(t('alreadyReg'));
      setStep('voice');
    } catch (x) { setErr(x.message); }
    setBusy(false);
  }
  // called by the review screen after the partner (and worker) said yes
  const save = (draft) => api('/voice/partner/register', { method: 'POST', body: { name: f.name.trim(), phone: f.phone, language: f.wlang, draft, confirmed: true, workerAgreed: f.agreed } });
  const saved = (res) => { setCreated({ phone: f.phone, password: res.password }); setStep('done'); load(); };
  const again = () => { setF({ name: '', phone: '', wlang: lang, agreed: false }); setCreated(null); setErr(''); setStep('details'); };

  if (step === 'done' && created) {
    return (
      <div className="narrow">
        <p className="hint" style={{ fontSize: 16, color: 'var(--ink)' }}>✅ {t('giveTo')} <b>{f.name}</b></p>
        <Created {...created} onContinue={again} cta={`＋ ${t('regAnother')}`} />
      </div>
    );
  }
  return (
    <>
      {step === 'details' && (
        <form className="box" onSubmit={next}>
          <h3>{t('partnerT')}</h3>
          <p className="hint" style={{ marginTop: 0 }}>{t('pIntro')}</p>
          <label htmlFor="pn">{t('pName')}</label><VoiceField id="pn" kind="name" required value={f.name} onChange={set('name')} />
          <label htmlFor="pp">{t('pPhone')}</label><VoiceField id="pp" kind="phone" required value={f.phone} onChange={set('phone')} />
          <label htmlFor="pl">{t('pLang')}</label>
          <select id="pl" value={f.wlang} onChange={(e) => set('wlang')(e.target.value)}>{LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
          <label className="agree"><input type="checkbox" checked={f.agreed} onChange={(e) => set('agreed')(e.target.checked)} required /> <span>{t('pAgree')}</span></label>
          {err && <p className="err" role="alert">{err}</p>}
          <button className="btn" style={{ width: '100%' }} disabled={busy || !f.agreed}>{t('pNext')} →</button>
        </form>
      )}
      {step === 'voice' && (
        <>
          <button type="button" className="link back" onClick={() => setStep('details')}>← {t('back')}</button>
          <Pitch key={f.phone} mode="partner" worker={{ name: f.name.trim(), lang: f.wlang }} save={save} onSaved={saved} />
        </>
      )}
    </>
  );
}

const inr = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN');
const calm = () => matchMedia('(prefers-reduced-motion:reduce)').matches;

// Number that counts up when it first appears (plain number if the person prefers less motion).
function Count({ to, money }) {
  const [v, setV] = useState(calm() ? to : 0);
  useEffect(() => {
    if (calm()) { setV(to); return; }
    const o = { n: 0 }, g = gsap.to(o, { n: to, duration: 0.9, ease: 'power2.out', onUpdate: () => setV(o.n) });
    return () => g.kill();
  }, [to]);
  return <>{money ? inr(v) : Math.round(v)}</>;
}

function Workers({ list, placed, setTab }) {
  const { t } = useApp();
  if (!list.length) return <div className="box empty"><p>{t('noWorkers')}</p><button type="button" className="btn" onClick={() => setTab('reg')}>＋ {t('pdFirst')}</button></div>;
  return (
    <div className="box"><h3>{t('myWorkers')}</h3>
      {list.map((w) => (
        <div className="prow" key={w._id}>
          <div><b>{w.name}</b>{placed.has(String(w._id)) && <span className="chip ok">✅ {t('pdPlaced')}</span>}
            <small>{w.city || '—'} · {[...(w.skills || []).map((k) => t('sk_' + k)), w.occupation].filter(Boolean).join(', ') || '—'}</small></div>
          <a className="btn ghost sm" href={'tel:' + w.phone} aria-label={w.phone}>📞 {w.phone}</a>
        </div>))}
    </div>
  );
}

function Earnings({ data }) {
  const { t } = useApp(), tot = data.totals || {}, hires = data.hires || [];
  return (
    <>
      <div className="stats three">
        <div className="stat"><b><Count to={tot.partnerShare} money /></b><span>{t('pdStE')}</span></div>
        <div className="stat g"><b><Count to={tot.paidShare} money /></b><span>{t('pdPaid')}</span></div>
        <div className="stat a"><b><Count to={(tot.partnerShare || 0) - (tot.paidShare || 0)} money /></b><span>{t('pdDue')}</span></div>
      </div>
      <div className="box"><h3>{t('pdPlacedT')}</h3>
        {!hires.length && <p>{t('pdNoPlaced')}</p>}
        {hires.map((h) => (
          <div className="prow" key={h._id}>
            <div><b>{h.worker?.name || '—'}</b><small>{h.job?.title || ''}{h.employer?.company ? ' · ' + h.employer.company : ''}</small></div>
            <div className="amt"><b>{inr(h.partnerShare)}</b><span className={'chip ' + (h.feeStatus === 'paid' ? 'ok' : 'wait')}>{h.feeStatus === 'paid' ? t('pdPaid') : t('pdDue')}</span></div>
          </div>))}
        {!!hires.length && <p className="hint">{t('pdNote')}</p>}
      </div>
    </>
  );
}

// Dashboard of a Community Partner: register a worker, see the workers registered, placements and earnings.
export default function PartnerDash() {
  const { t, api } = useApp(), root = useRef();
  const [tab, setTab] = useState('reg'), [list, setList] = useState([]), [earn, setEarn] = useState({ hires: [], totals: {} });
  const load = useCallback(() => {
    api('/voice/partner/workers').then((r) => setList(r.workers)).catch(() => {});
    api('/hires/partner').then(setEarn).catch(() => {});
  }, [api]);
  useEffect(() => { load(); }, [load]);
  useLayoutEffect(() => {
    if (calm()) return;
    const c = gsap.context(() => { gsap.from('.stat', { y: 24, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }); }, root);
    return () => c.revert();
  }, []);
  useLayoutEffect(() => {
    if (calm()) return;
    const c = gsap.context(() => { gsap.from('.ptab > *', { y: 14, opacity: 0, duration: 0.35, stagger: 0.06, ease: 'power2.out' }); }, root);
    return () => c.revert();
  }, [tab]);
  const placed = new Set((earn.hires || []).map((h) => String(h.worker?._id)));
  const tabs = [['reg', '＋', t('pdReg')], ['workers', '👥', t('pdWorkers')], ['earn', '₹', t('pdEarn')]];
  return (
    <div ref={root} className="pdash">
      <div className="stats">
        <div className="stat"><b><Count to={list.length} /></b><span>{t('pdStW')}</span></div>
        <div className="stat g"><b><Count to={earn.totals?.hires || 0} /></b><span>{t('pdStP')}</span></div>
        <div className="stat a"><b><Count to={earn.totals?.partnerShare || 0} money /></b><span>{t('pdStE')}</span></div>
      </div>
      <div className="ptabs" role="tablist">
        {tabs.map(([k, i, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><span aria-hidden="true">{i}</span>{l}</button>)}
      </div>
      <div className="ptab" key={tab}>
        {tab === 'reg' && <Register list={list} load={load} />}
        {tab === 'workers' && <Workers list={list} placed={placed} setTab={setTab} />}
        {tab === 'earn' && <Earnings data={earn} />}
      </div>
    </div>
  );
}

// Own page at /partner (partners only).
export function PartnerPage() {
  const { user, ready, t } = useApp();
  if (!ready) return null;
  if (!user) return <Navigate to="/login?role=partner" replace />;
  if (user.role !== 'partner') return <Navigate to="/dashboard" replace />;
  return <div className="wrap page"><h1>🤝 {user.name}</h1><p className="sub">{t('lpPtT')}</p><PartnerDash /></div>;
}
