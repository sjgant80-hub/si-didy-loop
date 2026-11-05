// safejson.test.mjs — the crash-safe state file, proven on real files in a temp folder.
// (safejson.mjs holds no comparison or logic operator for witness to flip, so this behaviour suite is its proof.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readJsonSafe, writeJsonSafe } from './safejson.mjs';

const fresh = () => mkdtempSync(join(tmpdir(), 'safejson-'));

test('a missing file gives the fallback, says nothing, writes nothing', () => {
  const d = fresh(); const said = [];
  assert.deepEqual(readJsonSafe(join(d, 'none.json'), { empty: true }, (s) => said.push(s)), { empty: true });
  assert.equal(said.length, 0);
  assert.deepEqual(readdirSync(d), []);
  rmSync(d, { recursive: true });
});

test('a good file reads back as written', () => {
  const d = fresh(); const f = join(d, 'state.json');
  writeJsonSafe(f, { night: 3, list: ['a', 'b'] });
  assert.deepEqual(readJsonSafe(f, null, () => assert.fail('no warning for a good file')), { night: 3, list: ['a', 'b'] });
  assert.equal(readFileSync(f, 'utf8'), JSON.stringify({ night: 3, list: ['a', 'b'] }, null, 1));
  assert.equal(existsSync(f + '.tmp'), false);              // the temp file was renamed into place
  assert.equal(existsSync(f + '.prev'), false);             // nothing to keep on the first write
  rmSync(d, { recursive: true });
});

test('a second write keeps the last good copy as .prev', () => {
  const d = fresh(); const f = join(d, 'state.json');
  writeJsonSafe(f, { v: 1 });
  writeJsonSafe(f, { v: 2 });
  assert.deepEqual(JSON.parse(readFileSync(f, 'utf8')), { v: 2 });
  assert.deepEqual(JSON.parse(readFileSync(f + '.prev', 'utf8')), { v: 1 });
  rmSync(d, { recursive: true });
});

test('a bad file on disk is never kept as the good copy', () => {
  const d = fresh(); const f = join(d, 'state.json');
  writeFileSync(f + '.prev', JSON.stringify({ v: 'older good' }));
  writeFileSync(f, '');                                     // the 0-byte overlay.json of 2026-10-15
  writeJsonSafe(f, { v: 'new' });
  assert.deepEqual(JSON.parse(readFileSync(f, 'utf8')), { v: 'new' });
  assert.deepEqual(JSON.parse(readFileSync(f + '.prev', 'utf8')), { v: 'older good' });
  rmSync(d, { recursive: true });
});

test('an unreadable file: the bytes are kept aside, the night goes on from .prev, and it says so', () => {
  const d = fresh(); const f = join(d, 'overlay.json'); const said = [];
  writeFileSync(f + '.prev', JSON.stringify({ good: 'last' }));
  writeFileSync(f, '{"half": ');
  assert.deepEqual(readJsonSafe(f, { fresh: true }, (s) => said.push(s)), { good: 'last' });
  assert.equal(existsSync(f), false);                       // moved aside, not deleted
  const broken = readdirSync(d).filter((n) => n.startsWith('overlay.json.broken-'));
  assert.equal(broken.length, 1);
  assert.equal(readFileSync(join(d, broken[0]), 'utf8'), '{"half": ');
  assert.equal(said.length, 1);
  assert.match(said[0], /did not parse \(9 bytes\)/);
  assert.match(said[0], /going on from its last good copy \(\.prev\)/);
  assert.ok(said[0].includes(broken[0]));
  rmSync(d, { recursive: true });
});

test('an unreadable file with no good copy: the fallback, a fresh start, said loudly', () => {
  const d = fresh(); const f = join(d, 'p.json'); const said = [];
  writeFileSync(f, '');
  assert.deepEqual(readJsonSafe(f, { start: 0 }, (s) => said.push(s)), { start: 0 });
  assert.match(said[0], /did not parse \(0 bytes\).*going on from a fresh start/);
  rmSync(d, { recursive: true });
});

test('an unreadable file whose .prev is unreadable too: the fallback, still a fresh start', () => {
  const d = fresh(); const f = join(d, 'p.json'); const said = [];
  writeFileSync(f, 'nope');
  writeFileSync(f + '.prev', 'also nope');
  assert.deepEqual(readJsonSafe(f, [], (s) => said.push(s)), []);
  assert.match(said[0], /going on from a fresh start/);
  rmSync(d, { recursive: true });
});
