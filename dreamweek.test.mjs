import { test } from 'node:test';
import assert from 'node:assert/strict';
import { windowCounts, verdict } from './dreamweek.mjs';
import def from './dreamweek.mjs';

const FROM = '2026-10-28T12:00:00.000Z';
const TO = '2026-11-04T12:00:00.000Z';
const h = (hoursAfterFrom) => new Date(Date.parse(FROM) + hoursAfterFrom * 3600000).toISOString();
const dream = (title, at) => ({ kind: 'dream', title, detail: 'never read', ts: h(at), visibility: 'private' });
const render = (title, at) => ({ kind: 'render', title, detail: '===KERNEL===', ts: h(at) });
const gate = (title, at, detail) => ({ kind: 'gate', title: title + ' gated', detail, ts: h(at) });
const note = (title, at, detail = 'x') => ({ kind: 'note', title, detail, ts: h(at) });
const W = { from: FROM, to: TO };

test('refuses what is not a ledger or a window', () => {
  assert.deepEqual(windowCounts(null, W), { ok: false, why: 'ledger must be an array' });
  assert.deepEqual(windowCounts({}, W), { ok: false, why: 'ledger must be an array' });
  for (const o of [null, undefined, 5, 'x', []]) assert.deepEqual(windowCounts([], o), { ok: false, why: 'opts must be an object' });
  const bad = { ok: false, why: 'opts.from and opts.to must be ISO times' };
  assert.deepEqual(windowCounts([], { from: 'nope', to: TO }), bad);
  assert.deepEqual(windowCounts([], { from: FROM, to: 'nope' }), bad);
  assert.deepEqual(windowCounts([], { from: Date.parse(FROM), to: TO }), bad);
  assert.deepEqual(windowCounts([], { from: FROM, to: Date.parse(TO) }), bad);
  assert.deepEqual(windowCounts([], { to: TO }), bad);
  assert.deepEqual(windowCounts([], { from: FROM, to: FROM }), { ok: false, why: 'opts.to must be after opts.from' });
  assert.deepEqual(windowCounts([], { from: TO, to: FROM }), { ok: false, why: 'opts.to must be after opts.from' });
  for (const family of ['', '+++', 7, null]) assert.deepEqual(windowCounts([], { ...W, family }), { ok: false, why: 'opts.family must be a title' });
});

test('an empty window measures nothing: rates are null, never NaN', () => {
  assert.deepEqual(windowCounts([], W), { ok: true, from: FROM, to: TO, dreams: 0, becameCode: 0, passedGate: 0, familyDreams: 0, renderRate: null, passedRate: null, familyShare: null });
  assert.equal(windowCounts([], { ...W, family: 'PathFinder' }).familyShare, null);
});

test('a dream became code when a render follows it before the next dream; it passed when a gate records clean', () => {
  const ledger = [
    dream('A', 1), render('A', 1.1), gate('A', 1.2, '{"clean":false,"killed":7,"total":9} (round 0)'), render('A (revision 1)', 1.3), gate('A', 1.4, '{"clean": true,"killed":9,"total":9} (round 1)'), note('learned: A', 1.5),
    dream('B', 2), note('no render: B', 2.1),
    dream('C', 3), render('C', 3.1), gate('C', 3.2, 'tests failed (round 0)'), note('failure noted: C', 3.3, '{"clean":true} is not a gate'),
    dream('D', 4), gate('D', 4.1, '{"clean":true}'),
  ];
  const r = windowCounts(ledger, W);
  assert.equal(r.dreams, 4);
  assert.equal(r.becameCode, 2);                       // A and C; D's gate without a render is not code
  assert.equal(r.passedGate, 2);                       // A (its second round) and D; C's note quoting clean is not a gate
  assert.equal(r.renderRate, 0.5);
  assert.equal(r.passedRate, 0.5);
});

test('a gate whose detail is not text, or does not say clean, does not pass', () => {
  const ledger = [dream('A', 1), render('A', 1.1), { kind: 'gate', title: 'A gated', detail: { clean: true }, ts: h(1.2) }, gate('A', 1.3, 'tests failed (round 1)'), gate('A', 1.4, '"clean":false')];
  const r = windowCounts(ledger, W);
  assert.equal(r.becameCode, 1);
  assert.equal(r.passedGate, 0);
});

test('only dreams inside the window count; a dream outside still closes the one before it', () => {
  const ledger = [
    dream('Before', -1), render('Before', -0.9),             // outside: its render belongs to nobody in the window
    dream('AtStart', 0), render('AtStart', 0.1),             // exactly at from: out
    dream('In', 0.5),                                        // in, never rendered — the next (outside) dream closes it
    dream('AtEnd', 168), render('AtEnd', 168.1),             // exactly at to: in
    dream('After', 169), render('After', 169.1),             // out
  ];
  const r = windowCounts(ledger, W);
  assert.equal(r.dreams, 2);
  assert.equal(r.becameCode, 1);
  assert.equal(r.renderRate, 0.5);
  const tail = windowCounts([dream('In', 1), dream('Late', 200), render('Late', 200.1)], W);
  assert.equal(tail.dreams, 1);
  assert.equal(tail.becameCode, 0);
});

test('garbage entries are skipped; a dream with no usable time is outside every window but still closes', () => {
  const ledger = [null, 5, 'dream', [dream('X', 1)], dream('A', 1), { kind: 'dream', title: 'NoTime' }, render('NoTime', 1.2),
    { kind: 'dream', title: 'NumTime', ts: Date.parse(h(2)) }, render('NumTime', 2.1), dream('B', 3), render('B', 3.1)];
  const r = windowCounts(ledger, W);
  assert.equal(r.dreams, 2);
  assert.equal(r.becameCode, 1);                       // B only — A was closed by the timeless dream before NoTime's render
});

test('a family is counted under the sealed rule: version markers fold, things do not', () => {
  const ledger = ['PathFinder++', 'PathFinder+++', 'PathFinderOptimized', 'PathFinder Redux', 'PathFinderEnhanced', 'PathOptimizer', 'ColorBlender', 'PathFinder Evolution', '+++'].map((t, i) => dream(t, i + 1));
  const r = windowCounts(ledger, { ...W, family: 'PathFinder' });
  assert.equal(r.dreams, 9);
  assert.equal(r.familyDreams, 5);
  assert.equal(r.familyShare, 0.5556);
  assert.equal(windowCounts(ledger, { ...W, family: 'pathfinder+++' }).familyDreams, 5);
  const none = windowCounts(ledger, W);
  assert.equal(none.familyDreams, 0);                  // no family asked: nothing counted, not even the empty-titled dream
  assert.equal(none.familyShare, null);
});

test('rates are rounded to four places', () => {
  const ledger = [dream('A', 1), render('A', 1.1), dream('B', 2), dream('C', 3)];
  assert.equal(windowCounts(ledger, W).renderRate, 0.3333);
});

test('verdict: W1 holds when more dreams became code, W2 when the family share fell; ties fail', () => {
  const w = (renderRate, familyShare) => ({ ok: true, renderRate, familyShare });
  assert.deepEqual(verdict(w(0.2, 0.14), w(0.9, 0.4)), { ok: true, W1: 'HOLDS', W2: 'FAILS' });
  assert.deepEqual(verdict(w(0.9, 0.4), w(0.2, 0.14)), { ok: true, W1: 'FAILS', W2: 'HOLDS' });
  assert.deepEqual(verdict(w(0.5, 0.3), w(0.5, 0.3)), { ok: true, W1: 'FAILS', W2: 'FAILS' });
  assert.deepEqual(verdict(w(null, 0.3), w(0.5, null)), { ok: true, W1: 'UNMEASURED', W2: 'UNMEASURED' });
  assert.deepEqual(verdict(w(0.5, null), w(null, 0.3)), { ok: true, W1: 'UNMEASURED', W2: 'UNMEASURED' });
  assert.deepEqual(verdict(w(0, 0), w(0, 0)), { ok: true, W1: 'FAILS', W2: 'FAILS' });
});

test('verdict: refuses anything but two measured windows', () => {
  const good = { ok: true, renderRate: 0.1, familyShare: 0.1 };
  const no = { ok: false, why: 'two measured windows' };
  for (const bad of [null, 5, [], {}, { ok: false }, { ok: 'true', renderRate: 0.1 }]) {
    assert.deepEqual(verdict(bad, good), no);
    assert.deepEqual(verdict(good, bad), no);
  }
});

test('the default export carries both functions; garbage never throws', () => {
  assert.equal(def.windowCounts, windowCounts);
  assert.equal(def.verdict, verdict);
  for (const g of [undefined, null, 0, '', {}, [], [[]], [{ kind: 'dream', ts: {} }], [{ kind: 'gate', detail: 1 }]]) {
    assert.doesNotThrow(() => windowCounts(g, W));
    assert.doesNotThrow(() => windowCounts(Array.isArray(g) ? g : [], { from: g, to: g, family: g }));
    assert.doesNotThrow(() => verdict(g, g));
  }
});
