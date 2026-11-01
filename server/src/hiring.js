// Pure hiring logic (no database, no Express) so it can be unit-tested on its own.
// Used by routes/jobs.js (salary label), routes/hires.js (fee, ranking, credibility).

export const norm = (x) => String(x || '').trim().toLowerCase();
export const SALARY_PERIODS = ['month', 'day', 'piece'];
export const WORK_DAYS = 26; // working days used to turn a daily wage into a monthly figure

// ---------- salary ----------
const inr = (n) => Math.round(n).toLocaleString('en-IN');
export function payLabel(min = 0, max = 0, period = 'month') {
  if (!min && !max) return '';
  const range = min && max && min !== max ? `${inr(min)}–${inr(max)}` : inr(max || min);
  return `₹${range}/${SALARY_PERIODS.includes(period) ? period : 'month'}`;
}
// Monthly-equivalent pay of a job (midpoint of the range). Piece-rate has no fixed monthly figure -> 0.
export function monthlyOf(j = {}) {
  const lo = +j.salaryMin || 0, hi = +j.salaryMax || 0, v = lo && hi ? (lo + hi) / 2 : lo || hi;
  if (!v) return 0;
  return j.salaryPeriod === 'day' ? v * WORK_DAYS : j.salaryPeriod === 'piece' ? 0 : v;
}

// ---------- fee and partner share ----------
// Fee = HIRE_FEE_PCT % of one month's pay (never below HIRE_FEE_MIN rupees). If the worker was registered by a
// Community Partner, that partner receives PARTNER_SHARE_PCT % of the fee; the rest is the platform's.
const env = (k, d) => { const v = process.env[k], n = v === undefined || v === '' ? NaN : +v; return Number.isFinite(n) && n >= 0 ? n : d; };
export function calcFee(job = {}, hasPartner = false) {
  const feePct = env('HIRE_FEE_PCT', 10), min = env('HIRE_FEE_MIN', 200), partnerPct = Math.min(100, env('PARTNER_SHARE_PCT', 30));
  const salary = Math.round(monthlyOf(job));
  const fee = Math.round(Math.max(min, (salary * feePct) / 100));
  const partnerShare = hasPartner ? Math.round((fee * partnerPct) / 100) : 0;
  return { salary, feePct, partnerPct: hasPartner ? partnerPct : 0, fee, partnerShare, platformShare: fee - partnerShare };
}

// ---------- worker credibility (0-100) ----------
// Ratings 55 + show-up reliability 15 + track record 10 + experience 10 + profile completeness 10.
// Ratings are averaged with a prior of 3 "average" (3.5 star) ratings, so one 5-star rating cannot make a worker perfect
// and a new worker starts in the middle (about 50) instead of at zero.
const PRIOR_W = 3, PRIOR_M = 3.5;
export function credibilityOf(w = {}) {
  const n = w.ratingCount || 0, sum = w.ratingSum || 0, hires = w.hiredCount || 0, miss = w.noShows || 0;
  const avg = (PRIOR_W * PRIOR_M + sum) / (PRIOR_W + n);
  const rating = ((avg - 1) / 4) * 55;
  const reliable = ((Math.max(0, hires - miss) + 1) / (hires + 2)) * 15;
  const record = (Math.min(hires, 5) / 5) * 10;
  const exp = (Math.min(Math.max(w.experienceYears || 0, 0), 10) / 10) * 10;
  const profile = (w.skills?.length ? 3 : 0) + (w.specialties?.length ? 3 : 0) + (w.pitch ? 2 : 0) + (w.city ? 2 : 0);
  return Math.round(Math.max(0, Math.min(100, rating + reliable + record + exp + profile)));
}
export const levelOf = (w, score = credibilityOf(w)) => ((w.ratingCount || 0) === 0 ? 'new' : score >= 75 ? 'high' : score >= 55 ? 'good' : 'building');
export const ratingAvg = (w) => ((w.ratingCount || 0) ? Math.round(((w.ratingSum || 0) / w.ratingCount) * 10) / 10 : 0);
// What the employer sees about a worker's track record (the raw counters stay on the server).
export const credView = (w) => { const credibility = credibilityOf(w); return { credibility, level: levelOf(w, credibility), ratingAvg: ratingAvg(w), ratingCount: w.ratingCount || 0, hiredCount: w.hiredCount || 0 }; };

// ---------- ranking a worker against a hiring requirement ----------
// req: { skills[], specialties[], city, workType, minExperience }   w: a worker (User) document
// Points: each skill 3, each speciality 2, same city 2 (or ready to relocate 1), work type 1,
// experience at/above the minimum up to +2 (below it -3), plus up to +3 for credibility.
// `fit` (0-100) says how much of the requirement the worker covers, independent of credibility.
export function rankWorker(req, w) {
  const ws = new Set(w.skills || []), wsp = new Set((w.specialties || []).map(norm));
  const skills = req.skills || [], specs = req.specialties || [];
  const skillHits = skills.filter((x) => ws.has(x)).length;
  const specHits = specs.filter((x) => wsp.has(norm(x))).length;
  const c = norm(w.city), rc = norm(req.city);
  const city = !!c && !!rc && (c.includes(rc) || rc.includes(c));
  const relocate = !!rc && !city && w.relocate === true;
  const workType = !!req.workType && w.workType === req.workType;
  const minExp = req.minExperience || 0, exp = w.experienceYears || 0, expOk = exp >= minExp;

  const covered = skillHits * 3 + specHits * 2 + (city ? 2 : relocate ? 1 : 0) + (workType ? 1 : 0);
  const possible = skills.length * 3 + specs.length * 2 + (rc ? 2 : 0) + (req.workType ? 1 : 0);
  const fit = possible ? Math.max(0, Math.min(100, Math.round((covered / possible) * 100) - (expOk ? 0 : 15))) : 0;
  const credibility = credibilityOf(w);
  const expPoints = expOk ? Math.min(2, (exp - minExp) * 0.25) : -3;
  const score = Math.round((covered + expPoints + (credibility / 100) * 3) * 100) / 100;
  return { score, fit, skillHits, specHits, city, relocate, workType, expOk, credibility };
}

// Public card for the employer's pool. No phone number: it is shown only after the worker is shortlisted.
export function workerCard(w, m, hire = null) {
  return {
    _id: w._id, name: w.name, city: w.city, state: w.state, skills: w.skills || [], specialties: w.specialties || [], occupation: w.occupation || '',
    experienceYears: w.experienceYears || 0, workType: w.workType, shift: w.shift, relocate: w.relocate, pitch: w.pitch,
    partnerRegistered: !!w.registeredBy, ...credView(w), fit: m.fit,
    why: { skills: m.skillHits, specialties: m.specHits, city: m.city, relocate: m.relocate, workType: m.workType, expOk: m.expOk },
    hire
  };
}
