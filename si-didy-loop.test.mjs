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

test('constants: KAPPA = 1/φ, GOLDEN = the golden angle', () => {
  assert.ok(Math.abs(KAPPA - 0.6180339887) < 1e-9);
  assert.ok(Math.abs(GOLDEN - 2.399963229728653) < 1e-12);
});
