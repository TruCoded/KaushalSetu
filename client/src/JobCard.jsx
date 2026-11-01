import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, Tr } from './ctx.jsx';

export default function JobCard({ job, onApplied }) {
  const { t, user, api, say, lang, stopSpeaking } = useApp();
  const [err, setErr] = useState(''), [done, setDone] = useState(job.applied);
  const [playing, setPlaying] = useState(false);
  const apply = async () => { try { await api(`/jobs/${job._id}/apply`, { method: 'POST' }); setDone(true); onApplied?.(); } catch (e) { setErr(e.message); } };
  const e = job.employer || {};
  const readOut = async () => {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    try {
      const pay = job.pay ? job.pay.replace(/₹/g, 'Rupees ') : '';
      await say(`${job.title}. ${e.company || ''}. ${job.city}. ${pay}. ${job.positions > 1 ? job.positions + ' workers needed.' : ''}`);
    } finally {
      setPlaying(false);
    }
  };
  return (
    <article className="jc">
      <div>
        <h3><Tr>{job.title}</Tr>{job.match > 0 && <span className="mt">{job.match} {t('match')}</span>}</h3>
        <p className="meta">{e.company || e.name} <span className={'vb' + (e.verified ? '' : ' no')}>{e.verified ? '✓ ' + t('verified') : t('unverified')}</span><br />
          📍 <Tr>{job.city}</Tr> · {t(job.type)}{job.pay && <> · <Tr>{job.pay}</Tr></>}{job.positions > 1 && <> · 👥 {job.positions}</>}</p>
        {job.description && <p className="meta"><Tr>{job.description}</Tr></p>}
        <div className="tags">{job.skills.map((k) => <span className="tag" key={k}>{t('sk_' + k)}</span>)}{(job.specialties || []).slice(0, 3).map((k) => <span className="tag alt" key={k}><Tr>{k}</Tr></span>)}</div>
        {err && <p className="err">{err}</p>}
      </div>
      <div className="acts">
        <button className={'btn ghost sm' + (playing ? ' on' : '')} onClick={readOut} data-lang={lang} aria-pressed={playing}>
          {playing ? '⏹ Stop' : `🔊 ${t('listen')}`}
        </button>
        {user?.role === 'worker'
          ? <button className="btn sm" disabled={done} onClick={apply}>{done ? '✓ ' + t('applied') : t('apply')}</button>
          : !user && <Link className="btn sm" to="/register?role=worker">{t('apply')}</Link>}
      </div>
    </article>
  );
}
