import { Router } from 'express';
import mongoose from 'mongoose';
import { Job, Hire, User, Application } from '../models.js';
import { need, bad } from '../middleware.js';
import { SKILL_KEYS } from '../nlp.js';
import { calcFee, rankWorker, workerCard, credView } from '../hiring.js';

const r = Router();             // mounted at /api/hires
export const workers = Router(); // mounted at /api/workers
const TYPES = ['full-time', 'part-time', 'home-based'];
const oid = (v, what) => { if (!mongoose.isValidObjectId(v)) throw bad(`Invalid ${what}`); return String(v); };
const list = (v) => [].concat(v ?? []).flatMap((x) => String(x).split(',')).map((x) => x.trim()).filter(Boolean);
const CARD = 'name city state skills specialties occupation experienceYears workType shift relocate pitch registeredBy ratingSum ratingCount hiredCount noShows';

// ---------------------------------------------------------------------------------------------
// GET /api/workers/match  -> ranked pool of workers for a hiring requirement (employer only)
//   ?job=<id>                                use a saved requirement (anything below overrides it)
//   ?skills=tailoring,embroidery  &specialties=blouse stitching  &city=Ludhiana  &minExperience=3  &workType=full-time
//   &strict=1                                only workers who meet the minimum experience and are in the city (or ready to move)
//   &limit=50                                (max 200)
// Phone numbers are not included: they appear once the worker is shortlisted (GET /api/hires).
// ---------------------------------------------------------------------------------------------
workers.get('/match', need('employer'), async (q, s) => {
  let rq = { skills: [], specialties: [], city: '', workType: '', minExperience: 0 }, job = null;
  if (q.query.job) {
    job = await Job.findOne({ _id: oid(q.query.job, 'job'), employer: q.user.id }).lean();
    if (!job) throw bad('Job not found', 404);
    rq = { skills: job.skills || [], specialties: job.specialties || [], city: job.city || '', workType: job.type || '', minExperience: job.minExperience || 0 };
  }
  if (q.query.skills) rq.skills = list(q.query.skills);
  if (q.query.specialties) rq.specialties = list(q.query.specialties).slice(0, 30);
  if (typeof q.query.city === 'string') rq.city = q.query.city.trim();
  if (q.query.workType !== undefined) rq.workType = TYPES.includes(q.query.workType) ? q.query.workType : '';
  if (q.query.minExperience !== undefined) rq.minExperience = Math.max(0, Math.min(60, +q.query.minExperience || 0));
  rq.skills = [...new Set(rq.skills.filter((k) => SKILL_KEYS.includes(k)))];
  if (!rq.skills.length) throw bad('Choose at least one skill to search for');
  const strict = ['1', 'true'].includes(String(q.query.strict)), limit = Math.max(1, Math.min(+q.query.limit || 50, 200));

  const found = await User.find({ role: 'worker', skills: { $in: rq.skills } }).select(CARD).limit(2000).lean();
  const state = job ? new Map((await Hire.find({ job: job._id }).select('worker status').lean()).map((h) => [String(h.worker), h.status])) : new Map();
  let rows = found.map((w) => ({ w, m: rankWorker(rq, w) }));
  if (strict) rows = rows.filter(({ m }) => m.expOk && (!rq.city || m.city || m.relocate));
  rows.sort((a, b) => b.m.score - a.m.score || b.m.credibility - a.m.credibility || (b.w.experienceYears || 0) - (a.w.experienceYears || 0));
  s.json({
    requirement: { ...rq, positions: job?.positions ?? null, filled: job?.filled ?? null },
    total: rows.length, feeEstimate: job ? calcFee(job, false).fee : null,
    workers: rows.slice(0, limit).map(({ w, m }) => workerCard(w, m, state.get(String(w._id)) || null))
  });
});

// ---------------------------------------------------------------------------------------------
// Worker track record: recomputed from the Hire records every time, so it can never drift.
// ---------------------------------------------------------------------------------------------
async function refreshStats(workerId) {
  const [a] = await Hire.aggregate([
    { $match: { worker: new mongoose.Types.ObjectId(String(workerId)), status: { $in: ['hired', 'completed'] } } },
    { $group: {
      _id: null, hired: { $sum: 1 },
      rated: { $sum: { $cond: [{ $gt: ['$rating', 0] }, 1, 0] } }, sum: { $sum: { $ifNull: ['$rating', 0] } },
      noShows: { $sum: { $cond: [{ $eq: ['$showedUp', false] }, 1, 0] } }
    } }
  ]);
  await User.updateOne({ _id: workerId }, { hiredCount: a?.hired || 0, ratingCount: a?.rated || 0, ratingSum: a?.sum || 0, noShows: a?.noShows || 0 });
}

// Shortlist or hire one worker for one requirement. Hiring takes a position atomically, so two clicks (or two
// browser tabs) can never fill more positions than the employer asked for. The last position closes the requirement.
async function act(employer, jobId, workerId, action) {
  const job = await Job.findOne({ _id: oid(jobId, 'job'), employer: employer.id });
  if (!job) throw bad('Job not found', 404);
  const worker = await User.findOne({ _id: oid(workerId, 'worker'), role: 'worker' });
  if (!worker) throw bad('Worker not found', 404);
  if (job.status !== 'open') throw bad('This requirement is closed', 409);
  const cur = await Hire.findOne({ job: job.id, worker: worker.id });
  if (cur && cur.status !== 'shortlisted') throw bad('This worker is already hired', 409);
  const base = { job: job.id, employer: employer.id, worker: worker.id, partner: worker.registeredBy };

  if (action === 'shortlist') {
    if (cur) return cur;
    try { return await Hire.create({ ...base, status: 'shortlisted' }); }
    catch (e) { if (e.code === 11000) return Hire.findOne({ job: job.id, worker: worker.id }); throw e; }
  }

  const slot = await Job.findOneAndUpdate({ _id: job.id, status: 'open', $expr: { $lt: ['$filled', '$positions'] } }, { $inc: { filled: 1 } }, { new: true });
  if (!slot) throw bad('All positions are already filled', 409);
  const terms = { status: 'hired', hiredAt: new Date(), ...calcFee(job, !!worker.registeredBy) };
  let h;
  try {
    h = cur ? await Hire.findOneAndUpdate({ _id: cur.id, status: 'shortlisted' }, terms, { new: true }) : await Hire.create({ ...base, ...terms });
    if (!h) throw bad('This worker is already hired', 409);
  } catch (e) {
    await Job.updateOne({ _id: job.id }, { $inc: { filled: -1 } }); // give the position back
    throw e.code === 11000 ? bad('This worker is already hired', 409) : e;
  }
  if (slot.filled >= slot.positions) await Job.updateOne({ _id: job.id }, { status: 'closed' });
  await Application.updateOne({ job: job.id, worker: worker.id }, { status: 'accepted' });
  await refreshStats(worker.id);
  return h;
}

// POST /api/hires  { job, worker, action: 'shortlist' | 'hire' }
r.post('/', need('employer'), async (q, s) => {
  const action = q.body.action;
  if (!['shortlist', 'hire'].includes(action)) throw bad('Action must be shortlist or hire');
  const hire = await act(q.user, q.body.job, q.body.worker, action);
  s.status(201).json({ hire });
});

// POST /api/hires/bulk  { job, workers: [ids], action }  (bulk hiring: shortlist or hire many at once, up to 200)
r.post('/bulk', need('employer'), async (q, s) => {
  const action = q.body.action;
  if (!['shortlist', 'hire'].includes(action)) throw bad('Action must be shortlist or hire');
  const ids = [...new Set(list(q.body.workers))].slice(0, 200);
  if (!ids.length) throw bad('Choose at least one worker');
  const done = [], failed = [];
  for (const id of ids) {
    try { await act(q.user, q.body.job, id, action); done.push(id); }
    catch (e) { if (!e.status) throw e; failed.push({ worker: id, error: e.message }); if (/filled|closed/.test(e.message)) break; }
  }
  s.json({ done, failed, skipped: ids.length - done.length - failed.length });
});

// GET /api/hires?job=<id>  -> this employer's shortlist and hires, with phone numbers (visible once shortlisted)
r.get('/', need('employer'), async (q, s) => {
  const f = { employer: q.user.id };
  if (q.query.job) f.job = oid(q.query.job, 'job');
  const rows = await Hire.find(f).sort('-createdAt').limit(500).populate('worker', 'phone ' + CARD).populate('job', 'title city').lean();
  const hires = rows.filter((h) => h.worker).map((h) => { const { ratingSum, ratingCount, hiredCount, noShows, registeredBy, ...w } = h.worker; return { ...h, worker: { ...w, partnerRegistered: !!registeredBy, ...credView(h.worker) } }; });
  const paid = hires.filter((h) => h.status !== 'shortlisted');
  s.json({ hires, totals: { hired: paid.length, fee: paid.reduce((n, h) => n + h.fee, 0) } });
});

// PATCH /api/hires/:id/rate  { rating: 1-5, feedback?, showedUp? }  (once, only for a hired worker)
r.patch('/:id/rate', need('employer'), async (q, s) => {
  const h = await Hire.findOne({ _id: oid(q.params.id, 'hire'), employer: q.user.id });
  if (!h) throw bad('Not found', 404);
  if (h.status === 'completed') throw bad('You have already rated this worker', 409);
  if (h.status !== 'hired') throw bad('Hire the worker before rating', 409);
  const rating = Math.round(+q.body.rating);
  if (!(rating >= 1 && rating <= 5)) throw bad('Rating must be 1 to 5');
  const upd = await Hire.findOneAndUpdate({ _id: h.id, status: 'hired' },
    { rating, feedback: String(q.body.feedback || '').trim().slice(0, 300), showedUp: q.body.showedUp !== false, status: 'completed', ratedAt: new Date() }, { new: true });
  if (!upd) throw bad('You have already rated this worker', 409);
  await refreshStats(h.worker);
  s.json({ hire: upd });
});

// DELETE /api/hires/:id  -> take a worker off the shortlist (a hire cannot be undone: a fee was recorded)
r.delete('/:id', need('employer'), async (q, s) => {
  const h = await Hire.findOneAndDelete({ _id: oid(q.params.id, 'hire'), employer: q.user.id, status: 'shortlisted' });
  if (!h) throw bad('Only a shortlisted worker can be removed', 404);
  s.json({ ok: true });
});

// GET /api/hires/partner  -> hires of the workers a Community Partner registered, and their share of the fees
r.get('/partner', need('partner', 'admin'), async (q, s) => {
  const f = { status: { $in: ['hired', 'completed'] }, ...(q.user.role === 'partner' && { partner: q.user.id }) };
  const hires = await Hire.find(f).sort('-hiredAt').limit(500).populate('worker', 'name city').populate('job', 'title city').populate('employer', 'company').lean();
  const sum = (xs, k) => xs.reduce((n, x) => n + x[k], 0);
  s.json({ hires, totals: { hires: hires.length, partnerShare: sum(hires, 'partnerShare'), paidShare: sum(hires.filter((h) => h.feeStatus === 'paid'), 'partnerShare'), platformShare: sum(hires, 'platformShare') } });
});

// PATCH /api/hires/:id/fee  { status: 'paid' | 'due' }  (admin records that the employer paid the fee)
r.patch('/:id/fee', need('admin'), async (q, s) => {
  if (!['paid', 'due'].includes(q.body.status)) throw bad('Invalid status');
  const h = await Hire.findOneAndUpdate({ _id: oid(q.params.id, 'hire'), status: { $in: ['hired', 'completed'] } }, { feeStatus: q.body.status }, { new: true });
  if (!h) throw bad('Not found', 404);
  s.json({ hire: h });
});

export default r;
