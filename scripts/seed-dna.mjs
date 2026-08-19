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
const CHAT_DIR = process.argv.includes('--chats')
  ? process.argv[process.argv.indexOf('--chats') + 1]
  : 'C:/Users/sjgan/.claude/projects/C--Users-sjgan--claude';

const nodes = new Map();   // id -> { id, type, meta }
const edges = [];          // { from, to, type, weight, meta }
const edgeSeen = new Set();
const addNode = (id, type, meta) => { if (!nodes.has(id)) nodes.set(id, { id, type, meta }); };
const addEdge = (from, to, type, meta = {}) => {
  const k = `${from} ${type} ${to}`;
  if (edgeSeen.has(k)) return;
  edgeSeen.add(k);
  edges.push({ from, to, type, weight: 1, meta });
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

// ── 3 · CC chats: each session file is one chat-node, edged to the repos it mentions ──
let chatCount = 0, chatEdges = 0;
try {
  for (const f of readdirSync(CHAT_DIR)) {
    if (!f.endsWith('.jsonl')) continue;
    const path = join(CHAT_DIR, f);
    if (statSync(path).size < 10000) continue;            // an empty session teaches nothing
    const fd = openSync(path, 'r');
    const buf = Buffer.alloc(200000);
    const n = readSync(fd, buf, 0, buf.length, 0);
    closeSync(fd);
    const head = buf.toString('utf8', 0, n);
    const id = 'chat:' + basename(f, '.jsonl').slice(0, 12);
    addNode(id, 'chat', { src: 'cc-chats', file: f });
    chatCount++;
    for (const name of repoNames) {
      if (head.includes(name)) { addEdge(id, name, 'reuses', { as: 'discussed' }); chatEdges++; }
    }
  }
} catch { /* no chat dir is a thinner DNA, not a failure */ }

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
