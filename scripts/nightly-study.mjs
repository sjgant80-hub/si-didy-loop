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

// the operator works its shift: three sweeps a night, every stream's AUTO layer, bounded by
// construction — threshold doors queue unsigned and NOTHING crosses them while the key-holder
// sleeps. The sweeps run BEFORE the dream and the export so the mind wakes up carrying what
// the operator built.
const sweeps = [];
for (let i = 0; i < 3; i++) {
  const s = run('operate.mjs', ['--sweep']);
  sweeps.push(s.ok ? (s.out.trim().split('\n').filter(l => /swept |compose /.test(l)).join('\n') || s.out.trim().slice(-200)) : 'SWEEP FAILED:\n' + s.out.trim());
  if (!s.ok) break;
}

const dream = run('deepen-run.mjs', ['--dream']);

// the sanctioned rail: measure yesterday's posts (the learn half), then post the next graded
// draft the window allows. Posting is AUTO (the 2026-08-19 correction); until the one-time
// rail setup both steps refuse loudly and the night continues — posts wait for the RAIL,
// never for a signature.
const measure = run('rail.mjs', ['--measure']);
const posted = run('rail.mjs', ['--post-next']);

// the course never closes: one drill per night keeps every mastery warm and, once complete,
// each night's drill IS an S6 expansion — a new proposal from the dream shadow, for the
// key-holder's morning. Expansion proposes; the human disposes.
const course = run('train.mjs', ['--all']);

const mind = run('export-mind.mjs');

// the last word of every night: one page for the morning, ending in ONE first action
const brief = run('brief.mjs');

const line = [
  `── ${stamp}`,
  seed.ok ? seed.out.trim() : 'SEED FAILED:\n' + seed.out.trim(),
  study.ok ? study.out.trim() : 'STUDY FAILED:\n' + study.out.trim(),
  ...sweeps,
  dream.ok ? dream.out.split('\n')[0] : 'DREAM FAILED',
  measure.out.trim().split('\n').slice(-2).join('\n'),
  posted.out.trim().split('\n').slice(-1)[0],
  course.ok ? course.out.trim().split('\n').filter(l => /MASTERED|not yet|proposed|now in front/.test(l)).join('\n') : 'COURSE DRILL FAILED',
  mind.ok ? mind.out.trim() : 'MIND EXPORT FAILED',
  brief.ok ? brief.out.trim() : 'BRIEF FAILED',
  '',
].join('\n');
appendFileSync(LOG, line + '\n');
console.log(line);
process.exit(seed.ok && study.ok ? 0 : 1);
