# KaushalSetu — Skills to Opportunities

Voice-first MERN platform that connects informal workers with industries. Worker, employer and admin roles.
**Any language** on screen, in speech and in answers. No paid services and no API keys.

## Run it
Requirements: Node 18+, MongoDB (local or Atlas URI).
```bash
npm run install:all
cp server/.env.example server/.env      # set JWT_SECRET, MONGO_URI
npm run seed                            # demo data
npm run server                          # terminal 1 → http://localhost:5000
npm run client                          # terminal 2 → http://localhost:5173
npm test                                # server tests (NLP, translation, voice flow)
```
Demo logins (seed): worker `9812345678 / worker123`, employer `9876543210 / employer123`, admin `9999999999 / admin123`.
Use **Chrome** (desktop or Android) for the microphone.

## What changed in this version
- **Bhashini removed.** Speech-to-text and text-to-speech use the browser (Web Speech API).
- **Every language.** 🌐 picker with ~85 languages. Hindi, Punjabi and English are hand-written; every other language is translated once through Google's unofficial endpoint
  (`translate.googleapis.com/translate_a/single?client=gtx…`), cached on the server (memory + MongoDB) and on the device. User-written text (job titles, pitches, scam reports) is translated for whoever is reading.
- **Spoken job pitch (`client/src/Pitch.jsx`, `POST /api/voice/pitch`).** The worker speaks in their language → translated to English → NLP (`server/src/nlp.js`) extracts work, speciality, experience, work type and place →
  anything missing is asked back **by voice in the worker's language** (e.g. "tailoring" → *which kind: blouse, suits, alterations, bridal, factory…?* → *how many years?*) → improvement tips are shown/spoken in their language →
  a first-person pitch is saved (English, translated on display for employers) → matching **vacancies** are shown and read aloud.
  A question that cannot be understood is asked twice, then skipped, so the conversation never loops.
- **No OTP.** Phone + password. If the person does not want to type one, a **🎲 auto-generated 6-digit password** is created (default), shown in large digits with 🔊 read-aloud, copy and WhatsApp share.
  Name and village boxes have a 🎤 button. Forgotten passwords: admin / Community Partner calls `POST /api/auth/admin/reset {phone}` (admin token) and gives the new password. Login is rate-limited.
- **Vacancy tagging and matching.** Jobs get `specialties`, `minExperience`, `positions` (bulk hiring). Posting a job auto-tags it from its text (any language). `POST /api/jobs/match` ranks by skills ×3, specialities ×2, city, work type, experience.

## Voice, AI and worker profile (Person 2)
- **Stage 2, understanding the answer** (`server/src/nlp.js`, the "skills" module). Besides skills, specialities, years and full/part/home work type it now extracts **location** (city or village *and* state, also from a sentence like "I live in Ropar, Punjab"), **work preference** (shift: day / evening / night / any; ready to move to another city: yes / no; both are captured when mentioned, never asked, so the interview does not get longer) and an **occupation** that is not in the catalogue ("security guard"). A free-text occupation counts as the "work" answer so the interview moves on instead of asking twice.
- **Stage 3, review and confirm** (`POST /api/voice/review`, `client/src/Review.jsx`, `Pitch.jsx`). When the interview is complete the AI reads back what it understood (in the speaker's language), asks *"Is this correct?"* and listens for yes / no (typed or buttons work too). **Nothing is saved before "yes".** "No" opens an edit form, then it reads back again. Saving goes through `POST /api/voice/profile` (needs `confirmed: true`; the pitch is rebuilt on the server). A person who is not signed in keeps the confirmed draft, and it is adopted at sign-up; half-finished drafts are never adopted.
- **Partner registers a worker** (`client/src/Partner.jsx`, role `partner`, seed login `9111111111 / partner123`). Step 1: worker's name and mobile number (🎤 works for both: "nine eight one two…" becomes 9812345678), the language the worker speaks, and a tick that the worker agrees. Step 2: the same interview, but the AI asks about the worker ("Which work does Rani do?") in the *partner's* language, with no tips. Step 3: the read-back (also playable in the worker's language), then `POST /api/voice/partner/register` creates the worker with an auto 6-digit password; the partner hands over phone + password (listen, copy, WhatsApp). The account records `registeredBy` and `consentAt`. The partner sees a list of the workers they registered.
- **Bhashini**. Nothing changes until `BHASHINI_API_KEY` is set **and** `server/src/bhashini.js` exists. Then `GET /api/voice/engine` reports `bhashini`, `client/src/speech.js` records a short clip (stops by itself after a pause, 12 s max) and sends it to `POST /api/voice/stt`; if Bhashini fails or is slow it falls back to the browser microphone engine for that turn. Contract for `bhashini.js` (ES module):
  ```js
  export async function stt({ audio /* Buffer */, mime, lang /* 'hi', 'pa'… */ }) { return 'recognised text'; }
  export async function tts({ text, lang }) { return { audio: Buffer, mime: 'audio/mpeg' }; } // optional; used by /api/voice/tts before the Google fallback
  ```

## Employer hiring engine (Person 3)
The employer dashboard is no longer a job form. It is a **hiring requirement → ranked pool → shortlist → hire → rating** flow (`client/src/Work.jsx` `EmployerDash`, `server/src/routes/jobs.js`, `server/src/routes/hires.js`, pure logic in `server/src/hiring.js`).

| Endpoint (employer token) | What it does |
| --- | --- |
| `POST /api/jobs` | Publish a requirement: `skills[]`, `positions`, `minExperience`, `city`, `salaryMin`/`salaryMax`/`salaryPeriod` (`month`/`day`/`piece`), `type`, optional `title`/`description` (the text is NLP-tagged for specialities). At least one skill is required. The `pay` label is built from the salary range. |
| `GET /api/workers/match` | Ranked pool. `?job=<id>` or `?skills=tailoring,embroidery&specialties=…&city=Ludhiana&minExperience=3&workType=full-time`, optional `strict=1` (hard-filter on experience and city), `limit` (≤200). Returns `fit` %, credibility, rating and the worker's hire state for that job. **No phone numbers** until shortlisted. |
| `POST /api/hires` `{job, worker, action}` | `shortlist` or `hire`. Hiring takes a position **atomically** (never more hires than `positions`) and closes the requirement when the last one is filled. Creates/updates the **Hire** with `fee`, `partnerShare`, `platformShare`. |
| `POST /api/hires/bulk` `{job, workers[], action}` | Same for up to 200 workers (bulk hiring). Returns `done` and `failed`. |
| `GET /api/hires?job=<id>` | Shortlist and hires with phone numbers and fee totals. `DELETE /api/hires/:id` removes a shortlisted worker. |
| `PATCH /api/hires/:id/rate` `{rating 1-5, feedback?, showedUp?}` | Once per hire, only after hiring. Updates the worker's credibility. |
| `GET /api/hires/partner` (partner/admin) | Hires of the workers a partner registered, with their share. `PATCH /api/hires/:id/fee` (admin) marks the fee `paid`. |

- **Ranking** (`rankWorker`): skill 3, speciality 2, same city 2 (ready to relocate 1), work type 1, experience at/above the minimum up to +2 (below it −3), plus up to +3 for credibility. `fit` is how much of the requirement is covered, 0–100.
- **Fee**: `HIRE_FEE_PCT` % of one month's pay (daily wage × 26; midpoint of the range), at least `HIRE_FEE_MIN`. If the worker was registered by a Community Partner, that partner gets `PARTNER_SHARE_PCT` % of the fee, otherwise the platform keeps all of it. The numbers are snapshotted on the Hire so later changes to the settings do not rewrite history. **The 10 % / ₹200 / 30 % defaults are placeholders: set your real commercial terms in `server/.env`.**
- **Credibility (0–100)**: ratings 55 (averaged with three "average" ratings, so one 5-star review cannot make a perfect score and a new worker starts near 50, not 0), show-up reliability 15, track record 10, experience 10, profile completeness 10. Counters on the worker are recomputed from the Hire records after every hire and rating.
- **Known limits**: a rating is the employer's word only (no dispute or admin moderation yet); the fee is *recorded* (`feeStatus: due/paid`), not collected: there is no payment gateway; the worker dashboard does not yet show the worker's own credibility or feedback.

## Structure
```
server/src
  nlp.js            skill catalogue (12 trades × specialities), analysis, question/tip/pitch builder
  translate.js      gtx client: batching, caching, soft-fail          routes/translate.js  POST /api/translate
  password.js       auto password                                      routes/voice.js      /pitch, /review, /field, /profile, /partner/*, /engine, /stt, /tts, /skills
  routes/           auth, jobs (+match, applications), hires (+ /api/workers/match), scams, voice, translate
  hiring.js         salary label, fee and partner share, credibility score, worker ranking (pure, unit-tested)
client/src
  ctx.jsx           language, screen-text translation, <Tr>, speak()   langs.js   language list + speech codes
  Pitch.jsx         the conversation + review   Review.jsx   Partner.jsx   speech.js (browser / Bhashini)   JobCard.jsx   LangPicker.jsx   Auth.jsx   Work.jsx   Home.jsx   Scams.jsx
```

## Know the limits
- The Google endpoints (translate and the fallback voice at `/api/voice/tts`) are **unofficial**: they can rate-limit or change without notice. Everything fails soft (English / typed input), results are cached, and the endpoint is rate-limited here. Before a real launch, swap `server/src/translate.js` for the paid Cloud Translation API (one function, `google()`).
- **Speech recognition is up to the browser.** Chrome covers Hindi, Punjabi, Bengali, Gujarati, Marathi, Tamil, Telugu, Kannada, Malayalam, Urdu and most world languages; some (e.g. Odia, Maithili) are not available. The app then offers "Speak in Hindi / English / Punjabi" and still answers in the worker's language; typing works in any language.
- Voices: if the phone has no voice for a language, the server fetches Google's voice (needs internet). The proxy path must be same-origin (Vite proxy in dev; reverse proxy in production).
- 6-digit passwords are easy for workers but weak; that is why login is rate-limited. Add admin/partner reset UI and optional lock-out before launch.
- Translations of the new screen text for Hindi/Punjabi come from machine translation until someone hand-writes them in `client/src/i18n.js`.
