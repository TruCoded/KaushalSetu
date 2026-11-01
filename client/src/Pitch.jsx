import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from './ctx.jsx';
import { listenVoice, voiceReady } from './speech.js';
import { speechCode, nativeName } from './langs.js';
import JobCard from './JobCard.jsx';
import { ReviewSummary, ReviewForm } from './Review.jsx';

const blank = () => ({ skills: [], specialties: [], detailDone: [], experienceYears: null, workType: '', workTypeAny: false, city: '', state: '', occupation: '', shift: '', relocate: null, fails: {}, skipped: [], turn: 0 });
function initialDraft(user, partner) {
  if (partner) return blank(); // a partner starts every worker from nothing and never reuses another person's draft
  try { const d = JSON.parse(sessionStorage.getItem('ks-draft')); if (d?.skills?.length || d?.occupation) return { ...blank(), ...d }; } catch { /* no draft */ }
  if (user?.role === 'worker' && (user.skills?.length || user.occupation)) {
    return { ...blank(), skills: user.skills || [], specialties: user.specialties || [], experienceYears: user.experienceYears ?? null, workType: user.workType || '', city: user.city || '',
      state: user.state || '', occupation: user.occupation || '', shift: user.shift || '', relocate: user.relocate ?? null };
  }
  return blank();
}
const FALLBACK = ['hi', 'en', 'pa'];
const store = (d, ok) => { try { sessionStorage.setItem('ks-draft', JSON.stringify(d)); if (ok) sessionStorage.setItem('ks-draft-ok', '1'); else sessionStorage.removeItem('ks-draft-ok'); } catch { /* private mode */ } };

// The spoken interview. Stage 2: the AI asks in the person's language, listens in it, and asks again for what is missing
// (work, kind of work, years, work preference, place). Stage 3: it reads back what it understood and nothing is saved
// until the person says "yes" (or taps Save); "no" opens a form to correct it.
//   mode="partner": a Community Partner answers for the worker (`worker` = { name, lang }); `save(draft)` registers them.
export default function Pitch({ mode = 'self', worker = null, save: saveFn, onSaved }) {
  const { t, lang, api, user, setUser, speak, say, stopSpeaking } = useApp();
  const partner = mode === 'partner';
  const who = partner ? String(worker?.name || '').trim().split(/\s+/)[0] : '';
  const workerLang = partner ? worker?.lang || lang : lang;
  const [msgs, setMsgs] = useState([]), [draft, setDraft] = useState(() => initialDraft(user, partner)), [awaiting, setAwaiting] = useState('intro');
  const [st, setSt] = useState('idle'), [live, setLive] = useState(''), [txt, setTxt] = useState(''), [err, setErr] = useState('');
  const [tips, setTips] = useState([]), [phase, setPhase] = useState('ask'), [review, setReview] = useState(null), [saved, setSaved] = useState(false);
  const [jobs, setJobs] = useState(null), [matched, setMatched] = useState(true), [reading, setReading] = useState(false);
  const [sayOn, setSayOn] = useState(true), [auto, setAuto] = useState(true), [sttLang, setSttLang] = useState(lang), [fallback, setFallback] = useState(false);
  const S = useRef({ phase: 'ask', unclear: 0 }); S.current = { ...S.current, draft, awaiting, lang, sayOn, auto, sttLang, user, who, workerLang };
  const rec = useRef(null), chat = useRef(null), halt = useRef(false);

  useEffect(() => {
    setSttLang(lang);
    setFallback(false);
    if (msgs.length > 0 && phase === 'ask') {
      setMsgs([]);
      setErr('');
      setTips([]);
      turn({ start: true });
    }
  }, [lang]);
  useEffect(() => { if (chat.current) chat.current.scrollTop = chat.current.scrollHeight; }, [msgs, live, st]);
  useEffect(() => () => { rec.current?.abort(); stopSpeaking(); }, [stopSpeaking]);

  const push = (m) => setMsgs((x) => [...x, m]);
  const go = (p) => { S.current.phase = p; setPhase(p); };
  const keep = (d) => { S.current.draft = d; setDraft(d); if (!partner) store(d, false); };

  // ---- Stage 2: one question / answer round ----
  async function turn(body) {
    const s = S.current;
    setErr(''); setSt('busy');
    let r;
    try { r = await api('/voice/pitch', { method: 'POST', body: { ...body, lang: s.lang, who: s.who, draft: s.draft, awaiting: s.awaiting } }); }
    catch (e) { setErr(e.message); setSt('idle'); return; }
    S.current = { ...S.current, awaiting: r.awaiting }; keep(r.draft);
    setAwaiting(r.awaiting); setTips(r.tips || []);
    const spoken = [r.ack, r.question].filter(Boolean).join(' ');
    push({ from: 'ai', text: spoken });
    if (S.current.sayOn) { setSt('speaking'); await speak(spoken, S.current.lang); }
    setSt('idle');
    if (r.complete) await enterReview(r.draft);
    else if (S.current.sayOn && S.current.auto) listenOnce();
  }

  // ---- Stage 3: read back what was understood, then wait for yes / no ----
  async function enterReview(d) {
    const s = S.current;
    go('review'); S.current.unclear = 0; setErr(''); setSt('busy');
    let rv;
    try { rv = await api('/voice/review', { method: 'POST', body: { draft: d, lang: s.lang, workerLang: s.workerLang, who: s.who } }); }
    catch (e) { setErr(e.message); setSt('idle'); return; }
    keep(rv.draft); setReview(rv);
    const spoken = `${rv.readback} ${rv.ask}`;
    push({ from: 'ai', text: spoken });
    if (S.current.sayOn) { setSt('speaking'); await speak(spoken, S.current.lang); }
    setSt('idle');
    if (S.current.sayOn && S.current.auto && S.current.phase === 'review') listenOnce();
  }

  async function reviewAnswer(text) {
    const s = S.current;
    setSt('busy');
    let v = '';
    try { v = (await api('/voice/review', { method: 'POST', body: { draft: s.draft, lang: s.lang, text, verdictOnly: true } })).verdict; }
    catch (e) { setErr(e.message); setSt('idle'); return; }
    if (v === 'yes') return confirm();
    if (v === 'no') return startEdit();
    S.current.unclear = (S.current.unclear || 0) + 1; setSt('idle'); // always through S.current: it is re-created on every render
    if (s.sayOn) await speak(t('yesNoAgain'), s.lang);
    if (S.current.sayOn && S.current.auto && S.current.unclear < 2 && S.current.phase === 'review') listenOnce(); // after two misses, leave it to the buttons
  }

  function startEdit() {
    stopSpeaking(); rec.current?.abort(); go('edit'); setSt('idle');
    if (S.current.sayOn) speak(t('editHint'), S.current.lang);
  }

  // Only here is anything saved.
  async function confirm() {
    stopSpeaking(); rec.current?.abort(); setErr(''); setSt('busy');
    const s = S.current, d = s.draft;
    let res = null;
    try {
      if (saveFn) res = await saveFn(d, s.lang); // partner: register the worker
      else if (s.user?.role === 'worker') { res = await api('/voice/profile', { method: 'POST', body: { draft: d, confirmed: true, lang: s.lang } }); setUser(res.user); }
      else store(d, true); // not signed in: keep the confirmed draft; it is adopted when they create their account
    } catch (e) { setErr(e.message); setSt('idle'); return; }
    go('saved'); setSaved(!!res && !saveFn); setSt('idle');
    onSaved?.(res, d);
    if (partner) return;
    if (S.current.sayOn) await speak(t('pitchSaved'), S.current.lang);
    let j = null;
    try { j = await api('/jobs/match', { method: 'POST', body: { skills: d.skills, specialties: d.specialties, city: d.city, workType: d.workType, experienceYears: d.experienceYears ?? 0 } }); } catch { /* vacancies are a bonus */ }
    if (!j) return;
    setJobs(j.jobs); setMatched(j.matched);
    if (S.current.sayOn) {
      const line = j.matched ? `I found ${j.jobs.length} jobs for you. The best one is ${j.jobs[0].title} in ${j.jobs[0].city}.` : 'I could not find an exact match yet. Please look at the recent jobs.';
      await say(line, S.current.lang);
    }
  }

  async function listenOnce(code) {
    if (!(await voiceReady())) { setErr(t('noMic')); return; }
    stopSpeaking(); setErr(''); setLive(''); setSt('rec');
    const h = listenVoice({ speech: code || speechCode(S.current.sttLang), lang: S.current.sttLang, onInterim: setLive }); rec.current = h;
    try {
      const text = await h.promise; setLive('');
      if (!text) { setSt('idle'); setErr(t('noSpeech')); return; }
      push({ from: 'me', text });
      if (S.current.phase === 'review') await reviewAnswer(text); else await turn({ text });
    } catch (e) {
      setLive(''); setSt('idle');
      if (e.code === 'not-allowed' || e.code === 'service-not-allowed') setErr(t('micDenied'));
      else if (e.code === 'language-not-supported' || e.code === 'network') { setFallback(true); setErr(t('langNoVoice')); }
      else if (e.code === 'no-speech') setErr(t('noSpeech'));
      else if (e.code !== 'aborted') setErr(t('micDenied'));
    }
  }

  const mic = () => {
    if (st === 'rec') { rec.current?.stop(); return; }
    if (st === 'busy') return;
    stopSpeaking();
    if (!msgs.length) turn({ start: true }); else listenOnce();
  };
  const sendTyped = (e) => {
    e.preventDefault(); const x = txt.trim();
    if (!x || st === 'busy' || !msgs.length) return;
    setTxt(''); stopSpeaking(); push({ from: 'me', text: x });
    if (S.current.phase === 'review') reviewAnswer(x); else turn({ text: x });
  };
  const restart = () => {
    stopSpeaking(); rec.current?.abort(); try { sessionStorage.removeItem('ks-draft'); sessionStorage.removeItem('ks-draft-ok'); } catch { /* private mode */ }
    const d = initialDraft(null, true); S.current = { ...S.current, draft: d, awaiting: 'intro', phase: 'ask', unclear: 0 };
    setDraft(d); setAwaiting('intro'); setMsgs([]); setTips([]); setPhase('ask'); setReview(null); setJobs(null); setSaved(false); setErr(''); setSt('idle');
  };
  const readJobs = async () => {
    if (reading) { halt.current = true; stopSpeaking(); return; }
    halt.current = false; setReading(true);
    for (const j of (jobs || []).slice(0, 4)) { if (halt.current) break; await say(`${j.title}. ${j.employer?.company || ''}. ${j.city}. ${j.pay || ''}`); }
    setReading(false);
  };
  const pickLang = (c) => { setSttLang(c); S.current.sttLang = c; setFallback(false); listenOnce(speechCode(c)); };

  const d = draft, asking = phase === 'ask' || phase === 'review';
  const prog = [
    ['pgSkills', d.skills.length > 0 || !!d.occupation],
    ['pgType', d.skills.length > 0 && d.skills.every((k) => d.detailDone.includes(k) || d.skipped.includes('details:' + k))],
    ['pgExp', d.experienceYears !== null],
    ['pgWt', !!d.workType || d.workTypeAny],
    ['pgCity', !!d.city],
    ['pgReview', phase === 'saved']
  ];
  const label = st === 'rec' ? t('stopBtn') : st === 'busy' ? t('thinking') : msgs.length ? t('speakBtn') : t('start');

  return (
    <div className="box pitchbox">
      {partner && <p className="whofor">🙋 {t('speakingFor')} <b>{worker?.name}</b> · {nativeName(workerLang)}</p>}
      <div className="prog" aria-label="progress">{prog.map(([k, ok]) => <span key={k} className={ok ? 'ok' : ''}>{ok ? '✓' : '○'} {t(k)}</span>)}</div>
      {!msgs.length && <p className="say">{partner ? t('pStartHint') : t('startHint')}</p>}
      {msgs.length > 0 && (
        <div className="chat" ref={chat} aria-live="polite">
          {msgs.map((m, i) => (
            <div key={i} className={'bub ' + m.from}>{m.text}{m.from === 'ai' && <button type="button" className="re" onClick={() => speak(m.text, lang)} aria-label={t('replay')}>🔊</button>}</div>
          ))}
          {live && <div className="bub me live">{live} …</div>}
          {st === 'busy' && <div className="bub ai dots">{t('thinking')}</div>}
        </div>
      )}
      {asking && (
        <div className="pctl">
          <button type="button" className={'big' + (st === 'rec' ? ' on' : '')} onClick={mic} aria-label={label} disabled={st === 'busy'}>
            <svg viewBox="0 0 48 48"><rect x="18" y="5" width="12" height="22" rx="6" /><path d="M11 22a13 13 0 0026 0M24 35v8" /></svg>
          </button>
          <div className="plabel"><b>{phase === 'review' && st !== 'rec' && st !== 'busy' ? t('sayYesNoShort') : label}</b>
            <div className="toggles">
              <button type="button" role="switch" aria-checked={sayOn} className={sayOn ? 'on' : ''} onClick={() => { setSayOn(!sayOn); stopSpeaking(); }}>🔊 {t('sayAloud')}</button>
              <button type="button" role="switch" aria-checked={auto} className={auto ? 'on' : ''} onClick={() => setAuto(!auto)}>🎙 {t('autoListen')}</button>
              {msgs.length > 0 && <button type="button" onClick={restart} aria-label={t('start')}>↻</button>}
            </div>
          </div>
        </div>
      )}
      {fallback && <div className="fb"><span>{t('speakIn')}:</span>{FALLBACK.map((c) => <button key={c} type="button" className="btn ghost sm" onClick={() => pickLang(c)}>{nativeName(c)}</button>)}</div>}
      {err && <p className="err" role="alert">{err}</p>}
      {asking && msgs.length > 0 && (
        <form className="typed" onSubmit={sendTyped}>
          <input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={phase === 'review' ? t('typeYesNo') : t('typeAns')} aria-label={t('typeAns')} lang={lang} />
          <button className="btn" type="submit">{t('go')}</button>
        </form>
      )}
      {phase === 'ask' && tips.length > 0 && (
        <div className="tips"><b>💡 {t('tipsT')}</b>
          <ul>{tips.map((x, i) => <li key={i}>{x} <button type="button" className="re" onClick={() => speak(x, lang)} aria-label={t('replay')}>🔊</button></li>)}</ul></div>
      )}
      {phase === 'review' && review && (
        <ReviewSummary draft={d} review={review} who={who} canSave={review.canSave} busy={st === 'busy'} lang={lang} workerLang={workerLang}
          onYes={confirm} onEdit={startEdit} onSpeak={speak} />
      )}
      {phase === 'edit' && <ReviewForm draft={d} onChange={keep} onDone={() => enterReview(S.current.draft)} busy={st === 'busy'} />}
      {phase === 'saved' && !partner && (
        <div className="pitchcard">
          <b>{t('pitchReady')}</b>
          <p>{review?.pitch} <button type="button" className="re" onClick={() => speak(review?.pitch, lang)} aria-label={t('replay')}>🔊</button></p>
          {saved ? <span className="good">✓ {t('pitchSaved')}</span> : !user && <Link className="btn" to="/register?role=worker">{t('makeProfile')}</Link>}
        </div>
      )}
      {phase === 'saved' && jobs && (
        <div className="vac">
          <h3>{t('vacT')} {matched && `· ${jobs.length}`}</h3>
          {!matched && <p>{t('vacNone')}</p>}
          <button type="button" className="btn ghost sm" onClick={readJobs}>{reading ? '⏹' : '🔊'} {t('readJobs')}</button>
          {jobs.map((j) => <JobCard key={j._id} job={j} />)}
        </div>
      )}
    </div>
  );
}
