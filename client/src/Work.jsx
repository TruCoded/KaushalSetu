import { useEffect, useState, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useApp, Tr } from './ctx.jsx';
import { SKILLS } from './i18n.js';
import Pitch from './Pitch.jsx';
import PartnerDash from './Partner.jsx';
import { STATES } from './Review.jsx';
import JobCard from './JobCard.jsx';

export function Jobs() {
  const { t, api, user } = useApp();
  const [jobs, setJobs] = useState(null), [city, setCity] = useState(''), [type, setType] = useState('');
  useEffect(() => {
    const id = setTimeout(() => api(`/jobs?city=${encodeURIComponent(city)}&type=${type}`).then((r) => setJobs(r.jobs)).catch(() => setJobs([])), 250);
    return () => clearTimeout(id);
  }, [api, city, type, user]);
  return (
    <div className="wrap page">
      <h1>{t('jobsT')}</h1><p className="sub"> </p>
      <div className="filters">
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t('cityF')} aria-label={t('cityF')} />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label={t('allTypes')}>
          <option value="">{t('allTypes')}</option>{['full-time', 'part-time', 'home-based'].map((k) => <option key={k} value={k}>{t(k)}</option>)}
        </select>
      </div>
      {jobs?.length === 0 && <p>{t('noJobs')}</p>}
      {jobs?.map((j) => <JobCard key={j._id} job={j} />)}
    </div>
  );
}

const Chips = ({ value, onChange, t }) => (
  <div className="chipset">{SKILLS.map((k) => (
    <button type="button" key={k} className={value.includes(k) ? 'on' : ''} aria-pressed={value.includes(k)}
      onClick={() => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k])}>{t('sk_' + k)}</button>))}</div>
);

function WorkerDash() {
  const { t, api, user, setUser } = useApp();
  const [skills, setSkills] = useState(user.skills || []), [exp, setExp] = useState(user.experienceYears || 0);
  const [wt, setWt] = useState(user.workType || ''), [city, setCity] = useState(user.city || '');
  const [state, setState] = useState(user.state || ''), [shift, setShift] = useState(user.shift || ''), [mv, setMv] = useState(user.relocate ?? null);
  const [msg, setMsg] = useState(''), [list, setList] = useState([]);
  useEffect(() => { api('/applications/mine').then((r) => setList(r.applications)).catch(() => {}); }, [api]);
  // keep the form in step with the spoken pitch (which saves the profile), and adopt a pitch made before signing up
  useEffect(() => { setSkills(user.skills || []); setExp(user.experienceYears || 0); setWt(user.workType || ''); setCity(user.city || ''); setState(user.state || ''); setShift(user.shift || ''); setMv(user.relocate ?? null); }, [user]);
  useEffect(() => {
    try {
      const d = JSON.parse(sessionStorage.getItem('ks-draft'));
      // only a draft the person confirmed on the review screen is saved; half-finished ones are never adopted
      if (sessionStorage.getItem('ks-draft-ok') && (d?.skills?.length || d?.occupation) && !(user.skills || []).length && !user.occupation) {
        api('/auth/me', { method: 'PUT', body: { skills: d.skills, specialties: d.specialties, occupation: d.occupation, experienceYears: d.experienceYears ?? 0, workType: d.workType, city: d.city || user.city, state: d.state, shift: d.shift, relocate: d.relocate ?? null } })
          .then((r) => { setUser(r.user); sessionStorage.removeItem('ks-draft-ok'); }).catch(() => {});
      }
    } catch { /* no draft */ }
  }, []); // eslint-disable-line
  const save = async () => { try { const r = await api('/auth/me', { method: 'PUT', body: { skills, experienceYears: exp, workType: wt, city, state, shift, relocate: mv } }); setUser(r.user); setMsg(t('saved')); } catch (e) { setMsg(e.message); } };
  return (
    <>
      {!(user.skills || []).length && !user.occupation && (
        <div style={{ background: '#eaf4fd', border: '1px solid #c2defc', borderRadius: 10, padding: '14px 18px', marginBottom: 14 }}>
          <b style={{ color: 'var(--navy)', fontSize: 16 }}>{t('voiceProfileNow')}</b>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--muted)' }}>{t('voiceIntro')}</p>
        </div>
      )}
      <Pitch />
      <div className="box">
        <h3>{t('myProfile')}</h3>
        <label>{t('skillsL')}</label><Chips value={skills} onChange={setSkills} t={t} />
        {user.specialties?.length > 0 && <><label>{t('specL')}</label><div className="tags" style={{ marginBottom: 14 }}>{user.specialties.map((k) => <span className="tag alt" key={k}><Tr>{k}</Tr></span>)}</div></>}
        {user.occupation && <><label>{t('occL')}</label><p style={{ margin: '0 0 14px' }}>{user.occupation}</p></>}
        {user.pitch && <><label>{t('pitchL')}</label><p style={{ margin: '0 0 14px' }}><Tr>{user.pitch}</Tr></p></>}
        <div className="row">
          <div><label htmlFor="ex">{t('exp')}</label><input id="ex" type="number" min="0" max="60" value={exp} onChange={(e) => setExp(e.target.value)} /></div>
          <div><label htmlFor="ci">{t('city')}</label><input id="ci" value={city} onChange={(e) => setCity(e.target.value)} /></div>
        </div>
        <div className="row">
          <div><label htmlFor="wt">{t('wtype')}</label>
            <select id="wt" value={wt} onChange={(e) => setWt(e.target.value)}><option value="">—</option>{['full-time', 'part-time', 'home-based'].map((k) => <option key={k} value={k}>{t(k)}</option>)}</select></div>
          <div><label htmlFor="wst">{t('stateL')}</label>
            <select id="wst" value={state} onChange={(e) => setState(e.target.value)}><option value="">—</option>{STATES.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
        </div>
        <div className="row">
          <div><label htmlFor="wsh">{t('shiftL')}</label>
            <select id="wsh" value={shift} onChange={(e) => setShift(e.target.value)}><option value="">—</option>{['day', 'evening', 'night', 'any'].map((k) => <option key={k} value={k}>{t('shift_' + k)}</option>)}</select></div>
          <div><label htmlFor="wmv">{t('relocL')}</label>
            <select id="wmv" value={mv === null ? '' : String(mv)} onChange={(e) => setMv(e.target.value === '' ? null : e.target.value === 'true')}><option value="">—</option><option value="true">{t('yes')}</option><option value="false">{t('no')}</option></select></div>
        </div>
        <button className="btn" onClick={save}>{t('saveProfile')}</button>{msg && <span className="good"> {msg}</span>}
      </div>
      <div className="box"><h3>{t('myApps')}</h3>
        {!list.length && <p>{t('noApps')}</p>}
        {list.map((a) => (
          <p key={a._id}><b>{a.job.title}</b> · {a.job.employer?.company} · <span className={'st ' + a.status}>{t(a.status + '_s')}</span>
            {a.status === 'accepted' && a.job.employer?.phone && <> · <a className="link" href={'tel:' + a.job.employer.phone}>📞 {t('call')} {a.job.employer.phone}</a></>}</p>))}
        <Link className="link" to="/jobs">{t('jobsT')} →</Link>
      </div>
    </>
  );
}

const PERIODS = ['month', 'day', 'piece'];
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

const Cred = ({ w, t }) => (
  <span className={'cred ' + (w.level || 'new')} title={t('credTip')}>
    {w.ratingCount > 0 ? <>★ {w.ratingAvg} ({w.ratingCount})</> : t('credNew')} · {t('credL')} {w.credibility}
  </span>
);

// One worker in the pool, the applicants list or the shortlist. `status` is null, shortlisted, hired or completed.
function WorkerRow({ w, status, busy, onShortlist, onHire, onRemove, children }) {
  const { t } = useApp();
  const done = status === 'hired' || status === 'completed';
  return (
    <div className="wr">
      <div className="wr-main">
        <b>👤 {w.name}</b> · {w.city || '—'} · {w.experienceYears ?? 0}y
        {w.fit != null && <span className="mt">{w.fit}% {t('fitL')}</span>}
        {w.partnerRegistered && <span className="pb" title={t('partnerOf')}>🤝</span>}
        <div className="tags">
          {(w.skills || []).map((k) => <span className="tag" key={k}>{t('sk_' + k)}</span>)}
          {(w.specialties || []).slice(0, 3).map((k) => <span className="tag alt" key={k}><Tr>{k}</Tr></span>)}
        </div>
        <Cred w={w} t={t} />
        {w.phone && <> · <a className="link" href={'tel:' + w.phone}>📞 {w.phone}</a></>}
        {w.pitch && <><br /><small className="muted">“<Tr>{w.pitch}</Tr>”</small></>}
        {children}
      </div>
      <div className="acts">
        {status && <span className={'st hs ' + status}>{t('hs_' + status)}</span>}
        {!status && onShortlist && <button className="btn ghost sm" disabled={busy} onClick={onShortlist}>{t('shortlist')}</button>}
        {!done && onHire && <button className="btn sm" disabled={busy} onClick={onHire}>{t('hire')}</button>}
        {status === 'shortlisted' && onRemove && <button className="btn red sm" disabled={busy} onClick={onRemove}>{t('removeL')}</button>}
      </div>
    </div>
  );
}

function RateForm({ h, onSave }) {
  const { t } = useApp();
  const [n, setN] = useState(0), [fb, setFb] = useState(''), [showed, setShowed] = useState(true), [err, setErr] = useState('');
  const go = async () => { if (!n) return setErr(t('needRating')); setErr(''); try { await onSave(h._id, { rating: n, feedback: fb, showedUp: showed }); } catch (e) { setErr(e.message); } };
  return (
    <div className="rate">
      <b>{t('rateT')}</b>
      <div className="stars" role="radiogroup" aria-label={t('rateT')}>
        {[1, 2, 3, 4, 5].map((k) => <button type="button" key={k} role="radio" aria-checked={n === k} aria-label={k + '/5'} className={k <= n ? 'on' : ''} onClick={() => setN(k)}>★</button>)}
      </div>
      <label className="chk"><input type="checkbox" checked={showed} onChange={(e) => setShowed(e.target.checked)} /> {t('showedL')}</label>
      <input value={fb} maxLength={300} onChange={(e) => setFb(e.target.value)} placeholder={t('feedbackL')} aria-label={t('feedbackL')} />
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn sm" onClick={go}>{t('rateBtn')}</button>
    </div>
  );
}

function EmployerDash() {
  const { t, api, user } = useApp();
  const blank = { title: '', description: '', type: 'full-time', city: user.city || '', positions: 1, minExperience: 0, salaryMin: '', salaryMax: '', salaryPeriod: 'month' };
  const [f, setF] = useState(blank), [skills, setSkills] = useState([]), [jobs, setJobs] = useState([]), [err, setErr] = useState('');
  const [panel, setPanel] = useState(null);            // { id, tab: 'pool' | 'team' | 'applicants' }
  const [pool, setPool] = useState(null), [team, setTeam] = useState(null), [ap, setAp] = useState([]);
  const [busy, setBusy] = useState(false), [note, setNote] = useState('');

  const load = useCallback(() => api('/jobs/mine').then((r) => setJobs(r.jobs)).catch(() => {}), [api]);
  useEffect(() => { load(); }, [load]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const fetchTab = useCallback(async (id, tab) => {
    if (tab === 'pool') setPool((await api(`/workers/match?job=${id}&limit=50`)));
    if (tab === 'team') setTeam(await api(`/hires?job=${id}`));
    if (tab === 'applicants') setAp((await api(`/jobs/${id}/applicants`)).applicants);
  }, [api]);
  const openTab = async (id, tab) => {
    if (panel?.id === id && panel.tab === tab) return setPanel(null);
    setNote(''); setPool(null); setTeam(null); setPanel({ id, tab });
    try { await fetchTab(id, tab); } catch (e) { setNote(e.message); }
  };
  const refresh = async () => { await Promise.all([load(), panel && fetchTab(panel.id, panel.tab)]); };
  const run = async (fn) => { setBusy(true); setNote(''); try { await fn(); await refresh(); } catch (e) { setNote(e.message); } finally { setBusy(false); } };

  const post = async (e) => {
    e.preventDefault(); setErr('');
    if (!skills.length) return setErr(t('needSkill'));
    try {
      const { job } = await api('/jobs', { method: 'POST', body: { ...f, skills } });
      setF({ ...blank, city: f.city, type: f.type }); setSkills([]); await load(); openTab(job._id, 'pool');
    } catch (x) { setErr(x.message); }
  };
  const hire = (jobId, w, action) => run(async () => {
    if (action === 'hire' && !window.confirm(t('confirmHire') + (pool?.feeEstimate ? ` (${t('feeL')} ≈ ${inr(pool.feeEstimate)})` : ''))) return;
    await api('/hires', { method: 'POST', body: { job: jobId, worker: w._id, action } });
  });
  const bulk = (jobId, ids, action, confirmKey) => run(async () => {
    if (!ids.length || (confirmKey && !window.confirm(t(confirmKey)))) return;
    const r = await api('/hires/bulk', { method: 'POST', body: { job: jobId, workers: ids, action } });
    if (r.failed.length) setNote(`${t('someFailed')} ${r.failed.length}: ${r.failed[0].error}`);
  });
  const remove = (hireId) => run(() => api('/hires/' + hireId, { method: 'DELETE' }));
  const rate = async (hireId, body) => { await api(`/hires/${hireId}/rate`, { method: 'PATCH', body }); await refresh(); };
  const decide = async (id, status) => { await api('/applications/' + id, { method: 'PATCH', body: { status } }); setAp(ap.map((a) => (a._id === id ? { ...a, status } : a))); };
  const close = (id) => run(() => api(`/jobs/${id}/close`, { method: 'PATCH' }));

  const tab = (j, k, label) => <button className={'btn sm ' + (panel?.id === j._id && panel.tab === k ? '' : 'ghost')} onClick={() => openTab(j._id, k)}>{label}</button>;

  return (
    <>
      <form className="box" onSubmit={post}>
        <h3>{t('reqT')}</h3><p className="muted" style={{ marginTop: -6 }}>{t('reqHint')}</p>
        <label>{t('reqSkills')}</label><Chips value={skills} onChange={setSkills} t={t} />
        <div className="row">
          <div><label htmlFor="jn">{t('positions')}</label><input id="jn" type="number" min="1" max="10000" value={f.positions} onChange={set('positions')} /></div>
          <div><label htmlFor="jm">{t('minExp')}</label><input id="jm" type="number" min="0" max="60" value={f.minExperience} onChange={set('minExperience')} /></div>
        </div>
        <div className="row">
          <div><label htmlFor="jc">{t('reqLoc')}</label><input id="jc" required value={f.city} onChange={set('city')} /></div>
          <div><label htmlFor="jy">{t('wtype')}</label>
            <select id="jy" value={f.type} onChange={set('type')}>{['full-time', 'part-time', 'home-based'].map((k) => <option key={k} value={k}>{t(k)}</option>)}</select></div>
        </div>
        <div className="row3">
          <div><label htmlFor="sa">{t('salMin')}</label><input id="sa" type="number" min="0" inputMode="numeric" value={f.salaryMin} onChange={set('salaryMin')} /></div>
          <div><label htmlFor="sb">{t('salMax')}</label><input id="sb" type="number" min="0" inputMode="numeric" value={f.salaryMax} onChange={set('salaryMax')} /></div>
          <div><label htmlFor="sp">{t('salPer')}</label>
            <select id="sp" value={f.salaryPeriod} onChange={set('salaryPeriod')}>{PERIODS.map((k) => <option key={k} value={k}>{t('per_' + k)}</option>)}</select></div>
        </div>
        <label htmlFor="jt">{t('reqTitle')}</label><input id="jt" value={f.title} onChange={set('title')} />
        <label htmlFor="jd">{t('reqDetails')}</label><textarea id="jd" value={f.description} onChange={set('description')} />
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn" type="submit">{t('reqPublish')}</button>
      </form>

      <div className="box"><h3>{t('myReqs')}</h3>
        {note && <p className="err" role="alert">{note}</p>}
        {jobs.map((j) => {
          const left = Math.max(0, (j.positions || 1) - (j.filled || 0)), isOpen = panel?.id === j._id;
          return (
            <div key={j._id} className="req">
              <b><Tr>{j.title}</Tr></b> · {j.city} · {t(j.type)}{j.pay && <> · <Tr>{j.pay}</Tr></>}{j.minExperience > 0 && <> · {j.minExperience}y+</>}
              <div className="tags" style={{ margin: '6px 0' }}>{j.skills.map((k) => <span className="tag" key={k}>{t('sk_' + k)}</span>)}</div>
              <div className="meta">👥 {j.filled || 0}/{j.positions} {t('filledOf')} · {j.shortlisted || 0} {t('shortlistedN')}{j.status === 'closed' && <> · 🔒 {t('closedL')}</>}</div>
              <div className="btns">
                {tab(j, 'pool', t('findW'))}{tab(j, 'team', t('teamT'))}{tab(j, 'applicants', `${j.applicants} ${t('applicants')}`)}
                {j.status === 'open' && <button className="btn red sm" onClick={() => close(j._id)}>{t('closeJob')}</button>}
              </div>

              {isOpen && panel.tab === 'pool' && pool && (
                <div className="panel">
                  <h4>{t('poolT')}: {pool.total} {t('poolCount')} {j.status === 'open' && <small className="muted">· {left} {t('openSlots')}</small>}</h4>
                  <p className="muted">{t('poolNote')}</p>
                  {j.status === 'open' && pool.workers.some((w) => !w.hire) &&
                    <button className="btn ghost sm" disabled={busy} onClick={() => bulk(j._id, pool.workers.filter((w) => !w.hire).slice(0, 10).map((w) => w._id), 'shortlist')}>{t('top10')}</button>}
                  {pool.workers.length === 0 && <p>{t('noPool')}</p>}
                  {pool.workers.map((w) => (
                    <WorkerRow key={w._id} w={w} status={w.hire} busy={busy || j.status !== 'open'}
                      onShortlist={() => hire(j._id, w, 'shortlist')} onHire={() => hire(j._id, w, 'hire')} />))}
                </div>)}

              {isOpen && panel.tab === 'team' && team && (
                <div className="panel">
                  <h4>{t('teamT')} <small className="muted">· {t('feeTotal')}: {inr(team.totals.fee)}</small></h4>
                  {team.hires.some((h) => h.status === 'shortlisted') && j.status === 'open' &&
                    <button className="btn sm" disabled={busy} onClick={() => bulk(j._id, team.hires.filter((h) => h.status === 'shortlisted').map((h) => h.worker._id), 'hire', 'confirmHireAll')}>{t('hireAll')}</button>}
                  {team.hires.length === 0 && <p>{t('noTeam')}</p>}
                  {team.hires.map((h) => (
                    <WorkerRow key={h._id} w={h.worker} status={h.status} busy={busy || j.status !== 'open'}
                      onHire={() => hire(j._id, h.worker, 'hire')} onRemove={() => remove(h._id)}>
                      {h.status !== 'shortlisted' && <><br /><small className="muted">{t('feeL')}: {inr(h.fee)}</small></>}
                      {h.status === 'hired' && <RateForm h={h} onSave={rate} />}
                      {h.status === 'completed' && <p className="muted" style={{ margin: '6px 0 0' }}>{t('ratedL')}: <span className="starline">{'★'.repeat(h.rating)}{'☆'.repeat(5 - h.rating)}</span>{h.feedback && <> · <Tr>{h.feedback}</Tr></>}{h.showedUp === false && ' · ⚠'}</p>}
                    </WorkerRow>))}
                </div>)}

              {isOpen && panel.tab === 'applicants' && (
                <div className="panel">
                  {ap.length === 0 && <p>{t('noApplicants')}</p>}
                  {ap.map((a) => (
                    <WorkerRow key={a._id} w={a.worker} status={a.hire} busy={busy || j.status !== 'open'}
                      onShortlist={() => hire(j._id, a.worker, 'shortlist')} onHire={() => hire(j._id, a.worker, 'hire')}>
                      {' '}· <span className={'st ' + a.status}>{t(a.status + '_s')}</span>{' '}
                      {a.status === 'applied' && <button className="btn red sm" onClick={() => decide(a._id, 'rejected')}>{t('reject')}</button>}
                    </WorkerRow>))}
                </div>)}
            </div>);
        })}
      </div>
    </>
  );
}

export function Dashboard() {
  const { user, ready, t } = useApp();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/scams" replace />;
  return (
    <div className="wrap page">
      <h1>{user.role === 'worker' ? '🙏 ' : user.role === 'partner' ? '🤝 ' : '🏢 '}{user.name}{user.company ? ' · ' + user.company : ''}</h1><p className="sub">{t('dash')}</p>
      {user.role === 'worker' ? <WorkerDash /> : user.role === 'partner' ? <PartnerDash /> : <EmployerDash />}
    </div>
  );
}
