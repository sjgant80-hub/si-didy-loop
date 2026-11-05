// vendor.test.mjs — the vendored cost case is the bytes it says it is: every file in vendor/liveware/PINS.json
// hashes to its pin, and the basis carries a source for every figure the kernel reads (hoursPerYear is a
// definition, 24 x 365, not a sourced figure, and is checked as one).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('./', import.meta.url);
const PINS = JSON.parse(readFileSync(new URL('vendor/liveware/PINS.json', root), 'utf8'));

test('every vendored file hashes to its pin', () => {
  const files = Object.entries(PINS.files);
  assert.equal(files.length, 3);
  for (const [path, sha] of files) {
    const got = createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex');
    assert.equal(got, sha, path);
  }
});

test('the basis names a source for every figure the cost case reads', async () => {
  const { BASIS_KEYS, sourcesOf } = await import('./vendor/liveware/src/mintcase.mjs');
  const basis = JSON.parse(readFileSync(new URL('vendor/liveware/vendor/ai-first-company/vendor/sovereign-enterprise/data/basis.json', root), 'utf8'));
  const s = sourcesOf(basis);
  assert.equal(s.length, BASIS_KEYS.length);
  for (const x of s) {
    if (x.key === 'hoursPerYear') { assert.equal(basis.hoursPerYear.value, 24 * 365); assert.equal(x.source, undefined); continue; }
    assert.match(x.source, /^https:\/\//, x.key);
    assert.ok(typeof x.what === 'string' && x.what.length > 10, x.key);
  }
});
