#!/usr/bin/env node
// si-didy-loop · scripts/nightly-study.mjs — the nightly ritual: re-seed the DNA, study it all.
//
// Run by the Windows scheduled task "sididy-nightly-study" (and runnable by hand any time).
// Everything stays on this machine; the only output is the overlay, the shadow, and a log line
// per night in local-dna/study-log.txt so any morning can be inspected.

import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const LOG = join(here, '..', 'local-dna', 'study-log.txt');
mkdirSync(join(here, '..', 'local-dna'), { recursive: true });

const run = (script, args = []) => {
  const r = spawnSync(process.execPath, [join(here, script), ...args], { encoding: 'utf8', timeout: 30 * 60 * 1000 });
  return { out: (r.stdout || '') + (r.stderr || ''), ok: r.status === 0 };
};

const stamp = new Date().toISOString();
const seed = run('seed-dna.mjs');
const study = run('study.mjs', ['--all']);
const dream = run('deepen-run.mjs', ['--dream']);

const line = [
  `── ${stamp}`,
  seed.ok ? seed.out.trim() : 'SEED FAILED:\n' + seed.out.trim(),
  study.ok ? study.out.trim() : 'STUDY FAILED:\n' + study.out.trim(),
  dream.ok ? dream.out.split('\n')[0] : 'DREAM FAILED',
  '',
].join('\n');
appendFileSync(LOG, line + '\n');
console.log(line);
process.exit(seed.ok && study.ok ? 0 : 1);
