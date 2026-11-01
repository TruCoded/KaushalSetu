import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { User } from '../models.js';
import { sign, need, bad } from '../middleware.js';
import { makePassword } from '../password.js';
import { canonCity } from '../translate.js';
import { STATES, cleanDraft, usable, fieldsOf } from '../nlp.js';
const r = Router();
const LANG = /^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$/;
const tries = rateLimit({ windowMs: 15 * 60_000, limit: 30, message: { error: 'Too many tries. Please wait a few minutes and try again.' } });

r.post('/check-phone', async (q, s) => {
  const phone = String(q.body.phone || '');
  s.json({ valid: /^\d{10}$/.test(phone), exists: /^\d{10}$/.test(phone) && !!(await User.exists({ phone })) });
});

r.post('/register', async (q, s) => {
  const { role, name = '', phone = '', city = '', language = 'hi', company = '' } = q.body;
  // No OTP (paid SMS). If the person leaves the password empty we generate an easy 6-digit one and show it once.
  const given = String(q.body.password || ''), generated = given ? '' : makePassword(), password = given || generated;
  if (!['worker', 'employer', 'partner'].includes(role)) throw bad('Choose worker, employer, or partner');
  if (!name.trim()) throw bad('Please enter your name');
  if (!/^\d{10}$/.test(phone)) throw bad('Enter a 10-digit mobile number');
  if (password.length < 6) throw bad('Password needs at least 6 characters');
  if (role === 'employer' && !company.trim()) throw bad('Please enter your business name');
  if (await User.exists({ phone })) throw bad('This number is already registered', 409);
  let workerFields = {};
  if (role === 'worker' && q.body.draft) {
    const d = cleanDraft(q.body.draft);
    if (usable(d)) workerFields = fieldsOf(d);
  }
  const u = await User.create({
    role, name: name.trim(), phone, city: await canonCity(city || workerFields.city || ''), company: role === 'employer' ? company : undefined,
    language: LANG.test(language) ? language : 'pa',
    ...workerFields,
    passwordHash: await bcrypt.hash(password, 10)
  });
  s.status(201).json({ token: sign(u), user: u, ...(generated && { password: generated }) });
});

r.post('/login', tries, async (q, s) => {
  const { phone = '', password = '', role } = q.body;
  const u = await User.findOne({ phone });
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) throw bad('Wrong number or password', 401);
  if (role && u.role !== role && u.role !== 'admin' && u.role !== 'partner') throw bad(`This number is registered as ${u.role === 'worker' ? 'a worker' : 'an employer'}. Use the other tab.`, 403);
  s.json({ token: sign(u), user: u });
});

r.get('/me', need(), (q, s) => s.json({ user: q.user }));

r.put('/me', need(), async (q, s) => {
  const b = q.body, u = q.user;
  if (typeof b.name === 'string' && b.name.trim()) u.name = b.name.trim();
  if (typeof b.city === 'string') u.city = await canonCity(b.city);
  if (LANG.test(String(b.language))) u.language = b.language;
  if (u.role === 'worker') {
    if (Array.isArray(b.skills)) u.skills = [...new Set(b.skills.map(String))].slice(0, 20);
    if (Array.isArray(b.specialties)) u.specialties = [...new Set(b.specialties.map((x) => String(x).slice(0, 60)))].slice(0, 30);
    if (typeof b.pitch === 'string') u.pitch = b.pitch.slice(0, 600);
    if (Number.isFinite(+b.experienceYears)) u.experienceYears = Math.max(0, Math.min(60, +b.experienceYears));
    if (['', 'full-time', 'part-time', 'home-based'].includes(b.workType)) u.workType = b.workType;
    if (typeof b.occupation === 'string') u.occupation = b.occupation.replace(/[^\p{L}\s'-]/gu, '').trim().slice(0, 40);
    if (typeof b.state === 'string') u.state = STATES.includes(b.state) ? b.state : '';
    if (['', 'day', 'evening', 'night', 'any'].includes(b.shift)) u.shift = b.shift;
    if (b.relocate === true || b.relocate === false || b.relocate === null) u.relocate = b.relocate;
  }
  if (u.role === 'employer' && typeof b.company === 'string' && b.company.trim()) u.company = b.company.trim();
  await u.save();
  s.json({ user: u });
});

// Admin marks an employer as verified (shows a green badge on their jobs)
r.patch('/verify/:id', need('admin'), async (q, s) => {
  const u = await User.findOneAndUpdate({ _id: q.params.id, role: 'employer' }, { verified: !!q.body.verified }, { new: true });
  if (!u) throw bad('Employer not found', 404);
  s.json({ user: u });
});

// Admin (or a Community Partner working through the admin) gives a person a fresh password when they forget it.
r.post('/admin/reset', need('admin'), async (q, s) => {
  const u = await User.findOne({ phone: String(q.body.phone || '') });
  if (!u || u.role === 'admin') throw bad('User not found', 404);
  const password = q.body.password ? String(q.body.password) : makePassword();
  if (password.length < 6) throw bad('Password needs at least 6 characters');
  u.passwordHash = await bcrypt.hash(password, 10); await u.save();
  s.json({ phone: u.phone, password });
});
export default r;
