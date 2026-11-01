import { useEffect } from 'react';
import { useApp } from './ctx.jsx';
import { LANGS } from './langs.js';

export default function LangPicker() {
  const { lang, setLang, setPicker } = useApp();
  useEffect(() => { const f = (e) => e.key === 'Escape' && setPicker(false); addEventListener('keydown', f); return () => removeEventListener('keydown', f); }, [setPicker]);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Choose your language">
      <div className="sheet">
        <button className="x" onClick={() => setPicker(false)} aria-label="Close">✕</button>
        <h2>🌐 Choose your language · भाषा चुनें · ਭਾਸ਼ਾ ਚੁਣੋ</h2>
        <div className="lgrid">
          {LANGS.map(([c, n]) => <button key={c} className={c === lang ? 'on' : ''} onClick={() => setLang(c)} lang={c}>{n}</button>)}
        </div>
      </div>
    </div>
  );
}
