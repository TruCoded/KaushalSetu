import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from './ctx.jsx';
import { listen, sttSupported } from './speech.js';
import { speechCode } from './langs.js';
import Pitch from './Pitch.jsx';

// Text box with a 🎤 button: say your name or village instead of typing it.
function MicInput({ id, value, onChange, required, autoComplete }) {
  const { lang, t } = useApp();
  const [on, setOn] = useState(false);
  const go = async () => {
    setOn(true);
    try { const x = await listen(speechCode(lang)).promise; if (x) onChange(x.replace(/[.।]+$/, '')); } catch { /* denied or nothing heard */ }
    setOn(false);
  };
  return (
    <div className="micin">
      <input id={id} required={required} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} lang={lang} />
      {sttSupported() && <button type="button" className={'mic' + (on ? ' on' : '')} onClick={go} aria-label={t('speakField')}>🎤</button>}
    </div>
  );
}

export function Created({ phone, password, onContinue, cta }) {
  const { t, speak, lang } = useApp();
  const [copied, setCopied] = useState(false);
  const spaced = password.split('').join(' ');
  const copy = async () => { try { await navigator.clipboard.writeText(`${phone} / ${password}`); setCopied(true); } catch { /* clipboard blocked */ } };
  const wa = 'https://wa.me/?text=' + encodeURIComponent(`KaushalSetu\n${t('yourPhone')}: ${phone}\n${t('yourPw')}: ${password}`);
  return (
    <div className="box created" role="status">
      <h1>🎉 {t('acctReady')}</h1>
      <p className="lbl">{t('yourPhone')}</p><div className="bignum">{phone}</div>
      <p className="lbl">{t('yourPw')}</p><div className="bignum pw" aria-label={spaced}>{spaced}</div>
      <div className="crow">
        <button type="button" className="btn ghost" onClick={() => speak(`${t('pwIs')} ${password.split('').join(', ')}`, lang)}>🔊 {t('listen')}</button>
        <button type="button" className="btn ghost" onClick={copy}>📋 {copied ? t('copied') : t('copy')}</button>
        <a className="btn ghost" href={wa} target="_blank" rel="noreferrer">💬 {t('shareWa')}</a>
      </div>
      <p className="hint">📸 {t('pwShot')}</p>
      <button type="button" className="btn" style={{ width: '100%' }} onClick={onContinue}>{cta || `${t('contBtn')} →`}</button>
    </div>
  );
}

export default function Auth({ mode }) {
  const { t, api, signIn, lang } = useApp();
  const [sp] = useSearchParams(), nav = useNavigate();
  const [role, setRole] = useState(sp.get('role') === 'employer' || sp.get('role') === 'partner' ? sp.get('role') : 'worker');
  const [f, setF] = useState({ name: '', phone: '', password: '', city: '', company: '' });
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(true), [show, setShow] = useState(false), [pad, setPad] = useState(true), [created, setCreated] = useState(null);
  const [step, setStep] = useState('details'); // 'details' | 'voice'
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const login = mode === 'login';
  const rr = role;

  const preDraft = (() => {
    try {
      const raw = sessionStorage.getItem('ks-draft');
      if (sessionStorage.getItem('ks-draft-ok') && raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.skills?.length || parsed?.occupation) return parsed;
      }
    } catch {}
    return null;
  })();

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await api('/auth/' + (login ? 'login' : 'register'), {
        method: 'POST',
        body: {
          ...f,
          password: !login && auto ? '' : f.password,
          role: rr,
          language: lang,
          ...(!login && rr === 'worker' && preDraft && { draft: preDraft })
        }
      });
      signIn(r);
      try {
        sessionStorage.removeItem('ks-draft');
        sessionStorage.removeItem('ks-draft-ok');
      } catch {}
      if (r.password) setCreated({ phone: f.phone, password: r.password });
      else nav(r.user?.role === 'partner' ? '/partner' : '/dashboard');
    } catch (x) { setErr(x.message); }
    setBusy(false);
  }

  async function startVoiceSignup(e) {
    e.preventDefault(); setErr('');
    if (!f.name.trim()) { setErr(t('nameShort') || 'Please enter your name'); return; }
    if (!/^\d{10}$/.test(f.phone)) { setErr(t('phone10')); return; }
    setBusy(true);
    try {
      const c = await api('/auth/check-phone', { method: 'POST', body: { phone: f.phone } });
      if (!c.valid) throw new Error(t('phone10'));
      if (c.exists) throw new Error(t('alreadyReg'));
      setStep('voice');
    } catch (x) { setErr(x.message); }
    setBusy(false);
  }

  if (created) return <div className="wrap page"><div className="narrow"><Created {...created} onContinue={() => nav(role === 'partner' ? '/partner' : '/dashboard')} cta={role === 'partner' ? `${t('goPartnerDash')} →` : undefined} /></div></div>;

  if (!login && rr === 'worker' && step === 'voice') {
    return (
      <div className="wrap page"><div className="narrow">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>🎤 {t('stepVoice')}</h1>
          <button type="button" className="btn ghost sm" onClick={() => setStep('details')}>← {t('back')}</button>
        </div>
        <p className="sub" style={{ margin: '0 0 16px' }}>{t('voiceIntro')}</p>
        <Pitch
          mode="self"
          save={async (draft) => {
            const r = await api('/auth/register', {
              method: 'POST',
              body: {
                ...f,
                password: auto ? '' : f.password,
                role: 'worker',
                language: lang,
                draft
              }
            });
            signIn(r);
            return r;
          }}
          onSaved={(res) => {
            try {
              sessionStorage.removeItem('ks-draft');
              sessionStorage.removeItem('ks-draft-ok');
            } catch {}
            if (res?.password) setCreated({ phone: f.phone, password: res.password });
            else nav('/dashboard');
          }}
        />
      </div></div>
    );
  }

  return (
    <div className="wrap page"><div className="narrow">
      <h1>{login ? t('loginT') : t('regT')}</h1><p className="sub">{login ? t('loginWelcome') : ''}</p>
      <form className="box" onSubmit={submit}>
        <div className="tabs t3" role="tablist">
          <button type="button" role="tab" aria-selected={role === 'worker'} className={role === 'worker' ? 'on' : ''} onClick={() => { setRole('worker'); setStep('details'); }}>🧵 {t('iWork')}</button>
          <button type="button" role="tab" aria-selected={role === 'employer'} className={role === 'employer' ? 'on' : ''} onClick={() => { setRole('employer'); setStep('details'); }}>🏢 {t('iHire')}</button>
          <button type="button" role="tab" aria-selected={role === 'partner'} className={role === 'partner' ? 'on' : ''} onClick={() => { setRole('partner'); setStep('details'); }}>🤝 {t('iPartner')}</button>
        </div>

        {!login && role === 'partner' && (
          <p className="hint" style={{ marginTop: 0, marginBottom: 14 }}>
            🤝 {t('partnerRegHint')}
          </p>
        )}

        {!login && rr === 'worker' && preDraft && (
          <div style={{ background: '#eaf7ef', border: '1px solid #bce6cb', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#176537', fontSize: 14 }}>
            <b>✓ {t('voiceDraftReady')}</b>
          </div>
        )}

        {!login && <><label htmlFor="n">{t('name')}</label><MicInput id="n" required value={f.name} onChange={set('name')} autoComplete="name" /></>}
        {!login && role === 'employer' && <><label htmlFor="co">{t('company')}</label><MicInput id="co" required value={f.company} onChange={set('company')} /></>}
        <label htmlFor="p">{t('phone')}</label>
        <input id="p" required inputMode="numeric" pattern="\d{10}" maxLength={10} value={f.phone} onChange={(e) => set('phone')(e.target.value.replace(/\D/g, ''))} autoComplete="tel" />
        {!login && <><label htmlFor="c">{t('city')}</label><MicInput id="c" required={role === 'partner'} value={f.city} onChange={set('city')} /></>}
        {!login && (
          <button type="button" role="switch" aria-checked={auto} className={'autopw' + (auto ? ' on' : '')} onClick={() => setAuto(!auto)}>
            <span className="knob" aria-hidden="true" />
            <span><b>🎲 {t('autoPw')}</b><small>{auto ? t('autoPwHint') : t('ownPw')}</small></span>
          </button>
        )}
        {(login || !auto) && (
          <>
            <label htmlFor="pw">{t('password')}</label>
            <div className="micin">
              <input id="pw" required type={show ? 'text' : 'password'} minLength={6} inputMode={pad ? 'numeric' : 'text'} value={f.password} onChange={(e) => set('password')(e.target.value)} autoComplete={login ? 'current-password' : 'new-password'} />
              <button type="button" className="mic" onClick={() => setShow(!show)} aria-label={show ? t('hidePw') : t('showPw')}>{show ? '🙈' : '👁'}</button>
              <button type="button" className={'mic' + (pad ? ' on2' : '')} onClick={() => setPad(!pad)} aria-pressed={pad} aria-label={t('keypad')}>123</button>
            </div>
          </>
        )}
        {err && <p className="err" role="alert">{err}</p>}

        {!login && rr === 'worker' && !preDraft ? (
          <>
            <button type="button" className="btn" style={{ width: '100%', marginBottom: 10 }} onClick={startVoiceSignup} disabled={busy}>
              🎤 {t('voiceSignup')}
            </button>
            <button type="submit" className="btn ghost" style={{ width: '100%' }} disabled={busy}>
              {t('quickReg')}
            </button>
          </>
        ) : (
          <button className="btn" style={{ width: '100%' }} disabled={busy}>{login ? t('login') : t('register')}</button>
        )}

        {login && <p className="hint" style={{ marginTop: 12 }}>🔑 {t('forgotPw')}</p>}
        {login && role === 'partner' && <p className="hint">🤝 {t('partnerRegHint')}</p>}
        <p style={{ textAlign: 'center', margin: '14px 0 0' }}>{login ? t('noAcc') : t('haveAcc')}{' '}
          <Link className="link" to={(login ? '/register' : '/login') + '?role=' + role}>{login ? t('register') : t('login')}</Link></p>
      </form>
    </div></div>
  );
}
