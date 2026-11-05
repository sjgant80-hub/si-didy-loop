#!/usr/bin/env node
// dreamweek-cli.mjs — the runner for the dream fold's one-week check (CLAIMS-dream-week.md, sealed first).
// Reads the resident's private sandbox ledger, hands it to the gated kernels (dreamweek.mjs, lessonsfold.mjs)
// and writes receipts/dream-week.json: counts, verdicts and the top-5 dream titles only — never a dream's or a
// render's text. The windows and the family are the sealed ones; this file only wires the file to the kernel.
//   node scripts/dreamweek-cli.mjs [--ledger <path>]     (default ~/.si-didy/sandbox/ledger.json)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { windowCounts, verdict } from '../dreamweek.mjs';
import { foldDreams } from '../lessonsfold.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const at = process.argv.indexOf('--ledger');
const LEDGER = at > 0 ? process.argv[at + 1] : join(homedir(), '.si-didy', 'sandbox', 'ledger.json');
const OUT = join(HERE, '..', 'receipts', 'dream-week.json');

// the sealed windows (CLAIMS-dream-week.md)
const A = { from: '2026-10-14T12:00:00Z', to: '2026-10-28T12:00:00Z' };
const B = { from: '2026-10-28T12:00:00Z', to: '2026-11-04T12:00:00Z' };
const BPLUS = { from: '2026-10-28T12:00:00Z', to: '2026-11-05T12:00:00Z' };
const FAMILY = 'PathFinder';

let bytes, ledger;
try { bytes = readFileSync(LEDGER); ledger = JSON.parse(bytes.toString('utf8')); }
catch (e) { console.error('could not read ' + LEDGER + ': ' + e.message); process.exit(1); }

const a = windowCounts(ledger, { ...A, family: FAMILY });
const b = windowCounts(ledger, { ...B, family: FAMILY });
const bp = windowCounts(ledger, { ...BPLUS, family: FAMILY });
for (const w of [a, b, bp]) if (!w.ok) { console.error('windowCounts refused: ' + w.why); process.exit(1); }
const v = verdict(a, b);

// the prompt's list, as the night builds it (14 nights, at least twice, top 5), at the check date —
// with the fold as it shipped on 2026-10-28 (exact spelling, punctuation-insensitive) and as fixed now
const oldKey = (t) => (typeof t === 'string' ? t.replace(/\(revision \d+\)/gi, '').toLowerCase().replace(/[^a-z0-9]/g, '') : '');
function oldFold(rows, now) {
  const end = Date.parse(now), start = end - 14 * 86400000, by = new Map();
  for (const e of rows) {
    if (!e || e.kind !== 'dream' || typeof e.ts !== 'string') continue;
    const t = Date.parse(e.ts);
    if (!(t > start && t <= end)) continue;
    const k = oldKey(e.title);
    if (!k) continue;
    const x = by.get(k) || { title: '', count: 0, lastAt: '' };
    x.count += 1;
    if (e.ts >= x.lastAt) { x.lastAt = e.ts; x.title = e.title.replace(/\(revision \d+\)/gi, '').trim(); }
    by.set(k, x);
  }
  return [...by.values()].filter((x) => x.count >= 2).sort((p, q) => (q.count - p.count) || p.title.localeCompare(q.title));
}
const fixed = foldDreams(ledger, { now: BPLUS.to, days: 14, minCount: 2 });
const strip = (l) => ({ title: l.title, count: l.count });

const counts = (w) => ({ from: w.from, to: w.to, dreams: w.dreams, becameCode: w.becameCode, renderRate: w.renderRate,
  passedGate: w.passedGate, passedRate: w.passedRate, pathFinderFamily: w.familyDreams, pathFinderShare: w.familyShare });
const receipt = {
  kind: 'si-didy-loop/dream-week',
  claims: 'CLAIMS-dream-week.md',
  measuredAt: new Date().toISOString(),
  ledger: { entries: Array.isArray(ledger) ? ledger.length : 0, sha256: createHash('sha256').update(bytes).digest('hex'),
    note: 'the private sandbox ledger; only counts and titles leave it' },
  windows: { A: counts(a), B: counts(b), Bplus: counts(bp) },
  verdict: { W1: v.W1, W2: v.W2, W3: 'reported, no bar' },
  promptList: { at: BPLUS.to, asShipped: oldFold(ledger, BPLUS.to).slice(0, 5).map(strip), familyFolded: fixed.ok ? fixed.lessons.slice(0, 5).map(strip) : [] },
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(receipt, null, 2) + '\n');
console.log('wrote ' + OUT);
console.log(JSON.stringify({ windows: receipt.windows, verdict: receipt.verdict, promptList: receipt.promptList }, null, 1));
