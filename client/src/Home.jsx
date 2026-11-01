import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useApp } from './ctx.jsx';
import Pitch from './Pitch.jsx';
import JobCard from './JobCard.jsx';
gsap.registerPlugin(ScrollTrigger);

const Icon = ({ d }) => <svg viewBox="0 0 48 48"><path d={d} /></svg>;
const MIC = 'M18 11a6 6 0 0112 0v10a6 6 0 01-12 0zM11 22a13 13 0 0026 0M24 35v8';

export default function Home() {
  const { t, api } = useApp();
  const root = useRef(), [jobs, setJobs] = useState([]);
  useEffect(() => { api('/jobs?limit=3').then((r) => setJobs(r.jobs.slice(0, 3))).catch(() => {}); }, [api]);
  useLayoutEffect(() => {
    if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    const c = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power2.out' } })
        .from('.hero h1,.hero p,.hero .btn', { y: 26, opacity: 0, duration: 0.7, stagger: 0.14 }, 0.1)
        .from('.phone', { y: 70, opacity: 0, rotate: 4, duration: 0.9 }, 0.3)
        .from('.fl', { scale: 0.6, opacity: 0, duration: 0.5, stagger: 0.2, ease: 'back.out(1.8)' }, 0.9)
        .from('.cards .card', { y: 60, opacity: 0, duration: 0.7, stagger: 0.15 }, '-=.4');
      gsap.to('.wave i', { scaleY: () => gsap.utils.random(0.25, 1), duration: 0.35, repeat: -1, yoyo: true, repeatRefresh: true, stagger: 0.05 });
      gsap.to('.fl', { y: -8, duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 0.4 });
      gsap.from('.pstep', { y: 36, opacity: 0, duration: 0.6, stagger: 0.15, scrollTrigger: { trigger: '.psteps', start: 'top 85%' } });
      gsap.utils.toArray('.rv').forEach((el) => gsap.from(el, { y: 40, opacity: 0, duration: 0.7, scrollTrigger: { trigger: el, start: 'top 88%' } }));
    }, root);
    return () => c.revert();
  }, []);
  return (
    <div ref={root}>
      <div className="hero">
        <div className="wrap hg">
          <div><h1>{t('h1')}</h1><p>{t('sub')}</p>
            <Link className="btn" to="/register?role=worker">{t('findWork')}</Link>
            <Link className="btn o" to="/register?role=employer">{t('postJob')}</Link></div>
          <div className="pw" aria-hidden="true">
            <div className="phone"><div className="pt">KaushalSetu</div><div className="pq">अपनी जानकारी बताइए</div>
              <div className="pm"><Icon d={MIC} /></div>
              <div className="wave">{[...Array(9)].map((_, i) => <i key={i} />)}</div>
              <div className="chips"><span>हिंदी</span><span>English</span><span>ਪੰਜਾਬੀ</span></div><div className="pbtn">Tap to Speak</div></div>
            <div className="fl f1"><em>🧵</em><span><b>Tailoring Work</b><small>Near you · 2 km</small></span></div>
            <div className="fl f2"><em>✅</em><span><b>Verified Worker</b><small>Chandigarh</small></span></div>
            <div className="fl f3"><em>👗</em><span><b>Boutique Stitching</b><small>1.5 km away</small></span></div>
          </div>
        </div>
      </div>
      <div className="wrap">
        <div className="cards">
          <article className="card"><div className="ic"><Icon d={MIC} /></div><h3>{t('c1t')}</h3><p>{t('c1d')}</p><a className="btn" href="#speak">{t('more')}</a></article>
          <article className="card"><div className="ic"><Icon d="M24 4l16 6v12c0 11-7 18-16 22C15 40 8 33 8 22V10zM16 24l6 6 11-12" /></div><h3>{t('c2t')}</h3><p>{t('c2d')}</p><Link className="btn" to="/jobs">{t('more')}</Link></article>
          <article className="card"><div className="ic"><Icon d="M24 6L4 42h40zM24 20v10M24 35v1" /></div><h3>{t('c3t')}</h3><p>{t('c3d')}</p><Link className="btn" to="/scams">{t('more')}</Link></article>
        </div>
        <section className="rv"><h2>{t('focusT')}</h2>
          <div className="focus">
            {[['f1', 'M20 6a14 14 0 100 28 14 14 0 000-28zM20 13a7 7 0 100 14 7 7 0 000-14zM20 20l12-12', '#speak'],
              ['f2', 'M20 36s12-11 12-20a12 12 0 00-24 0c0 9 12 20 12 20zM20 12a4 4 0 100 8 4 4 0 000-8z', '/jobs'],
              ['f3', 'M14 28c-4-3-6-6-6-10a12 12 0 0124 0c0 4-2 7-6 10v4H14zM15 36h10', '/jobs'],
              ['f4', 'M9 17h22v16H9zM13 17v-4a7 7 0 0114 0v4', '/scams']].map(([k, d, to]) => (
              <div key={k}><svg viewBox="0 0 40 40"><path d={d} /></svg><h3>{t(k + 't')}</h3><p>{t(k + 'd')}</p>
                {to.startsWith('#') ? <a className="mini" href={to}>{t('more')}</a> : <Link className="mini" to={to}>{t('more')}</Link>}</div>))}
          </div>
        </section>
        <section className="rv partners"><h2>{t('lpPtT')}</h2><p className="psub">{t('lpPtS')}</p>
          <div className="psteps">
            {[['1', '🎤'], ['2', '🔎'], ['3', '₹']].map(([n, e]) => (
              <div className="pstep" key={n}><span className="pe" aria-hidden="true">{e}</span><h3>{t('lpP' + n + 'T')}</h3><p>{t('lpP' + n + 'D')}</p></div>))}
          </div>
          <div className="pfeat">
            <div><b>👥 {t('lpBulkT')}</b><p>{t('lpBulkD')}</p></div>
            <div><b>⭐ {t('lpRateT')}</b><p>{t('lpRateD')}</p></div>
          </div>
          <p style={{ textAlign: 'center' }}><Link className="btn" to="/register?role=partner">{t('lpPtCta')} →</Link></p>
        </section>
        <section id="speak" className="rv"><h2>{t('speakT')}</h2>
          <Pitch />
        </section>
      </div>
      <div className="dark rv"><div className="wrap"><h2>{t('recentT')}</h2>
        {jobs.map((j) => <JobCard key={j._id} job={j} />)}
        <p style={{ textAlign: 'center' }}><Link className="btn o" style={{ margin: 0 }} to="/jobs">{t('allJobs')}</Link></p>
      </div></div>
    </div>
  );
}
