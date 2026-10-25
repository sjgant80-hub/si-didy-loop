import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeShare, anchorsIn, lessonKey, DEFAULT_ANCHORS } from './sharedoor.mjs';

const NOW = '2026-10-25T10:00:00Z';
const good = { kind: 'note', title: 'learned: PulseDebounce', reason: 'the debounce pattern applies to the closing bell and the door-queue' };

// --- refusals: garbage is not-a-share, never a throw ---
test('non-shares refuse', () => {
  for (const s of [null, undefined, 'x', 5, [], [good]]) {
    const r = judgeShare(s, { now: NOW });
    assert.equal(r.ok, false);
    assert.match(r.why, /not a share/);
  }
});
test('untitled refuses', () => {
  for (const title of [undefined, '', '   ', 7]) {
    const r = judgeShare({ ...good, title }, { now: NOW });
    assert.equal(r.ok, false); assert.match(r.why, /untitled/);
  }
});
test('no reason refuses', () => {
  for (const reason of [undefined, '', '  ', 3]) {
    const r = judgeShare({ ...good, reason }, { now: NOW });
    assert.equal(r.ok, false); assert.match(r.why, /no reason/);
  }
});
test('missing or bad options refuse', () => {
  for (const o of [undefined, null, 'now', []]) {
    const r = judgeShare(good, o);
    assert.equal(r.ok, false); assert.match(r.why, /options/);
  }
});
test('no clock refuses', () => {
  for (const now of [undefined, '', 'yesterday', 1729850000000]) {
    const r = judgeShare(good, { now });
    assert.equal(r.ok, false); assert.match(r.why, /no clock/);
  }
});
test('bad anchors / known refuse', () => {
  const a = judgeShare(good, { now: NOW, anchors: 'gate' });
  assert.equal(a.ok, false); assert.match(a.why, /anchors/);
  const k = judgeShare(good, { now: NOW, known: { title: 'x' } });
  assert.equal(k.ok, false); assert.match(k.why, /known/);
});

// --- the stamp ---
test('stamps at from the caller clock, normalised ISO', () => {
  const r = judgeShare(good, { now: '2026-10-25T10:00:00+01:00' });
  assert.equal(r.ok, true); assert.equal(r.open, true);
  assert.equal(r.at, '2026-10-25T09:00:00.000Z');
  assert.equal(r.share.at, '2026-10-25T09:00:00.000Z');
  assert.deepEqual(Object.keys(r.share).sort(), ['at', 'kind', 'reason', 'title']);
});
test('share trims and keeps kind; defaults kind to note', () => {
  const r = judgeShare({ kind: 'render', title: '  learned: X ', reason: '  the witness gate  ' }, { now: NOW });
  assert.equal(r.share.kind, 'render'); assert.equal(r.share.title, 'learned: X'); assert.equal(r.share.reason, 'the witness gate');
  assert.equal(judgeShare({ title: 'x', reason: 'the witness gate' }, { now: NOW }).share.kind, 'note');
  assert.equal(judgeShare({ kind: 5, title: 'x', reason: 'the witness gate' }, { now: NOW }).share.kind, 'note');
});

// --- the platitude floor: the three real shares that went out in October ---
const PLATITUDES = [
  'Clear communication prevents project ambiguities and ensures successful collaboration.',
  'It highlights how underlying order can exist within chaos, a concept valuable for further simulations and theoretical discussions.',
  'I want to share the positive impact of rule-based creativity with Simon and claudedidy to inspire our next collaborative project.',
];
test('platitudes are shut, with the reason and no share', () => {
  for (const reason of PLATITUDES) {
    const r = judgeShare({ kind: 'note', title: 'failure noted: DynamicEchoAnalyzer', reason }, { now: NOW });
    assert.equal(r.ok, true); assert.equal(r.open, false); assert.equal(r.repeat, false);
    assert.equal(r.share, undefined); assert.deepEqual(r.named, []);
    assert.equal(r.at, '2026-10-25T10:00:00.000Z');
    assert.match(r.why, /names nothing/);
  }
});
test('addressees alone do not anchor a reason', () => {
  assert.equal(judgeShare({ title: 't', reason: 'Simon and claudedidy and Kar should see it' }, { now: NOW }).open, false);
  assert.deepEqual(anchorsIn('tell claudeDidy and Sididy', 't', []), []);
});
test('the share\'s own title does not anchor its reason', () => {
  assert.equal(judgeShare({ title: 'learned: HysteresisGate', reason: 'HysteresisGate is lovely to think about' }, { now: NOW, anchors: [] }).open, false);
  assert.equal(judgeShare({ title: 'Gate', reason: 'a gate is nice' }, { now: NOW }).open, false);
});

// --- what DOES anchor ---
test('an anchor word opens the door and is named', () => {
  const r = judgeShare(good, { now: NOW });
  assert.equal(r.open, true); assert.equal(r.repeat, false);
  assert.ok(r.named.includes('bell')); assert.ok(r.named.includes('door-queue'));
  assert.match(r.why, /^open — the reason names /);
});
test('plural anchors count; substrings inside words do not', () => {
  assert.deepEqual(anchorsIn('future kernels', 't', ['kernel']), ['kernel']);
  assert.deepEqual(anchorsIn('kernelish', 't', ['kernel']), []);
  assert.deepEqual(anchorsIn('akernel', 't', ['kernel']), []);
  assert.deepEqual(anchorsIn('gate-writing pattern', 't', ['gate']), ['gate']);
  assert.deepEqual(anchorsIn('kernel', 't', ['kernel']), ['kernel']);
});
test('anchor matching is case-insensitive and regex-safe', () => {
  assert.deepEqual(anchorsIn('the WITNESS run', 't', ['witness']), ['witness']);
  assert.deepEqual(anchorsIn('see a+b here', 't', ['a+b']), ['a+b']);
  assert.deepEqual(anchorsIn('see aab here', 't', ['a+b']), []);
  assert.deepEqual(anchorsIn('x', 't', [' ', '', 9, null]), []);
});
test('code-shaped names anchor: files, camelCase, PascalCase, rule N, scores', () => {
  assert.deepEqual(anchorsIn('touches render.mjs', 't', []), ['render.mjs']);
  assert.deepEqual(anchorsIn('see shares.json', 't', []), ['shares.json']);
  assert.deepEqual(anchorsIn('call foldLessons first', 't', []), ['foldLessons']);
  assert.deepEqual(anchorsIn('like TrustDecay did', 't', []), ['TrustDecay']);
  assert.deepEqual(anchorsIn('costs nothing from rule 7', 't', []), ['rule 7']);
  assert.deepEqual(anchorsIn('a clean 16/16 run', 't', []), ['16/16']);
  assert.deepEqual(anchorsIn('a plain sentence', 't', []), []);
  assert.deepEqual(anchorsIn('Trust decays', 't', []), []);
});
test('anchorsIn is total and de-duplicates', () => {
  assert.deepEqual(anchorsIn(null, 't', DEFAULT_ANCHORS), []);
  assert.deepEqual(anchorsIn('gate gate gates', 't', ['gate']), ['gate']);
});
test('custom anchors replace the defaults', () => {
  assert.equal(judgeShare({ title: 't', reason: 'the witness gate' }, { now: NOW, anchors: ['falcon'] }).open, false);
  assert.equal(judgeShare({ title: 't', reason: 'the falcon flies' }, { now: NOW, anchors: ['falcon'] }).open, true);
});
test('defaults include the anchors the backtest needed', () => {
  for (const a of ['gate', 'witness', 'door-queue', 'memory', 'refusal', 'estate', 'debrief', 'reuse']) assert.ok(DEFAULT_ANCHORS.includes(a), a);
});

// --- repeats: labelled, never shut ---
const known = [{ title: 'HysteresisGate', count: 7 }, { title: 'Once', count: 1 }, { title: 'Twice', count: 2 }];
test('a lesson the ledger holds >=2x is labelled a repeat but still opens', () => {
  const r = judgeShare({ title: 'learned: HysteresisGate', reason: 'every threshold gate in the estate' }, { now: NOW, known });
  assert.equal(r.open, true); assert.equal(r.repeat, true); assert.equal(r.share.repeat, 7);
  assert.match(r.why, /repeat .* 7×/);
  const t = judgeShare({ title: 'learned: Twice', reason: 'the witness gate' }, { now: NOW, known });
  assert.equal(t.repeat, true); assert.equal(t.share.repeat, 2);
});
test('a lesson seen once is not a repeat', () => {
  const r = judgeShare({ title: 'learned: Once', reason: 'the witness gate' }, { now: NOW, known });
  assert.equal(r.repeat, false); assert.equal(r.share.repeat, undefined);
});
test('"new:" lifts the repeat label', () => {
  const r = judgeShare({ title: 'learned: HysteresisGate', reason: 'new: the exit band must sit below the health-gate floor' }, { now: NOW, known });
  assert.equal(r.open, true); assert.equal(r.repeat, false);
  assert.equal(judgeShare({ title: 'learned: HysteresisGate', reason: 'renew: the gate' }, { now: NOW, known }).repeat, true);
  assert.equal(judgeShare({ title: 'learned: HysteresisGate', reason: 'the gate, NEW : wider' }, { now: NOW, known }).repeat, false);
});
test('repeat takes the highest count and ignores garbage rows', () => {
  const k = [null, 'x', { title: 'A', count: 'many' }, { title: 'A', count: 2.5 }, { title: 'A', count: 3 }, { title: 'a', count: 2 }];
  const r = judgeShare({ title: 'failure noted: A', reason: 'the witness gate' }, { now: NOW, known: k });
  assert.equal(r.repeat, true); assert.equal(r.share.repeat, 3);
  const g = judgeShare({ title: 'A', reason: 'the witness gate' }, { now: NOW, known: [{ title: 'A', count: 2.5 }, { title: 'A', count: '9' }] });
  assert.equal(g.repeat, false);
});
test('a platitude repeat is shut, not labelled', () => {
  const r = judgeShare({ title: 'learned: HysteresisGate', reason: 'it is a nice idea to share' }, { now: NOW, known });
  assert.equal(r.open, false); assert.equal(r.repeat, false);
});

// --- lessonKey ---
test('lessonKey strips prefixes, lowercases, collapses space', () => {
  assert.equal(lessonKey('learned: HysteresisGate'), 'hysteresisgate');
  assert.equal(lessonKey('Failure Noted:  QuorumMask   Aggregate '), 'quorummask aggregate');
  assert.equal(lessonKey('lesson:x'), 'x');
  assert.equal(lessonKey('share : y'), 'y');
  assert.equal(lessonKey('a learned: b'), 'a learned: b');
  assert.equal(lessonKey(5), '');
});

// --- fuzz: pure kernels never throw on garbage ---
test('fuzz: never throws', () => {
  let seed = 42; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const pool = [null, undefined, 0, '', 'x', [], {}, NaN, 'rule 9', 'gate', { title: 'q' }, () => 1, Symbol.for('s')];
  const pick = () => pool[Math.floor(rnd() * pool.length)];
  for (let i = 0; i < 500; i++) {
    const r = judgeShare({ kind: pick(), title: pick(), reason: pick() }, rnd() > 0.3 ? { now: rnd() > 0.5 ? NOW : pick(), known: rnd() > 0.5 ? [pick()] : pick(), anchors: rnd() > 0.5 ? undefined : [pick()] } : pick());
    assert.equal(typeof r.ok, 'boolean');
  }
});
