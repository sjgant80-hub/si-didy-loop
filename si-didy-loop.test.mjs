import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SiDidyLoop, INIT, BUILD, VERIFY, minimalMemory, KAPPA, GOLDEN } from './si-didy-loop.mjs';

test('BUILD forges a fold-signature whose generation scales with complexity', () => {
  const lo = BUILD(INIT({ theta: 0, complexity: 1 }));
  const hi = BUILD(INIT({ theta: 0, complexity: 8 }));
  const gen = (c) => c.folds.find((f) => f.axis === 2).depth;
  assert.ok(gen(hi) > gen(lo), 'more complexity ⇒ more generation');
  assert.ok(lo.folds.some((f) => f.axis === 17), 'has a resolver fold');
});

test('VERIFY is the κ-gate: a resolving candidate passes, a runaway is rejected', () => {
  const stable = { folds: [{ axis: 2, depth: 2 }, { axis: 17, depth: 8 }] };   // resolve 8 ≥ 0.618·10
  const runaway = { folds: [{ axis: 2, depth: 40 }, { axis: 17, depth: 2 }] };  // resolve 2 ≪ 0.618·42
  assert.equal(VERIFY(stable).valid, true);
  assert.equal(VERIFY(runaway).valid, false);
  assert.equal(VERIFY({ folds: [] }).valid, false, 'an empty candidate generates nothing — invalid');
});

test('a step runs the whole lifecycle and records the liveness series', () => {
  const loop = new SiDidyLoop({ strategy: 'spiral' });
  const r = loop.step();
  assert.equal(r.cycle, 1);
  assert.equal(loop.forgeSeries.length, 1);
  assert.equal(r.stored + r.rejected, 1, 'exactly one of stored/rejected per cycle');
});

test('naive strategy DEAD-ORBITS — one distinct state forever (the flatline)', () => {
  const loop = new SiDidyLoop({ strategy: 'naive' });
  loop.run(50);
  assert.equal(loop.report().distinct, 1, 'naive never leaves its starting state');
});

test('spiral strategy explores new territory AND stores (the alive loop)', () => {
  const loop = new SiDidyLoop({ strategy: 'spiral' });
  const r = loop.run(50);
  assert.ok(r.distinct > 10, `spiral visits many states (got ${r.distinct})`);
  assert.ok(r.stored > 0, 'spiral stores stable builds as it climbs');
});

test('unbounded strategy runs away — generation outruns the κ-gate, almost nothing stores', () => {
  const loop = new SiDidyLoop({ strategy: 'unbounded' });
  const r = loop.run(50);
  assert.ok(r.rejected > r.stored, 'the ungated loop is rejected far more than it stores');
  const s = loop.forgeSeries;
  assert.ok(s[s.length - 1] > s[0] * 2, 'forge grows without bound (escaped)');
});

test('the REMEMBER organ is injectable — a custom memory receives the stores', () => {
  const mem = minimalMemory();
  const loop = new SiDidyLoop({ strategy: 'spiral', memory: mem });
  loop.run(40);
  assert.equal(mem.size, loop.stored, 'injected memory holds exactly the stored builds');
});

test('region buckets an attempt into a (phase, complexity) cell', () => {
  const loop = new SiDidyLoop();
  assert.deepEqual(loop.region({ theta: 0, complexity: 3 }), { phase: 0, c: 3 });
  assert.equal(loop.region({ theta: Math.PI, complexity: 5 }).phase, 6, 'θ=π is the opposite of 12 buckets');
  assert.equal(loop.region({ theta: 0, complexity: 4.4 }).c, 4, 'complexity rounds to a cell');
});

test('a rejected build becomes a DURABLE miss-signature (missig failure-forward)', () => {
  const loop = new SiDidyLoop({ strategy: 'unbounded' });   // unbounded → mostly rejected
  loop.run(40);
  assert.ok(loop.rejected > 0);
  assert.ok(loop.misses.size > 0, 'rejections are remembered as miss-signatures');
});

test('durable failure-forward pays off — the learning spiral rejects LESS and stores MORE than the blind one', () => {
  const learn = new SiDidyLoop({ strategy: 'spiral', learn: true }).run(300);
  const blind = new SiDidyLoop({ strategy: 'spiral', learn: false }).run(300);
  assert.ok(learn.avoided > 0, 'the learner backed off from known-doomed regions');
  assert.ok(learn.rejected < blind.rejected, `learner wastes fewer cycles (${learn.rejected} < ${blind.rejected})`);
  assert.ok(learn.stored > blind.stored, `and stores more good folds (${learn.stored} > ${blind.stored})`);
});

test('a blind spiral (learn:false) still records misses but never consults them', () => {
  const blind = new SiDidyLoop({ strategy: 'spiral', learn: false }).run(60);
  assert.equal(blind.avoided, 0, 'learn:false never avoids');
  assert.ok(blind.misses > 0, 'but the misses are still recorded');
});

test('the spiral is deterministic — this exact trajectory (characterization: kills stall-guard/region/escape/loop drift)', () => {
  const l = new SiDidyLoop({ strategy: 'spiral' });
  const r = l.run(100);
  assert.deepEqual({ stored: r.stored, rejected: r.rejected, distinct: r.distinct, misses: r.misses, avoided: r.avoided, cycle: r.cycles },
    { stored: 62, rejected: 38, distinct: 100, misses: 13, avoided: 118, cycle: 100 });
  assert.equal(l.recent.length, 8, 'the stall-guard memory holds exactly the last 8 phases');
  assert.deepEqual(new SiDidyLoop({ strategy: 'spiral' }).run(14).forgeSeries,
    [14, 9, 12, 11, 7, 12, 8, 9, 12, 7, 11, 9, 7, 12], 'the per-cycle forge sequence is pinned');
});

test('the stall guard fires — a next phase landing on a recent one is kicked clear', () => {
  const TAU = 2 * Math.PI, wrap = (x) => ((x % TAU) + TAU) % TAU;
  const l = new SiDidyLoop({ strategy: 'spiral' });
  const target = 2.0;
  l.recent = [wrap(target)];                                   // a recent phase
  l.state = { theta: wrap(target - GOLDEN), complexity: 3 };   // so theta + GOLDEN lands exactly on it
  l.newestStoredComplexity = 3; l.lastRejected = false;
  const next = l.EXPLORE();
  const d = wrap(next.theta - wrap(target));
  assert.ok(d > 0.06 && d < TAU - 0.06, 'the guard bumped the next phase clear of the recent one (not on top of it)');
});

test('constants: KAPPA = 1/φ, GOLDEN = the golden angle', () => {
  assert.ok(Math.abs(KAPPA - 0.6180339887) < 1e-9);
  assert.ok(Math.abs(GOLDEN - 2.399963229728653) < 1e-12);
});
