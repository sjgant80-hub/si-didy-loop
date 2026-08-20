#!/usr/bin/env node
// si-didy-loop · scripts/gen-gaptemplates.mjs — regenerate gaptemplates.mjs from gap-proposals.json.
// The json is the SOURCE (mined by the didy fan-out, frontier-verified); the module is generated,
// and the suite asserts they deep-agree — a hand edit to either side fails the gate.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const props = JSON.parse(readFileSync(join(here, '..', 'gap-proposals.json'), 'utf8'));
const mod = `// si-didy-loop · gaptemplates.mjs — GENERATED from gap-proposals.json (the didy fan-out,
// wf_42f96e16), never hand-typed: ten sealed exams, each derived from a REMEMBERED estate defect
// and vector-verified at the frontier before landing. The memory of past defects is the syllabus.
// Every one handles money, law, or trust — threshold 1: these exams demand perfection.
// Regenerate: node scripts/gen-gaptemplates.mjs   (the suite asserts module === source)

export const GAP_TEMPLATES = ${JSON.stringify(props.map(p => ({
  fn: p.fn, teaches: p.teaches, description: p.description, inputs: p.inputs.map(i => i.split(':')[0].trim()),
  verify: p.verify, threshold: 1, groundedIn: p.groundedIn.slice(0, 200),
})), null, 1)};

for (const t of GAP_TEMPLATES) {
  Object.freeze(t.inputs); Object.freeze(t.verify);
  for (const v of t.verify) { Object.freeze(v.in); Object.freeze(v.out); Object.freeze(v); }
  Object.freeze(t);
}
Object.freeze(GAP_TEMPLATES);
export default GAP_TEMPLATES;
`;
writeFileSync(join(here, '..', 'gaptemplates.mjs'), mod);
console.log('gaptemplates.mjs regenerated from gap-proposals.json ·', props.length, 'templates');
