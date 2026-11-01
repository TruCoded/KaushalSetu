// Worker-pitch NLP. Speech is translated to English first (see translate.js), then analysed here.
// Hindi/Punjabi keywords are kept as a fallback for when translation is unavailable.
export const CATALOG = {
  tailoring: {
    name: 'tailoring',
    kw: ['सिलाई', 'ਸਿਲਾਈ', 'ਸਿਊਂ', 'silai', 'stitch', 'tailor', 'sewing', 'seamstress', 'dressmak'],
    details: {
      'blouse stitching': ['blouse'],
      'suit and salwar stitching': ['suit', 'salwar', 'kurta', 'kameez', 'churidar', 'ladies dress'],
      alterations: ['alteration', 'fitting', 'mending'],
      'bridal and lehenga wear': ['bridal', 'lehenga', 'wedding dress'],
      "men's shirts and trousers": ['shirt', 'trouser', 'pant', 'coat', "men's wear"],
      'kids wear and uniforms': ['kids wear', 'children clothes', 'uniform', 'school dress'],
      'factory and bulk stitching': ['factory', 'industrial', 'overlock', 'bulk', 'piece rate', 'export', 'production unit', 'garment unit'],
      'embroidery work': ['embroidery', 'aari', 'zari']
    },
    tips: ['Say whether you have your own sewing machine.', 'Say if you can take bulk orders, for example 100 pieces.', 'Mention if you can also do cutting and finishing.']
  },
  embroidery: {
    name: 'embroidery',
    kw: ['कढ़ाई', 'कढाई', 'ਕਢਾਈ', 'फुलकारी', 'embroider', 'phulkari', 'zardozi', 'aari'],
    details: {
      'hand embroidery': ['hand embroidery', 'by hand', 'hand work'],
      'machine embroidery': ['machine embroidery', 'computer embroidery', 'machine work'],
      'zari and zardozi': ['zari', 'zardozi'],
      phulkari: ['phulkari'],
      'aari work': ['aari'],
      'bead and sequin work': ['bead', 'sequin', 'stone work']
    },
    tips: ['Say whether you work by hand or on a machine.', 'Mention the designs you are best at.']
  },
  cooking: {
    name: 'cooking',
    kw: ['खाना', 'रसोई', 'ਖਾਣਾ', 'ਰਸੋਈ', 'cook', 'chef', 'kitchen', 'bake', 'baking', 'tiffin', 'catering'],
    details: {
      'North Indian food': ['north indian', 'punjabi food', 'dal', 'curry'],
      'South Indian food': ['south indian', 'dosa', 'idli'],
      'tiffin and home meals': ['tiffin', 'home meals', 'home food'],
      'catering for events': ['catering', 'wedding food', 'party food', 'event'],
      'bakery and sweets': ['bakery', 'baking', 'cake', 'sweets', 'halwai'],
      'roti and tandoor': ['tandoor', 'roti', 'chapati'],
      'snacks and street food': ['snacks', 'street food', 'chaat', 'fast food']
    },
    tips: ['Say how many people you can cook for at one time.', 'Mention if you have a food hygiene or kitchen certificate.']
  },
  cleaning: {
    name: 'cleaning',
    kw: ['सफाई', 'सफ़ाई', 'झाड़ू', 'ਸਫ਼ਾਈ', 'ਸਫਾਈ', 'clean', 'sweep', 'mop', 'housekeeping', 'sanitation', 'maid'],
    details: {
      'house cleaning': ['house', 'home', 'maid', 'domestic'],
      'office and shop cleaning': ['office', 'shop', 'commercial', 'school', 'hospital'],
      'utensils and laundry': ['utensil', 'dishes', 'laundry', 'washing clothes'],
      'deep cleaning': ['deep clean', 'bathroom', 'window']
    },
    tips: ['Say if you can work in homes, offices, or both.', 'Mention if you can work morning or evening shifts.']
  },
  driving: {
    name: 'driving',
    kw: ['गाड़ी', 'ड्राइव', 'ड्राइवर', 'ਗੱਡੀ', 'ਡਰਾਈਵ', 'driv', 'chauffeur', 'rickshaw'],
    details: {
      'car driving': ['car', 'taxi', 'cab'],
      'truck and heavy vehicles': ['truck', 'lorry', 'heavy', 'trailer'],
      'auto and e-rickshaw': ['auto', 'rickshaw', 'e-rickshaw'],
      'tractor driving': ['tractor'],
      'delivery on two-wheeler': ['delivery', 'bike', 'scooter', 'two wheeler'],
      'bus and tempo': ['bus', 'tempo', 'van']
    },
    tips: ['Say which driving licence you hold.', 'Mention if you know the roads of your city well.']
  },
  farm: {
    name: 'farm work',
    kw: ['खेती', 'खेत', 'ਖੇਤੀ', 'ਖੇਤ', 'farm', 'agricult', 'harvest', 'crop', 'dairy', 'cattle'],
    details: {
      'crop harvesting': ['harvest', 'wheat', 'paddy', 'rice', 'crop'],
      'tractor and machinery': ['tractor', 'machine', 'thresher'],
      'dairy and animals': ['dairy', 'cow', 'buffalo', 'cattle', 'milk', 'animals'],
      'vegetables and orchards': ['vegetable', 'orchard', 'fruit', 'garden'],
      'spraying and irrigation': ['spray', 'irrigation', 'water pump']
    },
    tips: ['Say which crops or animals you know best.', 'Mention if you can run farm machines.']
  },
  repair: {
    name: 'repair work',
    kw: ['मरम्मत', 'मिस्त्री', 'ਮੁਰੰਮਤ', 'ਮਿਸਤਰੀ', 'repair', 'mechanic', 'fitter'],
    details: {
      'mobile phone repair': ['mobile', 'phone', 'smartphone'],
      'bike and scooter repair': ['bike', 'scooter', 'motorcycle', 'two wheeler'],
      'car mechanic': ['car', 'engine', 'garage'],
      'AC and fridge repair': ['ac', 'air conditioner', 'fridge', 'refrigerator', 'washing machine', 'appliance'],
      'cycle and tyre repair': ['cycle', 'bicycle', 'tyre', 'puncture']
    },
    tips: ['Say which machines you can fix.', 'Mention if you have your own tools.']
  },
  construction: {
    name: 'construction',
    kw: ['मजदूर', 'मज़दूर', 'राजमिस्त्री', 'ਉਸਾਰੀ', 'ਮਜ਼ਦੂਰ', 'construct', 'mason', 'labour', 'labor', 'brick', 'plaster', 'painter'],
    details: {
      'mason and bricklaying': ['mason', 'brick', 'bricklaying', 'wall'],
      'painting and polish': ['painting', 'painter', 'paint', 'whitewash'],
      'tiles and flooring': ['tile', 'tiles', 'flooring', 'marble'],
      plastering: ['plaster', 'plastering'],
      'steel and bar bending': ['steel', 'bar bending', 'rebar', 'shuttering', 'centring'],
      'helper and labour': ['helper', 'labour', 'labor', 'loading']
    },
    tips: ['Say if you can read a simple building plan.', 'Mention if you can lead a small team of workers.']
  },
  carpentry: {
    name: 'carpentry',
    kw: ['बढ़ई', 'बढई', 'ਤਰਖਾਣ', 'carpent', 'woodwork', 'furniture'],
    details: {
      'furniture making': ['furniture', 'bed', 'sofa', 'table', 'almirah'],
      'doors and windows': ['door', 'window', 'frame'],
      'modular kitchen and wardrobes': ['modular', 'kitchen', 'wardrobe', 'cabinet'],
      'polish and finishing': ['polish', 'finishing', 'laminate'],
      'repair and fitting': ['repair', 'fitting']
    },
    tips: ['Say whether you can work from a drawing.', 'Mention if you have your own tools.']
  },
  electrician: {
    name: 'electrical work',
    kw: ['बिजली', 'इलेक्ट्रीशियन', 'ਬਿਜਲੀ', 'electric', 'wiring', 'wireman'],
    details: {
      'house wiring': ['house wiring', 'home wiring', 'wiring', 'fan', 'switch'],
      'motor winding and repair': ['motor', 'winding', 'pump'],
      'panel and industrial work': ['panel', 'industrial', 'factory', 'three phase'],
      'solar and inverter': ['solar', 'inverter', 'battery'],
      'appliance repair': ['appliance', 'geyser', 'iron']
    },
    tips: ['Say if you hold an electrician licence or ITI certificate.', 'Mention if you can work at height safely.']
  },
  plumbing: {
    name: 'plumbing',
    kw: ['प्लंबर', 'नलसाज', 'ਪਲੰਬਰ', 'plumb', 'pipe fitt'],
    details: {
      'pipe fitting': ['pipe', 'fitting'],
      'bathroom fittings': ['bathroom', 'toilet', 'tap', 'basin', 'geyser'],
      'borewell and pumps': ['borewell', 'pump', 'motor'],
      'drainage and sewer': ['drain', 'drainage', 'sewer', 'leak']
    },
    tips: ['Say if you can handle leak repairs quickly.', 'Mention if you have your own tools.']
  },
  handicraft: {
    name: 'handicraft',
    kw: ['हस्तशिल्प', 'कारीगर', 'बुनाई', 'ਦਸਤਕਾਰੀ', 'handicraft', 'craft', 'pottery', 'weav', 'knit', 'crochet', 'bamboo'],
    details: {
      'knitting and crochet': ['knit', 'knitting', 'crochet', 'sweater'],
      'pottery and clay work': ['pottery', 'clay', 'terracotta'],
      'weaving and handloom': ['weaving', 'handloom', 'loom', 'carpet'],
      'bamboo and cane work': ['bamboo', 'cane', 'basket'],
      'jewellery making': ['jewellery', 'jewelry', 'beads', 'necklace'],
      'art and painting': ['art', 'painting', 'drawing', 'mehndi']
    },
    tips: ['Say what you can make and how many pieces per week.', 'Mention if you can make things to order.']
  }
};
export const SKILL_KEYS = Object.keys(CATALOG);
export const detailLabels = (skill) => Object.keys(CATALOG[skill]?.details || {});

const reCache = new Map();
function has(text, word, prefix = false) {
  if (!/^[a-z' -]+$/.test(word)) return text.includes(word); // Devanagari / Gurmukhi etc.
  const key = word + (prefix ? '^' : '$');
  let r = reCache.get(key);
  if (!r) {
    const e = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    r = new RegExp(`(?<![a-z])${e}${prefix ? '' : '(?:s|es)?(?![a-z])'}`);
    reCache.set(key, r);
  }
  return r.test(text);
}

const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30 };
const NUM = `(\\d+(?:\\.\\d+)?|${Object.keys(NUMW).join('|')})`;
const num = (x) => (x in NUMW ? NUMW[x] : parseFloat(x));
const digit = (c) => { const a = '०१२३४५६७८९'.indexOf(c), b = '੦੧੨੩੪੫੬੭੮੯'.indexOf(c); return a > -1 ? a : b > -1 ? b : c; };
const clampYears = (n) => (Number.isFinite(n) ? Math.max(0, Math.min(60, Math.round(n * 10) / 10)) : null);

export function parseExperience(original = '', english = '', bare = false) {
  const l = english.toLowerCase();
  let m = l.match(new RegExp(`${NUM}\\s*(?:\\+\\s*)?(?:years?|yrs?|yr)\\b`));
  if (m) return clampYears(num(m[1]));
  m = l.match(new RegExp(`${NUM}\\s*months?\\b`));
  if (m) return clampYears(num(m[1]) / 12);
  m = l.match(/since\s+(?:the\s+year\s+)?(19\d\d|20\d\d)/);
  if (m) return clampYears(new Date().getFullYear() - +m[1]);
  if (/\b(fresher|no experience|beginner|just started|just starting|new to this|zero experience)\b/.test(l)) return 0;
  const o = original.toLowerCase(); // Hindi / Punjabi digits & words as a fallback
  m = o.match(/([0-9०-९੦-੯]+)\s*(साल|वर्ष|ਸਾਲ|years?|yrs?)/);
  if (m) return clampYears(parseInt([...m[1]].map(digit).join(''), 10));
  if (bare) {
    m = l.trim().match(new RegExp(`^\\D*${NUM}\\D*$`)) || o.trim().match(/^\D*([0-9०-९੦-੯]+)\D*$/);
    if (m) return clampYears(typeof m[1] === 'string' && /^[0-9०-९੦-੯.]+$/.test(m[1]) ? parseFloat([...m[1]].map(digit).join('')) : num(m[1]));
  }
  return null;
}

function parseWorkType(original, english, awaiting) {
  const l = `${english} ${original}`.toLowerCase();
  if (/(from home|at home|home[- ]based|work from home|home work|stay at home)/.test(l) || /घर से|घर पर|ਘਰ ਤੋਂ|ਘਰ/.test(l)) return { workType: 'home-based' };
  if (/(part[- ]?time|few hours|half day)/.test(l) || /पार्ट|ਪਾਰਟ/.test(l)) return { workType: 'part-time' };
  if (/(full[- ]?time|regular job|permanent|whole day|all day|fixed job)/.test(l)) return { workType: 'full-time' };
  if (awaiting === 'workType' && /\b(any(?!\s+(?:city|place|shift|time|where))|anything|whatever|no preference|either|does not matter|doesn't matter)\b/.test(l)) return { workTypeAny: true };
  return {};
}

// ---------- location (Stage 2): city / village and state ----------
// Delhi, Chandigarh, Goa etc. are deliberately NOT here: people answer "Chandigarh" meaning the city.
const STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Jammu and Kashmir', 'Ladakh'];
export { STATES };
const stateRe = [...STATES.map((n) => [n, new RegExp(`(?<![a-z])${n.toLowerCase().replace(/ /g, '\\s+')}(?![a-z])`, 'i')]), ['Odisha', /(?<![a-z])orissa(?![a-z])/i]];
function takeState(s) {
  for (const [name, re] of stateRe) {
    if (re.test(s)) return { state: name, rest: s.replace(re, ' ').replace(/(?:\b(?:in|of|state)\s*)+$/i, '').replace(/^[\s,]+|[\s,]+$/g, '').replace(/\s{2,}/g, ' ') };
  }
  return { state: '', rest: s };
}
function cityFrom(raw) {
  let s = String(raw || '').trim().replace(/[.!?,]+$/g, '');
  const lead = /^(?:i\s+(?:live|stay|am\s+living|am\s+staying|come|am)\s+(?:in|at|from|near)|my\s+(?:village|city|town|place|home)\s+(?:is|name\s+is)|it\s+is|it's|(?:in|at|from|near)|village|city|town)\s+/i;
  for (let i = 0; i < 3 && lead.test(s); i++) s = s.replace(lead, '');
  const words = (s.match(/[\p{L}][\p{L}.'-]*/gu) || []).slice(0, 3);
  if (!words.length || words.join('').length < 2) return '';
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}
// "Ludhiana, Punjab" -> { city: 'Ludhiana', state: 'Punjab' }
export function parseCity(original, english) { return parsePlace(original, english, true).city; }
const LOOSE = /\b(?:live|lives|living|stay|stays|staying|reside|residing|based|settled)\s+(?:in|at|near|around)\s+([\p{L}][\p{L}' .,-]{1,40})|\bmy\s+(?:village|city|town|place|home\s*town|hometown)\s+(?:is|name\s+is)\s+([\p{L}][\p{L}' .,-]{1,40})/iu;
const CUT = /[,.;!?]|\b(?:and|but|for|since|with|because|so|where|which|i|my|we|want|work|working|looking|can|have|has|do|doing|from|also|then|now)\b/i;
// awaitingCity: the whole answer is a place. Otherwise only an explicit "I live in X" / "my village is X" counts.
export function parsePlace(original = '', english = '', awaitingCity = false) {
  const src = (english || original).trim();
  if (awaitingCity) {
    const { state, rest } = takeState(src);
    return { city: cityFrom(rest.split(',')[0]), state };
  }
  const m = src.match(LOOSE);
  if (!m) return { city: '', state: '' };
  const { state, rest } = takeState((m[1] || m[2]).split(CUT)[0]);
  return { city: cityFrom(rest), state };
}

// ---------- occupation not in the catalogue ("security guard", "peon") ----------
const OCC_BAD = new Set(['looking', 'searching', 'from', 'living', 'staying', 'here', 'not', 'very', 'ready', 'interested', 'new', 'just', 'also', 'working', 'doing', 'having', 'able', 'good', 'fresher', 'beginner', 'unemployed', 'jobless', 'student', 'housewife', 'worker', 'person', 'woman', 'man', 'lady', 'married', 'years', 'year', 'yes', 'no', 'in', 'at', 'to', 'the', 'a', 'an']);
export function parseOccupation(english = '') {
  const m = english.match(/\bi\s+(?:am|work\s+as|worked\s+as|was)\s+(?:an?\s+|the\s+)?([a-z][a-z -]{2,40})/i) || english.match(/\bmy\s+(?:work|job|occupation|profession)\s+is\s+(?:an?\s+|the\s+)?([a-z][a-z -]{2,40})/i);
  if (!m) return '';
  const words = m[1].split(/\b(?:and|but|for|since|with|from|in|at|i|my|because|who|years?|now|also)\b|[,.;]/i)[0].trim().split(/\s+/).filter(Boolean).slice(0, 3);
  if (!words.length || OCC_BAD.has(words[0].toLowerCase()) || words.join('').length < 3 || words.some((w) => w.toLowerCase() in NUMW)) return '';
  return words.join(' ').toLowerCase();
}

// ---------- work preference (Stage 2): shift and willingness to move, besides full/part-time/home ----------
export function parseShift(l = '') {
  l = l.toLowerCase();
  if (/\b(any shift|any time|anytime|flexible|whenever|all shifts)\b/.test(l)) return 'any';
  if (/\b(night shift|night duty|at night|night time|night work)\b/.test(l)) return 'night';
  if (/\b(evening shift|in the evening|evening work|evenings|afternoon shift|second shift)\b/.test(l)) return 'evening';
  if (/\b(morning shift|day shift|in the morning|morning work|daytime|day time|mornings|general shift)\b/.test(l)) return 'day';
  return '';
}
export function parseRelocate(l = '') {
  l = l.toLowerCase();
  if (/\b(?:cannot|can't|cant|can not|won't|will not|do not want to|don't want to|not ready to|not willing to)\s+(?:go|move|relocate|leave|travel|shift)\b|\bonly\s+(?:near|in|at)\s+(?:my\s+)?(?:home|house|village|town|city)\b|\blocal\s+only\b|\bnear\s+(?:my\s+)?home\s+only\b/.test(l)) return false;
  if (/\b(relocate|relocation|outstation|migrate|ready to travel|willing to travel|any city|any place|anywhere|move to (?:another|other|any) (?:city|place|state)|go to (?:another|other|any) (?:city|place|state))\b/.test(l)) return true;
  return null;
}

export function analyze(original = '', english = '', opts = {}) {
  const { awaiting = '', known = [] } = opts;
  const raw = `${english} ${original}`.toLowerCase();
  const skills = new Set();
  for (const [k, c] of Object.entries(CATALOG)) if (c.kw.some((w) => has(raw, w.toLowerCase(), true))) skills.add(k);
  if (!skills.size && (awaiting === 'skills' || awaiting === 'intro')) {
    for (const [k, c] of Object.entries(CATALOG)) if (Object.values(c.details).some((ws) => ws.some((w) => has(raw, w)))) skills.add(k);
  }
  const specialties = new Set();
  for (const k of new Set([...skills, ...known])) {
    for (const [label, words] of Object.entries(CATALOG[k]?.details || {})) if (words.some((w) => has(raw, w))) specialties.add(label);
  }
  const place = parsePlace(original, english, awaiting === 'city');
  const all = `${english} ${original}`;
  return {
    skills: [...skills], specialties: [...specialties],
    occupation: !skills.size && !known.length && (awaiting === 'skills' || awaiting === 'intro') ? parseOccupation(english) : '',
    experienceYears: parseExperience(original, english, awaiting === 'experience'),
    ...parseWorkType(original, english, awaiting),
    shift: parseShift(all), relocate: parseRelocate(all),
    city: place.city, state: place.state
  };
}

export const emptyDraft = () => ({ skills: [], specialties: [], detailDone: [], experienceYears: null, workType: '', workTypeAny: false, city: '', state: '', occupation: '', shift: '', relocate: null, fails: {}, skipped: [], turn: 0 });
export const SHIFTS = ['day', 'evening', 'night', 'any'];
const strs = (a, n, len = 60) => (Array.isArray(a) ? a : []).map((x) => String(x).slice(0, len)).filter(Boolean).slice(0, n);
export function cleanDraft(d = {}) {
  const e = emptyDraft();
  const exp = d.experienceYears === null || d.experienceYears === undefined || d.experienceYears === '' ? null : clampYears(+d.experienceYears);
  const out = {
    ...e,
    skills: strs(d.skills, 12).filter((k) => CATALOG[k]), specialties: strs(d.specialties, 30), detailDone: strs(d.detailDone, 12),
    experienceYears: exp, workType: ['full-time', 'part-time', 'home-based'].includes(d.workType) ? d.workType : '', workTypeAny: !!d.workTypeAny,
    city: String(d.city || '').slice(0, 60), state: STATES.includes(d.state) ? d.state : '',
    occupation: String(d.occupation || '').replace(/[^\p{L}\s'-]/gu, '').trim().slice(0, 40),
    shift: SHIFTS.includes(d.shift) ? d.shift : '', relocate: d.relocate === true || d.relocate === false ? d.relocate : null,
    skipped: strs(d.skipped, 10, 30), turn: Math.min(+d.turn || 0, 99),
    fails: Object.fromEntries(Object.entries(d.fails || {}).slice(0, 10).map(([k, v]) => [String(k).slice(0, 30), Math.min(+v || 0, 5)]))
  };
  for (const s of out.skills) if (!out.detailDone.includes(s) && detailLabels(s).some((l) => out.specialties.includes(l))) out.detailDone.push(s);
  return out;
}

export const normKey = (a) => (a === 'intro' ? 'skills' : a);
export function isMissing(d, key) {
  if (key === 'skills') return !d.skills.length && !d.occupation;
  if (key.startsWith('details:')) return !d.detailDone.includes(key.slice(8));
  if (key === 'experience') return d.experienceYears === null;
  if (key === 'workType') return !d.workType && !d.workTypeAny;
  if (key === 'city') return !d.city;
  return false;
}
export function nextKey(d) {
  const order = ['skills', ...d.skills.filter((s) => detailLabels(s).length).map((s) => 'details:' + s), 'experience', 'workType', 'city'];
  return order.find((k) => isMissing(d, k) && !d.skipped.includes(k)) || null;
}

// Merge what was found in one answer into the draft. Returns the new draft and what was newly learned.
export function applyFound(draft, found, awaiting = '') {
  const d = cleanDraft(draft), key = normKey(awaiting), added = { skills: [], specialties: [], exp: false, workType: false, city: false, state: false, occupation: false, shift: false, relocate: false };
  for (const k of found.skills) if (!d.skills.includes(k)) { d.skills.push(k); added.skills.push(k); }
  for (const sp of found.specialties) if (!d.specialties.includes(sp)) { d.specialties.push(sp); added.specialties.push(sp); }
  if (found.experienceYears !== null && found.experienceYears !== undefined) { d.experienceYears = found.experienceYears; added.exp = true; }
  if (found.workType) { d.workType = found.workType; d.workTypeAny = false; added.workType = true; }
  else if (found.workTypeAny) { d.workTypeAny = true; added.workType = true; }
  if (found.city) { if (found.city !== d.city && !found.state) d.state = ''; d.city = found.city; added.city = true; }
  if (found.state) { d.state = found.state; added.state = true; }
  if (found.occupation && !d.skills.length) { d.occupation = found.occupation; added.occupation = true; }
  if (found.shift) { d.shift = found.shift; added.shift = true; }
  if (found.relocate === true || found.relocate === false) { d.relocate = found.relocate; added.relocate = true; }
  for (const s of d.skills) if (!d.detailDone.includes(s) && detailLabels(s).some((l) => d.specialties.includes(l))) d.detailDone.push(s);
  if (key && isMissing(d, key)) {
    d.fails[key] = (d.fails[key] || 0) + 1;
    if (d.fails[key] >= 2 && !d.skipped.includes(key)) d.skipped.push(key);
  }
  d.turn += 1;
  return { draft: d, added };
}

const list = (a) => (a.length < 2 ? a.join('') : a.length === 2 ? `${a[0]} and ${a[1]}` : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
const yrs = (n) => `${n} ${n === 1 ? 'year' : 'years'}`;
const WT = { 'full-time': 'full-time', 'part-time': 'part-time', 'home-based': 'work from home' };

// `who` is set when a Community Partner answers for the worker ("Rani"), so questions are asked about her.
export function questionFor(key, d, who = '') {
  const Ex = (s) => `For example: ${detailLabels(s).slice(0, 4).join(', ')}.`;
  if (key === 'skills') return who ? `Which work does ${who} do? For example tailoring, cooking, driving, farming or construction.` : 'Which work do you do? For example tailoring, cooking, driving, farming or construction.';
  if (key.startsWith('details:')) {
    const s = key.slice(8), c = CATALOG[s];
    return who ? `What kind of ${c.name} does ${who} do? ${Ex(s)}` : `What kind of ${c.name} do you do? ${Ex(s)}`;
  }
  const names = list(d.skills.map((s) => CATALOG[s].name)), as = d.occupation ? `working as ${aOrAn(d.occupation)}` : '';
  const what = names ? `doing ${names}` : as || 'doing this work';
  if (key === 'experience') return who ? `How many years has ${who} been ${what}?` : `How many years have you been ${what}?`;
  if (key === 'workType') return who ? `What kind of work does ${who} want: full-time, part-time, or work from home?` : 'What kind of work do you want: full-time, part-time, or work from home?';
  if (key === 'city') return who ? `Which village or city does ${who} live in?` : 'Which village or city do you live in?';
  return '';
}
const SHIFT_EN = { day: 'the day shift', evening: 'the evening shift', night: 'the night shift', any: 'any shift' };
export function ackFor(added, d) {
  const p = [];
  if (added.skills.length) p.push(list(added.skills.map((s) => CATALOG[s].name)));
  if (added.occupation && d.occupation) p.push(d.occupation);
  if (added.specialties.length) p.push(list(added.specialties));
  if (added.exp && d.experienceYears !== null) p.push(d.experienceYears === 0 ? 'just starting out' : `${yrs(d.experienceYears)} of experience`);
  if (added.workType && d.workType) p.push(WT[d.workType]);
  if (added.shift && d.shift) p.push(SHIFT_EN[d.shift]);
  if (added.relocate) p.push(d.relocate ? 'ready to move for work' : 'wants work near home');
  if (added.city || added.state) p.push([added.city && d.city, added.state && d.state].filter(Boolean).join(', '));
  return p.filter(Boolean).length ? `Got it: ${p.filter(Boolean).join(', ')}.` : '';
}
export function tipsFor(d, n = 2) {
  const pool = d.skills.flatMap((s) => CATALOG[s].tips);
  pool.push('Mention if you can join work immediately.', 'Say about any earlier shop, factory or house where you worked.');
  const out = [];
  for (let i = 0; i < n && pool.length; i++) out.push(pool[(d.turn * n + i) % pool.length]);
  return [...new Set(out)];
}
const aOrAn = (w) => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
const place = (d) => [d.city, d.state].filter(Boolean).join(', ');
export function pitchEn(d) {
  const names = d.skills.map((s) => CATALOG[s].name), pl = place(d);
  const since = d.experienceYears === null ? '' : d.experienceYears === 0 ? ' and I am just starting out' : ` with ${yrs(d.experienceYears)} of experience`;
  const out = [];
  if (names.length) out.push(`I work in ${list(names)}${since}.`);
  if (d.occupation) out.push(names.length ? `I also work as ${aOrAn(d.occupation)}.` : `I work as ${aOrAn(d.occupation)}${since}.`);
  if (d.specialties.length) out.push(`I am skilled in ${list(d.specialties)}.`);
  if (d.workType) out.push(`I am looking for ${WT[d.workType]}${d.workType === 'home-based' ? '' : ' work'}${pl ? ` in ${pl}` : ''}.`);
  else if (pl) out.push(`I live in ${pl}.`);
  if (d.shift) out.push(`I prefer ${SHIFT_EN[d.shift]}.`);
  if (d.relocate === true) out.push('I am ready to move to another city for work.');
  else if (d.relocate === false) out.push('I want work near my home.');
  return out.join(' ');
}

// What the review screen reads back (Stage 3). `who` = the worker's first name when a partner is answering.
export function readbackEn(d, who = '') {
  const S = who || 'You', P = who ? 'does' : 'do', H = who ? 'has' : 'have', W = who ? 'wants' : 'want', L = who ? 'lives' : 'live', PR = who ? 'prefers' : 'prefer';
  const names = d.skills.map((s) => CATALOG[s].name), out = [];
  const work = [...names, ...(d.occupation ? [d.occupation] : [])];
  if (work.length) out.push(`${S} ${P} ${list(work)}${d.specialties.length ? `, mainly ${list(d.specialties)}` : ''}.`);
  if (d.experienceYears !== null) out.push(d.experienceYears === 0 ? `${S} ${who ? 'is' : 'are'} just starting out.` : `${S} ${H} ${yrs(d.experienceYears)} of experience.`);
  if (d.workType) out.push(`${S} ${W} ${WT[d.workType]}${d.workType === 'home-based' ? '' : ' work'}.`);
  if (d.shift) out.push(`${S} ${PR} ${SHIFT_EN[d.shift]}.`);
  if (d.relocate === true) out.push(`${S} ${who ? 'is' : 'are'} ready to move to another city for work.`);
  else if (d.relocate === false) out.push(`${S} ${W} work near home.`);
  if (place(d)) out.push(`${S} ${L} in ${place(d)}.`);
  return out.join(' ');
}
export const REVIEW_ASK = 'Is this correct? Say yes to save, or no to change something.';

// Yes / no spoken to the review question, in English (after translation) with Hindi / Punjabi fallbacks.
const YES = ['yes', 'yeah', 'yep', 'yup', 'ok', 'okay', 'correct', 'right', 'sure', 'save', 'confirm', 'fine', 'good', 'haan', 'han', 'ji', 'theek', 'sahi', 'हाँ', 'हां', 'हा', 'जी', 'ठीक', 'सही', 'सेव', 'ਹਾਂ', 'ਜੀ', 'ਠੀਕ', 'ਸਹੀ'];
const NO = ['no', 'nope', 'wrong', 'incorrect', 'change', 'edit', 'mistake', 'not correct', 'not right', 'nahi', 'nahin', 'नहीं', 'नही', 'गलत', 'गलती', 'बदल', 'ਨਹੀਂ', 'ਨਹੀ', 'ਗਲਤ', 'ਬਦਲ'];
export function verdictOf(original = '', english = '') {
  const raw = `${english} ${original}`.toLowerCase();
  const no = NO.some((w) => has(raw, w)), yes = YES.some((w) => has(raw, w));
  return no && !yes ? 'no' : yes && !no ? 'yes' : no && yes ? (/\b(not|no)\b/.test(english.toLowerCase()) ? 'no' : '') : '';
}

// ---------- fields filled by voice outside the interview (partner registration) ----------
const DIG = '०१२३४५६७८९', DIG2 = '੦੧੨੩੪੫੬੭੮੯';
const asciiDigits = (s) => [...s].map((c) => { const a = DIG.indexOf(c), b = DIG2.indexOf(c); return a > -1 ? String(a) : b > -1 ? String(b) : c; }).join('');
const WORD_DIGIT = {
  zero: 0, oh: 0, o: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  'शून्य': 0, 'जीरो': 0, 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5, 'छह': 6, 'छः': 6, 'छे': 6, 'सात': 7, 'आठ': 8, 'नौ': 9,
  'ਸਿਫ਼ਰ': 0, 'ਸਿਫਰ': 0, 'ਇੱਕ': 1, 'ਦੋ': 2, 'ਤਿੰਨ': 3, 'ਚਾਰ': 4, 'ਪੰਜ': 5, 'ਛੇ': 6, 'ਸੱਤ': 7, 'ਅੱਠ': 8, 'ਨੌਂ': 9, 'ਨੌ': 9
};
const MULT = { double: 2, triple: 3, 'डबल': 2, 'ट्रिपल': 3 };
// "98123 45678", "nine eight one two...", "double nine", Hindi/Punjabi digits and number words -> digits only
export function parsePhone(...texts) {
  for (const t of texts) {
    let digits = '', mult = 1;
    for (const tok of asciiDigits(String(t || '').toLowerCase()).split(/[\s,.\-–—:;()]+/)) {
      if (!tok) continue;
      if (tok in MULT) { mult = MULT[tok]; continue; }
      const d = /^\+?\d+$/.test(tok) ? tok.replace('+', '') : tok in WORD_DIGIT ? String(WORD_DIGIT[tok]) : '';
      if (d) { digits += (d.length === 1 ? d.repeat(mult) : d); mult = 1; }
    }
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length) return digits.slice(0, 10);
  }
  return '';
}
// "my name is rani devi" / "मेरा नाम रानी देवी है" -> "Rani Devi" / "रानी देवी"
const NAME_LEAD = /^(?:(?:my|his|her|the|their)\s+name\s+is|name\s+is|this\s+is|it\s+is|it's|i\s+am|i'm|मेरा\s+नाम|इनका\s+नाम|इनकी\s+का\s+नाम|उनका\s+नाम|उनकी\s+नाम|नाम|ਮੇਰਾ\s+ਨਾਂ|ਮੇਰਾ\s+ਨਾਮ|ਇਨ੍ਹਾਂ\s+ਦਾ\s+ਨਾਂ|ਉਨ੍ਹਾਂ\s+ਦਾ\s+ਨਾਂ|ਨਾਂ|ਨਾਮ)\s+/i;
const NAME_TAIL = /\s+(?:है|हैं|हूँ|हूं|ਹੈ|ਹਨ|ਹਾਂ|ਜੀ|जी|is\s+my\s+name|is\s+the\s+name)$/i;
export function parseName(text = '') {
  let s = String(text).trim().replace(/[.!?।,]+/g, ' ').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 2 && NAME_LEAD.test(s); i++) s = s.replace(NAME_LEAD, '');
  for (let i = 0; i < 2 && NAME_TAIL.test(s); i++) s = s.replace(NAME_TAIL, '');
  const words = (s.match(/[\p{L}\p{M}][\p{L}\p{M}'.-]*/gu) || []).slice(0, 4);
  return words.map((w) => (/^[a-z]/i.test(w) ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)).join(' ').slice(0, 60);
}

// Back-compat helper used by POST /api/voice/skills
export const extract = (text = '') => { const f = analyze(text, ''); return { skills: f.skills, specialties: f.specialties, experienceYears: f.experienceYears, workType: f.workType || '' }; };

export const usable = (d) => !!d && ((d.skills && d.skills.length > 0) || !!d.occupation);
export const fieldsOf = (d) => ({
  skills: d.skills || [], specialties: d.specialties || [], occupation: d.occupation || '', experienceYears: d.experienceYears ?? 0,
  workType: d.workType || '', state: d.state || '', shift: d.shift || '', relocate: d.relocate ?? null, pitch: pitchEn(d).slice(0, 600)
});
