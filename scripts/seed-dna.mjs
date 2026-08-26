#!/usr/bin/env node
// si-didy-loop · scripts/seed-dna.mjs — the SEED DNA generator.
//
// Builds the read-only association graph si-didy boots with: NOT weights, NOT a fine-tune —
// a file of typed nodes and edges the fan associates OVER. Sovereign (the model is untouched),
// inspectable (open the file, see every node), forkable (copy the file).
//
// Sources, all local:
//   · the estate index          — every repo as a node; repos sharing a rare topic become kin
//   · the estate memory (*.md)  — each distilled memory doc as a principle-node; a doc that
//                                 mentions a repo gets a `reuses` edge to it; [[wiki-links]]
//                                 between docs become kin
//   · CC chats (optional dir)   — each session file as a chat-node with `reuses` edges to the
//                                 repos it mentions (first 200KB scanned; the reasoning history
//                                 as graph, not as text)
//
// ⚠ THE OUTPUT IS LOCAL-ONLY (local-dna/ is gitignored): the index carries private repo names
// and the chats are private by nature. The DNA is yours, on your machine — that is the point.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, '..', 'local-dna');
const MEMORY_DIR = 'C:/Users/sjgan/.claude/projects/C--Users-sjgan--claude/memory';
const INDEX = join(MEMORY_DIR, 'estate-index.json');
const PROJECTS_DIR = 'C:/Users/sjgan/.claude/projects';
const CHAT_DIRS = process.argv.includes('--chats')
  ? [process.argv[process.argv.indexOf('--chats') + 1]]
  : (() => { try { return readdirSync(PROJECTS_DIR).map(d => join(PROJECTS_DIR, d)); } catch { return []; } })();
// imported vendor chats (ChatGPT via ingest-chatgpt.mjs) always join the DNA when present — the
// reasoning history predating the estate is part of the same mind. local-dna/ is gitignored.
{ const gpt = join(here, '..', 'local-dna', 'chatgpt-chats'); if (existsSync(gpt)) CHAT_DIRS.push(gpt); }

const nodes = new Map();   // id -> { id, type, meta }
const edges = [];          // { from, to, type, weight, meta }
const edgeSeen = new Set();
const addNode = (id, type, meta) => { if (!nodes.has(id)) nodes.set(id, { id, type, meta }); };
const addEdge = (from, to, type, meta = {}, weight = 1) => {
  const k = `${from} ${type} ${to}`;
  if (edgeSeen.has(k)) return;
  edgeSeen.add(k);
  edges.push({ from, to, type, weight, meta });
};

// ── 1 · the estate: repos as nodes; rare shared topics as kin ──
const index = JSON.parse(readFileSync(INDEX, 'utf8'));
const repos = Array.isArray(index) ? index : index.nodes || index.repos || [];
const byTopic = new Map();
let repoCount = 0;
for (const r of repos) {
  if (!r || typeof r.name !== 'string') continue;
  addNode(r.name, 'repo', { src: 'estate-index', desc: String(r.desc || r.description || '').slice(0, 140), private: !!r.private });
  repoCount++;
  for (const t of (Array.isArray(r.topics) ? r.topics : [])) {
    if (!byTopic.has(t)) byTopic.set(t, []);
    byTopic.get(t).push(r.name);
  }
}
// a topic shared by a FEW repos is a real kinship; a topic shared by hundreds is a category,
// and pairing a category explodes the graph with noise — capped and SAID.
let kinPairs = 0, skippedTopics = 0;
for (const [topic, members] of byTopic) {
  if (members.length < 2) continue;
  if (members.length > 12) { skippedTopics++; continue; }
  for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) {
    addEdge(members[i], members[j], 'kin', { topic });
    addEdge(members[j], members[i], 'kin', { topic });
    kinPairs++;
  }
}

// ── 2 · the memory docs: principles, their repo mentions, their wiki-links ──
const repoNames = [...nodes.keys()].filter(n => n.length >= 5);   // short names false-positive too easily
let docCount = 0, mentionEdges = 0, linkEdges = 0;
for (const f of readdirSync(MEMORY_DIR)) {
  if (!f.endsWith('.md') || f === 'MEMORY.md') continue;
  const id = 'memory:' + f.replace(/\.md$/, '');
  const text = readFileSync(join(MEMORY_DIR, f), 'utf8');
  addNode(id, 'principle', { src: 'estate-memory', file: f });
  docCount++;
  for (const name of repoNames) {
    if (text.includes(name)) { addEdge(id, name, 'reuses', { as: 'mentions' }); mentionEdges++; }
  }
  for (const m of text.matchAll(/\[\[([a-z0-9-]+)\]\]/g)) {
    const other = 'memory:' + m[1];
    addEdge(id, other, 'kin', { as: 'wiki-link' });
    addEdge(other, id, 'kin', { as: 'wiki-link' });
    linkEdges++;
  }
}

// ── 3 · CC chats: EVERY project dir, WHOLE files — the reasoning history as graph.
//        Mention frequency becomes edge weight: a repo named forty times in a session is a
//        stronger associate than one named once. Files are read in 1MB windows so a 100MB
//        session neither loads whole nor gets skipped.
let chatCount = 0, chatEdges = 0;
for (const dir of CHAT_DIRS) {
  let files = [];
  try { files = readdirSync(dir).filter(f => f.endsWith('.jsonl')); } catch { continue; }
  for (const f of files) {
    const path = join(dir, f);
    let size = 0;
    try { size = statSync(path).size; } catch { continue; }
    if (size < 10000) continue;                            // an empty session teaches nothing
    const counts = new Map();
    const fd = openSync(path, 'r');
    const buf = Buffer.alloc(1 << 20);
    for (let off = 0; off < size; off += buf.length) {
      const n = readSync(fd, buf, 0, buf.length, off);
      if (n <= 0) break;
      const win = buf.toString('utf8', 0, n);
      for (const name of repoNames) {
        let i = -1, c = 0;
        while ((i = win.indexOf(name, i + 1)) !== -1) c++;
        if (c) counts.set(name, (counts.get(name) || 0) + c);
      }
    }
    closeSync(fd);
    if (!counts.size) continue;                            // a session that names no repo teaches no edges
    const id = 'chat:' + basename(f, '.jsonl').slice(0, 12);
    addNode(id, 'chat', { src: 'cc-chats', file: f, project: basename(dir) });
    chatCount++;
    for (const [name, c] of counts) {
      addEdge(id, name, 'reuses', { as: 'discussed', mentions: c }, Math.min(1, 0.4 + c * 0.05));
      chatEdges++;
    }
  }
}

// ── 4 · fallworld's own map: rooms as places, the wing that holds each, evidence tiers ──
let roomEdges = 0;
try {
  const FW = 'C:/Users/sjgan/Downloads/fw-check';
  const world = JSON.parse(readFileSync(join(FW, 'world.json'), 'utf8'));
  for (const a of (Array.isArray(world.apps) ? world.apps : world.catalogue || [])) {
    if (!a || typeof a.id !== 'string') continue;
    if (nodes.has(a.id)) {
      const n = nodes.get(a.id);
      if (a.tier) n.meta.tier = a.tier;                    // the earned rank rides on the node
    }
  }
  const rooms = JSON.parse(readFileSync(join(FW, 'rooms.json'), 'utf8'));
  for (const w of (Array.isArray(rooms.wings) ? rooms.wings : [])) {
    const wid = 'wing:' + String(w.name || w.id || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    addNode(wid, 'wing', { src: 'fallworld', name: w.name || w.id });
    for (const r of (Array.isArray(w.rooms) ? w.rooms : [])) {
      const target = String(r.u || r.url || '').match(/github\.io\/([a-z0-9-]+)/);
      if (target && nodes.has(target[1])) { addEdge(wid, target[1], 'contains', { room: r.n || r.name || '' }); roomEdges++; }
    }
  }
} catch { /* no fallworld checkout is a thinner DNA, not a failure */ }

// ── write, locally only ──
mkdirSync(OUT_DIR, { recursive: true });
const dna = {
  v: 1,
  note: 'READ-ONLY seed DNA — a graph the fan associates over. Not weights, not a fine-tune. LOCAL-ONLY: contains private repo names and chat references.',
  generated: new Date().toISOString(),
  nodes: [...nodes.values()],
  edges,
};
writeFileSync(join(OUT_DIR, 'dna.json'), JSON.stringify(dna, null, 1));
console.log(`seed DNA written → local-dna/dna.json`);
console.log(`  ${repoCount} repos · ${docCount} memory docs · ${chatCount} chats`);
console.log(`  ${edges.length} edges (${kinPairs} topic-kin pairs, ${mentionEdges} doc-mentions, ${linkEdges} wiki-links, ${chatEdges} chat-mentions)`);
console.log(`  ${skippedTopics} hub topics skipped (over 12 members — categories, not kinships) — said, not silent`);
console.log(`  ${roomEdges} fallworld room edges — the world's own map, as DNA`);
