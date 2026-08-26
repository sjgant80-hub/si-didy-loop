#!/usr/bin/env node
// scripts/seam-cli.mjs — the thin I/O shell over seam.mjs (the gated law stays pure).
//   node scripts/seam-cli.mjs   → measure the real queue + lit-surface ledger, say the verdict
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seamFlux } from './seam.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const Q = join(here, '..', 'local-dna', 'operator-queue.json');
const X = join(here, '..', 'local-dna', 'executions.json');
const queue = existsSync(Q) ? JSON.parse(readFileSync(Q, 'utf8')) : {};
const execs = existsSync(X) ? JSON.parse(readFileSync(X, 'utf8')).executions || [] : [];
const r = seamFlux(Array.isArray(queue) ? queue : queue.items || [], execs);
if (!r.ok) { console.error('REFUSED: ' + r.why); process.exit(1); }
console.log(`seam: ${r.prepared} prepared · ${r.approved} approved · ${r.rejected} rejected · ${r.queued} still queued`);
console.log(`      decided ${r.decided} · executed ${r.executed} · RISEN ${r.risen}  (κ-band 0.618–0.687)`);
console.log(`      ${r.verdict}`);
