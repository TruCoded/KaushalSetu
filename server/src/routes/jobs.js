import { Router } from 'express';
import { Job, Application, Hire } from '../models.js';
import { need, optional, bad, esc } from '../middleware.js';
import { translateOne, canonCity } from '../translate.js';
import { analyze, SKILL_KEYS } from '../nlp.js';
import { payLabel, credView, SALARY_PERIODS } from '../hiring.js';
export const apps = Router();
const r = Router();
const TYPES = ['full-time', 'part-time', 'home-based'];
const norm = (x) => String(x || '').trim().toLowerCase();
// How well does a job fit a worker profile? skills 3, specialities 2 each, same city 2, work type 1, too little experience -2
export function score(j, p) {
  const ps = new Set(p.skills || []), pp = new Set((p.specialties || []).map(norm));
  const skillHits = (j.skills || []).filter((x) => ps.has(x)).length;
  const specHits = (j.specialties || []).filter((x) => pp.has(norm(x))).length;
  const c = norm(p.city), jc = norm(j.city), city = !!c && (jc.includes(c) || c.includes(jc));
  const workType = !!p.workType && j.type === p.workType;
  const expOk = !((j.minExperience || 0) > (p.experienceYears ?? 0));
  return { score: skillHits * 3 + specHits * 2 + (city ? 2 : 0) + (workType ? 1 : 0) + (expOk ? 0 : -2), skillHits, specHits, city, workType, expOk };
}
const profileOf = (u, b = {}) => ({
  skills: Array.isArray(b.skills) ? b.skills.map(String).slice(0, 20) : u?.skills || [],
  specialties: Array.isArray(b.specialties) ? b.specialties.map(String).slice(0, 30) : u?.specialties || [],
  city: typeof b.city === 'string' ? b.city : u?.city || '', workType: b.workType ?? u?.workType ?? '',
  experienceYears: b.experienceYears ?? u?.experienceYears ?? 0
});

r.get('/', optional, async (q, s) => {
  const { city, type, skill, limit = 50 } = q.query;
  const f = { status: 'open' };
  if (city) f.city = new RegExp(esc(city), 'i');
  if (TYPES.includes(type)) f.type = type;
  if (skill) f.skills = String(skill);
  const jobs = await Job.find(f).sort('-createdAt').limit(Math.min(+limit || 50, 100)).populate('employer', 'company name verified').lean();
  const worker = q.user?.role === 'worker' ? q.user : null;
  const mine = worker?.skills || [], me = worker ? profileOf(worker) : null;
  const done = worker ? new Set((await Application.find({ worker: worker.id, job: { $in: jobs.map((j) => j._id) } }).select('job')).map((a) => String(a.job))) : new Set();
  const out = jobs.map((j) => { const m = me ? score(j, me) : null; return { ...j, match: j.skills.filter((x) => mine.includes(x)).length, score: m?.score ?? 0, applied: done.has(String(j._id)) }; });
  if (mine.length) out.sort((a, b) => b.score - a.score);
  s.json({ jobs: out });
});

// Vacancies for a worker. Works for a signed-in worker or for a draft profile from the spoken pitch.
r.post('/match', optional, async (q, s) => {
  const p = profileOf(q.user?.role === 'worker' ? q.user : null, q.body);
  const jobs = await Job.find({ status: 'open' }).sort('-createdAt').limit(200).populate('employer', 'company name verified').lean();
  const done = q.user?.role === 'worker' ? new Set((await Application.find({ worker: q.user.id }).select('job')).map((a) => String(a.job))) : new Set();
  const ranked = jobs.map((j) => ({ j, m: score(j, p) })).filter((x) => x.m.skillHits > 0).sort((a, b) => b.m.score - a.m.score).slice(0, 12);
  const matched = ranked.length > 0, pick = matched ? ranked : jobs.slice(0, 6).map((j) => ({ j, m: score(j, p) }));
  s.json({ matched, jobs: pick.map(({ j, m }) => ({ ...j, match: m.skillHits, score: m.score, why: { specialties: m.specHits, city: m.city, workType: m.workType, expOk: m.expOk }, applied: done.has(String(j._id)) })) });
});

// A hiring requirement: skills, positions, minimum experience, location, salary range and work type.
// The title is optional (built from the skill), and the details text is read by the NLP to add specialities.
const money = (v) => Math.max(0, Math.min(10_000_000, Math.round(+v) || 0));
r.post('/', need('employer'), async (q, s) => {
  const b = q.body;
  const city = await canonCity(b.city ?? q.user.city);
  const title = String(b.title || '').trim().slice(0, 100), description = String(b.description || '').trim().slice(0, 1000), type = b.type ?? 'full-time';
  if (!String(city).trim()) throw bad('Location is required');
  if (!TYPES.includes(type)) throw bad('Invalid work type');
  // Tag the requirement from its own words (any language) so workers' specialities can match it.
  const text = `${title}. ${description}`.trim();
  const tag = text.length > 2 ? analyze(`${title} ${description}`, (await translateOne(text.slice(0, 600), 'en', 'auto')).text) : { skills: [], specialties: [] };
  const chosen = Array.isArray(b.skills) ? b.skills.map(String).filter((k) => SKILL_KEYS.includes(k)).slice(0, 10) : [];
  const skills = [...new Set([...chosen, ...tag.skills])].slice(0, 10);
  if (!skills.length) throw bad('Choose at least one skill you need');
  const positions = Math.max(1, Math.min(10000, Math.round(+b.positions) || 1));
  let lo = money(b.salaryMin), hi = money(b.salaryMax);
  if (lo && hi && lo > hi) [lo, hi] = [hi, lo];
  const period = SALARY_PERIODS.includes(b.salaryPeriod) ? b.salaryPeriod : 'month';
  const label = skills[0][0].toUpperCase() + skills[0].slice(1);
  const job = await Job.create({
    employer: q.user.id, title: title || `${label} worker${positions > 1 ? 's' : ''} needed`, description, city, type,
    pay: lo || hi ? payLabel(lo, hi, period) : String(b.pay || '').slice(0, 60), salaryMin: lo, salaryMax: hi, salaryPeriod: period,
    skills, specialties: tag.specialties, positions, minExperience: Math.max(0, Math.min(60, +b.minExperience || 0))
  });
  s.status(201).json({ job });
});

r.get('/mine', need('employer'), async (q, s) => {
  const jobs = await Job.find({ employer: q.user.id }).sort('-createdAt').lean();
  const ids = jobs.map((j) => j._id);
  const counts = await Promise.all(jobs.map((j) => Application.countDocuments({ job: j._id })));
  const by = {};
  for (const x of await Hire.aggregate([{ $match: { job: { $in: ids } } }, { $group: { _id: { job: '$job', status: '$status' }, n: { $sum: 1 } } }])) (by[x._id.job] ||= {})[x._id.status] = x.n;
  s.json({ jobs: jobs.map((j, i) => { const h = by[j._id] || {}; return { ...j, applicants: counts[i], shortlisted: h.shortlisted || 0, hired: (h.hired || 0) + (h.completed || 0) }; }) });
});

r.patch('/:id/close', need('employer'), async (q, s) => {
  const j = await Job.findOneAndUpdate({ _id: q.params.id, employer: q.user.id }, { status: 'closed' }, { new: true });
  if (!j) throw bad('Job not found', 404);
  s.json({ job: j });
});

r.get('/:id/applicants', need('employer'), async (q, s) => {
  if (!(await Job.exists({ _id: q.params.id, employer: q.user.id }))) throw bad('Job not found', 404);
  const [list, hires] = await Promise.all([
    Application.find({ job: q.params.id }).sort('-createdAt').populate('worker', 'name phone city skills specialties experienceYears workType pitch ratingSum ratingCount hiredCount noShows').lean(),
    Hire.find({ job: q.params.id }).select('worker status').lean()
  ]);
  const st = new Map(hires.map((h) => [String(h.worker), h.status]));
  s.json({ applicants: list.filter((a) => a.worker).map((a) => { const { ratingSum, ratingCount, hiredCount, noShows, ...w } = a.worker; return { ...a, worker: { ...w, ...credView(a.worker) }, hire: st.get(String(w._id)) || null }; }) });
});

r.post('/:id/apply', need('worker'), async (q, s) => {
  const job = await Job.findOne({ _id: q.params.id, status: 'open' });
  if (!job) throw bad('This job is closed', 404);
  try { await Application.create({ job: job.id, worker: q.user.id }); }
  catch (e) { if (e.code === 11000) throw bad('You already applied', 409); throw e; }
  s.status(201).json({ ok: true });
});

apps.get('/mine', need('worker'), async (q, s) => {
  const list = await Application.find({ worker: q.user.id }).sort('-createdAt').populate({ path: 'job', populate: { path: 'employer', select: 'company phone verified' } });
  s.json({ applications: list.filter((a) => a.job) });
});

apps.patch('/:id', need('employer'), async (q, s) => {
  const a = await Application.findById(q.params.id).populate('job');
  if (!a || String(a.job?.employer) !== q.user.id) throw bad('Not found', 404);
  if (!['accepted', 'rejected'].includes(q.body.status)) throw bad('Invalid status');
  a.status = q.body.status; await a.save();
  s.json({ application: a });
});
export default r;
