#!/usr/bin/env node
// lessonsfold-cli.mjs — the runner. Reads the sandbox's real shares.json, folds it through
// the gated kernel, writes local-dna/lessons-ledger.json. Never reads or writes anything
// the kernel doesn't already return — the kernel judges, this just wires files (same split
// as deepen.mjs/deepen-run.mjs elsewhere in this repo).
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { foldLessons } from '../lessonsfold.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHARES = join(homedir(), '.si-didy', 'sandbox', 'shares.json');
const OUT = join(HERE, '..', 'local-dna', 'lessons-ledger.json');

const minCount = Number(process.argv.find((a) => a.startsWith('--min='))?.split('=')[1] ?? 2);

let shares;
try { shares = JSON.parse(readFileSync(SHARES, 'utf8')); }
catch (e) { console.error('could not read ' + SHARES + ': ' + e.message); process.exit(1); }

const r = foldLessons(shares, { minCount });
if (!r.ok) { console.error('foldLessons refused: ' + r.why); process.exit(1); }

const out = {
  kind: 'kar-lessons-ledger',
  generatedAt: new Date().toISOString(),
  source: SHARES,
  minCount,
  totalShares: Array.isArray(shares) ? shares.length : 0,
  recurringCount: r.lessons.length,
  lessons: r.lessons,
};
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log('wrote ' + OUT + ' — ' + r.lessons.length + ' recurring lesson(s) out of ' + out.totalShares + ' total shares');
for (const l of r.lessons.slice(0, 15)) console.log('  ' + String(l.count).padStart(2) + '×  ' + l.title);
