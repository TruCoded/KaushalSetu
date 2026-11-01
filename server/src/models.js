import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const ref = (to, extra = {}) => ({ type: Schema.Types.ObjectId, ref: to, ...extra });

const user = new Schema({
  role: { type: String, enum: ['worker', 'employer', 'admin', 'partner'], required: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  city: { type: String, trim: true, default: '' },
  language: { type: String, default: 'hi', maxlength: 12 }, // any language code, e.g. hi, pa, ta, bn, es
  skills: [String],
  specialties: [String],
  experienceYears: { type: Number, default: 0 },
  workType: { type: String, default: '' },
  occupation: { type: String, default: '', maxlength: 40 }, // work outside the skill catalogue, e.g. "security guard"
  state: { type: String, default: '' },
  shift: { type: String, enum: ['', 'day', 'evening', 'night', 'any'], default: '' },
  relocate: { type: Boolean, default: null }, // ready to move to another city for work (null = not said)
  registeredBy: { type: Schema.Types.ObjectId, ref: 'User' }, // Community Partner who registered this worker by voice
  consentAt: Date, // when the worker agreed to be registered by the partner
  pitch: { type: String, default: '', maxlength: 600 }, // worker's spoken pitch, stored in English and translated on display
  company: String,
  verified: { type: Boolean, default: false },
  // worker track record, refreshed from Hire records (routes/hires.js); credibility is computed from these
  ratingSum: { type: Number, default: 0 }, ratingCount: { type: Number, default: 0 }, hiredCount: { type: Number, default: 0 }, noShows: { type: Number, default: 0 }
}, { timestamps: true });
user.index({ role: 1, skills: 1 });
user.set('toJSON', { transform: (_d, r) => { delete r.passwordHash; delete r.__v; return r; } });

const job = new Schema({
  employer: ref('User', { required: true }),
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  skills: [String],
  specialties: [String],
  minExperience: { type: Number, default: 0 },
  positions: { type: Number, default: 1 },
  city: { type: String, required: true, trim: true },
  pay: { type: String, default: '' }, // display text, built from the salary range below
  salaryMin: { type: Number, default: 0 }, salaryMax: { type: Number, default: 0 },
  salaryPeriod: { type: String, enum: ['month', 'day', 'piece'], default: 'month' },
  filled: { type: Number, default: 0 }, // positions already filled by hires
  type: { type: String, enum: ['full-time', 'part-time', 'home-based'], default: 'full-time' },
  status: { type: String, enum: ['open', 'closed'], default: 'open' }
}, { timestamps: true });

const application = new Schema({
  job: ref('Job', { required: true }),
  worker: ref('User', { required: true }),
  status: { type: String, enum: ['applied', 'accepted', 'rejected'], default: 'applied' }
}, { timestamps: true });
application.index({ job: 1, worker: 1 }, { unique: true });

// A shortlist entry or a hire of one worker for one requirement. The fee and the partner's share are fixed at hire time.
const hire = new Schema({
  job: ref('Job', { required: true }), employer: ref('User', { required: true }), worker: ref('User', { required: true }),
  partner: ref('User'), // Community Partner who registered the worker (gets a share of the fee)
  status: { type: String, enum: ['shortlisted', 'hired', 'completed'], default: 'shortlisted' }, // completed = hired and rated
  salary: { type: Number, default: 0 }, // monthly-equivalent pay the fee was based on
  feePct: { type: Number, default: 0 }, partnerPct: { type: Number, default: 0 },
  fee: { type: Number, default: 0 }, partnerShare: { type: Number, default: 0 }, platformShare: { type: Number, default: 0 },
  feeStatus: { type: String, enum: ['due', 'paid'], default: 'due' },
  hiredAt: Date,
  rating: { type: Number, min: 1, max: 5 }, feedback: { type: String, default: '', maxlength: 300 }, showedUp: Boolean, ratedAt: Date
}, { timestamps: true });
hire.index({ job: 1, worker: 1 }, { unique: true });
hire.index({ employer: 1, job: 1 });
hire.index({ worker: 1, status: 1 });
hire.index({ partner: 1 });

const scam = new Schema({
  reporter: ref('User'),
  kind: { type: String, enum: ['fee', 'fakejob', 'documents', 'other'], default: 'other' },
  description: { type: String, required: true, maxlength: 1000 },
  city: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  confirmations: [ref('User')]
}, { timestamps: true });

const translation = new Schema({ key: { type: String, unique: true, index: true }, out: String, det: String }, { timestamps: true });

export const Translation = model('Translation', translation);
export const User = model('User', user);
export const Job = model('Job', job);
export const Application = model('Application', application);
export const Hire = model('Hire', hire);
export const Scam = model('Scam', scam);
