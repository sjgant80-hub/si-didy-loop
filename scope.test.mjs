// si-didy-loop · scope.test.mjs — the scope registry, every rule falsifiable.
// The kernel (operator.mjs classify/prepare) is the authority throughout: the registry is
// tested THROUGH it, never beside it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MANDATE, STREAMS, streamOf, actionFor, coverage } from './scope.mjs';
import { classify, prepare, makeQueue, executable } from './operator.mjs';

test('NOTHING DROPPED — all eight named streams, every one operated, every door listed', () => {
  const c = coverage();
  assert.equal(c.ok, true, JSON.stringify(c));
  assert.equal(c.streams, 8);
  assert.deepEqual(c.missing, []);
  assert.deepEqual(c.extra, []);
  assert.deepEqual(c.unoperated, [], 'a stream with no AUTO capability is not operated');
  assert.deepEqual(c.doorless, [], 'a stream with threshold work but no listed door has nowhere to queue');
  assert.deepEqual(c.uncounseled, [], 'every money door carries its counsel note in the registry itself');
  assert.match(c.why, /nothing dropped/);
});

test('THE KERNEL AGREES WITH EVERY REGISTRATION — each entry re-judged by classify, not trusted', () => {
  for (const s of STREAMS) {
    for (const a of s.auto) {
      assert.equal(classify({ kind: a.kind }).lane, 'auto', `${s.id}.${a.cap}`);
    }
    for (const k of s.key) {
      assert.equal(classify({ kind: k.kind, ...k.flags }).lane, 'threshold', `${s.id}.${k.cap}`);
    }
  }
});

test('THE BRAIN HAS NO DOORS — deepening-loop is pure internal cognition, by the spec\'s own words', () => {
  const { stream } = streamOf('deepening-loop');
  assert.equal(stream.key.length, 0);
  assert.ok(stream.auto.length >= 5, 'and it is the most operated stream, not an empty label');
});

test('THE SPEC\'S OWN DOOR RULES HOLD — money flags, legal flags, the counsel notes', () => {
  const kcc = streamOf('baby-kcc').stream;
  const bridge = kcc.key.find(k => k.cap === 'bridge-real-money');
  assert.equal(bridge.kind, 'payment-rail');
  assert.equal(bridge.flags.money, true);
  assert.match(bridge.note, /counsel/, 'bridging the internal economy to real money is counsel-gated in the registry itself');
  const ans = streamOf('ai-native-solutions').stream;
  assert.equal(ans.key.find(k => k.cap === 'sign-engagement').flags.legal, true);
  assert.equal(ans.key.find(k => k.cap === 'send-binding-proposal').kind, 'commit');
  assert.match(ans.key.find(k => k.cap === 'sign-engagement').note, /human/, 'deals stay human, and the registry says so');
  const fw = streamOf('fallworld-market').stream;
  assert.equal(fw.key.find(k => k.cap === 'real-money-sale').flags.money, true);
});

test('AN UNREGISTERED CAPABILITY IS REFUSED — even one the kernel would have allowed', () => {
  // 'produce' is a kernel AUTO kind, but fallworld-market never registered it: it must not run
  const out = actionFor('fallworld-market', 'produce');
  assert.equal(out.ok, false);
  assert.match(out.why, /not registered on fallworld-market/);
  assert.match(out.why, /whatever the kernel might have said/);
  const gone = actionFor('fallmarket', 'run-listings');
  assert.equal(gone.ok, false);
  assert.match(gone.why, /not a registered stream/);
});

test('EVERY KEY DOOR ACROSS EVERY STREAM QUEUES UNSIGNED — one queue, and nothing executes', () => {
  let queue = makeQueue();
  let doors = 0;
  for (const s of STREAMS) {
    for (const k of s.key) {
      const built = actionFor(s.id, k.cap, { what: `${s.id} wants ${k.cap}` });
      assert.equal(built.ok, true);
      assert.equal(built.lane, 'threshold');
      const p = prepare(queue, built.action, { ready: 'fully prepared by si-didy' }, 't');
      assert.equal(p.ok, true, `${s.id}.${k.cap} must queue`);
      queue = p.queue;
      assert.equal(executable(p.item).ok, false, `${s.id}.${k.cap} must NOT execute unsigned`);
      doors += 1;
    }
  }
  assert.equal(queue.items.length, doors, 'one queue holds every door from every stream');
  assert.ok(doors >= 12, 'the estate has at least a dozen doors, all of them counted');
});

test('EVERY AUTO CAPABILITY REFUSES THE QUEUE — it just runs, and never buries the doors', () => {
  const queue = makeQueue();
  for (const s of STREAMS) {
    for (const a of s.auto) {
      const built = actionFor(s.id, a.cap);
      assert.equal(built.ok, true);
      assert.equal(built.lane, 'auto');
      const p = prepare(queue, built.action, {}, 't');
      assert.equal(p.ok, false, `${s.id}.${a.cap} must not queue`);
      assert.match(p.why, /does not queue — it just runs/);
    }
  }
});

test('THE REGISTRY IS FROZEN — si-didy cannot add a stream, drop a door, or bend a flag', () => {
  assert.throws(() => { STREAMS.push({ id: 'shadow-stream' }); });
  assert.throws(() => { STREAMS[0].key.pop(); });
  assert.throws(() => { STREAMS[0].key[0].flags.money = false; });
  assert.throws(() => { STREAMS[0].auto.push({ cap: 'pay-quietly', kind: 'pay' }); });
  assert.throws(() => { STREAMS[6].key.push({ cap: 'new-door', kind: 'pay', flags: {} }); },
    'even the brain cannot grow a door at runtime');
});

test('ONE MANDATE, PINNED — and it says who holds the key', () => {
  assert.match(MANDATE, /one mandate, one key/);
  assert.match(MANDATE, /learn-till-win on internal quality/);
  assert.match(MANDATE, /key-holder oversees/);
});

test('FUZZ: total on garbage', () => {
  streamOf(null); streamOf(7); streamOf({});
  actionFor(null, null); actionFor('baby-kcc', null); actionFor('baby-kcc', 42, 'not-an-object');
  const d = actionFor('baby-kcc', 'verify-chain', null);
  assert.equal(d.ok, true, 'a null detail is just an action with no extras');
  assert.equal(coverage().ok, true);
  coverage([null, 7, 'x']); coverage('not-a-list');
  assert.ok(true);
});


// ─── round two: the gate found nine gaps — each dies here ───

test('THE DETAIL RIDES THE ACTION WHOLE — and a garbage detail leaves no litter keys', () => {
  const built = actionFor('fallworld-market', 'publish-release', { what: 'ship the showcase', target: 'pages' });
  assert.equal(built.action.what, 'ship the showcase', 'the prep detail must reach the queue, not be dropped');
  assert.equal(built.action.target, 'pages');
  const junk = actionFor('baby-kcc', 'verify-chain', 'not-an-object');
  assert.equal(junk.ok, true);
  assert.ok(!('0' in junk.action), 'a string detail must vanish, never spread its characters into the action');
  const arrJunk = actionFor('baby-kcc', 'verify-chain', ['x']);
  assert.ok(!('0' in arrJunk.action), 'an array detail must vanish too');
});

test('EVERY NOTE IS A STRING — a noteless entry reads as empty, never as undefined', () => {
  for (const s of STREAMS) {
    for (const e of [...s.auto, ...s.key]) {
      assert.strictEqual(typeof e.note, 'string', `${s.id}.${e.cap} note must be a string`);
    }
  }
});

test('COVERAGE DETECTS EVERY HOLE CLASS — the checker\'s failure branch provably runs', () => {
  const clone = () => STREAMS.map(s => ({ id: s.id, name: s.name, auto: [...s.auto], key: [...s.key] }));

  // a named stream missing → listed by name, ok false
  const short = clone().filter(s => s.id !== 'two-forge-mesh');
  const m = coverage(short);
  assert.equal(m.ok, false);
  assert.deepEqual(m.missing, ['two-forge-mesh']);
  assert.match(m.why, /holes/);

  // an unregistered extra stream → flagged, ok false
  const bloated = [...clone(), { id: 'shadow-stream', auto: [{ cap: 'x', kind: 'track', note: '' }], key: [{ cap: 'y', kind: 'pay', flags: {}, note: '' }] }];
  const e = coverage(bloated);
  assert.equal(e.ok, false);
  assert.deepEqual(e.extra, ['shadow-stream']);

  // a stream with no AUTO capability is not operated → flagged
  const idle = clone(); idle[0] = { ...idle[0], auto: [] };
  const u = coverage(idle);
  assert.equal(u.ok, false);
  assert.deepEqual(u.unoperated, ['fallworld-market']);

  // a stream (not the brain) with no doors listed → flagged
  const open = clone(); open[2] = { ...open[2], key: [] };
  const dl = coverage(open);
  assert.equal(dl.ok, false);
  assert.deepEqual(dl.doorless, ['forge-studio']);
  // ...but the brain doorless is by design, and stays clean
  assert.equal(coverage(clone()).doorless.length, 0);

  // a money door without its counsel note → flagged
  const cheap = clone();
  cheap[4] = { ...cheap[4], key: [{ cap: 'bridge-real-money', kind: 'payment-rail', flags: { money: true }, note: 'later' }] };
  const c = coverage(cheap);
  assert.equal(c.ok, false);
  assert.deepEqual(c.uncounseled, ['baby-kcc.bridge-real-money']);
});
