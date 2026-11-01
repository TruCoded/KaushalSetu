import { useEffect, useState } from 'react';
import { useApp, Tr } from './ctx.jsx';

export default function Scams() {
  const { t, api, user } = useApp();
  const [list, setList] = useState([]), [kind, setKind] = useState('fee'), [desc, setDesc] = useState(''), [city, setCity] = useState(''), [msg, setMsg] = useState(''), [err, setErr] = useState('');
  const load = () => api('/scams').then((r) => setList(r.scams)).catch(() => {});
  useEffect(() => { load(); }, [user]); // eslint-disable-line
  const send = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    try { await api('/scams', { method: 'POST', body: { kind, description: desc, city } }); setDesc(''); setMsg(t('thanks')); load(); } catch (x) { setErr(x.message); }
  };
  const confirm = async (id) => { try { await api(`/scams/${id}/confirm`, { method: 'POST' }); load(); } catch (x) { setErr(x.message); } };
  const mod = async (id, status) => { await api('/scams/' + id, { method: 'PATCH', body: { status } }); load(); };
  return (
    <div className="wrap page">
      <h1>🛡️ {t('scamT')}</h1><p className="sub"> </p>
      <div className="scam">
        <form className="box" onSubmit={send}>
          <label htmlFor="k">{t('sType')}</label>
          <select id="k" value={kind} onChange={(e) => setKind(e.target.value)}>{['fee', 'fakejob', 'documents', 'other'].map((k) => <option key={k} value={k}>{t('k_' + k)}</option>)}</select>
          <label htmlFor="c">{t('city')}</label><input id="c" value={city} onChange={(e) => setCity(e.target.value)} />
          <label htmlFor="d">{t('sWhat')}</label><textarea id="d" required minLength={10} value={desc} onChange={(e) => setDesc(e.target.value)} />
          {err && <p className="err" role="alert">{err}</p>}
          <button className="btn" type="submit">{t('sSend')}</button>{msg && <p className="good" role="status">{msg}</p>}
        </form>
        <div className="box feed"><h3>{t('feedT')}</h3>
          <ul>{list.map((s) => (
            <li key={s._id}>
              <span className="badge" style={s.status === 'verified' ? {} : { background: '#8a94ad' }}>{s.status === 'verified' ? '!' : '?'}</span>
              <b>{t('k_' + s.kind)}</b>{s.city && ' · ' + s.city} <span className="st">{t(s.status + '_s')}</span>
              <div><Tr>{s.description}</Tr></div>
              <small style={{ color: 'var(--muted)' }}>{s.confirmations} {t('people')}</small>{' '}
              {user && (s.confirmed ? <small>✓ {t('confirmedL')}</small> : <button className="btn ghost sm" onClick={() => confirm(s._id)}>{t('confirm')}</button>)}
              {user?.role === 'admin' && <> <button className="btn sm" onClick={() => mod(s._id, 'verified')}>{t('verify')}</button> <button className="btn red sm" onClick={() => mod(s._id, 'rejected')}>{t('rejectS')}</button></>}
            </li>))}</ul>
        </div>
      </div>
    </div>
  );
}
