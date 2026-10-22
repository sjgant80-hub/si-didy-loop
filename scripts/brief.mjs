#!/usr/bin/env node
// si-didy-loop · scripts/brief.mjs — write the morning brief from the night's real files.
// LOCAL-ONLY: the brief carries queue preps and private names; it lives in local-dna and is
// never published. Open it any morning: local-dna/morning-brief.html

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { distill, renderBrief } from '../brief.mjs';
import { sayRoute } from '../plainsay.mjs';
import { loadLook } from './look.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DNA = join(here, '..', 'local-dna');
const readJson = (f) => existsSync(join(DNA, f)) ? JSON.parse(readFileSync(join(DNA, f), 'utf8')) : null;

// what the last dream held, said from the route it walked: the day's own finds first, most specific first — and spread,
// one per arrival, one per middle step, two at most from any one start, so five lines are five different things
const { look, shadow } = loadLook();
const lastAt = shadow.map(w => String(w?.at || '')).sort().at(-1) || '';
const seen = new Set(), perRoot = new Map();
const dreamt = shadow.filter(w => w && String(w.at || '') === lastAt && Array.isArray(w.path) && w.path.length)
  .sort((a, b) => (b.fresh === true) - (a.fresh === true) || (b.worth || 0) - (a.worth || 0) || (b.norm || 0) - (a.norm || 0))
  .filter(w => {
    const via = 'via ' + w.root + ' ' + (w.path[0]?.to || '');
    if (seen.has(w.node) || seen.has(via) || (perRoot.get(w.root) || 0) >= 2) return false;
    seen.add(w.node); seen.add(via); perRoot.set(w.root, (perRoot.get(w.root) || 0) + 1);
    return true;
  })
  .map(w => sayRoute(w, look)).filter(r => r.ok).map(r => (r.fresh ? 'from today: ' : '') + r.said).slice(0, 5);

const brief = distill({
  dreamt,
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
