#!/usr/bin/env node
// si-didy-loop · scripts/wisp-collapse.mjs — the wisp wire, running: S6 proposals become held
// specs; the LOCAL model is the wisp; only a verified collapse stands.
//
//   node scripts/wisp-collapse.mjs --seed        turn fresh S6 proposals into held possibilities
//   node scripts/wisp-collapse.mjs --collapse    collapse the next possibility via the local wisp
//   node scripts/wisp-collapse.mjs --status      the field: held · built · the ratio
//
// SOVEREIGN-FIRST, enforced: the wisp is Ollama on this machine (literal-prefix reach to
// http://localhost:11434/ and nowhere else). If local is down this STOPS LOUDLY — there is no
// cloud fallthrough in this file, by construction. The exam stays sealed (the model sees the
// redacted spec only), the screen runs before the gate, and a failed collapse is discarded —
// the spec stays possibility, and the log says so.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { specFromProposal, redactSpec, promptFor, extractCode } from '../wispwire.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DNA = join(here, '..', 'local-dna');
const FIELD_F = join(DNA, 'possibility-field.json');
const PROGRESS_F = join(DNA, 'course-progress.json');
const OLLAMA = 'http://localhost:11434/';

const GEN_DIR = join(here, '..', '..', 'generative-estate');
if (!existsSync(join(GEN_DIR, 'estate.mjs'))) {
  console.error('STOP: generative-estate is not checked out next door (' + GEN_DIR + ').');
  console.error('The wire holds specs in ITS gated field kernel — clone it beside si-didy-loop first.');
  process.exit(1);
}
const estate = await import(pathToFileURL(join(GEN_DIR, 'estate.mjs')).href);

const readJson = (f, fb) => existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : fb;
const field = estate.importField(readJson(FIELD_F, null)) || estate.newField();
const saveField = () => writeFileSync(FIELD_F, estate.exportField(field));

// parse an S6 evidence line back into {move, grounds}: the move is the quoted clause, the
// grounds are the named things inside it — a proposal that cannot name its parts does not seed
function proposalFrom(evidence) {
  const m = str(evidence).match(/"([^"]{15,})"/);
  if (!m) return null;
  const move = m[1];
  const g = move.match(/^(\S+) bundled with (\S+) .* runs (\S+)$/);
  const grounds = g ? [g[1], g[2], g[3]] : move.split(/[^a-zA-Z0-9:_-]+/).filter(w => w.length >= 5).slice(0, 4);
  return { move, grounds };
}
const str = (v) => typeof v === 'string' ? v : '';

const args = process.argv.slice(2);

if (args[0] === '--seed') {
  const attempts = (readJson(PROGRESS_F, {}).attempts || []).filter(a => a && a.stage === 'S6' && str(a.evidence));
  let held = 0, refused = 0;
  for (const a of attempts) {
    const p = proposalFrom(a.evidence);
    const s = p ? specFromProposal(p) : { ok: false, why: 'the evidence carries no quotable move' };
    if (!s.ok) { refused += 1; continue; }
    const d = estate.define(field, s.spec);
    if (d.ok && !d.built) { held += 1; console.log(`  ◇ held: ${s.why}`); }
  }
  saveField();
  const r = estate.ratio(field);
  console.log(`seeded from ${attempts.length} S6 proposal(s): ${held} newly held · ${refused} refused (thin or unquotable)`);
  console.log(`the field: ${r.possibilities} possibilities · ${r.built} built · ${(r.actualFraction * 100).toFixed(0)}% actual`);
  process.exit(0);
}

async function ollama(model, prompt, timeoutMs) {
  const url = OLLAMA + 'api/generate';
  if (!url.startsWith(OLLAMA)) throw new Error('unreachable');   // the reach rule, stated where it binds
  const res = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0, num_predict: 500 } }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return (await res.json()).response;
}

if (args[0] === '--collapse') {
  const next = estate.possibilities(field).find(s => !estate.isBuilt(field, s.id));
  if (!next) { console.log('nothing un-collapsed in the field — seed first, or every possibility already stands.'); process.exit(0); }
  const priorFails = field.log.filter(l => l.id === next.id && (l.ev === 'discarded' || l.ev === 'screened-out')).length;
  console.log(`collapsing: ${next.name}${priorFails ? ` (attempt ${priorFails + 1} — the prompt sharpens)` : ''}\n  ${next.description.slice(0, 110)}…`);
  const prompt = promptFor(redactSpec(next), priorFails);

  let raw = null, wispName = '';
  for (const [model, timeoutMs] of [['qwen2.5:14b', 240000], ['qwen2.5:7b', 120000]]) {
    try { raw = await ollama(model, prompt, timeoutMs); wispName = model; break; }
    catch (e) { console.log(`  ${model} did not answer (${e.message}) — ${model === 'qwen2.5:14b' ? 'trying the smaller wisp' : 'no wisp left'}`); }
  }
  if (raw === null) {
    console.error('STOP: no local wisp answered. Bring up Ollama — this file has no cloud fallthrough, by construction.');
    process.exit(1);
  }

  const screened = extractCode(raw, next.name);
  if (!screened.ok) {
    field.log.unshift({ id: next.id, ev: 'screened-out', ts: Date.now() });
    saveField();
    console.log(`  ✗ ${screened.why} — the spec stays possibility.`);
    process.exit(0);
  }
  const out = estate.collapse(field, next.id, () => screened.code, { ts: Date.now() });
  if (out.ok) {
    mkdirSync(join(DNA, 'collapsed'), { recursive: true });
    const file = join(DNA, 'collapsed', next.name + '.mjs');
    writeFileSync(file, `// collapsed by the wisp (${wispName}) · verified ${out.verify.detail} against the sealed exam\n// spec: ${next.description.replace(/\n/g, ' ')}\n${out.artifact}\nexport default ${next.name};\n`);
    saveField();
    console.log(`  ✓ STANDS — ${out.verify.detail} at the κ-gate · wisp: ${wispName}`);
    console.log(`  → ${file}`);
  } else {
    saveField();
    console.log(`  ✗ ${out.why}`);
    console.log('  the wisp will sit this exam again another night — verify-on-collapse is the whole safety.');
  }
  process.exit(0);
}

const r = estate.ratio(field);
console.log(`the field: ${r.possibilities} possibilities · ${r.built} built · potential ${r.potential} · ${(r.actualFraction * 100).toFixed(0)}% actual`);
for (const s of estate.possibilities(field)) console.log(`  ${estate.isBuilt(field, s.id) ? '●' : '◇'} ${s.name} — ${s.description.slice(0, 80)}…`);
for (const l of field.log.slice(0, 5)) console.log(`  log: ${l.ev} ${l.id.slice(0, 8)}`);
