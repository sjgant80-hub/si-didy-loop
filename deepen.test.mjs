// si-didy-loop · deepen.test.mjs — the deepening loop, every rule falsifiable.
// The mini-graph below implements the injected contract exactly; the pins are exact (κ decay to
// the digit); each gate refusal fires ALONE with its own sentence; the DENSER-PER-USE claim is
// proven by running the same turn twice and counting reach; the dream never writes; fuzz is total.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KAPPA, DEFAULTS, fan, gate, remember, dream, deepenTurn } from './deepen.mjs';

/** The smallest graph honouring the contract: node / edgesFrom / addEdge / hasEdge. */
function mini() {
  const nodes = new Map(), out = new Map();
  const key = (f, t, to) => `${f} ${t} ${to}`;
  const edges = new Set();
  return {
    node: (id) => nodes.get(String(id)) || null,
    edgesFrom: (id) => out.get(String(id)) || [],
    addNode(id, type = 'node', meta = {}) { nodes.set(String(id), { id: String(id), type, meta }); if (!out.has(String(id))) out.set(String(id), []); return this; },
    addEdge(from, to, type, { weight = 1, meta = {} } = {}) {
      if (!nodes.has(String(from))) this.addNode(from);
      if (!nodes.has(String(to))) this.addNode(to);
      out.get(String(from)).push({ from: String(from), to: String(to), type, weight, meta });
      edges.add(key(from, type, to));
      return this;
    },
    hasEdge: (f, t, to) => edges.has(key(f, t, to)),
    edgeCount: () => edges.size,
  };
}

/** The fixture estate: grounded chain A→B→C, an ungrounded reach, a clash, a faint far node. */
function estate() {
  const g = mini();
  g.addNode('A', 'repo', { src: 'estate-index' });
  g.addNode('B', 'repo', { src: 'estate-index' });
  g.addNode('C', 'repo', { src: 'estate-index' });
  g.addNode('GHOST', 'idea', {});                       // no provenance — the fan may hold, the gate must not ship
  g.addNode('D', 'repo', { src: 'estate-index' });      // grounded but clashed
  g.addNode('FAR', 'repo', { src: 'estate-index' });
  g.addEdge('A', 'B', 'reuses');
  g.addEdge('B', 'C', 'depends');
  g.addEdge('A', 'GHOST', 'kin');
  g.addEdge('A', 'D', 'reuses');
  g.addEdge('D', 'X', 'clash');                          // D is touched by a contradiction
  g.addEdge('C', 'FAR', 'reuses', { weight: 0.1 });      // fades past the floor by hop three
  return g;
}

test('THE FAN WALKS WIDE, DECAYS AT κ TO THE DIGIT, AND NEVER WALKS THROUGH A CLASH', () => {
  const g = estate();
  const branches = fan(g, ['A']);
  const byNode = Object.fromEntries(branches.map(b => [b.node, b]));
  assert.equal(byNode.B.hops, 1);
  assert.equal(byNode.B.weight, 1, 'hop one carries full weight');
  assert.equal(byNode.C.hops, 2);
  assert.equal(byNode.C.weight, KAPPA, 'hop two fades by exactly κ');
  assert.equal(byNode.FAR.weight, KAPPA * KAPPA * 0.1, 'edge weight and κ both ride the fade');
  assert.ok(byNode.GHOST, 'the fan HOLDS the ungrounded branch — that is the charlies move');
  assert.equal(byNode.GHOST.grounded, false);
  assert.ok(byNode.D.clash, 'a branch touched by a clash is flagged');
  assert.ok(!byNode.X, 'the clash edge itself is never walked through');
  // the path is carried whole
  assert.deepEqual(byNode.C.path.map(e => e.type), ['reuses', 'depends']);
  assert.equal(byNode.C.root, 'A');
});

test('THE FAN RESPECTS WIDTH AND DEPTH AND IS TOTAL ON GARBAGE', () => {
  const g = estate();
  assert.equal(fan(g, ['A'], { depth: 1 }).length, 3, 'depth one reaches only the direct edges');
  assert.equal(fan(g, ['A'], { width: 2 }).length, 2, 'width caps the open branches');
  assert.deepEqual(fan(null, ['A']), [], 'no graph, no fan, no crash');
  assert.deepEqual(fan(g, null), []);
  assert.deepEqual(fan(g, ['NOPE']), [], 'an unknown context fans nothing');
});

test('THE GATE DROPS EACH REFUSAL ALONE, WITH ITS OWN SENTENCE', () => {
  const g = estate();
  const { kept, dropped } = gate(fan(g, ['A']));
  const keptIds = kept.map(b => b.node);
  assert.ok(keptIds.includes('B') && keptIds.includes('C'), 'the grounded chain ships');
  const why = (n) => (dropped.find(d => d.branch.node === n) || {}).why || '(kept)';
  assert.match(why('GHOST'), /ungrounded — no provenance/, 'charlies would have shipped this');
  assert.match(why('D'), /contradicted without support/);
  assert.match(why('FAR'), /too faint/);
  assert.ok(kept.every(b => b.norm >= DEFAULTS.floor), 'everything kept sits above the κ² floor');
  // total on garbage
  assert.deepEqual(gate(null).kept, []);
  assert.equal(gate([null, 7, {}]).kept.length, 0);
});

test('REMEMBER WRITES ONLY NEW MULTI-HOP EDGES, WITH FULL PROVENANCE — never an echo, never an overwrite', () => {
  const g = estate();
  const { kept } = gate(fan(g, ['A']));
  const before = g.edgeCount();
  const r = remember(g, kept, '2026-08-19T12:00:00Z');
  assert.equal(r.added, 1, 'only the multi-hop discovery (A→C) is new knowledge');
  assert.equal(g.hasEdge('A', 'kin', 'C'), true);
  const e = g.edgesFrom('A').find(x => x.to === 'C' && x.type === 'kin');
  assert.equal(e.meta.by, 'deepen');
  assert.equal(e.meta.at, '2026-08-19T12:00:00Z');
  assert.match(e.meta.via, /A -reuses→ B · B -depends→ C/, 'the discovery path rides in the meta');
  // a second remember of the same kept set adds nothing — an echo is not a deepening
  const r2 = remember(g, kept, 'later');
  assert.equal(r2.added, 0);
  assert.equal(g.edgeCount(), before + 1);
  assert.deepEqual(remember(null, kept, 't'), { added: 0, skipped: 0 });
});

test('THE GRAPH IS DENSER PER USE — the second turn reaches in one hop what took two', () => {
  const g = estate();
  const t1 = deepenTurn(g, ['A'], 't1');
  assert.equal(t1.added, 1, t1.account);
  const secondFan = fan(g, ['A'], { depth: 1 });
  assert.ok(secondFan.some(b => b.node === 'C'),
    'C is now ONE hop from A — the remembered edge deepened the reach');
  const t2 = deepenTurn(g, ['A'], 't2');
  assert.equal(t2.added, 0, 'the same context a second time discovers nothing new — no false compounding');
  assert.match(t1.account, /the graph is denser than it was/);
  assert.match(t2.account, /nothing new — the graph already knew this ground/,
    'a zero-add turn must not claim density');
});

test('THE DREAM IS DETERMINISTIC, GOLDEN-ADVANCED, AND NEVER WRITES', () => {
  const g = estate();
  deepenTurn(g, ['A'], 't1');                    // give the graph something to dream over
  const before = g.edgeCount();
  const d1 = dream(g, ['A', 'B', 'C', 'D'], 0);
  const d1again = dream(g, ['A', 'B', 'C', 'D'], 0);
  assert.deepEqual(d1, d1again, 'the same graph and cycle dream the same dream');
  const d2 = dream(g, ['A', 'B', 'C', 'D'], 1);
  assert.notDeepEqual(d1.seeds, d2.seeds, 'the golden advance rotates the seeds');
  assert.equal(g.edgeCount(), before, 'a dream HOLDS — it never writes the ground graph');
  for (const h of d1.held) assert.match(h.why, /shadow surface/);
  assert.deepEqual(dream(null, ['A'], 0), { held: [], seeds: [] });
  assert.deepEqual(dream(g, [], 0), { held: [], seeds: [] });
});

test('FUZZ: the whole surface is total on garbage', () => {
  const g = estate();
  for (const bad of [null, undefined, 7, 'x', [], {}, { node: 1 }]) {
    fan(bad, ['A']); gate(bad); remember(bad, [], 't'); dream(bad, ['A'], 0); deepenTurn(bad, ['A'], 't');
  }
  deepenTurn(g, [null, 7, 'NOPE'], null);
  dream(g, ['A'], -5); dream(g, ['A'], NaN);
  assert.ok(true);
});


// ─── round two: the gate found 18 gaps — each dies here ───

test('THE CONTRACT GUARD REFUSES A GRAPH MISSING ANY ONE FUNCTION — quietly, never a crash', () => {
  const g = estate();
  const parts = { node: g.node, edgesFrom: g.edgesFrom, addEdge: g.addEdge.bind(g), hasEdge: g.hasEdge };
  for (const missing of Object.keys(parts)) {
    const crippled = { ...parts };
    delete crippled[missing];
    assert.deepEqual(fan(crippled, ['A']), [], 'a graph without ' + missing + ' must fan nothing');
    assert.deepEqual(remember(crippled, [], 't'), { added: 0, skipped: 0 });
  }
});

test('EDGE-WEIGHT SANITY: zero, negative and garbage weights all fall to 1, never poison the fan', () => {
  const g = mini();
  g.addNode('A', 'repo', { src: 'x' }); g.addNode('Z', 'repo', { src: 'x' });
  g.addNode('N', 'repo', { src: 'x' }); g.addNode('S', 'repo', { src: 'x' });
  g.addEdge('A', 'Z', 'reuses', { weight: 0 });
  g.addEdge('A', 'N', 'reuses', { weight: -1 });
  g.addEdge('A', 'S', 'reuses', { weight: 'heavy' });
  for (const b of fan(g, ['A'])) {
    assert.equal(b.weight, 1, b.node + ': a non-positive weight must fall to 1, got ' + b.weight);
  }
});

test('A MALFORMED EDGE IN THE GRAPH IS SKIPPED, NOT FATAL', () => {
  const g = mini();
  g.addNode('A', 'repo', { src: 'x' }); g.addNode('B', 'repo', { src: 'x' });
  g.edgesFrom('A').push(null, 7, { from: 'A', type: 'reuses', to: 42 });
  g.addEdge('A', 'B', 'reuses');
  const out = fan(g, ['A']);
  assert.deepEqual(out.map(b => b.node), ['B'], 'only the well-formed edge fans');
});

test('EQUAL WEIGHTS SORT BY NAME — the fan is deterministic, not insertion-ordered', () => {
  const g = mini();
  g.addNode('A', 'repo', { src: 'x' }); g.addNode('ZZ', 'repo', { src: 'x' }); g.addNode('AA', 'repo', { src: 'x' });
  g.addEdge('A', 'ZZ', 'reuses');   // inserted first
  g.addEdge('A', 'AA', 'reuses');
  assert.deepEqual(fan(g, ['A']).map(b => b.node), ['AA', 'ZZ']);
});

test('THE GATE NORMALIZES WITHOUT NaN AND THE κ² FLOOR IS INCLUSIVE', () => {
  // all-zero weights: no NaN anywhere in the account
  const zeros = gate([
    { node: 'p', root: 'r', path: [], hops: 1, weight: 0, clash: false, grounded: true },
    { node: 'q', root: 'r', path: [], hops: 1, weight: 0, clash: false, grounded: true },
  ]);
  assert.ok(!JSON.stringify(zeros).includes('NaN'), 'an all-zero fan must not breed NaN');
  assert.equal(zeros.kept.length, 0, 'a fan of zeros ships nothing — zero association is zero, not a pass');
  assert.equal(zeros.dropped.length, 2, 'both zero branches are dropped, each with a reason');
  // exactly the floor is KEPT — the band is inclusive
  const edge = gate([
    { node: 'top', root: 'r', path: [], hops: 1, weight: 1, clash: false, grounded: true },
    { node: 'band', root: 'r', path: [], hops: 1, weight: KAPPA * KAPPA, clash: false, grounded: true },
  ]);
  assert.ok(edge.kept.some(b => b.node === 'band'), 'a branch AT the κ² floor must ship');
});

test('CLASH WITH REAL SUPPORT SHIPS — and only kin/complementary count as support', () => {
  const g = estate();
  // D2: clashed but reached by KIN from the root — supported, ships
  g.addNode('D2', 'repo', { src: 'estate-index' });
  g.addEdge('A', 'D2', 'kin');
  g.addEdge('D2', 'X2', 'clash');
  // D3: clashed, reached by REUSES from the root — reuses is not support, drops
  g.addNode('D3', 'repo', { src: 'estate-index' });
  g.addEdge('A', 'D3', 'reuses');
  g.addEdge('D3', 'X3', 'clash');
  // D4: clashed, reached by COMPLEMENTARY — the other supporting type, ships
  g.addNode('D4', 'repo', { src: 'estate-index' });
  g.addEdge('A', 'D4', 'complementary');
  g.addEdge('D4', 'X4', 'clash');
  const { kept, dropped } = gate(fan(g, ['A']));
  const keptIds = kept.map(b => b.node);
  assert.ok(keptIds.includes('D2'), 'kin from the context IS support');
  assert.ok(keptIds.includes('D4'), 'complementary from the context IS support');
  assert.ok(dropped.some(d => d.branch.node === 'D3'), 'reuses is a use, not a backing — the clash stands');
});

test('REMEMBER SKIPS GARBAGE BRANCHES WITHOUT DYING', () => {
  const g = estate();
  const r = remember(g, [null, 7, { hops: 5 }, { hops: 3, root: 9, node: 'C' }], 't');
  assert.equal(r.added, 0);
  assert.equal(r.skipped, 4, 'every malformed branch is counted, none is written');
});

test('THE DREAM SEEDS ARE EXACT — two real pool members, and a negative cycle reads as cycle zero', () => {
  const g = estate();
  // B must NOT be a seed here: seeded together with A it reaches C in one hop and the
  // two-hop discovery never happens — multi-root fans share their seen-set by design
  const pool = ['A', 'D', 'FAR', 'GHOST'];
  const d0 = dream(g, pool, 0);
  assert.deepEqual(d0.seeds, ['A', 'D'], 'cycle zero seeds the head of the pool and its neighbour');
  assert.ok(d0.seeds.every(x => pool.includes(x)), 'a seed outside the pool is a bug, not a dream');
  assert.deepEqual(dream(g, pool, -5).seeds, d0.seeds, 'a negative cycle is storage damage and reads as zero');
  // a 2-hop gate-passed branch is held — the shadow starts at real discoveries, not hop three
  const held = dream(g, pool, 0).held;
  assert.ok(held.some(h => h.node === 'C' && h.root === 'A'), 'the two-hop discovery A→…→C must be held open');
});
