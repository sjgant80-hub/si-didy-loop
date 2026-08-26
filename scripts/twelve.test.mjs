// scripts/twelve.test.mjs — the twelve-powers law, falsifiable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POWERS, CRITICALITY, score, rubric } from './twelve.mjs';

const all = (mark) => Object.fromEntries(POWERS.map((p) => [p.key, mark]));

test('THE TWELVE — exactly twelve, keys unique, criticality is a permutation of them', () => {
  assert.equal(POWERS.length, 12);
  const keys = POWERS.map((p) => p.key);
  assert.equal(new Set(keys).size, 12);
  assert.deepEqual([...CRITICALITY].sort(), [...keys].sort(), 'criticality names every power exactly once');
  assert.equal(CRITICALITY[0], 'CONTAINMENT', 'the boundary is the first thing looked for');
});

test('SCORE — the completeness law: (strong + 0.5·weak)/12, as percent', () => {
  assert.equal(score(all('strong')).completeness, 100);
  assert.equal(score(all('missing')).completeness, 0);
  assert.equal(score(all('weak')).completeness, 50);
  const m = all('missing'); m.MANIFESTATION = 'strong'; m.IGNITION = 'strong'; m.STRUCTURE = 'weak';
  assert.equal(score(m).completeness, 21, 'the raw-script shape: 2 strong + 1 weak = 2.5/12 = 21%');
});

test('SCORE — a raw script reads as a hack; a mature build names its few gaps', () => {
  const raw = all('missing'); raw.MANIFESTATION = 'strong'; raw.IGNITION = 'strong';
  const r = score(raw);
  assert.match(r.reading, /quick hack, not a system/);
  assert.equal(r.next, 'CONTAINMENT', 'the most critical missing power is the headline');
  const mature = all('strong'); mature.LIFE = 'weak';
  const m = score(mature);
  assert.equal(m.completeness, 96);
  assert.deepEqual(m.missing, []);
  assert.equal(m.next, 'LIFE', 'nothing missing → the most critical WEAK power is next');
  assert.match(m.reading, /gaps are the to-do list/);
});

test('SCORE — the diagnostic readings fire in their order', () => {
  const noBound = all('strong'); noBound.CONTAINMENT = 'missing';
  assert.match(score(noBound).reading, /no boundary — a liability/);
  const dead = all('strong'); dead.LIFE = 'missing';
  assert.match(score(dead).reading, /static — it will not improve/);
  const bolted = all('strong'); bolted.UNION = 'missing';
  assert.match(score(bolted).reading, /bolted-on parts/);
  const crutch = all('strong'); crutch.WHOLENESS = 'missing';
  assert.match(score(crutch).reading, /not sovereign yet/);
  assert.match(score(all('strong')).reading, /the court is full/);
  assert.equal(score(all('strong')).next, null, 'a full court has no next');
});

test('SCORE REFUSES — an unmarked power is not a pass, junk marks are named', () => {
  const partial = all('strong'); delete partial.WISDOM;
  assert.match(score(partial).why, /unmarked power\(s\): WISDOM/);
  assert.match(score(partial).why, /an unasked question is not a pass/);
  const junk = all('strong'); junk.FLOW = 'yes';
  assert.match(score(junk).why, /FLOW=yes/);
  assert.equal(score(null).ok, false);
  assert.equal(score([]).ok, false);
  assert.equal(score('strong').ok, false, 'a bare string is not marks — and must refuse, not throw');
  assert.equal(score(0).ok, false);
  const arr = []; for (const p of POWERS) arr[p.key] = 'strong';
  assert.equal(score(arr).ok, false, 'an array wearing the twelve keys is still not an object of marks');
});

test('SCORE — the hack-shape boundary is EXACTLY six missing', () => {
  // M+I strong, exactly 6 missing, 4 weak → the hack reading fires at >= 6, not above it
  const m = all('weak'); m.MANIFESTATION = 'strong'; m.IGNITION = 'strong';
  for (const k of ['CONTAINMENT', 'LIFE', 'UNION', 'WHOLENESS', 'STRUCTURE', 'RELATION']) m[k] = 'missing';
  assert.match(score(m).reading, /quick hack, not a system/, 'exactly 6 missing is already a hack');
});

test('RUBRIC — carries all twelve questions, refuses emptiness, caps the text', () => {
  const r = rubric('a till for market stallholders, single html, offline');
  assert.equal(r.ok, true);
  for (const p of POWERS) assert.ok(r.prompt.includes(p.key + ' (' + p.shape + ')'), p.key + ' question present');
  assert.match(r.system, /absence of evidence IS missing/);
  assert.match(r.prompt, /a till for market stallholders/);
  assert.equal(rubric('').ok, false);
  assert.equal(rubric(null).ok, false);
  assert.ok(rubric('x'.repeat(20000)).prompt.length < 14000, 'spec text capped');
});
