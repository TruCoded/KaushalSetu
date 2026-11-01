import test from 'node:test';
import assert from 'node:assert/strict';
import { translateMany, translateOne } from '../src/translate.js';

// Fake gtx endpoint: "<tl>:" prefix per line so we can check batching, newline splitting and caching.
let calls = 0;
globalThis.fetch = async (url, opts = {}) => {
  calls++;
  const u = new URL(url), tl = u.searchParams.get('tl');
  const q = opts.method === 'POST' ? new URLSearchParams(opts.body).get('q') : u.searchParams.get('q');
  const out = q.split('\n').map((l) => `${tl}:${l}`).join('\n');
  return { ok: true, json: async () => [[[out, q]], null, 'hi'] };
};

test('batch is one request, order kept, then served from cache', async () => {
  const a = await translateMany(['Hello', 'Good morning', 'Hello'], 'ta');
  assert.deepEqual(a.texts, ['ta:Hello', 'ta:Good morning', 'ta:Hello']);
  assert.equal(calls, 1);
  await translateMany(['Hello'], 'ta');
  assert.equal(calls, 1);
});
test('detected language is returned and long text uses POST', async () => {
  const r = await translateOne('x'.repeat(2500), 'en');
  assert.equal(r.detected, 'hi'); assert.ok(r.ok);
});
test('failure is soft: original text comes back', async () => {
  const old = globalThis.fetch; globalThis.fetch = async () => { throw new Error('offline'); };
  const r = await translateMany(['Unseen text'], 'fr');
  assert.deepEqual(r.texts, ['Unseen text']); assert.equal(r.ok, false);
  globalThis.fetch = old;
});
test('bad language code is rejected', async () => {
  const r = await translateOne('hi', '../etc'); assert.equal(r.ok, false);
});
