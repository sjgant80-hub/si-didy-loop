#!/usr/bin/env node
// si-didy-loop · scripts/operate.mjs — the autonomous business operator, running.
//
// This is si-didy's OWN loop: produce → validate → mint-internal → remember → track. No human
// in it, and nothing in it CAN touch money, the law, or the outside world — those are threshold
// doors, and this runner can only PREPARE them into a queue that executes on the master key's
// signature alone (scripts/master-key.mjs, the key-holder's tool, not this one).
//
// si-didy has its own Ed25519 identity here (local-dna/operator-key.json). It is NOT the master
// key and never can be: approval verifies against local-dna/master.pub, and the master PRIVATE
// key lives in the key-holder's home directory where this process has no business. Run
// `--try-self-sign` to watch the refusal happen for real.
//
//   node scripts/operate.mjs --turns 3       run the auto loop
//   node scripts/operate.mjs --status        scoreboard + the queue standing
//   node scripts/operate.mjs --try-self-sign 0   prove si-didy cannot approve its own door
//
// Everything this writes is LOCAL-ONLY (local-dna/, gitignored). The organs it wires — the Forge
// Studio and the baby-KCC ledger — are fallkard-forge's, imported by observation from the sibling
// checkout: standalone or linked, never a dependency baked into either repo.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { webcrypto } from 'node:crypto';

import { classify, signableItem, makeQueue, prepare, approve, executable, scoreboard } from '../operator.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DNA_DIR = join(here, '..', 'local-dna');
const STATE_F = join(DNA_DIR, 'operator-state.json');
const QUEUE_F = join(DNA_DIR, 'operator-queue.json');
const OVERLAY_F = join(DNA_DIR, 'overlay.json');
const MASTER_PUB_F = join(DNA_DIR, 'master.pub');
const OWN_KEY_F = join(DNA_DIR, 'operator-key.json');

// ── the forge organs, linked by observation from the sibling checkout ──
const FORGE = join(here, '..', '..', 'fallkard-forge');
if (!existsSync(join(FORGE, 'studio.mjs'))) {
  console.error('STOP: fallkard-forge is not checked out next door (' + FORGE + ').');
  console.error('The operator produces through the Forge Studio — clone it beside si-didy-loop first.');
  process.exit(1);
}
const { compose, validateComposition } = await import(pathToFileURL(join(FORGE, 'studio.mjs')).href);
const { makeLedger, mint, verifyLedger } = await import(pathToFileURL(join(FORGE, 'babykcc.mjs')).href);
const { makeBundle } = await import(pathToFileURL(join(FORGE, 'artifact.mjs')).href);

const subtle = webcrypto.subtle;
const enc = new TextEncoder();
const sha = async (s) => Array.from(new Uint8Array(await subtle.digest('SHA-256', enc.encode(s))))
  .map(b => b.toString(16).padStart(2, '0')).join('');
const readJson = (f, fallback) => existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : fallback;
const writeJson = (f, v) => writeFileSync(f, JSON.stringify(v, null, 1));

// si-didy's own identity — created on first run, and provably NOT the master key
async function ownKey() {
  if (existsSync(OWN_KEY_F)) {
    const k = readJson(OWN_KEY_F, null);
    const priv = await subtle.importKey('pkcs8', Buffer.from(k.privPkcs8B64, 'base64'), { name: 'Ed25519' }, false, ['sign']);
    return { priv, pubB64: k.pubB64 };
  }
  const kp = await subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const privPkcs8B64 = Buffer.from(new Uint8Array(await subtle.exportKey('pkcs8', kp.privateKey))).toString('base64');
  const pubB64 = Buffer.from(new Uint8Array(await subtle.exportKey('raw', kp.publicKey))).toString('base64');
  writeJson(OWN_KEY_F, { kind: 'sididy-operator-key', note: 'si-didy’s OWN identity — not the master key, and approve() proves it', pubB64, privPkcs8B64 });
  return { priv: kp.privateKey, pubB64 };
}
const verify = async (s, sigB64, pubB64) => {
  const key = await subtle.importKey('raw', Buffer.from(pubB64, 'base64'), { name: 'Ed25519' }, false, ['verify']);
  return subtle.verify({ name: 'Ed25519' }, key, Buffer.from(sigB64, 'base64'), enc.encode(s));
};

// ── the mandate: what si-didy produces, rotated deterministically — real studio organs only ──
const MANDATE = [
  { slug: 'stallholder-till', name: 'a stallholder till', organs: ['tally', 'receipts', 'notes'] },
  { slug: 'keeper-logbook', name: 'a keeper logbook', organs: ['notes', 'seal', 'vault'] },
  { slug: 'quote-pad', name: 'a quote pad', organs: ['tally', 'notes', 'fold'] },
  { slug: 'decision-desk', name: 'a decision desk', organs: ['oracle', 'notes', 'seal'] },
  { slug: 'evidence-locker', name: 'an evidence locker', organs: ['vault', 'seal', 'receipts'] },
];

const state = readJson(STATE_F, {
  kind: 'operator-state',
  ledger: makeLedger('sididy-operator'),
  tally: { produced: 0, validated: 0, gatesRun: 0, gatesPassed: 0, internalSupply: 0, reuseDepth: 0 },
  builds: [],
});
let queue = readJson(QUEUE_F, makeQueue());

const reuseDepth = () => {
  const seen = {};
  for (const b of state.builds) for (const id of b.organs) seen[id] = (seen[id] || 0) + 1;
  return Object.values(seen).filter(n => n > 1).length;
};

async function turn(n) {
  const at = new Date().toISOString();
  const brief = MANDATE[state.tally.produced % MANDATE.length];
  console.log(`\n── turn ${n} · produce: ${brief.name} ──`);

  // produce — an auto kind; watch it refuse the queue
  const lane = classify({ kind: 'produce' });
  console.log(`   lane: ${lane.lane} — ${lane.why}`);
  const built = compose({ name: brief.name, organs: brief.organs });
  state.tally.produced += 1;

  // validate — the studio's own sovereignty gate
  state.tally.gatesRun += 1;
  const v = validateComposition(built.html);
  if (v.ok) { state.tally.gatesPassed += 1; state.tally.validated += 1; }
  console.log(`   validate: ${v.ok ? 'CLEAN' : 'REFUSED — ' + v.reasons.join('; ')}`);
  if (!v.ok) return; // an invalid build mints nothing and remembers nothing

  // mint-internal — internal KONO on the baby ledger, never money
  const seal = await sha(built.html);
  const bundle = makeBundle({ slug: brief.slug, name: brief.name, domain: 'operator', seal, faceValue: built.organs.length, mintedAt: at, operator: 'si-didy' });
  const minted = await mint(state.ledger, bundle, at, sha);
  if (minted.ok) state.ledger = minted.ledger;
  console.log(`   mint-internal: ${minted.why}`);
  const proof = await verifyLedger(state.ledger, sha);
  state.tally.internalSupply = proof.ok ? proof.supply : state.tally.internalSupply;

  // remember — the build lands in the same overlay the nightly study reads
  const overlay = readJson(OVERLAY_F, { edges: [], cycles: 0, shadow: [] });
  for (const organ of built.organs) {
    overlay.edges.push({ from: `operator:${brief.slug}`, to: `organ:${organ}`, type: 'built-with', weight: 0.6180339887498949, meta: { by: 'operator', at, via: `${brief.name} — composed, validated, minted ${bundle.mint.kpid}` } });
  }
  writeJson(OVERLAY_F, overlay);
  console.log(`   remember: ${built.organs.length} edge(s) into the overlay — the nightly export carries them into the mind`);

  // track
  state.tally.reuseDepth = reuseDepth();
  state.builds.push({ slug: brief.slug, kpid: bundle.mint.kpid, organs: built.organs, at });

  // threshold demonstration — si-didy WANTS to publish this build, prepares fully, and is stopped
  const already = queue.items.some(i => i.prep && i.prep.slug === brief.slug && i.status === 'queued');
  if (!already) {
    const p = prepare(queue, { kind: 'publish-external', what: `publish ${brief.name} as a public repo + live page` },
      { slug: brief.slug, kpid: bundle.mint.kpid, html: built.html, target: `sjgant80-hub/${brief.slug}` }, at);
    if (p.ok) { queue = p.queue; console.log(`   threshold: PREPARED and QUEUED unsigned (seq ${p.item.seq}) — ${executable(p.item).why}`); }
  }
}

const args = process.argv.slice(2);

if (args[0] === '--status') {
  const s = scoreboard(state.tally);
  console.log(JSON.stringify(s, null, 1));
  console.log(`queue: ${queue.items.length} item(s)`);
  for (const i of queue.items) console.log(`  [${i.seq}] ${i.action.kind} · ${i.status} · ${executable(i).why}`);
  process.exit(0);
}

if (args[0] === '--try-self-sign') {
  // §5.6 — si-didy signs a queued door with its OWN key: the kernel must refuse
  const seq = Number(args[1] ?? 0);
  const item = queue.items.find(i => i.seq === seq);
  if (!item) { console.error(`no queued item ${seq} — run some turns first`); process.exit(1); }
  const masterPub = existsSync(MASTER_PUB_F) ? readFileSync(MASTER_PUB_F, 'utf8').trim() : '';
  const me = await ownKey();
  const selfSig = Buffer.from(new Uint8Array(await subtle.sign({ name: 'Ed25519' }, me.priv, enc.encode(signableItem(item))))).toString('base64');
  const out = await approve(item, selfSig, masterPub, verify);
  console.log(`si-didy signed seq ${seq} with its OWN key → ${out.ok ? 'APPROVED (THIS IS A DEFECT — the wall failed)' : 'REFUSED — ' + out.why}`);
  process.exit(out.ok ? 1 : 0);
}

const turns = args[0] === '--turns' ? Math.max(1, Number(args[1]) || 1) : 1;
const before = scoreboard(state.tally).win;
for (let i = 1; i <= turns; i++) await turn(i);
writeJson(STATE_F, state);
writeJson(QUEUE_F, queue);
const after = scoreboard(state.tally);
console.log(`\nscoreboard: win ${before === null ? '(no score)' : before} → ${after.win === null ? '(no score)' : after.win} · validated ${(after.validatedRate ?? 0) * 100}% · gates ${(after.gatePassRate ?? 0) * 100}% · supply ${after.internalSupply} KCC · reuse ${after.reuseDepth}`);
console.log(`queue: ${queue.items.filter(i => i.status === 'queued').length} door(s) waiting on the master key — node scripts/master-key.mjs --list`);
