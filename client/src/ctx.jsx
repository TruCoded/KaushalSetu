import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { L } from './i18n.js';
import { RTL, speechCode, baseCode, known } from './langs.js';

const C = createContext();
export const useApp = () => useContext(C);
const EN = L.en;
const store = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ } }
};

// ---- translation (server proxies Google's unofficial gtx endpoint) ----
export async function xlate(texts, tl, sl = 'auto') {
  if (!texts.length) return [];
  try {
    const r = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tl, sl, texts }) });
    const j = await r.json();
    return r.ok && Array.isArray(j.texts) ? j.texts : texts;
  } catch { return texts; }
}
const memo = new Map(), queue = [];
let timer = null;
async function flush() {
  const jobs = queue.splice(0); timer = null;
  const byLang = {};
  jobs.forEach((j) => ((byLang[j.tl] ||= {})[j.text] ||= []).push(j));
  for (const [tl, texts] of Object.entries(byLang)) {
    const list = Object.keys(texts);
    for (let i = 0; i < list.length; i += 40) {
      const part = list.slice(i, i + 40), out = await xlate(part, tl);
      part.forEach((t, n) => { memo.set(tl + '|' + t, out[n]); texts[t].forEach((j) => j.res(out[n])); });
    }
  }
}
export function translate(text, tl) {
  const key = tl + '|' + text;
  if (memo.has(key)) return Promise.resolve(memo.get(key));
  return new Promise((res) => { queue.push({ text, tl, res }); if (!timer) timer = setTimeout(flush, 40); });
}
// Translates any user-written text (job titles, descriptions, pitches, scam reports) into the language on screen.
export function Tr({ children }) {
  const { lang } = useApp();
  const text = String(children ?? '');
  const [out, setOut] = useState(() => memo.get(lang + '|' + text) ?? text);
  useEffect(() => {
    let dead = false;
    if (!text.trim() || (lang === 'en' && /^[\x00-\x7F]*$/.test(text))) { setOut(text); return; }
    translate(text, lang).then((o) => { if (!dead) setOut(o || text); });
    return () => { dead = true; };
  }, [text, lang]);
  return <>{out}</>;
}

// ---- speech output: browser voice if one exists for the language, otherwise Google's voice through our server ----
const chunks = (s, n = 180) => {
  const out = []; let cur = '';
  for (const part of s.split(/(?<=[.!?।،。])\s+/)) {
    if ((cur + ' ' + part).length > n && cur) { out.push(cur); cur = part; } else cur = (cur + ' ' + part).trim();
    while (cur.length > n) { out.push(cur.slice(0, n)); cur = cur.slice(n); }
  }
  if (cur) out.push(cur);
  return out;
};
let cachedVoices = [];
function updateVoices() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const v = window.speechSynthesis.getVoices();
    if (v && v.length) cachedVoices = v;
  }
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  updateVoices();
  window.speechSynthesis.onvoiceschanged = updateVoices;
}

function pickVoice(code) {
  if (!('speechSynthesis' in window)) return null;
  updateVoices();
  const vs = cachedVoices.length ? cachedVoices : speechSynthesis.getVoices(), c = code.toLowerCase(), b = baseCode(c);
  if (!vs.length) return null;
  return vs.find((v) => v.lang.replace('_', '-').toLowerCase() === c)
    || vs.find((v) => v.lang.toLowerCase().startsWith(b + '-') || v.lang.toLowerCase() === b)
    || (b === 'en' ? (vs.find((v) => v.lang.toLowerCase().startsWith('en')) || vs.find((v) => v.default) || vs[0]) : null)
    || null;
}

export function Provider({ children }) {
  const [lang, setLangState] = useState(() => {
    const v2 = localStorage.getItem('ks-lang-v2');
    if (!v2) {
      localStorage.setItem('ks-lang-v2', '1');
      localStorage.setItem('ks-lang', 'pa');
      return 'pa';
    }
    const saved = localStorage.getItem('ks-lang');
    return known(saved) ? saved : 'pa';
  });
  const [picker, setPicker] = useState(() => !localStorage.getItem('ks-lang'));
  const [dict, setDict] = useState({});
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const cur = useRef(null);
  const t = (k) => L[lang]?.[k] ?? dict[k] ?? EN[k] ?? k;
  const setLang = (c) => { localStorage.setItem('ks-lang', c); setLangState(c); setPicker(false); };

  const api = useCallback(async (path, { method = 'GET', body } = {}) => {
    const tok = localStorage.getItem('ks-token');
    const r = await fetch('/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(tok && { Authorization: 'Bearer ' + tok }) }, body: body && JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || 'Something went wrong'), { status: r.status });
    return j;
  }, []);

  // Screen text: hand-written Hindi / Punjabi / English; everything else is translated once and cached on the device.
  useEffect(() => {
    document.documentElement.lang = lang; document.documentElement.dir = RTL.has(lang) ? 'rtl' : 'ltr';
    let dead = false;
    const own = L[lang] || {}, cache = store.get('ks-ui-' + lang) || {}, have = {}, todo = [];
    if (lang !== 'en') for (const k of Object.keys(EN)) { if (own[k]) continue; const c = cache[k]; if (c && c.s === EN[k]) have[k] = c.o; else todo.push(k); }
    setDict(have);
    (async () => {
      for (let i = 0; i < todo.length && !dead; i += 40) {
        const part = todo.slice(i, i + 40), out = await xlate(part.map((k) => EN[k]), lang, 'en');
        if (dead) return;
        part.forEach((k, n) => { if (out[n] && out[n] !== EN[k]) { have[k] = out[n]; cache[k] = { s: EN[k], o: out[n] }; } });
        setDict({ ...have }); store.set('ks-ui-' + lang, cache);
      }
    })();
    return () => { dead = true; };
  }, [lang]);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      speechSynthesis.getVoices();
      speechSynthesis.onvoiceschanged = () => {
        try { speechSynthesis.getVoices(); } catch {}
      };
    }
    (async () => {
      if (localStorage.getItem('ks-token')) { try { setUser((await api('/auth/me')).user); } catch { localStorage.removeItem('ks-token'); } }
      setReady(true);
    })();
  }, [api]);

  const signIn = ({ token, user }) => { localStorage.setItem('ks-token', token); setUser(user); };
  const signOut = () => { localStorage.removeItem('ks-token'); setUser(null); };

  const stopSpeaking = useCallback(() => { cur.current?.stop(); cur.current = null; }, []);
  // speak(text, language) -> resolves when finished (or if speech is impossible)
  const speak = useCallback((text, tl = lang) => new Promise((resolve) => {
    stopSpeaking();
    const clean = String(text || '').replace(/₹/g, ' Rupees ').replace(/\s+/g, ' ').trim();
    if (!clean) return resolve();

    const parts = chunks(clean);
    let i = 0, stopped = false, audio = null;

    const fallbackSpeech = (rest) => {
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.resume();
          const u = new SpeechSynthesisUtterance(rest);
          u.lang = baseCode(speechCode(tl)) === 'en' ? 'en-US' : speechCode(tl);
          u.onend = u.onerror = () => resolve();
          window.speechSynthesis.speak(u);
          return;
        }
      } catch {}
      resolve();
    };

    const next = () => {
      if (stopped || i >= parts.length) return resolve();
      const part = parts[i++];
      const url = `/api/voice/tts?tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(part)}`;
      audio = new Audio(url);
      audio.onended = next;
      audio.onerror = (e) => {
        console.warn('[KaushalSetu Audio Error]', e);
        fallbackSpeech([part, ...parts.slice(i)].join(' '));
      };
      audio.play().catch((err) => {
        console.warn('[KaushalSetu Audio play() rejected]', err);
        fallbackSpeech([part, ...parts.slice(i)].join(' '));
      });
    };

    cur.current = {
      stop: () => {
        stopped = true;
        if (audio) {
          try { audio.pause(); audio.currentTime = 0; } catch {}
        }
        try { window.speechSynthesis?.cancel(); } catch {}
        resolve();
      }
    };

    next();
  }), [lang, stopSpeaking]);

  // Translate English text to the screen language and read it aloud
  const say = useCallback(async (english, tl = lang) => { const [x] = tl === 'en' ? [english] : await translate(english, tl).then((o) => [o]); return speak(x, tl); }, [lang, speak]);

  return <C.Provider value={{ lang, setLang, picker, setPicker, t, api, user, setUser, signIn, signOut, ready, speak, say, stopSpeaking }}>{children}</C.Provider>;
}
