import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foldLessons } from './lessonsfold.mjs';

// --- validation ---
test('rejects non-array shares', () => {
  const r = foldLessons('nope');
  assert.equal(r.ok, false);
  assert.match(r.why, /array/);
});
test('rejects non-object opts', () => {
  assert.equal(foldLessons([], 5).ok, false);
});
test('rejects null opts', () => {
  assert.equal(foldLessons([], null).ok, false);
});
test('rejects non-number minCount', () => {
  const r = foldLessons([], { minCount: 'x' });
  assert.equal(r.ok, false);
  assert.match(r.why, /minCount/);
});
test('rejects minCount below 1', () => {
  assert.equal(foldLessons([], { minCount: 0 }).ok, false);
  assert.equal(foldLessons([], { minCount: -1 }).ok, false);
});
test('rejects minCount below 1 with the exact message (isolates the clause, not just the string)', () => {
  const r = foldLessons([], { minCount: 0 });
  assert.equal(r.why, 'opts.minCount must be a finite number >= 1');
});
test('rejects non-finite minCount (Infinity) even though typeof is number and it is not < 1', () => {
  // isolates the !Number.isFinite clause specifically: typeof-check and the <1 check both
  // pass here, only the finiteness check catches it.
  const r = foldLessons([], { minCount: Infinity });
  assert.equal(r.ok, false);
});
test('accepts minCount exactly 1', () => {
  const r = foldLessons([{ title: 'learned: X', reason: 'r' }], { minCount: 1 });
  assert.equal(r.ok, true);
  assert.equal(r.lessons.length, 1);
});

// --- empty / garbage-tolerant ---
test('empty shares -> empty lessons, ok', () => {
  const r = foldLessons([]);
  assert.deepEqual(r, { ok: true, lessons: [] });
});
test('skips non-object entries without throwing', () => {
  const r = foldLessons([null, undefined, 'str', 42, [], { title: 'learned: A', reason: 'a' }, { title: 'learned: A', reason: 'a again' }]);
  assert.equal(r.ok, true);
  assert.equal(r.lessons.length, 1);
  assert.equal(r.lessons[0].title, 'A');
});
test('skips entries with no title or non-string title', () => {
  const r = foldLessons([{ reason: 'no title' }, { title: 123, reason: 'x' }, { title: '   ', reason: 'blank' }]);
  assert.deepEqual(r.lessons, []);
});

// --- prefix stripping / recurrence identity ---
test('strips "learned: " and "failure noted: " prefixes so the SAME title recurs across both', () => {
  const shares = [
    { title: 'learned: HysteresisGate', reason: 'first' },
    { title: 'failure noted: HysteresisGate', reason: 'second' },
  ];
  const r = foldLessons(shares);
  assert.equal(r.ok, true);
  assert.equal(r.lessons.length, 1);
  assert.equal(r.lessons[0].title, 'HysteresisGate');
  assert.equal(r.lessons[0].count, 2);
});
test('titles with no recognized prefix are used verbatim (trimmed)', () => {
  const shares = [{ title: '  PixelWhisperer  ', reason: 'a' }, { title: 'PixelWhisperer', reason: 'b' }];
  const r = foldLessons(shares);
  assert.equal(r.lessons[0].title, 'PixelWhisperer');
  assert.equal(r.lessons[0].count, 2);
});
test('prefix match is case-insensitive', () => {
  const shares = [{ title: 'LEARNED: Foo', reason: 'a' }, { title: 'Failure Noted: Foo', reason: 'b' }];
  const r = foldLessons(shares);
  assert.equal(r.lessons.length, 1);
  assert.equal(r.lessons[0].count, 2);
});

// --- default minCount filters singletons ---
test('default minCount=2 drops titles seen only once', () => {
  const shares = [{ title: 'learned: OnlyOnce', reason: 'a' }, { title: 'learned: Twice', reason: 'a' }, { title: 'learned: Twice', reason: 'b' }];
  const r = foldLessons(shares);
  assert.equal(r.lessons.length, 1);
  assert.equal(r.lessons[0].title, 'Twice');
});

// --- sorting: count desc, then title asc ---
test('sorts by count descending', () => {
  const shares = [
    { title: 'learned: A', reason: '1' }, { title: 'learned: A', reason: '2' },
    { title: 'learned: B', reason: '1' }, { title: 'learned: B', reason: '2' }, { title: 'learned: B', reason: '3' },
  ];
  const r = foldLessons(shares);
  assert.deepEqual(r.lessons.map((l) => l.title), ['B', 'A']);
});
test('ties break by title ascending', () => {
  const shares = [
    { title: 'learned: Zeta', reason: '1' }, { title: 'learned: Zeta', reason: '2' },
    { title: 'learned: Alpha', reason: '1' }, { title: 'learned: Alpha', reason: '2' },
  ];
  const r = foldLessons(shares);
  assert.deepEqual(r.lessons.map((l) => l.title), ['Alpha', 'Zeta']);
});

// --- firstAt / lastAt / sample tracking ---
test('tracks firstAt as the earliest timestamp and lastAt as the latest', () => {
  const shares = [
    { title: 'learned: X', at: '2026-09-10T00:00:00Z', reason: 'mid' },
    { title: 'learned: X', at: '2026-09-05T00:00:00Z', reason: 'earliest' },
    { title: 'learned: X', at: '2026-09-20T00:00:00Z', reason: 'latest' },
  ];
  const r = foldLessons(shares);
  const l = r.lessons[0];
  assert.equal(l.firstAt, '2026-09-05T00:00:00Z');
  assert.equal(l.lastAt, '2026-09-20T00:00:00Z');
  assert.equal(l.sample, 'latest');
});
test('sample falls back to any available reason when no entry carries a timestamp', () => {
  const shares = [{ title: 'learned: Y', reason: 'only reason' }, { title: 'learned: Y', reason: '' }];
  const r = foldLessons(shares);
  assert.equal(r.lessons[0].sample, 'only reason');
  assert.equal(r.lessons[0].firstAt, null);
  assert.equal(r.lessons[0].lastAt, null);
});
test('entries with no reason at all leave sample null rather than throwing', () => {
  const shares = [{ title: 'learned: Z' }, { title: 'learned: Z' }];
  const r = foldLessons(shares);
  assert.equal(r.lessons[0].sample, null);
});
test('a later share with an EARLIER timestamp does not overwrite lastAt/sample (isolates && vs || on the lastAt guard)', () => {
  const shares = [
    { title: 'learned: Ord', at: 'T5', reason: 'r1' },
    { title: 'learned: Ord', at: 'T3', reason: 'r2' }, // T3 < T5 lexicographically: not the new latest
  ];
  const r = foldLessons(shares);
  const l = r.lessons[0];
  assert.equal(l.firstAt, 'T3'); // T3 IS the earlier one -> correctly becomes firstAt
  assert.equal(l.lastAt, 'T5'); // but it must NOT become lastAt
  assert.equal(l.sample, 'r1'); // and must NOT overwrite the sample either
});
test('a share with the SAME lastAt timestamp still updates the sample (isolates >= vs > on the lastAt boundary)', () => {
  const shares = [
    { title: 'learned: Tie', at: 'T1', reason: 'first' },
    { title: 'learned: Tie', at: 'T1', reason: 'second' }, // tied, not later -> >= still counts it as current
  ];
  const r = foldLessons(shares);
  assert.equal(r.lessons[0].lastAt, 'T1');
  assert.equal(r.lessons[0].sample, 'second');
});
test('the timestamp-less fallback keeps the FIRST reason seen, not the last (isolates && vs || on the sample-fallback guard)', () => {
  const shares = [
    { title: 'learned: Nots', reason: 'first' },
    { title: 'learned: Nots', reason: 'second' },
  ];
  const r = foldLessons(shares);
  assert.equal(r.lessons[0].sample, 'first');
});
test('a non-string reason is treated as absent, not stringified', () => {
  const shares = [{ title: 'learned: W', reason: 42 }, { title: 'learned: W', reason: { not: 'a string' } }];
  const r = foldLessons(shares);
  assert.equal(r.lessons[0].sample, null);
});

// --- real-shape smoke test mirroring the estate's own recurring finding ---
test('real-shape smoke: HysteresisGate recurring six times outranks a two-time lesson', () => {
  const shares = [
    ...Array.from({ length: 6 }, (_, i) => ({ title: 'learned: HysteresisGate', at: `2026-09-${10 + i}T00:00:00Z`, reason: 'two-threshold fix' })),
    { title: 'learned: TrustDecay', at: '2026-09-11T00:00:00Z', reason: 'decay curves' },
    { title: 'learned: TrustDecay', at: '2026-09-12T00:00:00Z', reason: 'decay curves again' },
  ];
  const r = foldLessons(shares);
  assert.equal(r.lessons[0].title, 'HysteresisGate');
  assert.equal(r.lessons[0].count, 6);
  assert.equal(r.lessons[1].title, 'TrustDecay');
  assert.equal(r.lessons[1].count, 2);
});
