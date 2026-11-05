#!/usr/bin/env node
// gates-check.mjs — the gate receipt the page reads, held to the runner that made it.
//
// CI runs witness on every kernel and writes each verdict to gate-out/<kernel>.json. This script reads which
// kernel is gated by which test files straight from .github/workflows/ci.yml (one source, no second list),
// counts each suite's tests with a fresh `node --test` run, and then either
//   check (default): fails unless receipts/gates.json says exactly what this run measured, row for row, or
//   --write:         writes receipts/gates.json from a run's verdicts (used on a downloaded CI artifact).
// So no number on the page can be typed in: it is the runner's, or CI goes red.
//   node scripts/gates-check.mjs <gate-out dir> <receipt> [--write]
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [outDir, receiptPath] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const WRITE = process.argv.includes('--write');
if (!outDir || !receiptPath) { console.error('usage: gates-check.mjs <gate-out dir> <receipt> [--write]'); process.exit(2); }

// every gated kernel, read from the workflow: "mutate <src> ... --test node --test <files> > gate-out/<name>.json"
const ci = readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
const rows = [];
for (const m of ci.matchAll(/mutate (\S+)\s+(.*?)--test node --test (.+?) > gate-out\/(\S+)\.json/g)) {
  const baseline = (m[2].match(/--baseline (\S+)/) || [])[1] || null;
  rows.push({ name: m[4], kernel: m[1], tests: m[3].trim().split(/\s+/), baseline });
}
if (!rows.length) { console.error('no witness step found in ci.yml'); process.exit(1); }

function testCount(files) {
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...files], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  const n = (k) => Number((r.stdout.match(new RegExp('^# ' + k + ' (\\d+)$', 'm')) || [])[1]);
  return { tests: n('tests'), pass: n('pass'), fail: n('fail') };
}

const measured = [];
const problems = [];
for (const row of rows) {
  const file = join(outDir, row.name + '.json');
  if (!existsSync(file)) { problems.push(row.name + ': no verdict in ' + outDir); continue; }
  let v;
  try { v = JSON.parse(readFileSync(file, 'utf8')); } catch { problems.push(row.name + ': the verdict did not parse'); continue; }
  const t = testCount(row.tests);
  if (!(t.tests > 0) || t.fail !== 0 || t.pass !== t.tests) problems.push(row.name + ': its suite did not pass whole (' + JSON.stringify(t) + ')');
  measured.push({ name: row.name, kernel: row.kernel, tests: row.tests, testCount: t.tests, baseline: row.baseline,
    total: v.total, killed: v.killed, ignored: (v.ignored || []).length, survived: (v.survived || []).length, clean: v.clean === true });
}
const extra = existsSync(outDir) ? readdirSync(outDir).filter((f) => f.endsWith('.json') && !rows.some((r) => r.name + '.json' === f)) : [];
for (const f of extra) problems.push(f + ': a verdict with no witness step in ci.yml');

const receiptOf = () => ({
  kind: 'si-didy-loop/gates',
  witness: 'sjgant80-hub/witness v0.6 (pinned tag), run on the GitHub runner by .github/workflows/ci.yml',
  note: 'every row is re-derived on every push by scripts/gates-check.mjs; a row that differs from the run turns CI red',
  behaviourOnly: [{ kernel: 'safejson.mjs', tests: ['safejson.test.mjs'], testCount: testCount(['safejson.test.mjs']).tests,
    why: 'no comparison or logic operator for witness to flip, so witness refuses to call it a pass; its proof is the behaviour suite on real files' }],
  kernels: measured,
  // each suite counted once (operator's gate also runs scope's suite), so a total over these is not double-counted
  testFiles: Object.fromEntries([...new Set([...rows.flatMap((r) => r.tests), 'safejson.test.mjs'])].sort().map((f) => [f, testCount([f]).tests])),
});

if (WRITE) {
  if (problems.length) { console.error('refusing to write a receipt from a run with problems:\n  ' + problems.join('\n  ')); process.exit(1); }
  writeFileSync(receiptPath, JSON.stringify(receiptOf(), null, 2) + '\n');
  console.log('wrote ' + receiptPath + ' — ' + measured.length + ' gated kernels');
  process.exit(0);
}

let receipt;
try { receipt = JSON.parse(readFileSync(receiptPath, 'utf8')); } catch { console.error('no readable receipt at ' + receiptPath); process.exit(1); }
const want = receiptOf();
const key = (r) => JSON.stringify([r.name, r.kernel, r.tests, r.testCount, r.baseline, r.total, r.killed, r.ignored, r.survived, r.clean]);
const have = new Map((receipt.kernels || []).map((r) => [r.name, r]));
for (const r of want.kernels) {
  const h = have.get(r.name);
  if (!h) problems.push(r.name + ': measured here, missing from the receipt');
  else if (key(h) !== key(r)) problems.push(r.name + ': receipt ' + key(h) + ' but this run ' + key(r));
  have.delete(r.name);
}
for (const n of have.keys()) problems.push(n + ': in the receipt, not gated by this run');
if (JSON.stringify(receipt.behaviourOnly) !== JSON.stringify(want.behaviourOnly)) problems.push('behaviourOnly: receipt differs from this run');
if (JSON.stringify(receipt.testFiles) !== JSON.stringify(want.testFiles)) problems.push('testFiles: receipt ' + JSON.stringify(receipt.testFiles) + ' but this run ' + JSON.stringify(want.testFiles));
for (const r of want.kernels) console.log((r.clean ? '✓ ' : '✗ ') + r.kernel.padEnd(26) + String(r.killed).padStart(4) + '/' + String(r.total).padEnd(4) + ' ignored ' + r.ignored + ' · ' + r.testCount + ' tests');
if (want.kernels.some((r) => !r.clean)) problems.push('a gate is not clean');
if (problems.length) { console.error('\n✗ the gate receipt does not match this run:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('\n✓ receipts/gates.json is exactly what this runner measured (' + want.kernels.length + ' kernels).');
