import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { translateOne, translateMany, canonCity, LANG_RE } from '../translate.js';
import {
  analyze, extract, cleanDraft, applyFound, nextKey, questionFor, ackFor, tipsFor, pitchEn, normKey,
  readbackEn, REVIEW_ASK, verdictOf, parsePhone, parseName, usable, fieldsOf
} from '../nlp.js';
import { User } from '../models.js';
import { need, bad } from '../middleware.js';
import { makePassword } from '../password.js';
const r = Router();

const lng = (x) => (LANG_RE.test(String(x)) ? String(x) : '');
// first name of the worker, used so a partner is asked "Which work does Rani do?"
const firstName = (x) => String(x || '').trim().split(/\s+/)[0].replace(/[^\p{L}\p{M}'-]/gu, '').slice(0, 20);
const needsEnglish = (text, lang) => lang !== 'en' || /[^\x00-\x7F]/.test(text);

r.post('/skills', (q, s) => s.json(extract(String(q.body.text || '').slice(0, 1000))));

// ---------------------------------------------------------------------------------------------------------------
// Bhashini seam. Nothing here needs the key: with no BHASHINI_API_KEY (or no src/bhashini.js yet) every call answers
// "browser" and the app keeps using the Web Speech API. When src/bhashini.js exists it must export:
//   stt({ audio: Buffer, mime: string, lang: string }) -> Promise<string>          (recognised text)
//   tts({ text: string, lang: string })                -> Promise<{ audio: Buffer, mime: string }>   (optional)
// ---------------------------------------------------------------------------------------------------------------
let bh; // undefined = not tried yet, null = not available
async function bhashini() {
  if (!process.env.BHASHINI_API_KEY) return null;
  if (bh === undefined) { try { bh = await import('../bhashini.js'); } catch { bh = null; } }
  return bh;
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);

r.get('/engine', async (_q, s) => {
  const b = await bhashini();
  s.json({ stt: typeof b?.stt === 'function' ? 'bhashini' : 'browser', tts: typeof b?.tts === 'function' ? 'bhashini' : 'browser' });
});
r.post('/stt', async (q, s) => {
  const b = await bhashini(), lang = lng(q.body.lang);
  if (typeof b?.stt !== 'function') throw bad('Bhashini is not set up', 501);
  if (!lang || typeof q.body.audio !== 'string') throw bad('Invalid request');
  const audio = Buffer.from(q.body.audio, 'base64');
  if (!audio.length || audio.length > 250_000) throw bad('Recording is too long', 413);
  try { s.json({ text: String(await withTimeout(b.stt({ audio, mime: String(q.body.mime || 'audio/webm').slice(0, 40), lang }), 15000) || '').trim() }); }
  catch { throw bad('Bhashini could not listen right now', 502); }
});

// ---------------------------------------------------------------------------------------------------------------
// Stage 2: one turn of the spoken interview. The words (any language) are translated to English, analysed, and the next
// question, tips and pitch come back translated into `lang`. In partner mode (`who` = the worker's first name) the
// partner answers for the worker, so questions are about the worker in the third person and tips are left out.
// ---------------------------------------------------------------------------------------------------------------
r.post('/pitch', async (q, s) => {
  const lang = lng(q.body.lang) || 'en', who = firstName(q.body.who);
  const text = String(q.body.text || '').slice(0, 1000).trim();
  const awaiting = String(q.body.awaiting || '').slice(0, 40);
  let draft = cleanDraft(q.body.draft), added = {};
  let english = '', detected = '', translated = true, missed = false;

  if (!q.body.start) {
    if (!text) throw bad('Please say something');
    if (needsEnglish(text, lang)) { const t = await translateOne(text, 'en', 'auto'); english = t.text; detected = t.detected; translated = t.ok; }
    else english = text;
    const key = normKey(awaiting);
    const found = analyze(text, english, { awaiting: key, known: draft.skills });
    // a free-text answer to "what kind of X" is kept as a custom speciality
    if (key.startsWith('details:') && !found.specialties.length && english.length >= 3 && english.length <= 60) {
      const sk = key.slice(8);
      if (!draft.detailDone.includes(sk)) { found.specialties.push(english.toLowerCase().replace(/[.!?]+$/, '')); draft.detailDone.push(sk); }
    }
    ({ draft, added } = applyFound(draft, found, awaiting));
    missed = !ackFor(added, draft);
  }

  const key = nextKey(draft), complete = !key;
  const ack = missed ? 'Sorry, I could not catch that.' : q.body.start ? '' : ackFor(added, draft);
  const question = complete ? 'Thank you. Now I will read back what I understood, so please check it.' : (q.body.start ? 'Welcome! ' : '') + questionFor(key, draft, who);
  const tips = complete || who ? [] : tipsFor(draft, 2);
  const pitch = complete || usable(draft) ? pitchEn(draft) : '';
  const lines = [ack, question, ...tips, pitch];
  const tr = lang === 'en' ? { texts: lines, ok: true } : await translateMany(lines.map((x) => x || ''), lang, 'en');
  const [ackL, questionL, ...rest] = tr.texts;
  s.json({
    draft, awaiting: key || '', complete, english, detected, translated, added,
    ack: ackL, question: questionL, tips: rest.slice(0, tips.length), pitch: rest[rest.length - 1], pitch_en: pitch,
    question_en: question, answerLang: lang, translationOk: tr.ok
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Stage 3: review and confirm. Nothing is saved here. It returns what to show and read aloud, and (when `text` is the
// spoken reply to "Is this correct?") whether the person said yes or no. `verdictOnly` skips the translations.
// ---------------------------------------------------------------------------------------------------------------
r.post('/review', async (q, s) => {
  const lang = lng(q.body.lang) || 'en', workerLang = lng(q.body.workerLang) || lang, who = firstName(q.body.who);
  const draft = cleanDraft(q.body.draft), text = String(q.body.text || '').slice(0, 200).trim();
  let verdict = '';
  if (text) {
    const english = needsEnglish(text, lang) ? (await translateOne(text, 'en', 'auto')).text : text;
    verdict = verdictOf(text, english);
  }
  if (q.body.verdictOnly) return s.json({ verdict });
  const readback_en = readbackEn(draft, who), pitch_en = pitchEn(draft);
  const lines = [readback_en, REVIEW_ASK, pitch_en];
  const tr = lang === 'en' ? { texts: lines, ok: true } : await translateMany(lines, lang, 'en');
  // when a partner speaks for the worker in another language, also give the read-back in the worker's own language
  let readbackWorker = '';
  if (who && workerLang !== lang) readbackWorker = workerLang === 'en' ? readbackEn(draft, '') : (await translateOne(readbackEn(draft, ''), workerLang, 'en')).text;
  s.json({
    draft, verdict, canSave: usable(draft),
    readback: tr.texts[0], ask: tr.texts[1], pitch: tr.texts[2], readback_en, pitch_en, readbackWorker, translationOk: tr.ok
  });
});

// Used for single fields outside the interview (partner registration): a spoken name or mobile number.
r.post('/field', async (q, s) => {
  const kind = String(q.body.kind), text = String(q.body.text || '').slice(0, 200).trim(), lang = lng(q.body.lang) || 'en';
  if (!['name', 'phone'].includes(kind)) throw bad('Invalid request');
  if (!text) throw bad('Please say something');
  if (kind === 'name') { const value = parseName(text); return s.json({ value, valid: value.length >= 2 }); }
  let value = parsePhone(text);
  if (value.length < 10 && needsEnglish(text, lang)) value = parsePhone(text, (await translateOne(text, 'en', 'auto')).text);
  s.json({ value, valid: /^\d{10}$/.test(value) });
});

// Save the confirmed profile of the signed-in worker (the review screen calls this after "Yes, save").
r.post('/profile', need('worker'), async (q, s) => {
  if (q.body.confirmed !== true) throw bad('Please confirm your details first');
  const d = cleanDraft(q.body.draft);
  if (!usable(d)) throw bad('Tell us at least one kind of work');
  const u = q.user, city = await canonCity(d.city);
  Object.assign(u, fieldsOf(d));
  if (city) u.city = city;
  if (lng(q.body.lang)) u.language = lng(q.body.lang);
  await u.save();
  s.json({ user: u, pitch: u.pitch });
});

// ---------------------------------------------------------------------------------------------------------------
// Community Partner registers a worker: the partner fills the worker's details, speaks the interview for them and
// confirms. The worker gets a phone + password (auto-generated like normal sign-up) and the partner hands it over.
// ---------------------------------------------------------------------------------------------------------------
const partner = need('partner', 'admin');
r.post('/partner/check', partner, async (q, s) => {
  const phone = String(q.body.phone || '');
  s.json({ valid: /^\d{10}$/.test(phone), exists: /^\d{10}$/.test(phone) && !!(await User.exists({ phone })) });
});
r.post('/partner/register', partner, async (q, s) => {
  const name = String(q.body.name || '').trim().slice(0, 60), phone = String(q.body.phone || '');
  if (name.length < 2) throw bad('Please enter the worker’s name');
  if (!/^\d{10}$/.test(phone)) throw bad('Enter a 10-digit mobile number');
  if (q.body.workerAgreed !== true) throw bad('The worker must agree to be registered');
  if (q.body.confirmed !== true) throw bad('Please confirm the details first');
  const d = cleanDraft(q.body.draft);
  if (!usable(d)) throw bad('Tell us at least one kind of work');
  const given = String(q.body.password || ''), password = given || makePassword();
  if (password.length < 6) throw bad('Password needs at least 6 characters');
  if (await User.exists({ phone })) throw bad('This number is already registered', 409);
  let u;
  try {
    u = await User.create({
      role: 'worker', name, phone, city: await canonCity(d.city), language: lng(q.body.language) || 'hi', ...fieldsOf(d),
      registeredBy: q.user.id, consentAt: new Date(), passwordHash: await bcrypt.hash(password, 10)
    });
  } catch (e) { if (e.code === 11000) throw bad('This number is already registered', 409); throw e; }
  s.status(201).json({ user: u, password, pitch: u.pitch });
});
r.get('/partner/workers', partner, async (q, s) => {
  const f = q.user.role === 'admin' ? { registeredBy: { $exists: true } } : { registeredBy: q.user.id };
  s.json({ workers: await User.find(f).sort('-createdAt').limit(100).select('name phone city skills occupation createdAt').lean() });
});

// Fallback voice for languages the browser has no speech voice for. Bhashini first when it is set up, then the
// same unofficial Google service as before.
r.get('/tts', async (q, s) => {
  const tl = String(q.query.tl || ''), text = String(q.query.q || '').slice(0, 200);
  if (!LANG_RE.test(tl) || !text.trim()) throw bad('Invalid request');
  const b = await bhashini();
  if (typeof b?.tts === 'function') {
    try {
      const v = await withTimeout(b.tts({ text, lang: tl }), 10000);
      if (v?.audio?.length) return s.set({ 'Content-Type': v.mime || 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' }).send(Buffer.from(v.audio));
    } catch { /* fall through to Google */ }
  }
  let up;
  try {
    up = await fetch(`https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(text)}`,
      { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', Referer: 'https://translate.google.com/' } });
  } catch { throw bad('Voice is not available right now', 502); }
  if (!up.ok) throw bad('Voice is not available for this language', 502);
  s.set({ 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' }).send(Buffer.from(await up.arrayBuffer()));
});
export default r;
