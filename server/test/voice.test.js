import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import voice from '../src/routes/voice.js';
import translate from '../src/routes/translate.js';

// Fake Google: Hindi->English from a tiny phrase book; English->anything just prefixes the language code.
const book = { 'हाँ ठीक है': 'yes it is fine', 'नहीं': 'no', 'नौ आठ एक दो तीन चार पाँच छह सात सात': 'nine eight one two three four five six seven seven', 'रानी': 'Rani', 'मैं सिलाई करती हूँ': 'I do tailoring', 'ब्लाउज और कढ़ाई': 'blouse and embroidery', 'पाँच साल': 'five years', 'घर से': 'from home', 'लुधियाना': 'Ludhiana' };
const real = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  if (!String(url).includes('translate.googleapis.com')) return real(url, opts);
  const u = new URL(url), tl = u.searchParams.get('tl'), q = opts?.method === 'POST' ? new URLSearchParams(opts.body).get('q') : u.searchParams.get('q');
  const out = q.split('\n').map((l) => (tl === 'en' ? book[l] || l : `[${tl}] ${l}`)).join('\n');
  return { ok: true, json: async () => [[[out, q]], null, tl === 'en' ? 'hi' : 'en'] };
};
const app = express(); app.use(express.json()); app.use('/voice', voice); app.use('/translate', translate);
app.use((e, _q, s, _n) => s.status(e.status || 500).json({ error: e.message }));
const srv = app.listen(0); const base = `http://127.0.0.1:${srv.address().port}`;
const post = async (p, body) => (await real(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
test.after(() => srv.close());

test('Hindi pitch: AI asks which tailoring, then experience, work type, place - all in Hindi', async () => {
  let r = await post('/voice/pitch', { start: true, lang: 'hi', draft: {} });
  assert.match(r.question, /^\[hi\] Welcome! Which work do you do/);
  let draft = r.draft, awaiting = r.awaiting;
  const say = async (text) => { r = await post('/voice/pitch', { text, lang: 'hi', draft, awaiting }); draft = r.draft; awaiting = r.awaiting; return r; };
  await say('मैं सिलाई करती हूँ');
  assert.equal(r.awaiting, 'details:tailoring');
  assert.match(r.question_en, /What kind of tailoring do you do\? For example: blouse stitching/);
  assert.match(r.question, /^\[hi\] /); assert.ok(r.tips.length > 0 && r.tips[0].startsWith('[hi]'));
  await say('ब्लाउज और कढ़ाई');
  assert.deepEqual(draft.skills.sort(), ['embroidery', 'tailoring']);
  assert.ok(draft.specialties.includes('blouse stitching'));
  assert.equal(r.awaiting, 'details:embroidery');
  await say('hand work by hand'); // free answer to the embroidery question
  assert.equal(r.awaiting, 'experience');
  await say('पाँच साल'); assert.equal(draft.experienceYears, 5); assert.equal(r.awaiting, 'workType');
  await say('घर से'); assert.equal(draft.workType, 'home-based'); assert.equal(r.awaiting, 'city');
  await say('लुधियाना');
  assert.equal(r.complete, true); assert.equal(draft.city, 'Ludhiana');
  assert.match(r.pitch_en, /5 years of experience/); assert.match(r.pitch, /^\[hi\] /);
});

test('translate endpoint validates input', async () => {
  assert.equal((await post('/translate', { tl: 'ta', texts: ['Hello', 'Bye'] })).texts[0], '[ta] Hello');
  assert.match((await post('/translate', { tl: '../x', texts: ['a'] })).error, /Invalid/);
  assert.match((await post('/voice/pitch', { text: '', lang: 'hi' })).error, /say something/);
});

test('Stage 3 review: read-back in the speaker\'s language, yes/no by voice, nothing saved', async () => {
  const draft = { skills: ['tailoring'], specialties: ['blouse stitching'], experienceYears: 5, workType: 'home-based', city: 'Ludhiana', state: 'Punjab', shift: 'night', relocate: false };
  const r = await post('/voice/review', { lang: 'hi', draft });
  assert.equal(r.canSave, true);
  assert.match(r.readback_en, /^You do tailoring, mainly blouse stitching\. You have 5 years of experience\./);
  assert.match(r.readback_en, /You live in Ludhiana, Punjab\.$/);
  assert.match(r.readback, /^\[hi\] /); assert.match(r.ask, /^\[hi\] Is this correct/);
  assert.equal((await post('/voice/review', { lang: 'hi', draft, text: 'हाँ ठीक है', verdictOnly: true })).verdict, 'yes');
  assert.equal((await post('/voice/review', { lang: 'hi', draft, text: 'नहीं', verdictOnly: true })).verdict, 'no');
  assert.equal((await post('/voice/review', { lang: 'en', draft, text: 'hmm', verdictOnly: true })).verdict, '');
  assert.equal((await post('/voice/review', { lang: 'en', draft: {} })).canSave, false);
});

test('Stage 2 extras: location with state, shift, move-for-work, work outside the catalogue', async () => {
  let r = await post('/voice/pitch', { text: 'I am a security guard', lang: 'en', draft: {}, awaiting: 'intro' });
  assert.equal(r.draft.occupation, 'security guard'); assert.equal(r.awaiting, 'experience');
  r = await post('/voice/pitch', { text: 'I live in Ropar Punjab and I can work night shift', lang: 'en', draft: r.draft, awaiting: 'experience' });
  assert.equal(r.draft.city, 'Ropar'); assert.equal(r.draft.state, 'Punjab'); assert.equal(r.draft.shift, 'night');
});

test('Partner mode asks about the worker in the third person and gives no tips', async () => {
  const r = await post('/voice/pitch', { start: true, lang: 'en', who: 'Rani', draft: {} });
  assert.match(r.question_en, /Which work does Rani do\?/);
  const t = await post('/voice/pitch', { text: 'tailoring', lang: 'en', who: 'Rani', draft: r.draft, awaiting: 'skills' });
  assert.match(t.question_en, /What kind of tailoring does Rani do\?/); assert.equal(t.tips.length, 0);
});

test('spoken name and phone number fields; Bhashini is off without a key', async () => {
  assert.deepEqual(await post('/voice/field', { kind: 'name', text: 'my name is suman devi', lang: 'en' }), { value: 'Suman Devi', valid: true });
  assert.equal((await post('/voice/field', { kind: 'phone', text: '98123 45678', lang: 'hi' })).valid, true);
  assert.equal((await post('/voice/field', { kind: 'phone', text: 'नौ आठ एक दो तीन चार पाँच छह सात सात', lang: 'hi' })).value, '9812345677');
  assert.equal((await post('/voice/field', { kind: 'phone', text: '12345', lang: 'en' })).valid, false);
  delete process.env.BHASHINI_API_KEY;
  assert.deepEqual(await (await real(base + '/voice/engine')).json(), { stt: 'browser', tts: 'browser' });
  assert.match((await post('/voice/stt', { audio: 'AAAA', lang: 'hi' })).error, /not set up/);
});
