#!/usr/bin/env node
// si-didy-loop · scripts/brief.mjs — write the morning brief from the night's real files.
// LOCAL-ONLY: the brief carries queue preps and private names; it lives in local-dna and is
// never published. Open it any morning: local-dna/morning-brief.html

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { distill, renderBrief } from '../brief.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DNA = join(here, '..', 'local-dna');
const readJson = (f) => existsSync(join(DNA, f)) ? JSON.parse(readFileSync(join(DNA, f), 'utf8')) : null;

const brief = distill({
  state: readJson('operator-state.json'),
  queue: readJson('operator-queue.json'),
  outbox: readJson('outbox.json'),
  railConfig: readJson('rail-config.json'),
  railHistory: readJson('rail-history.json'),
  progress: readJson('course-progress.json'),
}, Date.now());

const out = join(DNA, 'morning-brief.html');
writeFileSync(out, renderBrief(brief));
console.log(`morning brief → ${out}`);
console.log(`  → ${brief.firstAction.what}`);
console.log(`  overnight: ${brief.builds.length} build(s) · ${brief.doors.length} door(s) waiting · rail ${brief.rail.up ? 'up' : 'down'} · outbox ${brief.outboxWaiting}`);
