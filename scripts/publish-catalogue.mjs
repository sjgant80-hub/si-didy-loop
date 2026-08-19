#!/usr/bin/env node
// si-didy-loop · scripts/publish-catalogue.mjs — the EXECUTOR for one door: fallworld-market
// publish-release. It runs ONLY when the queue holds that door approved under the master key —
// executable() is checked first and this script refuses without it. The gate is honored by the
// executor, not just by the queue.
//
// What it ships: the operator's minted catalogue as a public showcase. Every build is
// RE-COMPOSED deterministically from its recorded organ set and its seal re-verified against
// the ledger entry (full sha, and the kpid's own 8-char carry) — a build that no longer proves
// itself is REFUSED from the catalogue and said so. The page is GENERATED from state; no number
// on it is typed by hand.
//
//   node scripts/publish-catalogue.mjs <dist-dir>
//
// Honesty on the page itself: KCC face values are INTERNAL accounting (verified work), not
// money and not prices. This door was publish-release — the real-money doors stay shut and
// counsel-gated.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { webcrypto } from 'node:crypto';

import { executable } from '../operator.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const QUEUE_F = join(here, '..', 'local-dna', 'operator-queue.json');
const STATE_F = join(here, '..', 'local-dna', 'operator-state.json');
const FORGE = join(here, '..', '..', 'fallkard-forge');
const { compose } = await import(pathToFileURL(join(FORGE, 'studio.mjs')).href);
const { verifyLedger } = await import(pathToFileURL(join(FORGE, 'babykcc.mjs')).href);

const enc = new TextEncoder();
const sha = async (s) => Array.from(new Uint8Array(await webcrypto.subtle.digest('SHA-256', enc.encode(s))))
  .map(b => b.toString(16).padStart(2, '0')).join('');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const dist = process.argv[2];
if (!dist) { console.error('usage: node scripts/publish-catalogue.mjs <dist-dir>'); process.exit(1); }

// ── THE GATE, HONORED BY THE EXECUTOR ──
const queue = JSON.parse(readFileSync(QUEUE_F, 'utf8'));
const door = queue.items.filter(i => i.action?.stream === 'fallworld-market' && i.action?.cap === 'publish-release')
  .sort((a, b) => b.seq - a.seq)[0];
const gate = executable(door || null);
if (!gate.ok) {
  console.error(`REFUSED: the publish-release door is not executable — ${gate.why}`);
  console.error('This executor ships nothing without the master key. Nothing was written.');
  process.exit(1);
}
console.log(`gate: seq ${door.seq} — ${gate.why}`);

// ── RE-COMPOSE AND RE-PROVE EVERY BUILD ──
const state = JSON.parse(readFileSync(STATE_F, 'utf8'));
const proof = await verifyLedger(state.ledger, sha);
if (!proof.ok) { console.error(`REFUSED: the ledger does not re-prove itself — ${proof.why}`); process.exit(1); }

if (state.builds.length !== door.prep.builds) {
  console.error(`REFUSED: the signed door covers ${door.prep.builds} builds but the catalogue holds ${state.builds.length} — re-prepare and re-sign.`);
  process.exit(1);
}

const entryOf = Object.fromEntries(state.ledger.entries.map(e => [e.kpid, e]));
const nameOf = (b) => {
  if (b.parent) return `${b.slug.replace(/-g2$/, '')}, second generation`;
  const named = { 'stallholder-till': 'a stallholder till', 'keeper-logbook': 'a keeper logbook', 'quote-pad': 'a quote pad', 'decision-desk': 'a decision desk', 'evidence-locker': 'an evidence locker' };
  return named[b.slug] || `a ${b.organs.join('·')} ${b.organs.length === 4 ? 'workshop' : 'bench'}`;
};
// forks were composed under their grown name — reconstruct it exactly as the sweep did:
// the grown-by organ is the one the parent lacks (stored organ order is studio order, not append order)
const buildOf = Object.fromEntries(state.builds.map(b => [b.kpid, b]));
const forkName = (b) => {
  const parentOrgans = buildOf[b.parent]?.organs || [];
  const add = b.organs.find(o => !parentOrgans.includes(o));
  return `${b.slug.replace(/-g2$/, '')}, second generation — grown by ${add}`;
};

const shipped = [], refused = [];
for (const b of state.builds) {
  const name = b.parent ? forkName(b) : nameOf(b);
  const built = compose({ name, organs: b.organs });
  const seal = await sha(built.html);
  const entry = entryOf[b.kpid];
  const sealOk = !!entry && entry.fork_sha === seal && b.kpid.endsWith(seal.slice(0, 8));
  const parentOk = !b.parent || (!!entryOf[b.parent]);
  if (sealOk && parentOk) shipped.push({ ...b, name, html: built.html, tier: entry.tier, value: entry.value });
  else refused.push({ slug: b.slug, why: !entry ? 'no ledger entry' : !sealOk ? 'the re-composed build no longer matches its sealed identity' : 'its parent is not in the ledger' });
}
for (const r of refused) console.log(`  ✗ refused from the catalogue: ${r.slug} — ${r.why}`);
console.log(`re-proven: ${shipped.length}/${state.builds.length} builds · ledger ${proof.count} entries, ${proof.supply} KCC internal`);

// ── EMIT: one generated page + every build as its own live single file ──
mkdirSync(join(dist, 'builds'), { recursive: true });
writeFileSync(join(dist, '.nojekyll'), '');
for (const s of shipped) writeFileSync(join(dist, 'builds', s.slug + '.html'), s.html);

const gen1 = shipped.filter(s => !s.parent), gen2 = shipped.filter(s => s.parent);
const card = (s) => `
<div class="card">
  <h3><a href="builds/${esc(s.slug)}.html">${esc(s.name)}</a></h3>
  <div class="organs">${s.organs.map(o => `<span>${esc(o)}</span>`).join('')}</div>
  <div class="meta">tier ${esc(s.tier)} · ${s.value} KCC internal · minted ${esc(s.at.slice(0, 10))}</div>
  <div class="kpid">${esc(s.kpid)}</div>
  ${s.parent ? `<div class="lineage">↳ chains to <code>${esc(s.parent)}</code> — verified in the ledger</div>` : ''}
  <a class="open" href="builds/${esc(s.slug)}.html">open it — it runs from one file, offline, and sends nothing anywhere</a>
</div>`;

const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>the si-didy catalogue</title>
<style>
body{font-family:Georgia,serif;background:#0b0a0f;color:#d8d2c4;max-width:860px;margin:0 auto;padding:28px 18px;line-height:1.55}
h1{font-size:1.5rem;color:#d4a017}h2{font-size:1.1rem;color:#d4a017;margin-top:2rem;border-bottom:1px solid #3a3630;padding-bottom:.3rem}
a{color:#d4a017}.quiet{opacity:.65;font-size:.92em}
.proof{border:1px solid #3a3630;border-radius:8px;padding:12px 16px;margin:1.2rem 0;font-size:.92em;background:#141218}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px;margin-top:1rem}
.card{border:1px solid #3a3630;border-radius:8px;padding:14px;background:#141218}
.card h3{margin:0 0 6px;font-size:1rem}.card h3 a{text-decoration:none}
.organs span{display:inline-block;border:1px solid #3a3630;border-radius:4px;padding:1px 7px;margin:0 4px 4px 0;font-size:.78em;opacity:.85}
.meta{font-size:.82em;opacity:.7;margin:6px 0 2px}.kpid{font-family:monospace;font-size:.7em;opacity:.5;word-break:break-all}
.lineage{font-size:.8em;margin-top:6px;color:#9fb89f}.lineage code{font-size:.9em}
.open{display:block;margin-top:8px;font-size:.85em}
footer{margin-top:2.5rem;padding-top:1rem;border-top:1px solid #3a3630;font-size:.8em;opacity:.65}
</style></head><body>
<h1>the si-didy catalogue</h1>
<p>${shipped.length} sovereign builds, composed autonomously by si-didy — the estate's operator —
from the <a href="https://sjgant80-hub.github.io/fallkard-forge/">Forge Studio</a> organ palette.
Every build is a single file: it runs offline, keeps everything on your machine, and sends nothing anywhere.
Open any of them — they are the real builds, not screenshots.</p>
<div class="proof">
<b>how this page earned itself:</b> every build here was re-composed from its recorded organ set at publish
time and its content hash re-checked against the sealed identity in the internal ledger —
${shipped.length}/${state.builds.length} proved themselves${refused.length ? ` (${refused.length} refused, named in the repo log)` : ''}.
The ledger re-proves its own chain: ${proof.count} entries, ${proof.supply} KCC.
<br><b>honest line:</b> KCC face values are INTERNAL accounting — verified work on a local ledger.
Nothing here is for sale and nothing here is money. This release crossed one signed door
(publish-release); the real-money doors stay shut behind the master key, counsel first.
</div>
<h2>first generation — ${gen1.length} builds</h2>
<div class="grid">${gen1.map(card).join('')}</div>
<h2>second generation — ${gen2.length} forks, lineage verified</h2>
<p class="quiet">each fork is its parent grown by one organ, minted with a fork identity that chains to the parent's — one heir per artifact.</p>
<div class="grid">${gen2.map(card).join('')}</div>
<footer>generated from the operator's state — no number typed by hand · released under a master-key-signed door
· composed in the Forge Studio · powered by fall·os · Konomi Architecture</footer>
</body></html>`;
writeFileSync(join(dist, 'index.html'), page);

writeFileSync(join(dist, 'README.md'), `# the si-didy catalogue

**LIVE: https://sjgant80-hub.github.io/sididy-catalogue/**

${shipped.length} sovereign single-file builds composed autonomously by si-didy (the estate's operator)
from the Forge Studio organ palette, each re-proven against its sealed ledger identity at publish time.
${gen1.length} first-generation, ${gen2.length} second-generation forks with verified lineage.

Internal ledger at release: ${proof.count} entries · ${proof.supply} KCC (internal accounting — not money,
nothing is for sale). Released through one master-key-signed door (publish-release, seq ${door.seq});
the real-money doors remain shut and counsel-gated.

Every page runs from one file, offline, and sends nothing anywhere. · Konomi Architecture
`);

// runner bookkeeping: the door records that it was executed, and where
door.executedAt = new Date().toISOString();
door.executedUrl = 'https://sjgant80-hub.github.io/sididy-catalogue/';
writeFileSync(QUEUE_F, JSON.stringify(queue, null, 1));
console.log(`emitted: index.html + ${shipped.length} build pages + README → ${dist}`);
