#!/usr/bin/env node
// night-trace-cli.mjs — one real night, traced for the page's HOW IT WORKS: what the sandbox did with one dream,
// step by step, plus what the share door did across the sealed week (window B of CLAIMS-dream-week.md).
// A description, not a measured claim. Kinds, titles, and a gate's verdict words only — never a dream's, a
// render's or a note's text. Reads the private ledger and the shares log; writes receipts/night-trace.json.
//   node scripts/night-trace-cli.mjs [--ledger <path>] [--shares <path>]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const SANDBOX = join(homedir(), '.si-didy', 'sandbox');
const LEDGER = arg('--ledger', join(SANDBOX, 'ledger.json'));
const SHARES = arg('--shares', join(SANDBOX, 'shares.json'));
const OUT = join(HERE, '..', 'receipts', 'night-trace.json');
const B = { from: '2026-10-28T12:00:00Z', to: '2026-11-04T12:00:00Z' };
const inB = (ts) => typeof ts === 'string' && ts > B.from && ts <= B.to;

const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));
const shares = JSON.parse(readFileSync(SHARES, 'utf8'));

// the dream sequences of window B, in ledger order (a dream and everything up to the next dream)
const seqs = [];
let cur = null;
for (const e of ledger) {
  if (!e || typeof e !== 'object') continue;
  if (e.kind === 'dream') { if (cur) seqs.push(cur); cur = inB(e.ts) ? [e] : null; continue; }
  if (cur) cur.push(e);
}
if (cur) seqs.push(cur);

// a gate's verdict, in its own words: "tests failed (round n)" or the witness numbers it recorded
const verdictOf = (d) => {
  if (typeof d !== 'string') return '';
  const w = d.match(/^\{"clean":(true|false),"killed":(\d+),"total":(\d+)\} \(round (\d+)\)/);
  if (w) return (w[1] === 'true' ? 'clean' : 'not clean') + ' — ' + w[2] + ' of ' + w[3] + ' mutants caught (round ' + w[4] + ')';
  const f = d.match(/^tests failed \(round (\d+)\)/);
  return f ? 'its own tests failed (round ' + f[1] + ')' : 'recorded';
};
const step = (e) => ({ kind: e.kind, title: e.title, ...(e.kind === 'gate' ? { verdict: verdictOf(e.detail) } : {}) });

// the traced night: the last sequence of the week that went all the way — rendered, gated, noted, met the door
const full = seqs.filter((s) => s.some((e) => e.kind === 'render') && s.some((e) => e.kind === 'gate')
  && s.some((e) => e.kind === 'note' && /^share shut at the door:/.test(e.title)));
const traced = full[full.length - 1] || [];

const noteKinds = {};
for (const s of seqs) for (const e of s) if (e.kind === 'note') {
  const k = /^share shut at the door:/.test(e.title) ? 'share shut at the door' : /^no render:/.test(e.title) ? 'no render'
    : /^failure noted:/.test(e.title) ? 'failure noted' : /^learned:/.test(e.title) ? 'learned' : 'other';
  noteKinds[k] = (noteKinds[k] || 0) + 1;
}
const opened = Array.isArray(shares) ? shares.filter((s) => s && inB(s.at)) : [];

const receipt = {
  kind: 'si-didy-loop/night-trace',
  about: 'a description of real nights (window B of CLAIMS-dream-week.md), not a measured claim; kinds, titles and gate verdict words only',
  tracedAt: new Date().toISOString(),
  window: B,
  dreams: seqs.length,
  traced: { at: traced[0] ? traced[0].ts : null, steps: traced.map(step) },
  notes: noteKinds,
  shareDoor: { shut: noteKinds['share shut at the door'] || 0, opened: opened.length, openedStamped: opened.filter((s) => typeof s.at === 'string').length },
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(receipt, null, 2) + '\n');
console.log('wrote ' + OUT);
console.log(JSON.stringify(receipt, null, 1));
