// [Google Translate code, name in its own script, browser speech-recognition code]
export const LANGS = [
  ['pa', 'ਪੰਜਾਬੀ', 'pa-Guru-IN'],
  ['hi', 'हिन्दी', 'hi-IN'],
  ['en', 'English', 'en-IN']
];
export const RTL = new Set();
const by = Object.fromEntries(LANGS.map((l) => [l[0], l]));
export const known = (c) => !!by[c];
export const nativeName = (c) => by[c]?.[1] || c;
export const speechCode = (c) => by[c]?.[2] || c;
export const baseCode = (c) => String(c).split('-')[0];
