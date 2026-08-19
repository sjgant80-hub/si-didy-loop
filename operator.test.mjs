// si-didy-loop · operator.test.mjs — the operator and its doors, every rule falsifiable.
// Real Ed25519 both sides: the master key approves; si-didy's own key MUST fail. The classifier
// is fixed and fail-safe; the queue never executes unsigned; the scoreboard cannot want money.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {
  THRESHOLD_KINDS, AUTO_KINDS, classify, signableItem, makeQueue, prepare,
  approve, executable, reject, scoreboard,
} from './operator.mjs';

const subtle = webcrypto.subtle;
const enc = new TextEncoder();
async function keypair() {
  const kp = await subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pubB64 = Buffer.from(new Uint8Array(await subtle.exportKey('raw', kp.publicKey))).toString('base64');
  const sign = async (s) => Buffer.from(new Uint8Array(await subtle.sign({ name: 'Ed25519' }, kp.privateKey, enc.encode(s)))).toString('base64');
  return { pubB64, sign };
}
const verify = async (s, sigB64, pubB64) => {
  const key = await subtle.importKey('raw', Buffer.from(pubB64, 'base64'), { name: 'Ed25519' }, false, ['verify']);
  return subtle.verify({ name: 'Ed25519' }, key, Buffer.from(sigB64, 'base64'), enc.encode(s));
};

test('THE CLASSIFIER IS FIXED AND FAIL-SAFE — flags always win, the unknown is threshold', () => {
  for (const kind of THRESHOLD_KINDS) assert.equal(classify({ kind }).lane, 'threshold', kind);
  for (const kind of AUTO_KINDS) assert.equal(classify({ kind }).lane, 'auto', kind);
  // a flag makes even an auto kind threshold — the door needs the key regardless of its name
  assert.equal(classify({ kind: 'draft', money: true }).lane, 'threshold');
  assert.equal(classify({ kind: 'produce', external: true }).lane, 'threshold');
  assert.equal(classify({ kind: 'track', legal: true }).lane, 'threshold');
  assert.equal(classify({ kind: 'remember', irreversible: true }).lane, 'threshold');
  // truthy-but-not-true flags do NOT relax anything the kind already decided, and do not trip it either
  assert.equal(classify({ kind: 'draft', money: 'yes' }).lane, 'auto', 'only strict true flags a door');
  // the unknown is the dangerous
  assert.match(classify({ kind: 'launch-rockets' }).why, /unknown is treated as the dangerous/);
  assert.equal(classify({}).lane, 'threshold');
  assert.equal(classify(null).lane, 'threshold');
  // the sets are frozen — si-didy cannot move the doors
  assert.throws(() => { THRESHOLD_KINDS.push('nothing'); });
  assert.throws(() => { AUTO_KINDS.push('pay'); });
});

test('THE QUEUE TAKES ONLY THRESHOLD WORK — auto work does not bury the doors', () => {
  const q = makeQueue();
  const no = prepare(q, { kind: 'produce' }, { build: 'x' }, 't');
  assert.equal(no.ok, false);
  assert.match(no.why, /does not queue — it just runs/);
  const yes = prepare(q, { kind: 'payment-rail', venture: 'x' }, { stripeDraft: 'everything filled in' }, '2026-08-19');
  assert.equal(yes.ok, true);
  assert.equal(yes.item.status, 'queued');
  assert.strictEqual(yes.item.signature, null);
  assert.equal(yes.item.prep.stripeDraft, 'everything filled in', 'si-didy did ALL the prep — the key-holder only turns the key');
  assert.equal(yes.queue.items.length, 1);
});

test('ONLY THE MASTER KEY APPROVES — si-didy self-signing fails, and tampering after signing fails', async () => {
  const master = await keypair();
  const sididy = await keypair();     // the operator's own identity — NOT the master key
  const { item } = prepare(makeQueue(), { kind: 'publish-external', what: 'venture page' }, { html: '<p>ready</p>' }, 't');

  // unsigned: prepared and queued, never sent
  assert.match(executable(item).why, /unsigned — prepared and queued, never sent/);
  assert.equal((await approve(item, '', master.pubB64, verify)).ok, false);

  // si-didy signs with its own key: refused by construction
  const selfSig = await sididy.sign(signableItem(item));
  const selfTry = await approve(item, selfSig, master.pubB64, verify);
  assert.equal(selfTry.ok, false);
  assert.match(selfTry.why, /cannot self-sign/);

  // the master key turns
  const sig = await master.sign(signableItem(item));
  const ok = await approve(item, sig, master.pubB64, verify);
  assert.equal(ok.ok, true, ok.why);
  assert.equal(ok.item.status, 'approved');
  assert.equal(executable(ok.item).ok, true);

  // an approved item cannot be re-approved, and a tampered item's signature dies
  assert.equal((await approve(ok.item, sig, master.pubB64, verify)).ok, false, 'only a queued item approves');
  const bent = { ...item, action: { ...item.action, what: 'a DIFFERENT page' } };
  const bentTry = await approve(bent, sig, master.pubB64, verify);
  assert.equal(bentTry.ok, false, 'the signature covers exactly what was queued');

  // no master key configured at all: nothing crosses, ever
  assert.match((await approve(item, sig, '', verify)).why, /nothing can cross the threshold at all/);
  assert.match((await approve(item, sig, master.pubB64, null)).why, /cannot be checked is not a signature/);
});

test('REJECT CLOSES A DOOR WITHOUT OPENING IT', async () => {
  const { item } = prepare(makeQueue(), { kind: 'pay', to: 'someone' }, { draft: 'payment' }, 't');
  const r = reject(item, 'not this quarter');
  assert.equal(r.ok, true);
  assert.equal(r.item.status, 'rejected');
  assert.match(executable(r.item).why, /rejected by the key-holder — closed/);
  const master = await keypair();
  const sig = await master.sign(signableItem(r.item));
  assert.equal((await approve(r.item, sig, master.pubB64, verify)).ok, false, 'a rejected door does not reopen by signature');
  assert.equal(reject(r.item, 'again').ok, false, 'only a queued item rejects');
});

test('THE SCOREBOARD CANNOT WANT MONEY — quality fields only, and no-production is NO SCORE', () => {
  const s = scoreboard({ produced: 10, validated: 8, gatesRun: 10, gatesPassed: 9, internalSupply: 12, reuseDepth: 3 });
  assert.equal(s.validatedRate, 0.8);
  assert.equal(s.gatePassRate, 0.9);
  assert.ok(s.win > 0.8 && s.win < 1.2, 'the composite sits in the quality band: ' + s.win);
  assert.ok(!('money' in s) && !('revenue' in s) && !('price' in s), 'the scoreboard has no field for money, by construction');
  const empty = scoreboard({});
  assert.strictEqual(empty.win, null, 'an operator that produced nothing scores NOTHING — never a flattering default');
  assert.match(empty.verdict, /nothing to be proud of/);
  // improvement is visible: more validated of the same produced scores higher
  const better = scoreboard({ produced: 10, validated: 10, gatesRun: 10, gatesPassed: 9, internalSupply: 12, reuseDepth: 3 });
  assert.ok(better.win > s.win, 'learn-till-win: better quality is a higher win');
  // garbage is zeroed, not believed
  assert.equal(scoreboard({ produced: -5, validated: NaN }).produced, 0);
});

test('FUZZ: total on garbage', async () => {
  classify(7); classify('x'); signableItem(null); makeQueue();
  prepare(null, null, null, null); executable(null); reject(null);
  await approve(null, null, null, null);
  const p = prepare({ items: 'x' }, { kind: 'pay' }, null, 9);
  assert.equal(p.ok, true, 'a mangled queue heals to a fresh item list');
  assert.equal(p.item.at, '', 'a non-string timestamp reads as empty');
  assert.ok(true);
});


// ─── round two: the gate found eleven gaps — each dies here ───

test('EXECUTABLE REFUSES EVERY FORGED STATE — a signature without approval, approval without a real signature', () => {
  assert.equal(executable({ status: 'queued', signature: 'x' }).ok, false,
    'a signature planted on a queued item is not approval');
  assert.equal(executable({ status: 'approved', signature: 7 }).ok, false,
    'a numeric signature is storage damage, not a signature');
  assert.equal(executable({ status: 'approved', signature: '' }).ok, false);
  assert.equal(executable({ status: 'approved', signature: 'real' }).ok, true);
});

test('THE SIGNABLE FORM IS PINNED — the canon can never drift silently', () => {
  const item = { seq: 0, action: { kind: 'pay', b: 1, a: 2 }, prep: {}, at: 't', why: 'w', status: 'queued', signature: 'IGNORED' };
  assert.equal(signableItem(item),
    '{"action":{"a":2,"b":1,"kind":"pay"},"at":"t","prep":{},"seq":0,"why":"w"}');
});

test('AN EMPTY KIND IS SAID AS (unnamed), a numeric signature is NO signature, a non-string note is empty', async () => {
  assert.match(classify({ kind: '' }).why, /\(unnamed\)/);
  const { item } = prepare(makeQueue(), { kind: 'pay' }, {}, 't');
  const master = await keypair();
  assert.match((await approve(item, 7, master.pubB64, verify)).why, /no signature/);
  const r = reject(item, 42);
  assert.strictEqual(r.item.note, '', 'a numeric note reads as empty, never as the value');
});

test('NO-SCORE MEANS NULL IN EVERY FIELD IT TOUCHES — zero production breeds no NaN and no partial win', () => {
  const none = scoreboard({});
  assert.strictEqual(none.validatedRate, null);
  assert.strictEqual(none.gatePassRate, null);
  const gatesOnly = scoreboard({ produced: 0, gatesRun: 10, gatesPassed: 9 });
  assert.strictEqual(gatesOnly.validatedRate, null);
  assert.strictEqual(gatesOnly.win, null, 'a win needs BOTH rates — gates alone cannot score');
  const producedOnly = scoreboard({ produced: 5, validated: 4 });
  assert.strictEqual(producedOnly.gatePassRate, null);
  assert.strictEqual(producedOnly.win, null);
  assert.ok(!JSON.stringify(none).includes('NaN'));
});
