// si-didy-loop · plainsay.test.mjs — every clause pinned to the exact words, every edge reason said its own way, the
// reverse edges read the right way round, every cut at its boundary, and garbage in never throws. The names are made up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nameOf, sayStep, sayRoute, sayIdea } from './plainsay.mjs';
import def from './plainsay.mjs';

// the smallest look honouring the contract: nodes with meta, edges keyed "from type to" with their meta
function lookOf(nodes = {}, edges = {}, fresh = []) {
  return {
    node: (id) => nodes[id] ? { type: 'x', meta: nodes[id] } : null,
    edge: (f, t, to) => edges[`${f} ${t} ${to}`] || null,
    fresh: (id) => fresh.includes(id),
  };
}

test('NAMES ARE SAID THE WAY A PERSON NAMES THEM', () => {
  const look = lookOf({ 'chat:0123abcd-ef01': { day: '2026-10-22T03:00' }, 'wing:tools': { name: 'Tools' } });
  assert.equal(nameOf('memory:tidy-rule', look), 'your memory note "tidy-rule"');
  assert.equal(nameOf('chat:0123abcd-ef01', look), 'a session (0123abcd, 2026-10-22)');
  assert.equal(nameOf('chat:9999ffff-aa', lookOf()), 'a session (9999ffff)', 'no day kept, none said');
  assert.equal(nameOf('wing:tools', look), 'FallWorld\'s "Tools" wing');
  assert.equal(nameOf('wing:plain', lookOf()), 'FallWorld\'s "plain" wing', 'no name kept: the id says it');
  assert.equal(nameOf('alpha-tool', look), 'alpha-tool');
  assert.equal(nameOf('', look), 'something unnamed');
  assert.equal(nameOf(7, look), 'something unnamed');
});

test('LONG NAMES ARE CUT AT THEIR EXACT LIMIT, AND NOT ONE CHARACTER SOONER', () => {
  const at = (n) => 'a'.repeat(n);
  assert.equal(nameOf(at(80)), at(80), 'a repo name of 80 is whole');
  assert.equal(nameOf(at(81)), at(79) + '…', 'a repo name of 81 is cut to 80');
  assert.equal(nameOf('memory:' + at(60)), `your memory note "${at(60)}"`);
  assert.equal(nameOf('memory:' + at(61)), `your memory note "${at(59)}…"`);
  assert.equal(nameOf('wing:' + at(40)), `FallWorld's "${at(40)}" wing`);
  assert.equal(nameOf('wing:' + at(41)), `FallWorld's "${at(39)}…" wing`);
  const day = lookOf({ 'chat:abcdefgh': { day: '2026-10-22-and-more' } });
  assert.equal(nameOf('chat:abcdefgh', day), 'a session (abcdefgh, 2026-10-22)', 'the day is the date: its first 10 characters');
  const dayTen = lookOf({ 'chat:abcdefgh': { day: '2026-10-22' } });
  assert.equal(nameOf('chat:abcdefgh', dayTen), 'a session (abcdefgh, 2026-10-22)', 'a day of exactly 10 is whole');
});

test('EVERY EDGE REASON IS SAID ITS OWN WAY — and a reverse edge reads the right way round', () => {
  const look = lookOf({}, {
    'memory:tidy-rule reuses alpha-tool': { as: 'mentions' },
    'alpha-tool reuses memory:tidy-rule': { as: 'mentions', rev: true },
    'chat:0123abcd-ef reuses beta-kit': { as: 'discussed', mentions: 40 },
    'beta-kit reuses chat:0123abcd-ef': { as: 'discussed', mentions: 2, rev: true },
    'chat:1111aaaa-bb reuses gamma': { as: 'discussed', mentions: 1 },
    'memory:a links memory:b': { as: 'wiki-link' },
    'alpha-tool kin beta-kit': { topic: 'invoicing' },
    'alpha-tool kin gamma': { by: 'deepen', at: 't', via: 'x' },
    'wing:tools contains alpha-tool': { room: 'r' },
    'alpha-tool contains wing:tools': { room: 'r', rev: true },
    'alpha-tool depends gamma': { weight: 1 },
  });
  const say = (from, type, to) => sayStep({ from, type, to }, look);
  assert.equal(say('memory:tidy-rule', 'reuses', 'alpha-tool'), 'your memory note "tidy-rule" names alpha-tool');
  assert.equal(say('alpha-tool', 'reuses', 'memory:tidy-rule'), 'alpha-tool is named in your memory note "tidy-rule"');
  assert.equal(say('chat:0123abcd-ef', 'reuses', 'beta-kit'), 'a session (0123abcd) talked about beta-kit (40 times)');
  assert.equal(say('beta-kit', 'reuses', 'chat:0123abcd-ef'), 'beta-kit came up in a session (0123abcd) (2 times)');
  assert.equal(say('chat:1111aaaa-bb', 'reuses', 'gamma'), 'a session (1111aaaa) talked about gamma', 'once is not counted aloud');
  assert.equal(say('memory:a', 'links', 'memory:b'), 'your memory note "a" links to your memory note "b"');
  assert.equal(say('alpha-tool', 'kin', 'beta-kit'), 'alpha-tool and beta-kit share the topic "invoicing"');
  assert.equal(say('alpha-tool', 'kin', 'gamma'), 'an earlier night linked alpha-tool to gamma');
  assert.equal(say('wing:tools', 'contains', 'alpha-tool'), 'FallWorld\'s "tools" wing holds alpha-tool');
  assert.equal(say('alpha-tool', 'contains', 'wing:tools'), 'alpha-tool is in FallWorld\'s "tools" wing');
  assert.equal(say('alpha-tool', 'depends', 'gamma'), 'alpha-tool is linked to gamma (depends)');
  assert.equal(say('alpha-tool', 'pairs', 'nowhere'), 'alpha-tool is linked to nowhere (the reason for this link was not kept)');
  assert.equal(say('alpha-tool', '', 'nowhere'), 'alpha-tool is linked to nowhere (the reason for this link was not kept)');
});

test('THE EDGE RECORD DECIDES THE CLAUSE, NOT THE ORDER OF THE CHECKS', () => {
  // a record with a topic AND an earlier-night stamp says the topic: the topic is the fact, the night only found it
  const look = lookOf({}, {
    'a kin b': { topic: 'shared', by: 'deepen' },
    'a kin c': { by: 'deepen' },
    'a contains b': {},
    'a typed b': { note: 1 },
  });
  assert.equal(sayStep({ from: 'a', type: 'kin', to: 'b' }, look), 'a and b share the topic "shared"');
  assert.equal(sayStep({ from: 'a', type: 'kin', to: 'c' }, look), 'an earlier night linked a to c');
  assert.equal(sayStep({ from: 'a', type: 'contains', to: 'b' }, look), 'a holds b', 'contains is said even with no record');
  assert.equal(sayStep({ from: 'a', type: 'typed', to: 'b' }, look), 'a is linked to b (typed)');
  const long = lookOf({}, { 'a kin b': { topic: 't'.repeat(61) }, 'a kin c': { topic: 't'.repeat(60) }, ['a ' + 'y'.repeat(31) + ' b']: { n: 1 }, ['a ' + 'y'.repeat(30) + ' b']: { n: 1 } });
  assert.equal(sayStep({ from: 'a', type: 'kin', to: 'b' }, long), `a and b share the topic "${'t'.repeat(59)}…"`);
  assert.equal(sayStep({ from: 'a', type: 'kin', to: 'c' }, long), `a and c share the topic "${'t'.repeat(60)}"`);
  assert.equal(sayStep({ from: 'a', type: 'y'.repeat(31), to: 'b' }, long), `a is linked to b (${'y'.repeat(29)}…)`);
  assert.equal(sayStep({ from: 'a', type: 'y'.repeat(30), to: 'b' }, long), `a is linked to b (${'y'.repeat(30)})`);
});

test('A ROUTE IS SAID WHOLE — start, every hop, the arrival, and what the arrival is', () => {
  const look = lookOf(
    { 'gamma': { desc: 'a small ledger for invoices' }, 'beta-kit': { desc: '' } },
    { 'memory:tidy-rule reuses alpha-tool': { as: 'mentions' }, 'alpha-tool kin gamma': { topic: 'invoicing' } },
    ['memory:tidy-rule'],
  );
  const r = sayRoute({ root: 'memory:tidy-rule', node: 'gamma', path: [
    { from: 'memory:tidy-rule', type: 'reuses', to: 'alpha-tool' },
    { from: 'alpha-tool', type: 'kin', to: 'gamma' },
  ] }, look);
  assert.equal(r.ok, true);
  assert.equal(r.said, 'your memory note "tidy-rule" led me to gamma: your memory note "tidy-rule" names alpha-tool; then alpha-tool and gamma share the topic "invoicing". (gamma: a small ledger for invoices)');
  assert.deepEqual(r.steps.length, 2);
  assert.equal(r.from, 'your memory note "tidy-rule"');
  assert.equal(r.to, 'gamma');
  assert.equal(r.fresh, true, 'the root is the day\'s own work');
  assert.equal(def, sayRoute, 'the default export is sayRoute');
  // freshness is read from every node on the route, not only the root
  const mid = lookOf({}, {}, ['alpha-tool']);
  assert.equal(sayRoute({ root: 'r', node: 'n', path: [{ from: 'r', type: 'kin', to: 'alpha-tool' }, { from: 'alpha-tool', type: 'kin', to: 'n' }] }, mid).fresh, true);
  assert.equal(sayRoute({ root: 'r', node: 'n', path: [{ from: 'r', type: 'kin', to: 'x' }] }, mid).fresh, false);
  assert.equal(sayRoute({ root: 'r', node: 'n', path: [{ from: 'r', type: 'kin', to: 'x' }] }, lookOf({}, {}, ['n'])).fresh, false, 'a route that never reaches the arrival does not count it');
  assert.equal(sayRoute({ root: 'r', node: 'n', path: [{ from: 'r', type: 'kin', to: 'n' }] }, lookOf({}, {}, ['n'])).fresh, true);
  // an empty description is not said; a route not kept is said as exactly that
  const none = sayRoute({ root: 'alpha-tool', node: 'beta-kit' }, look);
  assert.equal(none.said, 'alpha-tool led me to beta-kit, but the route was not kept, so I cannot say why.');
  assert.equal(sayRoute({ root: 'alpha-tool', node: 'gamma' }, look).said, 'alpha-tool led me to gamma, but the route was not kept, so I cannot say why. (gamma: a small ledger for invoices)');
  // a description is cut at 140, and a padded one is trimmed first
  const d = (s) => sayRoute({ root: 'a', node: 'b' }, lookOf({ b: { desc: s } })).said;
  assert.ok(d('x'.repeat(140)).endsWith(`(b: ${'x'.repeat(140)})`));
  assert.ok(d('x'.repeat(141)).endsWith(`(b: ${'x'.repeat(139)}…)`));
  assert.ok(d('  pad  ').endsWith('(b: pad)'));
});

test('AN IDEA IS TWO ROUTES AND THE WARNING — never a bare claim', () => {
  const look = lookOf({}, { 'a kin x': { topic: 't' }, 'b kin y': { topic: 'u' } });
  const A = { root: 'a', node: 'x', path: [{ from: 'a', type: 'kin', to: 'x' }] };
  const B = { root: 'b', node: 'y', path: [{ from: 'b', type: 'kin', to: 'y' }] };
  assert.equal(sayIdea(A, B, look), 'I think x and y might belong together. Why: a led me to x: a and x share the topic "t". b led me to y: b and y share the topic "u". Nothing has checked this yet; only a real turn confirms it.');
  const B2 = { root: 'b', node: 'x', path: [] };
  assert.equal(sayIdea(A, B2, look), 'I keep arriving at x. Why: a led me to x: a and x share the topic "t". b led me to x, but the route was not kept, so I cannot say why. Nothing has checked this yet; only a real turn confirms it.');
  assert.equal(sayIdea(A, null, look), '');
  assert.equal(sayIdea(null, B, look), '');
});

test('GARBAGE NEVER THROWS — no look, a throwing look, junk steps and junk routes', () => {
  const boom = { node: () => { throw new Error('x'); }, edge: () => { throw new Error('y'); }, fresh: () => { throw new Error('z'); } };
  for (const look of [undefined, null, 7, 'x', [], {}, boom, { node: 1, edge: 'no' }]) {
    assert.equal(typeof nameOf('chat:abc', look), 'string');
    assert.equal(sayStep({ from: 'a', type: 'kin', to: 'b' }, look), 'a is linked to b (the reason for this link was not kept)');
    const r = sayRoute({ root: 'a', node: 'b', path: [{ from: 'a', type: 'kin', to: 'b' }, null, 7, { from: 'a' }] }, look);
    assert.equal(r.ok, true);
    assert.equal(r.steps.length, 1, 'only the real step is said');
    assert.equal(r.fresh, false);
  }
  for (const bad of [undefined, null, 7, 'x', [], {}, { from: 'a' }, { to: 'b' }, { from: 1, to: 2 }]) assert.equal(sayStep(bad), '');
  for (const bad of [undefined, null, 7, 'x', [], {}, { root: 'a' }, { node: 'b' }, { root: 1, node: 2 }]) {
    assert.deepEqual(sayRoute(bad), { ok: false, said: '', steps: [], from: '', to: '', fresh: false });
  }
  assert.equal(sayRoute({ root: 'a', node: 'b', path: 'not a list' }).said, 'a led me to b, but the route was not kept, so I cannot say why.');
  assert.equal(nameOf('chat:abc', lookOf({ 'chat:abc': 7 })), 'a session (abc)', 'a node whose meta is not an object');
  assert.equal(nameOf('chat:abc', { node: () => ({ meta: [1] }) }), 'a session (abc)', 'a meta that is a list');
});

test('AN EDGE RECORD THAT IS NOT AN OBJECT IS NO RECORD — a string or a list is not a reason', () => {
  for (const rec of ['abc', [1], 7, true]) {
    assert.equal(sayStep({ from: 'a', type: 'kin', to: 'b' }, { edge: () => rec }), 'a is linked to b (the reason for this link was not kept)', JSON.stringify(rec));
  }
});
