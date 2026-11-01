import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { translateMany, LANG_RE } from '../translate.js';
import { bad } from '../middleware.js';
const r = Router();
r.use(rateLimit({ windowMs: 60_000, limit: 90, message: { error: 'Too many translations. Please wait a moment.' } }));

// POST { tl: 'ta', sl?: 'auto', texts: ['Hello', ...] }  ->  { texts: [...], ok }
r.post('/', async (q, s) => {
  const { tl, sl = 'auto', texts } = q.body;
  if (!LANG_RE.test(String(tl))) throw bad('Invalid language');
  if (!Array.isArray(texts) || !texts.length || texts.length > 80) throw bad('Send 1 to 80 texts');
  if (sl !== 'auto' && !LANG_RE.test(String(sl))) throw bad('Invalid source language');
  const list = texts.map((x) => String(x ?? '').slice(0, 1000));
  if (list.reduce((n, x) => n + x.length, 0) > 12000) throw bad('Too much text');
  s.json(await translateMany(list, tl, sl));
});
export default r;
