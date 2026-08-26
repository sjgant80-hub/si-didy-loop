#!/usr/bin/env node
// scripts/twelve-crawl-cli.mjs — thin I/O shell over twelve-crawl.mjs (the gated law stays pure).
// Sweeps the WHOLE estate index (never a subset), writes local-dna/twelve-crawl.json, says one line.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crawlEstate } from './twelve-crawl.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const N = JSON.parse(readFileSync('C:/Users/sjgan/.claude/projects/C--Users-sjgan--claude/memory/estate-index.json', 'utf8')).nodes;
const W = JSON.parse(readFileSync('C:/Users/sjgan/Downloads/fw-check/world.json', 'utf8')).items;
const byName = {}; for (const i of W) if (i && i.name) byName[i.name] = i;
const r = crawlEstate(N, byName, Date.now());
if (!r.ok) { console.error('REFUSED: ' + r.why); process.exit(1); }
writeFileSync(join(here, '..', 'local-dna', 'twelve-crawl.json'), JSON.stringify(r, null, 1));
console.log(`twelve-powers crawl: ${r.swept} swept · ${r.sellable.length} ready-to-sell · ${r.nearlyCount} nearly · ${r.darkCount} dark · ${r.staleCount} stale`);
