import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Job, Scam, Application, Hire } from './models.js';
await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kaushalsetu');
await Promise.all([User, Job, Scam, Application, Hire].map((m) => m.deleteMany({})));
const h = (p) => bcrypt.hash(p, 10);
await User.create({ role: 'admin', name: 'Admin', phone: '9999999999', passwordHash: await h('admin123') });
await User.create({ role: 'partner', name: 'Community Partner', phone: '9111111111', city: 'Ludhiana', passwordHash: await h('partner123') });
const e1 = await User.create({ role: 'employer', name: 'Anita Sharma', company: 'Sharma Boutique', phone: '9876543210', city: 'Chandigarh', verified: true, passwordHash: await h('employer123') });
const e2 = await User.create({ role: 'employer', name: 'Ravi Kumar', company: 'Style Garments', phone: '9876543211', city: 'Ludhiana', verified: true, passwordHash: await h('employer123') });
await User.create({ role: 'worker', name: 'Suman Devi', phone: '9812345678', city: 'Chandigarh', skills: ['tailoring', 'embroidery'], specialties: ['blouse stitching', 'embroidery work', 'hand embroidery'], pitch: 'I work in tailoring and embroidery with 5 years of experience. I am skilled in blouse stitching and hand embroidery. I am looking for work from home in Chandigarh.', experienceYears: 5, workType: 'home-based', language: 'pa', passwordHash: await h('worker123') });
const partner = await User.findOne({ role: 'partner' });
const pw = await h('worker123');
const W = (o) => User.create({ role: 'worker', passwordHash: pw, language: 'hi', ...o });
const rani = await W({ name: 'Rani Kaur', phone: '9812345601', city: 'Ludhiana', state: 'Punjab', skills: ['tailoring'], specialties: ['factory and bulk stitching', 'suit and salwar stitching'], experienceYears: 4, workType: 'full-time', relocate: true, registeredBy: partner.id, consentAt: new Date(), pitch: 'I do tailoring with 4 years of experience, mostly factory stitching.', ratingSum: 9, ratingCount: 2, hiredCount: 2 });
const kamal = await W({ name: 'Kamal Singh', phone: '9812345602', city: 'Chandigarh', state: 'Chandigarh', skills: ['tailoring'], specialties: ['suit and salwar stitching', 'alterations'], experienceYears: 8, workType: 'full-time', pitch: 'Boutique tailor, 8 years. Suits, salwars and alterations.', ratingSum: 14, ratingCount: 3, hiredCount: 3 });
await W({ name: 'Geeta Rani', phone: '9812345603', city: 'Mohali', state: 'Punjab', skills: ['embroidery', 'tailoring'], specialties: ['hand embroidery'], experienceYears: 2, workType: 'home-based', relocate: false, registeredBy: partner.id, consentAt: new Date(), pitch: 'Hand embroidery for 2 years, looking for work from home.' });
await W({ name: 'Harpreet Singh', phone: '9812345604', city: 'Ludhiana', state: 'Punjab', skills: ['tailoring', 'handicraft'], specialties: ['factory and bulk stitching'], experienceYears: 6, workType: 'full-time', relocate: true, pitch: 'Factory stitching supervisor for 6 years.', ratingSum: 5, ratingCount: 1, hiredCount: 1 });
await W({ name: 'Meena Devi', phone: '9812345605', city: 'Ropar', state: 'Punjab', skills: ['cooking', 'cleaning'], experienceYears: 3, workType: 'part-time', pitch: 'Cooking and cleaning, 3 years, morning shift.' });
await Job.insertMany([
  { employer: e1.id, title: 'Boutique Tailor', city: 'Chandigarh', pay: '₹14,000/month', salaryMin: 14000, salaryMax: 14000, type: 'full-time', skills: ['tailoring'], specialties: ['suit and salwar stitching', 'alterations'], minExperience: 2, positions: 2, description: 'Ladies suit stitching and alterations.' },
  { employer: e2.id, title: 'Garment Factory Helper', city: 'Ludhiana', pay: '₹12,000/month', salaryMin: 12000, salaryMax: 12000, type: 'full-time', skills: ['tailoring', 'handicraft'], specialties: ['factory and bulk stitching'], minExperience: 1, positions: 100, description: 'Cutting, stitching and finishing. 100 workers needed.' },
  { employer: e1.id, title: 'Home-based Stitching', city: 'Chandigarh', pay: '₹350/piece', salaryMin: 350, salaryMax: 350, salaryPeriod: 'piece', type: 'home-based', skills: ['tailoring', 'embroidery'], specialties: ['blouse stitching', 'hand embroidery'], minExperience: 1, positions: 5, description: 'Take work home, weekly pickup.' },
  { employer: e2.id, title: 'Kitchen Helper', city: 'Ludhiana', pay: '₹10,000/month', salaryMin: 10000, salaryMax: 10000, type: 'part-time', skills: ['cooking', 'cleaning'], description: 'Morning shift, meals provided.' }
]);
const seeded = await Job.find().lean(), jb = seeded.find((j) => j.title === 'Garment Factory Helper'), jt = seeded.find((j) => j.title === 'Boutique Tailor');
const past = (job, worker, rating, hasPartner) => Hire.create({ job: job._id, employer: job.employer, worker: worker.id, partner: hasPartner ? partner.id : undefined, status: 'completed', hiredAt: new Date(), ratedAt: new Date(), rating, showedUp: true, feedback: 'Reliable and on time.', salary: job.salaryMin, feePct: 10, partnerPct: hasPartner ? 30 : 0, fee: Math.round(job.salaryMin / 10), partnerShare: hasPartner ? Math.round(job.salaryMin / 10 * 0.3) : 0, platformShare: Math.round(job.salaryMin / 10) - (hasPartner ? Math.round(job.salaryMin / 10 * 0.3) : 0), feeStatus: 'paid' });
await past(jb, rani, 5, true); await past(jt, kamal, 4, false);
await Job.updateMany({ _id: { $in: [jb._id, jt._id] } }, { $inc: { filled: 1 } });
await Scam.insertMany([
  { kind: 'fee', description: 'Caller said: pay ₹500 to get a job letter. Real employers never ask for fees.', city: 'Ludhiana', status: 'verified' },
  { kind: 'documents', description: 'Asked for my Aadhaar and OTP for a "data entry job".', city: 'Chandigarh', status: 'verified' }
]);
console.log('Seeded. Admin 9999999999/admin123 · Partner 9111111111/partner123 · Employer 9876543210/employer123 · Worker 9812345678/worker123');
await mongoose.disconnect();
