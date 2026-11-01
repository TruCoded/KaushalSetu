import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import auth from './routes/auth.js';
import jobs, { apps } from './routes/jobs.js';
import hires, { workers } from './routes/hires.js';
import scams from './routes/scams.js';
import voice from './routes/voice.js';
import translate from './routes/translate.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '200kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 150 }));
app.get('/api/health', (_q, s) => s.json({ ok: true }));
app.use('/api/auth', auth);
app.use('/api/jobs', jobs);
app.use('/api/applications', apps);
app.use('/api/hires', hires);
app.use('/api/workers', workers);
app.use('/api/scams', scams);
app.use('/api/voice', voice);
app.use('/api/translate', translate);
app.use((e, _q, s, _n) => {
  if (!e.status) console.error(e);
  s.status(e.status || 500).json({ error: e.status ? e.message : 'Something went wrong. Please try again.' });
});

await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kaushalsetu');
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`KaushalSetu API on :${port}`));
