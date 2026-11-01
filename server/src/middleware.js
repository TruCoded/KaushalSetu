import jwt from 'jsonwebtoken';
import { User } from './models.js';
const secret = () => process.env.JWT_SECRET || 'dev-secret-change-me';
export const sign = (u) => jwt.sign({ id: u.id }, secret(), { expiresIn: '30d' });
async function load(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try { return await User.findById(jwt.verify(h.slice(7), secret()).id); } catch { return null; }
}
export const optional = async (req, _res, next) => { req.user = await load(req); next(); };
export const need = (...roles) => async (req, res, next) => {
  const u = await load(req);
  if (!u) return res.status(401).json({ error: 'Please sign in first' });
  if (roles.length && !roles.includes(u.role)) return res.status(403).json({ error: 'This is not available for your account type' });
  req.user = u; next();
};
export const bad = (m, status = 400) => Object.assign(new Error(m), { status });
export const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
