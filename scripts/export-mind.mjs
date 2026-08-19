#!/usr/bin/env node
// si-didy-loop · scripts/export-mind.mjs — distill the learned graph into a MIND the world can hold.
//
// The full graph (DNA + overlay) is tens of megabytes and carries whole-file provenance; a browser
// save is not the place for it. The mind is the distillation: for every node si-didy has LEARNED
// something about, its strongest few associates — with the via-path so every association can say
// where it came from — plus what the dreams are holding open.
//
// ⚠ LOCAL-ONLY like everything in local-dna/: the mind carries private repo names. It is meant to
// be LOADED INTO YOUR OWN BROWSER on fallworld's didy panel — it never rides in a repo or a page.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const DNA = join(here, '..', 'local-dna', 'dna.json');
const OVERLAY = join(here, '..', 'local-dna', 'overlay.json');
const OUT = join(here, '..', 'local-dna', 'mind.json');

if (!existsSync(DNA) || !existsSync(OVERLAY)) {
  console.error('nothing to distill — run seed-dna and study first');
  process.exit(2);
}
const dna = JSON.parse(readFileSync(DNA, 'utf8'));
const overlay = JSON.parse(readFileSync(OVERLAY, 'utf8'));
const KAPPA = (Math.sqrt(5) - 1) / 2;

const types = new Map(dna.nodes.map(n => [n.id, n.type]));
const byNode = new Map();
for (const e of overlay.edges) {
  if (!e || typeof e.from !== 'string') continue;
  const w = Number.isFinite(e.weight) ? e.weight : 0;
  if (w < KAPPA) continue;                                  // the mind keeps only the strong band
  if (!byNode.has(e.from)) byNode.set(e.from, []);
  byNode.get(e.from).push({
    to: e.to,
    w: Number(w.toFixed(3)),
    via: String((e.meta && e.meta.via) || '').slice(0, 160),
    at: String((e.meta && e.meta.at) || '').slice(0, 10),
  });
}
const mind = {};
for (const [node, list] of byNode) {
  list.sort((a, b) => b.w - a.w || a.to.localeCompare(b.to));
  mind[node] = list.slice(0, 5);                            // five strong associates per node
}
const out = {
  v: 1,
  kind: 'sididy-mind',
  note: 'the distilled learned graph — load it into YOUR browser on fallworld; it never rides in a repo',
  studied: overlay.studied || 0,
  cycles: overlay.cycles || 0,
  exported: new Date().toISOString().slice(0, 10),
  nodes: Object.keys(mind).length,
  types: Object.fromEntries([...types].filter(([id]) => mind[id])),
  mind,
  wonders: (overlay.shadow || []).slice(-21).map(h => ({ root: h.root, node: h.node, w: Number((h.norm || 0).toFixed(3)) })),
};
const json = JSON.stringify(out);
writeFileSync(OUT, json);
console.log(`mind distilled → local-dna/mind.json · ${out.nodes} nodes · ${Object.values(mind).reduce((n, l) => n + l.length, 0)} strong associations · ${out.wonders.length} wonders · ${(json.length / 1024).toFixed(0)}KB`);
