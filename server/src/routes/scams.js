import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Scam } from '../models.js';
import { need, optional, bad } from '../middleware.js';
const r = Router();
const post = rateLimit({ windowMs: 3600_000, limit: 10, message: { error: 'Too many reports. Please try again later.' } });
const view = (x, u) => ({
  _id: x._id, kind: x.kind, description: x.description, city: x.city, status: x.status, createdAt: x.createdAt,
  confirmations: x.confirmations.length, confirmed: !!u && x.confirmations.some((c) => String(c) === u.id)
});

r.get('/', optional, async (q, s) => {
  const f = q.user?.role === 'admin' ? {} : { status: { $ne: 'rejected' } };
  const list = await Scam.find(f).sort('-createdAt').limit(100);
  s.json({ scams: list.map((x) => view(x, q.user)) });
});

r.post('/', post, optional, async (q, s) => {
  const { kind = 'other', description = '', city = '' } = q.body;
  if (description.trim().length < 10) throw bad('Please describe what happened (at least 10 characters)');
  const x = await Scam.create({ kind, description: description.trim(), city: String(city).trim(), reporter: q.user?.id });
  s.status(201).json({ scam: view(x, q.user) });
});

// Community confirmation: 3 independent confirmations auto-verify a warning
r.post('/:id/confirm', need(), async (q, s) => {
  const x = await Scam.findById(q.params.id);
  if (!x || x.status === 'rejected') throw bad('Not found', 404);
  if (!x.confirmations.some((c) => String(c) === q.user.id) && String(x.reporter) !== q.user.id) x.confirmations.push(q.user.id);
  if (x.confirmations.length >= 3 && x.status === 'pending') x.status = 'verified';
  await x.save();
  s.json({ scam: view(x, q.user) });
});

r.patch('/:id', need('admin'), async (q, s) => {
  if (!['verified', 'rejected', 'pending'].includes(q.body.status)) throw bad('Invalid status');
  const x = await Scam.findByIdAndUpdate(q.params.id, { status: q.body.status }, { new: true });
  if (!x) throw bad('Not found', 404);
  s.json({ scam: view(x, q.user) });
});
export default r;
