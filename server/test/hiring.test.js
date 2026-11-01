import test from 'node:test';
import assert from 'node:assert/strict';
import { payLabel, monthlyOf, calcFee, credibilityOf, levelOf, ratingAvg, rankWorker, workerCard } from '../src/hiring.js';

const worker = (o = {}) => ({ _id: 'w', name: 'W', city: 'Ludhiana', skills: ['tailoring'], specialties: [], experienceYears: 3, workType: 'full-time', ...o });
const req = (o = {}) => ({ skills: ['tailoring'], specialties: [], city: 'Ludhiana', workType: 'full-time', minExperience: 2, ...o });

test('salary label: range, single value, piece rate, nothing', () => {
  assert.equal(payLabel(12000, 15000, 'month'), '₹12,000–15,000/month');
  assert.equal(payLabel(12000, 12000, 'month'), '₹12,000/month');
  assert.equal(payLabel(0, 500, 'day'), '₹500/day');
  assert.equal(payLabel(350, 350, 'piece'), '₹350/piece');
  assert.equal(payLabel(0, 0), '');
  assert.equal(payLabel(100000, 250000), '₹1,00,000–2,50,000/month'); // Indian digit grouping
});

test('monthly-equivalent pay: midpoint, daily wage x 26, piece rate has none', () => {
  assert.equal(monthlyOf({ salaryMin: 10000, salaryMax: 14000, salaryPeriod: 'month' }), 12000);
  assert.equal(monthlyOf({ salaryMin: 500, salaryMax: 500, salaryPeriod: 'day' }), 13000);
  assert.equal(monthlyOf({ salaryMin: 350, salaryPeriod: 'piece' }), 0);
  assert.equal(monthlyOf({}), 0);
});

test('fee is 10% of a month (min 200); partner gets 30% of it only when a partner registered the worker', () => {
  const job = { salaryMin: 12000, salaryMax: 14000, salaryPeriod: 'month' }; // 13,000 -> fee 1,300
  assert.deepEqual(calcFee(job, true), { salary: 13000, feePct: 10, partnerPct: 30, fee: 1300, partnerShare: 390, platformShare: 910 });
  assert.deepEqual(calcFee(job, false), { salary: 13000, feePct: 10, partnerPct: 0, fee: 1300, partnerShare: 0, platformShare: 1300 });
  const piece = calcFee({ salaryMin: 350, salaryPeriod: 'piece' }, true);
  assert.equal(piece.fee, 200); // no monthly figure -> minimum fee
  assert.equal(piece.partnerShare + piece.platformShare, piece.fee);
});

test('fee settings come from the environment', () => {
  Object.assign(process.env, { HIRE_FEE_PCT: '5', HIRE_FEE_MIN: '100', PARTNER_SHARE_PCT: '50' });
  try {
    const f = calcFee({ salaryMin: 20000, salaryPeriod: 'month' }, true);
    assert.deepEqual([f.fee, f.partnerShare, f.platformShare], [1000, 500, 500]);
  } finally { delete process.env.HIRE_FEE_PCT; delete process.env.HIRE_FEE_MIN; delete process.env.PARTNER_SHARE_PCT; }
  assert.equal(calcFee({ salaryMin: 20000 }).fee, 2000);
});

test('credibility: a new worker sits in the middle, never at zero or at 100', () => {
  const fresh = credibilityOf(worker({ skills: ['tailoring'], experienceYears: 0, city: '' }));
  assert.ok(fresh > 30 && fresh < 60, `fresh=${fresh}`);
  assert.equal(levelOf({ ratingCount: 0 }), 'new');
  const one = credibilityOf(worker({ ratingSum: 5, ratingCount: 1, hiredCount: 1 }));
  assert.ok(one < 90, 'one 5-star rating must not give a near-perfect score');
});

test('credibility rises with good ratings and falls with bad ratings and no-shows', () => {
  const base = worker({ experienceYears: 5, specialties: ['alterations'], pitch: 'hi' });
  const good = credibilityOf({ ...base, ratingSum: 25, ratingCount: 5, hiredCount: 5 });
  const none = credibilityOf(base);
  const bad = credibilityOf({ ...base, ratingSum: 5, ratingCount: 5, hiredCount: 5, noShows: 3 });
  assert.ok(good > none && none > bad, `${good} > ${none} > ${bad}`);
  assert.ok(good <= 100 && bad >= 0);
  assert.equal(levelOf({ ratingCount: 5 }, good), 'high');
  assert.equal(levelOf({ ratingCount: 5 }, bad), 'building');
  assert.equal(ratingAvg({ ratingSum: 14, ratingCount: 3 }), 4.7);
  assert.equal(ratingAvg({}), 0);
});

test('ranking: skills and specialities first, then city, work type and experience', () => {
  const r = req({ specialties: ['factory and bulk stitching'] });
  const best = rankWorker(r, worker({ specialties: ['Factory and bulk stitching'], experienceYears: 6 }));
  const noSpec = rankWorker(r, worker({ experienceYears: 6 }));
  const otherCity = rankWorker(r, worker({ city: 'Ropar', specialties: ['factory and bulk stitching'], experienceYears: 6 }));
  const green = rankWorker(r, worker({ specialties: ['factory and bulk stitching'], experienceYears: 0 }));
  assert.ok(best.score > noSpec.score && best.score > otherCity.score && best.score > green.score);
  assert.equal(best.specHits, 1); // case-insensitive
  assert.equal(best.fit, 100);
  assert.equal(green.expOk, false);
  assert.ok(green.fit < best.fit);
});

test('ranking: a worker ready to move counts a little; an empty requirement city never matches by accident', () => {
  const far = rankWorker(req({ city: 'Chandigarh' }), worker({ city: 'Ropar', relocate: true }));
  const farNo = rankWorker(req({ city: 'Chandigarh' }), worker({ city: 'Ropar', relocate: false }));
  assert.ok(far.relocate && !farNo.relocate && far.score > farNo.score && far.fit > farNo.fit);
  const anywhere = rankWorker(req({ city: '' }), worker());
  assert.equal(anywhere.city, false);
});

test('ranking: a more credible worker wins a tie', () => {
  const a = rankWorker(req(), worker({ ratingSum: 20, ratingCount: 4, hiredCount: 4 }));
  const b = rankWorker(req(), worker());
  assert.equal(a.fit, b.fit);
  assert.ok(a.score > b.score);
});

test('worker card for the pool never exposes a phone number or the raw counters', () => {
  const w = worker({ phone: '9812345678', passwordHash: 'x', ratingSum: 9, ratingCount: 2, noShows: 1, registeredBy: 'p1' });
  const c = workerCard(w, rankWorker(req(), w), 'shortlisted');
  assert.equal(c.phone, undefined);
  assert.equal(c.ratingSum, undefined);
  assert.equal(c.partnerRegistered, true);
  assert.equal(c.hire, 'shortlisted');
  assert.equal(c.ratingAvg, 4.5);
});
