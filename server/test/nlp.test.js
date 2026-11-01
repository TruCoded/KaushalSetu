import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, cleanDraft, applyFound, nextKey, questionFor, ackFor, pitchEn, parseExperience, parsePlace, parseShift, parseRelocate, parsePhone, parseName, verdictOf, readbackEn } from '../src/nlp.js';
import { makePassword } from '../src/password.js';

test('tailor with no type -> asks which kind of tailoring, then experience', () => {
  let { draft } = applyFound(cleanDraft({}), analyze('मैं सिलाई करती हूं', 'I do tailoring', { awaiting: 'skills' }), 'intro');
  assert.deepEqual(draft.skills, ['tailoring']);
  assert.equal(nextKey(draft), 'details:tailoring');
  assert.match(questionFor('details:tailoring', draft), /What kind of tailoring/);
  ({ draft } = applyFound(draft, analyze('', 'blouse and embroidery', { awaiting: 'details:tailoring', known: draft.skills }), 'details:tailoring'));
  assert.ok(draft.specialties.includes('blouse stitching'));
  assert.ok(draft.skills.includes('embroidery'));
  assert.equal(nextKey(draft), 'details:embroidery'); // embroidery has its own question
});

test('experience words, months, since-year, bare numbers', () => {
  assert.equal(parseExperience('', 'five years of experience'), 5);
  assert.equal(parseExperience('', '6 months'), 0.5);
  assert.equal(parseExperience('', 'since 2016'), new Date().getFullYear() - 2016);
  assert.equal(parseExperience('', 'I am a fresher'), 0);
  assert.equal(parseExperience('', 'ten', true), 10);
  assert.equal(parseExperience('', 'ten'), null);
  assert.equal(parseExperience('५ साल', ''), 5);
});

test('full interview ends complete and builds a pitch', () => {
  let d = cleanDraft({ city: '' });
  const say = (o, e, a, kn) => ({ draft: d } = applyFound(d, analyze(o, e, { awaiting: a, known: d.skills }), a));
  say('', 'I do tailoring, blouse stitching', 'intro');
  assert.equal(nextKey(d), 'experience');
  say('', 'seven years', 'experience');
  say('', 'from home', 'workType');
  say('', 'I live in ludhiana', 'city');
  assert.equal(nextKey(d), null);
  assert.equal(d.city, 'Ludhiana');
  assert.match(pitchEn(d), /7 years/);
  assert.match(pitchEn(d), /work from home in Ludhiana/);
});

test('unanswerable question is asked twice then skipped (no endless loop)', () => {
  let d = cleanDraft({ skills: ['driving'], detailDone: ['driving'], experienceYears: 3, workType: 'full-time', city: 'Ropar' });
  d.experienceYears = null;
  ({ draft: d } = applyFound(d, analyze('', 'hmm', { awaiting: 'experience' }), 'experience'));
  assert.equal(nextKey(d), 'experience');
  ({ draft: d } = applyFound(d, analyze('', 'hmm', { awaiting: 'experience' }), 'experience'));
  assert.equal(nextKey(d), null);
});

test('ack and draft sanitising', () => {
  const { draft, added } = applyFound(cleanDraft({ skills: ['<script>', 'cooking'] }), analyze('', 'I cook 2 years'), '');
  assert.deepEqual(draft.skills, ['cooking']);
  assert.match(ackFor(added, draft), /2 years/);
});

test('generated passwords are 6 digits and not trivial', () => {
  for (let i = 0; i < 500; i++) { const p = makePassword(); assert.match(p, /^\d{6}$/); assert.ok(!/^(\d)\1+$/.test(p)); assert.notEqual(p, '123456'); }
});

test('Stage 2: location with state, in the middle of a sentence or as the answer', () => {
  assert.deepEqual(parsePlace('', 'Ludhiana, Punjab', true), { city: 'Ludhiana', state: 'Punjab' });
  assert.deepEqual(parsePlace('', 'I live in Ropar Punjab and I want work', false), { city: 'Ropar', state: 'Punjab' });
  assert.deepEqual(parsePlace('', 'I want work from home', false), { city: '', state: '' });
  assert.deepEqual(parsePlace('', 'Chandigarh', true), { city: 'Chandigarh', state: '' });
});

test('Stage 2: work preference beyond full/part-time', () => {
  assert.equal(parseShift('I can work night shift'), 'night');
  assert.equal(parseShift('any shift is fine'), 'any');
  assert.equal(parseRelocate('I can relocate to any city'), true);
  assert.equal(parseRelocate('I cannot move, only near my home'), false);
  assert.equal(analyze('', 'I can relocate to any city', { awaiting: 'workType' }).workTypeAny, undefined);
});

test('Stage 2: occupation outside the catalogue is kept and the interview moves on', () => {
  const { draft, added } = applyFound(cleanDraft({}), analyze('', 'I am a security guard', { awaiting: 'intro' }), 'intro');
  assert.equal(draft.occupation, 'security guard');
  assert.equal(nextKey(draft), 'experience');
  assert.match(ackFor(added, draft), /security guard/);
  assert.equal(analyze('', 'I am looking for work', { awaiting: 'intro' }).occupation, '');
  assert.match(pitchEn({ ...draft, experienceYears: 3 }), /I work as a security guard with 3 years/);
});

test('Stage 3: read-back sentences and yes/no', () => {
  const d = cleanDraft({ skills: ['tailoring'], experienceYears: 5, workType: 'home-based', city: 'Ludhiana', state: 'Punjab' });
  assert.equal(readbackEn(d), 'You do tailoring. You have 5 years of experience. You want work from home. You live in Ludhiana, Punjab.');
  assert.match(readbackEn(d, 'Rani'), /^Rani does tailoring\. Rani has 5 years/);
  assert.equal(verdictOf('हाँ', ''), 'yes'); assert.equal(verdictOf('', 'not right'), 'no'); assert.equal(verdictOf('', 'hmm'), '');
});

test('partner fields: spoken phone numbers and names', () => {
  assert.equal(parsePhone('98123 45678'), '9812345678');
  assert.equal(parsePhone('nine eight one two three four five six double seven'), '9812345677');
  assert.equal(parsePhone('+91 98123 45678'), '9812345678');
  assert.equal(parsePhone('९८१२३ ४५६७८'), '9812345678');
  assert.equal(parseName('my name is rani devi'), 'Rani Devi');
  assert.equal(parseName('मेरा नाम रानी देवी है'), 'रानी देवी');
});
