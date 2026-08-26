// scripts/seam.test.mjs — the seam law, falsifiable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seamFlux } from './seam.mjs';

const doors = (specs) => specs.map(([seq, status]) => ({ seq, status }));

test('SEAM — decided and risen computed exactly, verdict at κ', () => {
  // 11 approved, 5 rejected, 3 queued (the real 2026-08-26 shape), 7 executed
  const q = doors([[0,'approved'],[1,'approved'],[2,'rejected'],[3,'approved'],[4,'approved'],[5,'rejected'],
    [6,'queued'],[7,'approved'],[8,'approved'],[9,'queued'],[10,'approved'],[11,'approved'],[12,'rejected'],
    [13,'rejected'],[14,'approved'],[15,'approved'],[16,'rejected'],[17,'queued'],[18,'approved']]);
  const x = [0,1,3,4,7,8,18].map((seq) => ({ seq }));
  const r = seamFlux(q, x);
  assert.equal(r.ok, true);
  assert.equal(r.prepared, 19); assert.equal(r.approved, 11); assert.equal(r.rejected, 5); assert.equal(r.queued, 3);
  assert.equal(r.executed, 7);
  assert.equal(r.decided, 0.842);
  assert.equal(r.risen, 0.636);
  assert.match(r.verdict, /at κ — conducting and deliberate/);
});

test('SEAM — closed below the floor, flooding above the ceiling; boundaries are strict', () => {
  const q = doors([[0,'approved'],[1,'approved'],[2,'approved'],[3,'approved'],[4,'approved']]);
  assert.match(seamFlux(q, [{seq:0}]).verdict, /below the κ floor/, '1/5=0.2 closed');
  assert.match(seamFlux(q, [0,1,2,3,4].map((s)=>({seq:s}))).verdict, /above the κ ceiling/, '5/5=1 flood');
  // the fibonacci ratio 13/21 = 0.619 sits inside the band; 8/13 = 0.615 sits just under the floor
  const q21 = doors(Array.from({length:21},(_,i)=>[i,'approved']));
  assert.match(seamFlux(q21, Array.from({length:13},(_,i)=>({seq:i}))).verdict, /at κ/, '13/21 in band');
  const q13 = doors(Array.from({length:13},(_,i)=>[i,'approved']));
  assert.match(seamFlux(q13, Array.from({length:8},(_,i)=>({seq:i}))).verdict, /below the κ floor/, '8/13 just under');
});

test('SEAM — the κ boundaries are EXACT: 0.618 and 0.687 are IN the band', () => {
  const qN = (n) => Array.from({length:n},(_,i)=>({seq:i,status:'approved'}));
  const xN = (n) => Array.from({length:n},(_,i)=>({seq:i}));
  assert.match(seamFlux(qN(1000), xN(618)).verdict, /at κ/, '0.618 exactly = the floor is inclusive');
  assert.match(seamFlux(qN(1000), xN(687)).verdict, /at κ/, '0.687 exactly = the ceiling is inclusive');
  assert.match(seamFlux(qN(1000), xN(688)).verdict, /above the κ ceiling/);
});

test('SEAM — an execution naming an unapproved door does NOT count (the wall holds in the metric)', () => {
  const q = doors([[0,'approved'],[1,'queued'],[2,'rejected']]);
  const r = seamFlux(q, [{seq:1},{seq:2},{seq:99},{seq:0},{seq:0}]);
  assert.equal(r.executed, 1, 'only the approved seq 0 counts, deduped');
  assert.equal(r.risen, 1);
});

test('SEAM — total on garbage; empty queue is a finding not a crash; zero approved never divides', () => {
  assert.equal(seamFlux(null, []).ok, false);
  assert.equal(seamFlux('x', []).ok, false);
  assert.match(seamFlux([], []).verdict, /nothing to measure/);
  const r = seamFlux(doors([[0,'queued']]), [{seq:0}]);
  assert.equal(r.risen, 0, 'no approvals → risen 0, no NaN');
  const junk = seamFlux([null, 'x', {seq:0,status:'approved'}], [{seq:0}]);
  assert.equal(junk.prepared, 1, 'junk doors filtered');
});
