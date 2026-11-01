import { useEffect, useLayoutEffect, useState } from 'react';
import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { useApp } from './ctx.jsx';
import Home from './Home.jsx';
import Auth from './Auth.jsx';
import Scams from './Scams.jsx';
import LangPicker from './LangPicker.jsx';
import { LANGS } from './langs.js';
import { Jobs, Dashboard } from './Work.jsx';
import { PartnerPage } from './Partner.jsx';

function Header() {
  const { t, lang, setLang, user, signOut } = useApp();
  const [solid, setSolid] = useState(false), loc = useLocation(), home = loc.pathname === '/';
  useEffect(() => { const f = () => setSolid(scrollY > 40); f(); addEventListener('scroll', f, { passive: true }); return () => removeEventListener('scroll', f); }, []);
  const L = ({ to, k }) => <NavLink className={({ isActive }) => 'l' + (isActive ? ' on' : '')} to={to} end={to === '/'}>{t(k)}</NavLink>;
  return (
    <header className={solid ? 'solid' : home ? '' : 'solid2'}>
      <div className="wrap nav">
        <Link className="brand" to="/"><img src="/logo.png" alt="KaushalSetu" className="brand-logo" /><span>Kaushal<b>Setu</b></span></Link>
        <L to="/" k="home" /><L to="/jobs" k="jobs" /><L to="/scams" k="scams" />
        <div className="lang" role="group" aria-label="Language">
          {LANGS.map(([c, n]) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === lang}
              onClick={() => setLang(c)}
            >
              {n}
            </button>
          ))}
        </div>
        {user ? <><L to={user.role === 'partner' ? '/partner' : '/dashboard'} k="dash" /><button className="l" onClick={signOut}>{t('logout')}</button></>
          : <><Link className="l" to="/login">{t('signin')}</Link><Link className="l cta" to="/register">{t('join')}</Link></>}
      </div>
    </header>
  );
}

export default function App() {
  const { t, picker } = useApp(), loc = useLocation();
  useLayoutEffect(() => {
    scrollTo(0, 0);
    if (!matchMedia('(prefers-reduced-motion:reduce)').matches) gsap.fromTo('.pg', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
  }, [loc.pathname]);
  return (
    <>
      <Header />
      {picker && <LangPicker />}
      <main className="pg">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/scams" element={<Scams />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/partner" element={<PartnerPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <footer><div className="wrap"><div style={{ fontSize: 22, fontWeight: 700 }}>KaushalSetu</div><p>{t('tag')}</p><p>© 2026 KaushalSetu</p></div></footer>
    </>
  );
}
