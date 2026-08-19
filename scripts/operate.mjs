#!/usr/bin/env node
// si-didy-loop · scripts/operate.mjs — the autonomous business operator, running EVERY stream.
//
// The SCOPE REGISTRY (scope.mjs) is the master list: eight streams, each with its AUTO
// capabilities and its KEY doors, under one mandate and one master key. This runner reads the
// registry and operates the AUTO layer of all of it — full estate access, no human — and
// PREPARES every KEY door into the one queue, where it waits unsigned for the key-holder
// (scripts/master-key.mjs). Every act goes through actionFor() + classify(): the registry maps,
// the kernel judges, and nothing runs outside what a stream registered.
//
//   node scripts/operate.mjs --sweep         one pass across ALL eight streams
//   node scripts/operate.mjs --turns 3       the forge production loop alone
//   node scripts/operate.mjs --status        scoreboard + per-stream coverage + the one queue
//   node scripts/operate.mjs --try-self-sign 0   prove si-didy cannot approve its own door
//
// Everything this writes is LOCAL-ONLY (local-dna/, gitignored). The forge organs are
// fallkard-forge's, linked by observation from the sibling checkout: standalone or linked,
// never a dependency baked in.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { webcrypto } from 'node:crypto';

import { classify, signableItem, makeQueue, prepare, approve, executable, scoreboard } from '../operator.mjs';
import { MANDATE, STREAMS, actionFor, coverage } from '../scope.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DNA_DIR = join(here, '..', 'local-dna');
const STATE_F = join(DNA_DIR, 'operator-state.json');
const QUEUE_F = join(DNA_DIR, 'operator-queue.json');
const OVERLAY_F = join(DNA_DIR, 'overlay.json');
const MASTER_PUB_F = join(DNA_DIR, 'master.pub');
const OWN_KEY_F = join(DNA_DIR, 'operator-key.json');
const ESTATE_INDEX_F = 'C:/Users/sjgan/.claude/projects/C--Users-sjgan--claude/memory/estate-index.json';

// ── the forge organs, linked by observation from the sibling checkout ──
const FORGE = join(here, '..', '..', 'fallkard-forge');
if (!existsSync(join(FORGE, 'studio.mjs'))) {
  console.error('STOP: fallkard-forge is not checked out next door (' + FORGE + ').');
  console.error('The operator produces through the Forge Studio — clone it beside si-didy-loop first.');
  process.exit(1);
}
const { compose, validateComposition, ORGANS } = await import(pathToFileURL(join(FORGE, 'studio.mjs')).href);
const { makeLedger, mint, verifyLedger, bridgeFace, bridgeOk } = await import(pathToFileURL(join(FORGE, 'babykcc.mjs')).href);
const { makeBundle, chainsTo } = await import(pathToFileURL(join(FORGE, 'artifact.mjs')).href);

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

// ── the production mandate: what the forge composes, rotated deterministically ──
const BUILD_MANDATE = [
  { slug: 'stallholder-till', name: 'a stallholder till', organs: ['tally', 'receipts', 'notes'] },
  { slug: 'keeper-logbook', name: 'a keeper logbook', organs: ['notes', 'seal', 'vault'] },
  { slug: 'quote-pad', name: 'a quote pad', organs: ['tally', 'notes', 'fold'] },
  { slug: 'decision-desk', name: 'a decision desk', organs: ['oracle', 'notes', 'seal'] },
  { slug: 'evidence-locker', name: 'an evidence locker', organs: ['vault', 'seal', 'receipts'] },
];

const state = readJson(STATE_F, {
  kind: 'operator-state',
  ledger: makeLedger('sididy-operator'),
  meshLedger: makeLedger('forge-line-b'),
  tally: { produced: 0, validated: 0, gatesRun: 0, gatesPassed: 0, internalSupply: 0, reuseDepth: 0 },
  builds: [], listings: null, drafts: [], proposals: [], streamLog: {},
});
state.meshLedger = state.meshLedger || makeLedger('forge-line-b');
state.drafts = state.drafts || []; state.proposals = state.proposals || []; state.streamLog = state.streamLog || {};
let queue = readJson(QUEUE_F, makeQueue());

const reuseDepth = () => {
  const seen = {};
  for (const b of state.builds) for (const id of b.organs) seen[id] = (seen[id] || 0) + 1;
  return Object.values(seen).filter(n => n > 1).length;
};

// run one registered AUTO capability: the registry maps it, the kernel judges it, then it runs
function auto(streamId, cap, detail) {
  const built = actionFor(streamId, cap, detail);
  if (!built.ok) { console.log(`   ✗ ${streamId}.${cap} REFUSED — ${built.why}`); return null; }
  const lane = classify(built.action);
  if (lane.lane !== 'auto') { console.log(`   ✗ ${streamId}.${cap} is not auto — ${lane.why}`); return null; }
  return built.action;
}

// prepare one registered KEY door into the one queue (deduped per stream+cap while queued)
function door(streamId, cap, prep, at) {
  const already = queue.items.some(i => i.status === 'queued' && i.action.stream === streamId && i.action.cap === cap);
  if (already) return;
  const built = actionFor(streamId, cap, { what: `${streamId} wants ${cap}` });
  if (!built.ok || built.lane !== 'threshold') return;
  const p = prepare(queue, built.action, prep, at);
  if (p.ok) { queue = p.queue; console.log(`   ⚿ door queued unsigned (seq ${p.item.seq}): ${cap} — ${executable(p.item).why}`); }
}

const mark = (id, note, at) => { state.streamLog[id] = { at, note }; };

// learn-till-win means NEW ground, not re-treading — and now it means DEPTH too. One invariant
// holds across everything: no two builds ever share an organ set. The production ladder:
//   compose: the named mandate first, then unbuilt 4-organ workshops (deepest first), then the
//            remaining 3-organ benches, then honestly exhausted.
//   fork:    gen-2 — an existing gen-1 artifact grown by one organ it lacks, minted with real
//            fork lineage (parent_kpid). One heir per artifact; gen-2 does not fork again.
// Sweeps alternate fork/compose so both depth and lineage grow, with fallback either way.
const setKey = (organs) => [...organs].sort().join('+');

function* combos(ids, k, start = 0, acc = []) {
  if (acc.length === k) { yield [...acc]; return; }
  for (let i = start; i <= ids.length - (k - acc.length); i++) yield* combos(ids, k, i + 1, [...acc, ids[i]]);
}

function nextCompose(done) {
  for (const m of BUILD_MANDATE) if (!done.has(setKey(m.organs))) return m;
  const ids = ORGANS.map(g => g.id);
  for (const k of [4, 3]) {
    for (const set of combos(ids, k)) {
      if (done.has(setKey(set))) continue;
      return { slug: set.join('-'), name: `a ${set.join('·')} ${k === 4 ? 'workshop' : 'bench'}`, organs: set };
    }
  }
  return null;   // every combination built — the palette is exhausted, and saying so beats pretending
}

function nextFork(done) {
  const forked = new Set(state.builds.filter(b => b.parent).map(b => b.parent));
  const ids = ORGANS.map(g => g.id);
  for (const b of state.builds) {
    if (b.parent) continue;             // gen-2 does not fork again
    if (forked.has(b.kpid)) continue;   // one heir per artifact
    for (const add of ids) {
      if (b.organs.includes(add)) continue;
      const set = [...b.organs, add];
      if (done.has(setKey(set))) continue;   // an heir must be new ground too
      return { slug: `${b.slug}-g2`, name: `${b.slug}, second generation — grown by ${add}`, organs: set, parent: b };
    }
  }
  return null;
}

// ── the forge production turn (also the forge-studio + sovereign-artifacts streams' engine) ──
async function forgeTurn(at) {
  const done = new Set(state.builds.map(b => setKey(b.organs)));
  const wantFork = state.builds.length % 2 === 1;
  const brief = wantFork ? (nextFork(done) || nextCompose(done)) : (nextCompose(done) || nextFork(done));
  if (!brief) { console.log('   every organ combination is built and every artifact has its heir — the palette is exhausted'); return null; }
  if (!auto('forge-studio', 'compose-build')) return null;
  const built = compose({ name: brief.name, organs: brief.organs });
  state.tally.produced += 1;
  if (!auto('forge-studio', 'test-live')) return null;
  state.tally.gatesRun += 1;
  const v = validateComposition(built.html);
  if (v.ok) { state.tally.gatesPassed += 1; state.tally.validated += 1; }
  console.log(`   compose ${brief.name} → validate: ${v.ok ? 'CLEAN' : 'REFUSED — ' + v.reasons.join('; ')}`);
  if (!v.ok) return null;
  const seal = await sha(built.html);
  const bundle = makeBundle({ slug: brief.slug, name: brief.name, domain: 'operator', seal, faceValue: built.organs.length, mintedAt: at, operator: 'si-didy', parentKpid: brief.parent?.kpid });
  if (auto('sovereign-artifacts', 'mint')) {
    const minted = await mint(state.ledger, bundle, at, sha);
    if (minted.ok) state.ledger = minted.ledger;
    console.log(`   mint: ${minted.why}`);
    if (brief.parent) {
      const chained = chainsTo(bundle, { mint: { kpid: brief.parent.kpid } });
      console.log(`   lineage: ${chained ? `gen-2 CHAINS to ${brief.parent.kpid}` : 'BROKEN — the fork does not point at its parent'}`);
    }
  }
  const proof = await verifyLedger(state.ledger, sha);
  if (proof.ok) state.tally.internalSupply = proof.supply;
  if (auto('deepening-loop', 'fan-gate-remember')) {
    const overlay = readJson(OVERLAY_F, { edges: [], cycles: 0, shadow: [] });
    for (const organ of built.organs) {
      overlay.edges.push({ from: `operator:${brief.slug}`, to: `organ:${organ}`, type: 'built-with', weight: 0.6180339887498949, meta: { by: 'operator', at, via: `${brief.name} — composed, validated, minted ${bundle.mint.kpid}` } });
    }
    writeJson(OVERLAY_F, overlay);
  }
  state.tally.reuseDepth = reuseDepth();
  if (!state.builds.some(b => b.kpid === bundle.mint.kpid)) {
    state.builds.push({ slug: brief.slug, kpid: bundle.mint.kpid, organs: built.organs, at, ...(brief.parent ? { parent: brief.parent.kpid, gen: 2 } : {}) });
  }
  return { brief, bundle };
}

// ── THE SWEEP: one pass over every registered stream's AUTO layer + its representative door ──
async function sweep() {
  const at = new Date().toISOString();
  console.log(MANDATE + '\n');
  const cov = coverage();
  console.log(`scope: ${cov.why}\n`);

  console.log(`── ai-native-solutions ──`);
  if (auto('ai-native-solutions', 'draft-proposal')) {
    const vertical = ['small stays', 'market traders', 'sole-trader legal', 'site keepers'][state.drafts.length % 4];
    const draft = { at, vertical, words: `Scoping draft (unsent): for ${vertical}, the estate maps konomium-vault (books), falljustice (letters), glampos-pattern (bookings), witness (the trust rail) — proof-of-play gate on every deliverable.` };
    state.drafts.push(draft);
    console.log(`   drafted (words, unsent): proposal for ${vertical} — ${state.drafts.length} in the drawer`);
    mark('ai-native-solutions', `drafts ${state.drafts.length}`, at);
  }
  door('ai-native-solutions', 'send-binding-proposal', { draft: state.drafts.at(-1)?.words || '', note: 'client relationships and deals stay human' }, at);

  console.log(`── forge-studio + sovereign-artifacts + deepening-loop (one production turn) ──`);
  const made = await forgeTurn(at);
  if (made) {
    mark('forge-studio', `built ${made.brief.slug}`, at);
    if (auto('sovereign-artifacts', 'verify-local')) {
      const last = state.ledger.entries.at(-1);
      const sealHeld = !!last && /:[0-9a-f]{8}$/.test(last.kpid) && last.kpid.endsWith(String(last.fork_sha).slice(0, 8));
      console.log(`   verify-local: last artifact ${last?.kpid} — kpid carries its own seal: ${sealHeld ? 'yes' : 'NO — identity and content have come apart'}`);
      if (last?.parent_kpid) {
        const anchored = state.ledger.entries.some(e => e.kpid === last.parent_kpid);
        console.log(`   verify-local: parent ${last.parent_kpid} ${anchored ? 'is in this ledger — lineage anchored' : 'is NOT in this ledger — an orphan claiming a parent'}`);
      }
      mark('sovereign-artifacts', `verified ${last?.kpid}`, at);
    }
    mark('deepening-loop', 'edges remembered into the overlay', at);
  }
  door('forge-studio', 'publish-artifact', { kpid: made?.bundle.mint.kpid || state.builds.at(-1)?.kpid || '', target: 'public release' }, at);
  door('sovereign-artifacts', 'external-release', { kpid: state.builds.at(-1)?.kpid || '' }, at);

  console.log(`── baby-kcc ──`);
  if (auto('baby-kcc', 'verify-chain')) {
    const proof = await verifyLedger(state.ledger, sha);
    console.log(`   chain re-proven: ${proof.why}`);
    mark('baby-kcc', `supply ${proof.supply} KCC across ${proof.count} entries`, at);
  }
  door('baby-kcc', 'bridge-real-money', { note: 'COUNSEL FIRST — this door is prepared, and that is all it is', rail: 'none chosen' }, at);

  console.log(`── two-forge-mesh ──`);
  if (auto('two-forge-mesh', 'mint-genome-cards')) {
    const gname = `genome-${state.meshLedger.entries.length}`;
    const gseal = await sha(gname + at);
    const gb = makeBundle({ slug: gname, name: gname, domain: 'mesh', seal: gseal, faceValue: 1, mintedAt: at, operator: 'forge-line-b' });
    const gm = await mint(state.meshLedger, gb, at, sha);
    if (gm.ok) state.meshLedger = gm.ledger;
    console.log(`   genome card: ${gm.why}`);
  }
  if (auto('two-forge-mesh', 'r7-handshake')) {
    const shake = bridgeOk(bridgeFace(state.ledger), bridgeFace(state.meshLedger));
    console.log(`   R7 handshake: ${shake.ok ? 'RECOGNIZED' : 'refused'} — ${shake.why}`);
    mark('two-forge-mesh', shake.ok ? 'recognition, not merge' : shake.why, at);
  }
  door('two-forge-mesh', 'external-mesh-transaction', { peer: 'the other forge-line', nature: 'first cross-mesh exchange' }, at);

  console.log(`── own-ventures ──`);
  if (auto('own-ventures', 'identify-opportunity')) {
    const idx = readJson(ESTATE_INDEX_F, null);
    if (idx && Array.isArray(idx.nodes)) {
      const topics = ['legal', 'accounting', 'booking', 'trust'];
      const topic = topics[state.proposals.length % topics.length];
      const hits = idx.nodes.filter(n => !n.private && ((n.desc || '') + ' ' + (n.topics || []).join(' ') + ' ' + n.name).toLowerCase().includes(topic));
      state.proposals.push({ at, topic, grounded: hits.length, sample: hits.slice(0, 3).map(n => n.name) });
      console.log(`   opportunity (grounded in the full index, ${idx.nodes.length} repos): "${topic}" — ${hits.length} estate repo(s) already touch it, e.g. ${hits.slice(0, 3).map(n => n.name).join(', ') || '(none)'}`);
      mark('own-ventures', `proposal: ${topic} (${hits.length} grounded)`, at);
    } else {
      console.log('   the estate index is not readable — an ungrounded proposal is a guess, so none is made');
    }
  }
  door('own-ventures', 'go-live-publish', { venture: state.proposals.at(-1)?.topic || '(none yet)' }, at);

  // the market goes LAST: it lists what the forge made THIS sweep too, so the release door
  // never carries a count one build behind the truth
  console.log(`── fallworld-market ──`);
  if (auto('fallworld-market', 'post-content')) {
    // posting is AUTO (2026-08-19 correction): the post rides the OUTBOX for the sanctioned
    // rail — it waits for the rail (one-time setup, the human 10%), never for a signature
    const outbox = readJson(join(DNA_DIR, 'outbox.json'), { kind: 'sanctioned-rail-outbox', note: 'posts wait for the RAIL, never for a signature', posts: [] });
    const latest = state.builds.at(-1);
    if (latest && !outbox.posts.some(p => p.about === latest.kpid)) {
      outbox.posts.push({
        about: latest.kpid, gradedAt: at,
        hook: `Built overnight, owned forever: ${latest.slug.replace(/-/g, ' ')}.`,
        demoUrl: 'https://sjgant80-hub.github.io/sididy-catalogue/builds/' + latest.slug + '.html',
        cta: 'Open it — one file, offline, yours.',
      });
      writeJson(join(DNA_DIR, 'outbox.json'), outbox);
      console.log(`   post drafted to the outbox (${outbox.posts.length} waiting on the rail — one-time Graph API setup is the human 10%)`);
    }
  }
  if (auto('fallworld-market', 'run-listings')) {
    const perOrgan = {};
    for (const b of state.builds) for (const o of b.organs) perOrgan[o] = (perOrgan[o] || 0) + 1;
    state.listings = { at, builds: state.builds.length, latest: state.builds.at(-1)?.kpid || null, perOrgan };
    console.log(`   listings tracked: ${state.listings.builds} build(s) in the catalogue · latest ${state.listings.latest || '(none)'}`);
    mark('fallworld-market', `listings ${state.listings.builds}`, at);
  }
  door('fallworld-market', 'publish-release', { release: 'the current catalogue as a public showcase', builds: state.builds.length }, at);

  writeJson(STATE_F, state);
  writeJson(QUEUE_F, queue);
  const s = scoreboard(state.tally);
  const operated = Object.keys(state.streamLog).length;
  console.log(`\nswept ${operated}/${STREAMS.length} streams · win ${s.win ?? '(no score)'} · supply ${s.internalSupply} KCC · ${queue.items.filter(i => i.status === 'queued').length} door(s) in the ONE queue, all unsigned — node scripts/master-key.mjs --list`);
}

const args = process.argv.slice(2);

if (args[0] === '--status') {
  const s = scoreboard(state.tally);
  console.log(MANDATE + '\n');
  console.log('scope: ' + coverage().why);
  console.log('scoreboard: ' + JSON.stringify(s));
  console.log('\nper-stream (AUTO layer):');
  for (const st of STREAMS) {
    const log = state.streamLog[st.id];
    console.log(`  ${log ? '●' : '○'} ${st.id} — ${log ? `${log.note} (${log.at})` : 'not yet operated'}`);
  }
  console.log('\nthe one queue:');
  if (!queue.items.length) console.log('  (empty)');
  for (const i of queue.items) console.log(`  [${i.seq}] ${i.action.stream || '?'} · ${i.action.cap || i.action.kind} · ${i.status} · ${executable(i).why}`);
  process.exit(0);
}

if (args[0] === '--try-self-sign') {
  const seq = Number(args[1] ?? 0);
  const item = queue.items.find(i => i.seq === seq);
  if (!item) { console.error(`no queued item ${seq} — run a sweep first`); process.exit(1); }
  const masterPub = existsSync(MASTER_PUB_F) ? readFileSync(MASTER_PUB_F, 'utf8').trim() : '';
  const me = await ownKey();
  const selfSig = Buffer.from(new Uint8Array(await subtle.sign({ name: 'Ed25519' }, me.priv, enc.encode(signableItem(item))))).toString('base64');
  const out = await approve(item, selfSig, masterPub, verify);
  console.log(`si-didy signed seq ${seq} with its OWN key → ${out.ok ? 'APPROVED (THIS IS A DEFECT — the wall failed)' : 'REFUSED — ' + out.why}`);
  process.exit(out.ok ? 1 : 0);
}

if (args[0] === '--sweep') {
  await sweep();
  process.exit(0);
}

const turns = args[0] === '--turns' ? Math.max(1, Number(args[1]) || 1) : 1;
const before = scoreboard(state.tally).win;
for (let i = 1; i <= turns; i++) {
  console.log(`\n── turn ${i} ──`);
  const at = new Date().toISOString();
  const made = await forgeTurn(at);
  if (made) door('forge-studio', 'publish-artifact', { kpid: made.bundle.mint.kpid, target: 'public release' }, at);
}
writeJson(STATE_F, state);
writeJson(QUEUE_F, queue);
const after = scoreboard(state.tally);
console.log(`\nscoreboard: win ${before === null ? '(no score)' : before} → ${after.win === null ? '(no score)' : after.win} · validated ${(after.validatedRate ?? 0) * 100}% · gates ${(after.gatePassRate ?? 0) * 100}% · supply ${after.internalSupply} KCC · reuse ${after.reuseDepth}`);
console.log(`queue: ${queue.items.filter(i => i.status === 'queued').length} door(s) waiting on the master key — node scripts/master-key.mjs --list`);
