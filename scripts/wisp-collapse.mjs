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
import { request, get } from 'node:http';
import { freemem } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { specFromProposal, specFromGap, redactSpec, promptFor, extractCode, TEMPLATES } from '../wispwire.mjs';

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

// THE WIRE TO THE WISP, over node:http and STREAMED. Found 2026-10-22, three ways a slow laptop read as a dead wisp:
// the 14B and the 7B sat in memory together (14.4GB of 15.7GB, no GPU) and the 7B crawled at 1.3 tokens a second;
// both hit a fixed 240s/120s clock while still answering; and fetch gives up on its own when no reply has started in
// 300s, which is how long the 14B takes to load here, and calls that "fetch failed". So: it waits while tokens keep
// coming (firstMs for the load and the prompt, stallMs between tokens, capMs in all); keep_alive 0 unloads the model
// the moment it has answered; and it says which way it failed.
function post(path, body, onLine, { firstMs, stallMs, capMs }) {
  const url = OLLAMA + path;
  if (!url.startsWith(OLLAMA)) return Promise.reject(new Error('unreachable'));   // the reach rule, stated where it binds
  return new Promise((resolve, reject) => {
    let lines = 0, buf = '', timer = null, cap = null, settled = false, req = null;
    const done = (err, v) => {
      if (settled) return;
      settled = true; clearTimeout(timer); clearTimeout(cap);
      if (req) req.destroy();
      if (err) reject(err); else resolve(v);
    };
    const arm = () => {
      clearTimeout(timer);
      const wait = lines ? stallMs : firstMs;
      timer = setTimeout(() => done(new Error(lines ? `stalled: nothing for ${wait / 1000}s after ${lines} tokens` : `no first token in ${wait / 1000}s (loading the model and reading the prompt)`)), wait);
    };
    cap = setTimeout(() => done(new Error(`still going at the ${capMs / 1000}s cap (${lines} tokens)`)), capMs);
    req = request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
      if (res.statusCode !== 200) { done(new Error('HTTP ' + res.statusCode)); return; }
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buf += chunk;
        for (let nl; (nl = buf.indexOf('\n')) >= 0;) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let j;
          try { j = JSON.parse(line); } catch { continue; }
          if (j.error) { done(new Error(String(j.error))); return; }
          lines += 1;
          arm();
          if (onLine(j)) { done(null, lines); return; }
        }
      });
      res.on('end', () => done(null, lines));
    });
    req.on('error', (e) => done(new Error(e.code === 'ECONNREFUSED' ? `Ollama is not reachable at ${OLLAMA}` : e.message)));
    arm();
    req.end(JSON.stringify(body));
  });
}
const getJson = (path) => new Promise((resolve) => {
  const url = OLLAMA + path;
  if (!url.startsWith(OLLAMA)) { resolve(null); return; }
  const req = get(url, (res) => {
    let s = '';
    res.setEncoding('utf8');
    res.on('data', (c) => { s += c; });
    res.on('end', () => { try { resolve(JSON.parse(s)); } catch { resolve(null); } });
  });
  req.on('error', () => resolve(null));
  req.setTimeout(15000, () => { req.destroy(); resolve(null); });
});
async function ollama(model, prompt, wait) {
  let text = '';
  const tokens = await post('api/generate', { model, prompt, stream: true, keep_alive: 0, options: { temperature: 0, num_predict: 500 } },
    (j) => { text += j.response || ''; return j.done === true; }, wait);
  return { text, tokens };
}
// a wisp that failed is put out of memory before the next one loads: two models at once is what starved the night
const unload = (model) => post('api/generate', { model, keep_alive: 0 }, () => true, { firstMs: 30000, stallMs: 30000, capMs: 60000 }).catch(() => {});
const gb = (n) => (n / 1e9).toFixed(1);
const WISPS = [
  ['qwen2.5:14b', { firstMs: 600000, stallMs: 90000, capMs: 1200000 }],
  ['qwen2.5:7b', { firstMs: 240000, stallMs: 60000, capMs: 600000 }],
];

if (args[0] === '--fill') {
  // gap-fill: hold a template's exam directly — the ground is a remembered estate defect
  const fn = args[1];
  const ground = args.slice(2).join(' ');
  const s = specFromGap(fn, ground);
  if (!s.ok) {
    console.error(s.why);
    console.error('templates carried: ' + TEMPLATES.map(t => t.fn).join(', '));
    process.exit(1);
  }
  const d = estate.define(field, s.spec);
  saveField();
  console.log(`◇ held: ${s.why}${d.built ? ' (already built — content-addressed)' : ''}`);
  process.exit(0);
}

// the exam with the FEWEST failed sittings goes next (field order breaks a tie): found 2026-10-22, the first un-built
// spec was re-sat every night (splitDeposit, "attempt 5" for a week) and the other forty never got a turn.
const failsOf = (id) => field.log.filter(l => l.id === id && (l.ev === 'discarded' || l.ev === 'screened-out')).length;

async function collapseNext() {
  const open = estate.possibilities(field).filter(s => !estate.isBuilt(field, s.id));
  if (!open.length) { console.log('nothing un-collapsed in the field — seed first, or every possibility already stands.'); return 0; }
  const next = open.reduce((best, s) => failsOf(s.id) < failsOf(best.id) ? s : best);
  const priorFails = failsOf(next.id);
  console.log(`collapsing: ${next.name}${priorFails ? ` (attempt ${priorFails + 1} — the prompt sharpens)` : ''} · ${open.length} still possibility\n  ${next.description.slice(0, 110)}…`);
  const prompt = promptFor(redactSpec(next), priorFails);

  const tags = await getJson('api/tags');
  if (!tags) { console.log('STOP: no local wisp answered — Ollama is not up. Bring it up; this file has no cloud fallthrough, by construction.'); return 1; }
  let raw = null, wispName = '';
  for (const [model, wait] of WISPS) {
    // a model that cannot fit in what is free would page to disk and crawl (the 14B needs ~10GB; this laptop has 15.7GB
    // in all and the day's windows hold half of it) — measured each night and said, never loaded blind
    const size = (Array.isArray(tags.models) ? tags.models : []).find(m => m && m.name === model)?.size;
    const resident = ((await getJson('api/ps'))?.models || []).some(m => m && m.name === model);
    if (!size) { console.log(`  ${model} is not pulled on this machine — skipped`); continue; }
    if (!resident && freemem() < size * 1.15) { console.log(`  ${model} skipped: it needs ~${gb(size * 1.15)}GB of memory and ${gb(freemem())}GB is free — loaded now it would page to disk and crawl`); continue; }
    const t0 = Date.now();
    try { const a = await ollama(model, prompt, wait); raw = a.text; wispName = model; console.log(`  ${model} answered: ${a.tokens} tokens in ${Math.round((Date.now() - t0) / 1000)}s`); break; }
    catch (e) {
      console.log(`  ${model} did not answer (${e.message}) — ${model === WISPS[0][0] ? 'trying the smaller wisp' : 'no wisp left'}`);
      await unload(model);
    }
  }
  if (raw === null) {
    console.log('STOP: Ollama is up but no wisp finished an answer (see above) — the exam waits for another night; no cloud fallthrough, by construction.');
    return 1;
  }
  // every answer is kept, so a refused one can be read in the morning instead of guessed at
  mkdirSync(join(DNA, 'wisp-answers'), { recursive: true });
  writeFileSync(join(DNA, 'wisp-answers', `${next.name}.${Date.now()}.${wispName.replace(/[^a-z0-9.]+/gi, '-')}.txt`), raw);

  const screened = extractCode(raw, next.name);
  if (!screened.ok) {
    field.log.unshift({ id: next.id, ev: 'screened-out', ts: Date.now() });
    saveField();
    console.log(`  ✗ ${screened.why} — the spec stays possibility.`);
    return 0;
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
  return 0;
}

// after a fetch the process ENDS by itself (exitCode), never by process.exit: on Windows, Node 25 aborts with a libuv
// assertion (UV_HANDLE_CLOSING) when process.exit lands while a socket is still closing
if (args[0] === '--collapse') {
  // `--collapse N` sits up to N exams (at most 13) inside a 20-minute budget, so the night's own 30-minute limit never
  // cuts one off half-written: one exam a night left forty possibilities waiting a month and more
  const n = Math.min(13, Math.max(1, Number.parseInt(args[1], 10) || 1));
  const t0 = Date.now();
  let code = 0, sat = 0;
  while (sat < n && Date.now() - t0 < 20 * 60 * 1000) {
    sat += 1;
    code = await collapseNext();
    if (code !== 0) break;                      // no wisp answered: a second ask tonight would only fail the same way
    if (!estate.possibilities(field).some(s => !estate.isBuilt(field, s.id))) break;   // every possibility stands
  }
  const r = estate.ratio(field);
  console.log(`sat ${sat} exam(s) in ${Math.round((Date.now() - t0) / 1000)}s · the field: ${r.possibilities} possibilities · ${r.built} built · ${(r.actualFraction * 100).toFixed(0)}% actual`);
  process.exitCode = code;
} else {
  const r = estate.ratio(field);
  console.log(`the field: ${r.possibilities} possibilities · ${r.built} built · potential ${r.potential} · ${(r.actualFraction * 100).toFixed(0)}% actual`);
  for (const s of estate.possibilities(field)) console.log(`  ${estate.isBuilt(field, s.id) ? '●' : '◇'} ${s.name} — ${s.description.slice(0, 80)}…`);
  for (const l of field.log.slice(0, 5)) console.log(`  log: ${l.ev} ${l.id.slice(0, 8)}`);
}
