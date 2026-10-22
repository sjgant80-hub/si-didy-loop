// si-didy-loop · scripts/look.mjs — the `look` plainsay.mjs reads: the seed DNA and the overlay as one place to ask
// "what is this node" and "why does this edge exist". Edges are looked up both ways round, the reverse marked rev,
// exactly as scripts/deepen-run.mjs walks them, so a route the dream held can be said hop by hop.
//
// LOCAL-ONLY: it reads local-dna/, which carries private names. What it feeds is the local brief and the course's
// own record, never a public file.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJsonSafe } from '../safejson.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DNA_F = join(here, '..', 'local-dna', 'dna.json');
const OVERLAY_F = join(here, '..', 'local-dna', 'overlay.json');
const FRESH_MS = 36 * 3600 * 1000;   // the same window scripts/deepen-run.mjs dreams from

export function loadLook(nowMs = Date.now()) {
  const dna = existsSync(DNA_F) ? readJsonSafe(DNA_F, { nodes: [], edges: [] }) : { nodes: [], edges: [] };
  const overlay = readJsonSafe(OVERLAY_F, { edges: [], shadow: [] });
  const nodes = new Map((dna.nodes || []).map(n => [n.id, n]));
  const edges = new Map();
  for (const e of [...(dna.edges || []), ...(overlay.edges || [])]) {
    if (!e || typeof e.from !== 'string' || typeof e.to !== 'string') continue;
    const k = `${e.from} ${e.type} ${e.to}`, r = `${e.to} ${e.type} ${e.from}`;
    if (!edges.has(k)) edges.set(k, e.meta || {});
    if (!edges.has(r)) edges.set(r, { ...(e.meta || {}), rev: true });
  }
  const age = (n) => Math.max(Number(n?.meta?.mtime) || 0, Date.parse(n?.meta?.pushed || '') || 0);
  return {
    look: {
      node: (id) => nodes.get(String(id)) || null,
      edge: (from, type, to) => edges.get(`${from} ${type} ${to}`) || null,
      fresh: (id) => { const n = nodes.get(String(id)); return !!n && nowMs - age(n) < FRESH_MS; },
    },
    shadow: Array.isArray(overlay.shadow) ? overlay.shadow : [],
  };
}

export default loadLook;
