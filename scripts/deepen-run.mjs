#!/usr/bin/env node
// si-didy-loop · scripts/deepen-run.mjs — the local runner: seed DNA + writable overlay + the loop.
//
//   node scripts/deepen-run.mjs <context-id> [more-ids...]     one deepening turn
//   node scripts/deepen-run.mjs --dream                        one idle dream cycle
//
// The DNA (local-dna/dna.json) is READ-ONLY; everything the loop remembers goes to the overlay
// (local-dna/overlay.json, append-only in spirit: existing edges are never overwritten). Both are
// files on this machine — inspectable, forkable, deletable. Nothing leaves.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fan, gate, remember, dream, deepenTurn } from '../deepen.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DNA = join(here, '..', 'local-dna', 'dna.json');
const OVERLAY = join(here, '..', 'local-dna', 'overlay.json');

if (!existsSync(DNA)) {
  console.error('no seed DNA — run: node scripts/seed-dna.mjs   (the DNA is local-only, by design)');
  process.exit(2);
}
const dna = JSON.parse(readFileSync(DNA, 'utf8'));
const overlay = existsSync(OVERLAY) ? JSON.parse(readFileSync(OVERLAY, 'utf8')) : { edges: [], cycles: 0, shadow: [] };

// ── the contract graph: DNA (read-only) + overlay (writable), one view ──
const nodes = new Map(dna.nodes.map(n => [n.id, n]));
const out = new Map();
const eKeys = new Set();
// association is symmetric at fan time even though storage is directed: an edge doc-reuses→repo
// makes the doc an associate OF the repo too. The reverse ride is marked rev so provenance holds.
const push = (e) => {
  if (!out.has(e.from)) out.set(e.from, []);
  out.get(e.from).push(e);
  eKeys.add(`${e.from} ${e.type} ${e.to}`);
  if (e.from !== e.to) {
    if (!out.has(e.to)) out.set(e.to, []);
    out.get(e.to).push({ from: e.to, to: e.from, type: e.type, weight: e.weight, meta: { ...e.meta, rev: true } });
  }
};
for (const e of dna.edges) push(e);
for (const e of overlay.edges) push(e);

const g = {
  node: (id) => nodes.get(String(id)) || null,
  edgesFrom: (id) => out.get(String(id)) || [],
  hasEdge: (f, t, to) => eKeys.has(`${f} ${t} ${to}`),
  addEdge: (from, to, type, { weight = 1, meta = {} } = {}) => {
    const e = { from: String(from), to: String(to), type, weight, meta };
    push(e);
    overlay.edges.push(e);           // only the overlay grows — the DNA is never written
    return e;
  },
};

const save = () => writeFileSync(OVERLAY, JSON.stringify(overlay, null, 1));
const args = process.argv.slice(2);

if (args[0] === '--dream') {
  // deterministic seed pool: the best-connected nodes, rotated by the persisted cycle count
  const degree = [...out.entries()].map(([id, es]) => [id, es.length]).sort((a, b) => b[1] - a[1]);
  const pool = degree.slice(0, 55).map(([id]) => id);
  const d = dream(g, pool, overlay.cycles);
  overlay.cycles += 1;
  overlay.shadow = [...(overlay.shadow || []), ...d.held].slice(-233);   // the shadow holds, bounded
  save();
  console.log(`dream cycle ${overlay.cycles - 1} · seeds ${d.seeds.join(', ')} · ${d.held.length} held open on the shadow surface (${overlay.shadow.length} held in all)`);
  for (const h of d.held.slice(0, 8)) console.log(`  ◌ ${h.root} … ${h.node} (${h.norm.toFixed(3)}) — ${h.why}`);
  process.exit(0);
}

const context = args.filter(Boolean);
if (!context.length) {
  console.error('usage: node scripts/deepen-run.mjs <context-id> [...]   or   --dream');
  process.exit(2);
}
const t = deepenTurn(g, context, new Date().toISOString());
save();
console.log(t.account);
const fresh = fan(g, context, { depth: 1 });
console.log(`one-hop reach from [${context.join(', ')}] is now ${fresh.length} node(s)`);
for (const d of t.dropped.slice(0, 6)) console.log(`  ✗ ${d.branch.node} — ${d.why}`);
