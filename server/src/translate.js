// Translation through Google's unofficial "gtx" endpoint (no API key). It can change or rate-limit without notice,
// so every call fails soft (returns the original text) and results are cached in memory and in MongoDB.
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Translation } from './models.js';

const BASE = 'https://translate.googleapis.com/translate_a/single';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const mem = new Map();
const MAX_MEM = 30000;
export const LANG_RE = /^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$/;
const k = (sl, tl, t) => crypto.createHash('sha1').update(`${sl}|${tl}|${t}`).digest('hex');
const dbReady = () => mongoose.connection.readyState === 1;
const clean = (t) => String(t ?? '').replace(/\s*\n+\s*/g, ' ').trim();

const DICT = {
  pa: {
    'Welcome! Which work do you do? For example tailoring, cooking, driving, farming or construction.': 'ਜੀ ਆਇਆਂ ਨੂੰ! ਤੁਸੀਂ ਕਿਹੜਾ ਕੰਮ ਕਰਦੇ ਹੋ? ਜਿਵੇਂ ਸਿਲਾਈ, ਖਾਣਾ ਬਣਾਉਣਾ, ਗੱਡੀ ਚਲਾਉਣਾ, ਖੇਤੀ ਜਾਂ ਉਸਾਰੀ ਦਾ ਕੰਮ।',
    'Which work do you do? For example tailoring, cooking, driving, farming or construction.': 'ਤੁਸੀਂ ਕਿਹੜਾ ਕੰਮ ਕਰਦੇ ਹੋ? ਜਿਵੇਂ ਸਿਲਾਈ, ਖਾਣਾ ਬਣਾਉਣਾ, ਗੱਡੀ ਚਲਾਉਣਾ, ਖੇਤੀ ਜਾਂ ਉਸਾਰੀ ਦਾ ਕੰਮ।',
    'Mention if you can join work immediately.': 'ਦੱਸੋ ਜੇਕਰ ਤੁਸੀਂ ਤੁਰੰਤ ਕੰਮ ਸ਼ੁਰੂ ਕਰ ਸਕਦੇ ਹੋ।',
    'Say about any earlier shop, factory or house where you worked.': 'ਪਹਿਲਾਂ ਜਿਸ ਦੁਕਾਨ, ਫੈਕਟਰੀ ਜਾਂ ਘਰ ਵਿੱਚ ਕੰਮ ਕੀਤਾ ਹੈ, ਉਸ ਬਾਰੇ ਦੱਸੋ।',
    'Say whether you have your own sewing machine.': 'ਦੱਸੋ ਕਿ ਕੀ ਤੁਹਾਡੇ ਕੋਲ ਆਪਣੀ ਸਿਲਾਈ ਮਸ਼ੀਨ ਹੈ।',
    'Say if you can take bulk orders, for example 100 pieces.': 'ਦੱਸੋ ਜੇਕਰ ਤੁਸੀਂ ਥੋਕ ਆਰਡਰ ਲੈ ਸਕਦੇ ਹੋ, ਜਿਵੇਂ 100 ਪੀਸ।',
    'Mention if you can also do cutting and finishing.': 'ਦੱਸੋ ਜੇਕਰ ਤੁਸੀਂ ਕਟਿੰਗ ਅਤੇ ਫਿਨਿਸ਼ਿੰਗ ਵੀ ਕਰ ਸਕਦੇ ਹੋ।',
    'Say whether you work by hand or on a machine.': 'ਦੱਸੋ ਕਿ ਤੁਸੀਂ ਹੱਥ ਨਾਲ ਕੰਮ ਕਰਦੇ ਹੋ ਜਾਂ ਮਸ਼ੀਨ ’ਤੇ।',
    'Mention the designs you are best at.': 'ਉਹ ਡਿਜ਼ਾਈਨ ਦੱਸੋ ਜਿਸ ਵਿੱਚ ਤੁਸੀਂ ਸਭ ਤੋਂ ਵਧੀਆ ਹੋ।',
    'Say how many people you can cook for at one time.': 'ਦੱਸੋ ਕਿ ਤੁਸੀਂ ਇੱਕ ਵਾਰ ਵਿੱਚ ਕਿੰਨੇ ਲੋਕਾਂ ਲਈ ਖਾਣਾ ਬਣਾ ਸਕਦੇ ਹੋ।',
    'Mention if you have a food hygiene or kitchen certificate.': 'ਦੱਸੋ ਜੇਕਰ ਤੁਹਾਡੇ ਕੋਲ ਕੋਈ ਰਸੋਈ ਜਾਂ ਫੂਡ ਸਰਟੀਫਿਕੇਟ ਹੈ।',
    'Say if you can work in homes, offices, or both.': 'ਦੱਸੋ ਜੇਕਰ ਤੁਸੀਂ ਘਰਾਂ ਵਿੱਚ, ਦਫ਼ਤਰਾਂ ਵਿੱਚ ਜਾਂ ਦੋਵਾਂ ਵਿੱਚ ਕੰਮ ਕਰ ਸਕਦੇ ਹੋ।',
    'Mention if you can work morning or evening shifts.': 'ਦੱਸੋ ਜੇਕਰ ਤੁਸੀਂ ਸਵੇਰ ਜਾਂ ਸ਼ਾਮ ਦੀ ਸ਼ਿਫ਼ਟ ਵਿੱਚ ਕੰਮ ਕਰ ਸਕਦੇ ਹੋ।',
    'Say which driving licence you hold.': 'ਦੱਸੋ ਤੁਹਾਡੇ ਕੋਲ ਕਿਹੜਾ ਡਰਾਈਵਿੰਗ ਲਾਇਸੈਂਸ ਹੈ।',
    'Mention if you know the roads of your city well.': 'ਦੱਸੋ ਜੇਕਰ ਤੁਸੀਂ ਆਪਣੇ ਸ਼ਹਿਰ ਦੀਆਂ ਸੜਕਾਂ ਨੂੰ ਚੰਗੀ ਤਰ੍ਹਾਂ ਜਾਣਦੇ ਹੋ।',
    'What kind of work do you want: full-time, part-time, or work from home?': 'ਤੁਹਾਨੂੰ ਕਿਸ ਤਰ੍ਹਾਂ ਦਾ ਕੰਮ ਚਾਹੀਦਾ ਹੈ: ਪੂਰਾ ਸਮਾਂ, ਅੱਧਾ ਸਮਾਂ, ਜਾਂ ਘਰ ਤੋਂ ਕੰਮ?',
    'Which village or city do you live in?': 'ਤੁਸੀਂ ਕਿਹੜੇ ਪਿੰਡ ਜਾਂ ਸ਼ਹਿਰ ਵਿੱਚ ਰਹਿੰਦੇ ਹੋ?',
    'Thank you. Now I will read back what I understood, so please check it.': 'ਧੰਨਵਾਦ। ਹੁਣ ਮੈਂ ਪੜ੍ਹ ਕੇ ਸੁਣਾਵਾਂਗਾ ਜੋ ਮੈਂ ਸਮਝਿਆ ਹੈ, ਕਿਰਪਾ ਕਰਕੇ ਜਾਂਚ ਕਰੋ।',
    'Sorry, I could not catch that.': 'ਮਾਫ਼ ਕਰਨਾ, ਮੈਂ ਸਮਝ ਨਹੀਂ ਸਕਿਆ।',
    'Is this correct? Say yes to save, or no to change something.': 'ਕੀ ਇਹ ਸਹੀ ਹੈ? ਸੰਭਾਲਣ ਲਈ ਹਾਂ ਕਹੋ, ਜਾਂ ਕੁਝ ਬਦਲਣ ਲਈ ਨਹੀਂ।'
  },
  hi: {
    'Welcome! Which work do you do? For example tailoring, cooking, driving, farming or construction.': 'स्वागत है! आप कौन सा काम करते हैं? जैसे सिलाई, खाना बनाना, गाड़ी चलाना, खेती या निर्माण कार्य।',
    'Which work do you do? For example tailoring, cooking, driving, farming or construction.': 'आप कौन सा काम करते हैं? जैसे सिलाई, खाना बनाना, गाड़ी चलाना, खेती या निर्माण कार्य।',
    'Mention if you can join work immediately.': 'बताइए अगर आप तुरंत काम शुरू कर सकते हैं।',
    'Say about any earlier shop, factory or house where you worked.': 'पहले जिस दुकान, फ़ैक्ट्री या घर में काम किया है, उसके बारे में बताइए।',
    'Say whether you have your own sewing machine.': 'बताइए क्या आपके पास अपनी सिलाई मशीन है।',
    'Say if you can take bulk orders, for example 100 pieces.': 'बताइए क्या आप थोक ऑर्डर ले सकते हैं, जैसे 100 पीस।',
    'Mention if you can also do cutting and finishing.': 'बताइए अगर आप कटिंग और फ़िनिशिंग भी कर सकते हैं।',
    'Say whether you work by hand or on a machine.': 'बताइए कि आप हाथ से काम करते हैं या मशीन पर।',
    'Mention the designs you are best at.': 'वे डिज़ाइन बताइए जिनमें आप सबसे अच्छे हैं।',
    'Say how many people you can cook for at one time.': 'बताइए कि आप एक बार में कितने लोगों के लिए खाना बना सकते हैं।',
    'Mention if you have a food hygiene or kitchen certificate.': 'बताइए अगर आपके पास कोई किचन या फ़ूड सर्टिफ़िकेट है।',
    'Say if you can work in homes, offices, or both.': 'बताइए क्या आप घरों में, दफ़्तरों में या दोनों जगह काम कर सकते हैं।',
    'Mention if you can work morning or evening shifts.': 'बताइए क्या आप सुबह या शाम की शिफ्ट में काम कर सकते हैं।',
    'Say which driving licence you hold.': 'बताइए आपके पास कौन सा ड्राइविंग लाइसेंस है।',
    'Mention if you know the roads of your city well.': 'बताइए क्या आप अपने शहर की सड़कों को अच्छी तरह जानते हैं।',
    'What kind of work do you want: full-time, part-time, or work from home?': 'आपको किस तरह का काम चाहिए: पूरा समय, आधा समय, या घर से काम?',
    'Which village or city do you live in?': 'आप कौन से गाँव या शहर में रहते हैं?',
    'Thank you. Now I will read back what I understood, so please check it.': 'धन्यवाद। अब मैं पढ़कर सुनाऊँगा जो मैंने समझा है, कृपया जाँच लें।',
    'Sorry, I could not catch that.': 'माफ़ कीजिए, मैं समझ नहीं पाया।',
    'Is this correct? Say yes to save, or no to change something.': 'क्या यह सही है? सहेजने के लिए हाँ कहें, या कुछ बदलने के लिए नहीं।'
  }
};

function getStaticTranslation(text, tl) {
  if (!DICT[tl]) return null;
  const t = text.trim();
  if (DICT[tl][t]) return DICT[tl][t];
  if (tl === 'pa') {
    const mTailor = t.match(/^What kind of (.+?) do you do\? For example: (.+)\.$/i);
    if (mTailor) return `ਤੁਸੀਂ ਕਿਸ ਤਰ੍ਹਾਂ ਦਾ ਕੰਮ ਕਰਦੇ ਹੋ? ਜਿਵੇਂ: ${mTailor[2]}`;
    const mExp = t.match(/^How many years have you been (.+)\?$/i);
    if (mExp) return `ਤੁਹਾਨੂੰ ਇਹ ਕੰਮ ਕਰਦਿਆਂ ਕਿੰਨੇ ਸਾਲ ਹੋ ਗਏ ਹਨ?`;
    if (t.startsWith('Got it:')) return t.replace(/^Got it:/, 'ਸਮਝ ਆ ਗਿਆ:');
  } else if (tl === 'hi') {
    const mTailor = t.match(/^What kind of (.+?) do you do\? For example: (.+)\.$/i);
    if (mTailor) return `आप किस तरह का काम करते हैं? जैसे: ${mTailor[2]}`;
    const mExp = t.match(/^How many years have you been (.+)\?$/i);
    if (mExp) return `आपको यह काम करते हुए कितने साल हो गए हैं?`;
    if (t.startsWith('Got it:')) return t.replace(/^Got it:/, 'समझ आ गया:');
  }
  return null;
}

async function google(text, tl, sl = 'auto') {
  const q = encodeURIComponent(text), qs = `client=gtx&sl=${sl}&tl=${tl}&dt=t`;
  const opts = { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': UA } };
  const url = `${BASE}?${qs}&q=${q}`;
  // long text: same endpoint, POST body instead of a very long URL
  const r = url.length < 1900 ? await fetch(url, opts)
    : await fetch(`${BASE}?${qs}`, { ...opts, method: 'POST', headers: { ...opts.headers, 'Content-Type': 'application/x-www-form-urlencoded' }, body: `q=${q}` });
  if (!r.ok) throw new Error('translate ' + r.status);
  const j = await r.json();
  return { out: (j[0] || []).map((x) => x[0]).join(''), det: typeof j[2] === 'string' ? j[2] : '' };
}

function remember(key, v) {
  if (mem.size > MAX_MEM) mem.delete(mem.keys().next().value);
  mem.set(key, v);
}

export async function translateOne(text, tl, sl = 'auto') {
  const t = clean(text);
  if (!t) return { text: '', detected: '', ok: true };
  if (!LANG_RE.test(tl)) return { text: t, detected: '', ok: false };
  if (tl === 'pa') {
    const st = getStaticTranslation(t, tl);
    if (st) return { text: st, detected: 'en', ok: true };
  }
  const key = k(sl, tl, t);
  if (mem.has(key)) { const v = mem.get(key); return { text: v.out, detected: v.det, ok: true }; }
  try {
    const v = await google(t, tl, sl);
    if (!v.out) throw new Error('empty');
    remember(key, v);
    if (dbReady()) Translation.updateOne({ key }, { out: v.out, det: v.det }, { upsert: true }).catch(() => {});
    return { text: v.out, detected: v.det, ok: true };
  } catch {
    const st = getStaticTranslation(t, tl);
    if (st) return { text: st, detected: 'en', ok: true };
    return { text: t, detected: '', ok: false };
  }
}

// Many strings at once: packs them into few requests separated by newlines, falls back to one-by-one if the count does not match.
export async function translateMany(texts, tl, sl = 'auto') {
  const src = texts.map(clean), out = src.slice(), todo = new Map(); // text -> indexes
  let ok = true;
  src.forEach((t, i) => { if (t) (todo.get(t) || todo.set(t, []).get(t)).push(i); });
  const need = [];
  for (const [t] of todo) {
    if (tl === 'pa') {
      const st = getStaticTranslation(t, tl);
      if (st) { todo.get(t).forEach((i) => (out[i] = st)); continue; }
    }
    const v = mem.get(k(sl, tl, t));
    if (v) todo.get(t).forEach((i) => (out[i] = v.out)); else need.push(t);
  }
  if (need.length && dbReady()) {
    try {
      const keys = need.map((t) => k(sl, tl, t));
      const rows = await Translation.find({ key: { $in: keys } }).lean();
      const by = new Map(rows.map((x) => [x.key, x]));
      for (let i = need.length - 1; i >= 0; i--) { const row = by.get(keys[i]); if (row) { remember(keys[i], { out: row.out, det: row.det }); todo.get(need[i]).forEach((j) => (out[j] = row.out)); need.splice(i, 1); } }
    } catch { /* cache is optional */ }
  }
  if (!LANG_RE.test(tl)) return { texts: out, ok: false };
  const batches = []; let cur = [], len = 0;
  for (const t of need) { if (len + t.length > 1200 && cur.length) { batches.push(cur); cur = []; len = 0; } cur.push(t); len += t.length + 1; }
  if (cur.length) batches.push(cur);
  for (const b of batches) {
    let res = null;
    if (b.length > 1) {
      try {
        const v = await google(b.join('\n'), tl, sl), parts = v.out.split('\n').map((x) => x.trim());
        while (parts.length > b.length && parts[parts.length - 1] === '') parts.pop();
        if (parts.length === b.length && parts.every(Boolean)) res = parts;
      } catch { /* fall back below */ }
    }
    if (!res) res = await Promise.all(b.map(async (t) => { const r = await translateOne(t, tl, sl); if (!r.ok) ok = false; return r.text; }));
    else b.forEach((t, i) => { const v = { out: res[i], det: '' }; remember(k(sl, tl, t), v); if (dbReady()) Translation.updateOne({ key: k(sl, tl, t) }, v, { upsert: true }).catch(() => {}); });
    b.forEach((t, i) => todo.get(t).forEach((j) => (out[j] = res[i])));
  }
  return { texts: out, ok };
}

// City names are stored in English so matching works whatever language they were spoken in.
export async function canonCity(city) {
  const c = clean(city);
  if (!c || !/[^\x00-\x7F]/.test(c)) return c;
  const r = await translateOne(c, 'en', 'auto');
  return r.ok ? r.text.replace(/\.$/, '') : c;
}
export const __mem = mem;
