#!/usr/bin/env node
// scripts/twelve-cli.mjs — thin I/O shell over twelve.mjs (the gated law stays pure).
//   node scripts/twelve-cli.mjs marks.json          → manual mode: score a marks file
//   node scripts/twelve-cli.mjs --rubric spec.txt   → assisted mode: print the rubric for a model
import { readFileSync } from 'node:fs';
import { score, rubric } from './twelve.mjs';
const [a, b] = process.argv.slice(2);
if (a === '--rubric') {
  const r = rubric(readFileSync(b, 'utf8'));
  if (!r.ok) { console.error('REFUSED: ' + r.why); process.exit(1); }
  console.log('SYSTEM:\n' + r.system + '\n\nPROMPT:\n' + r.prompt); process.exit(0);
}
const r = score(JSON.parse(readFileSync(a, 'utf8')));
if (!r.ok) { console.error('REFUSED: ' + r.why); process.exit(1); }
console.log(`completeness ${r.completeness}%`);
console.log(`  missing: ${r.missing.join(', ') || '—'}`);
console.log(`  weak:    ${r.weak.join(', ') || '—'}`);
console.log(`  next:    ${r.next || '—'}`);
console.log(`  ${r.reading}`);
