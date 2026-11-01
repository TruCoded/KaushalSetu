import { useApp, Tr } from './ctx.jsx';
import { SKILLS } from './i18n.js';

// Same list as STATES in server/src/nlp.js (the server drops anything that is not on it).
export const STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Jammu and Kashmir', 'Ladakh'];
const TYPES = ['full-time', 'part-time', 'home-based'], SHIFTS = ['day', 'evening', 'night', 'any'];

// Read-only view of what the AI understood, with the three choices: save, change, hear it again.
export function ReviewSummary({ draft: d, review, who, canSave, busy, onYes, onEdit, onSpeak, workerLang, lang }) {
  const { t } = useApp();
  const work = [...d.skills.map((k) => t('sk_' + k)), ...(d.occupation ? [d.occupation] : [])];
  const rows = [
    ['pgSkills', work.length ? work.join(', ') : ''],
    ['specL', d.specialties.length ? d.specialties.map((x) => <span key={x} className="tag alt"><Tr>{x}</Tr></span>) : ''],
    ['exp', d.experienceYears === null ? '' : String(d.experienceYears)],
    ['wtype', d.workType ? t(d.workType) : d.workTypeAny ? t('anyType') : ''],
    ['shiftL', d.shift ? t('shift_' + d.shift) : ''],
    ['relocL', d.relocate === true ? t('yes') : d.relocate === false ? t('no') : ''],
    ['pgCity', [d.city, d.state].filter(Boolean).join(', ')]
  ];
  return (
    <div className="review" role="region" aria-label={t('reviewT')}>
      <h3>{who ? `${t('reviewFor')} ${who}` : t('reviewT')}</h3>
      <dl className="rows">
        {rows.map(([k, v]) => (
          <div key={k} className={v === '' ? 'empty' : ''}><dt>{t(k)}</dt><dd>{v === '' ? '—' : v}</dd></div>
        ))}
      </dl>
      {review?.pitch && <p className="rpitch">“{review.pitch}”</p>}
      <div className="rbtns">
        <button type="button" className="btn" onClick={onYes} disabled={busy || !canSave}>✓ {t('yesSave')}</button>
        <button type="button" className="btn ghost" onClick={onEdit} disabled={busy}>✎ {t('change')}</button>
        <button type="button" className="btn ghost" onClick={() => onSpeak(`${review?.readback || ''} ${review?.ask || ''}`, lang)} disabled={!review}>🔊 {t('readAgain')}</button>
        {who && review?.readbackWorker && workerLang !== lang && (
          <button type="button" className="btn ghost" onClick={() => onSpeak(review.readbackWorker, workerLang)}>🔊 {t('readToWorker')}</button>
        )}
      </div>
      {!canSave && <p className="err" role="alert">{t('needWork')}</p>}
      <p className="hint">{t('sayYesNo')}</p>
    </div>
  );
}

// Everything the interview collected, editable by tapping or typing. Used when the answer to "is this correct?" is no.
export function ReviewForm({ draft: d, onChange, onDone, busy }) {
  const { t, lang } = useApp();
  const set = (patch) => onChange({ ...d, ...patch });
  const toggleSkill = (k) => set({ skills: d.skills.includes(k) ? d.skills.filter((x) => x !== k) : [...d.skills, k] });
  return (
    <div className="review edit">
      <h3>{t('changeT')}</h3>
      <label>{t('skillsL')}</label>
      <div className="chipset">{SKILLS.map((k) => (
        <button type="button" key={k} className={d.skills.includes(k) ? 'on' : ''} aria-pressed={d.skills.includes(k)} onClick={() => toggleSkill(k)}>{t('sk_' + k)}</button>))}</div>
      <label htmlFor="rv-occ">{t('occL')}</label>
      <input id="rv-occ" value={d.occupation} maxLength={40} lang={lang} onChange={(e) => set({ occupation: e.target.value })} />
      {d.specialties.length > 0 && (
        <>
          <label>{t('specL')}</label>
          <div className="tags" style={{ marginBottom: 14 }}>{d.specialties.map((x) => (
            <button type="button" key={x} className="tag alt rm" onClick={() => set({ specialties: d.specialties.filter((y) => y !== x) })} aria-label={`${t('remove')} ${x}`}><Tr>{x}</Tr> ✕</button>))}</div>
        </>
      )}
      <div className="row">
        <div><label htmlFor="rv-exp">{t('exp')}</label>
          <input id="rv-exp" type="number" min="0" max="60" value={d.experienceYears ?? ''} onChange={(e) => set({ experienceYears: e.target.value === '' ? null : Math.max(0, Math.min(60, +e.target.value)) })} /></div>
        <div><label htmlFor="rv-wt">{t('wtype')}</label>
          <select id="rv-wt" value={d.workType} onChange={(e) => set({ workType: e.target.value, workTypeAny: false })}>
            <option value="">—</option>{TYPES.map((k) => <option key={k} value={k}>{t(k)}</option>)}</select></div>
      </div>
      <div className="row">
        <div><label htmlFor="rv-ci">{t('city')}</label><input id="rv-ci" value={d.city} maxLength={60} lang={lang} onChange={(e) => set({ city: e.target.value })} /></div>
        <div><label htmlFor="rv-st">{t('stateL')}</label>
          <select id="rv-st" value={d.state} onChange={(e) => set({ state: e.target.value })}><option value="">—</option>{STATES.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
      </div>
      <div className="row">
        <div><label htmlFor="rv-sh">{t('shiftL')}</label>
          <select id="rv-sh" value={d.shift} onChange={(e) => set({ shift: e.target.value })}><option value="">—</option>{SHIFTS.map((k) => <option key={k} value={k}>{t('shift_' + k)}</option>)}</select></div>
        <div><label htmlFor="rv-mv">{t('relocL')}</label>
          <select id="rv-mv" value={d.relocate === null ? '' : String(d.relocate)} onChange={(e) => set({ relocate: e.target.value === '' ? null : e.target.value === 'true' })}>
            <option value="">—</option><option value="true">{t('yes')}</option><option value="false">{t('no')}</option></select></div>
      </div>
      <button type="button" className="btn" onClick={onDone} disabled={busy}>{t('doneEdit')}</button>
    </div>
  );
}
