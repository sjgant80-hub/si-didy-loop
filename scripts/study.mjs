#!/usr/bin/env node
// si-didy-loop · scripts/study.mjs — si-didy STUDIES: the systematic sweep of everything it holds.
//
//   node scripts/study.mjs               one batch (233 contexts), resumes where it left off
//   node scripts/study.mjs --all         sweep every context in one sitting
//   node scripts/study.mjs --status      where the study stands, nothing run
//
// The studier walks the whole graph — every repo, every principle, every chat — one deepening
// turn per context (fan → gate → remember), a dream every 34 contexts, resumable by cursor.
// Deterministic apart from timestamps; no model, no network, no cost: the loop is pure graph
// work on this machine. What it learns lands in the overlay; what it wonders lands on the
// shadow. Run it again any time — an echo adds nothing, new ground compounds.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fan, gate, remember, dream, deepenTurn } from '../deepen.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DNA = join(here, '..', 'local-dna', 'dna.json');
const OVERLAY = join(here, '..', 'local-dna', 'overlay.json');

if (!existsSync(DNA)) {
  console.error('no seed DNA — run: node scripts/seed-dna.mjs first');
  process.exit(2);
}
const dna = JSON.parse(readFileSync(DNA, 'utf8'));
const overlay = existsSync(OVERLAY) ? JSON.parse(readFileSync(OVERLAY, 'utf8'))
  : { edges: [], cycles: 0, shadow: [], cursor: 0, studied: 0 };
overlay.cursor = Number.isFinite(overlay.cursor) ? overlay.cursor : 0;
overlay.studied = Number.isFinite(overlay.studied) ? overlay.studied : 0;

// the graph: DNA read-only + overlay writable, association symmetric at fan time
const nodes = new Map(dna.nodes.map(n => [n.id, n]));
const out = new Map();
const eKeys = new Set();
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
    overlay.edges.push(e);
    return e;
  },
};

// the syllabus: every node that has anything to associate from, in one stable order
const syllabus = [...nodes.keys()].filter(id => (out.get(id) || []).length > 0).sort();
const save = () => writeFileSync(OVERLAY, JSON.stringify(overlay, null, 1));

if (process.argv.includes('--status')) {
  console.log(`the study: ${overlay.studied}/${syllabus.length} contexts studied · cursor at ${overlay.cursor}`);
  console.log(`learned: ${overlay.edges.length} remembered edges · ${overlay.cycles} dream cycles · ${(overlay.shadow || []).length} held on the shadow`);
  process.exit(0);
}

const BATCH = process.argv.includes('--all') ? syllabus.length : 233;
let turns = 0, totalAdded = 0, totalDropped = 0;
const discoveries = [];
const t0 = Date.now();

while (turns < BATCH && overlay.cursor < syllabus.length) {
  const ctx = syllabus[overlay.cursor];
  const t = deepenTurn(g, [ctx], new Date().toISOString());
  totalAdded += t.added;
  totalDropped += t.dropped.length;
  if (t.added > 0) discoveries.push({ ctx, added: t.added });
  overlay.cursor += 1;
  overlay.studied += 1;
  turns += 1;
  if (turns % 34 === 0) {                       // a dream every 34 contexts — study, then sleep on it
    const degree = [...out.entries()].map(([id, es]) => [id, es.length]).sort((a, b) => b[1] - a[1]);
    const d = dream(g, degree.slice(0, 55).map(([id]) => id), overlay.cycles);
    overlay.cycles += 1;
    overlay.shadow = [...(overlay.shadow || []), ...d.held].slice(-233);
  }
}
if (overlay.cursor >= syllabus.length) overlay.cursor = 0;    // the syllabus wraps — a denser graph re-reads differently
save();

const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`studied ${turns} context(s) in ${secs}s · ${totalAdded} new association(s) remembered · ${totalDropped} branches dropped at the gate, each with a reason`);
console.log(`the graph now holds ${overlay.edges.length} learned edges over the ${dna.edges.length}-edge DNA · shadow holds ${(overlay.shadow || []).length}`);
discoveries.sort((a, b) => b.added - a.added);
for (const d of discoveries.slice(0, 8)) console.log(`  ◆ ${d.ctx} — ${d.added} new association(s)`);
if (overlay.cursor === 0 && turns > 0) console.log('the syllabus wrapped — the whole graph has been studied; the next pass reads a denser world');
else console.log(`cursor at ${overlay.cursor}/${syllabus.length} — run again to continue`);
