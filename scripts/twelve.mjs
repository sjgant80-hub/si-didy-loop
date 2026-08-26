// si-didy-loop · scripts/twelve.mjs — THE TWELVE-POWERS LINTER.
//
// A linter for COMPLETENESS, not syntax: twelve powers any whole system answers for, each keyed to
// one of the twelve shapes of the fold-ladder. Mark each strong/weak/missing and the MISSING powers
// become the next-build roadmap.
//
// completeness = (strong + 0.5·weak) / 12.
// The headline gap is chosen by CRITICALITY: a missing boundary is a liability before anything
// else; a thing that outputs nothing is not yet a thing; then whether it starts, learns,
// integrates, stands alone — and only then the softer powers.
//
// Pure and total: garbage marks → { ok:false, why }, never a throw.

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;

export const POWERS = [
  { n: 1,  key: 'RELATION',      shape: 'the line',        question: 'do its parts connect? interfaces, APIs, how pieces talk' },
  { n: 2,  key: 'STRUCTURE',     shape: 'the triangle',       question: 'is there a stable frame that holds? schema, architecture, the spine' },
  { n: 3,  key: 'MANIFESTATION', shape: 'the square',   question: 'does it actually OUTPUT something real, not just internal logic?' },
  { n: 4,  key: 'IGNITION',      shape: 'the tetrahedron',       question: 'is there a first-move / entry point / trigger that STARTS it?' },
  { n: 5,  key: 'CONTAINMENT',   shape: 'the cube',      question: 'is there a BOUNDARY? scope, sovereignty, what it refuses to do' },
  { n: 6,  key: 'BALANCE',       shape: 'the octahedron',        question: 'does it hold its opposites? edge cases, error handling' },
  { n: 7,  key: 'WISDOM',        shape: 'the dodecahedron',           question: 'does it know WHY — judgment and taste, not just rules?' },
  { n: 8,  key: 'FLOW',          shape: 'the icosahedron',    question: 'does it move and adapt? state changes, the dynamic' },
  { n: 9,  key: 'UNION',         shape: 'the star-tetrahedron',      question: 'do the parts INTEGRATE into one, or sit bolted-on beside each other?' },
  { n: 10, key: 'WHOLENESS',     shape: 'the torus',    question: 'is it self-complete — runs without external crutches, holds its own shadow?' },
  { n: 11, key: 'LIFE',          shape: 'the spiral',       question: 'does it GROW — learn, improve, feed back — or is it static?' },
  { n: 12, key: 'REUNIFICATION', shape: 'the mesh', question: 'does it gather to ONE coherent purpose, not scatter?' },
];

// the diagnostic order for the headline gap — the spec's own reading, most-critical first
export const CRITICALITY = ['CONTAINMENT', 'MANIFESTATION', 'IGNITION', 'LIFE', 'UNION', 'WHOLENESS', 'STRUCTURE', 'RELATION', 'FLOW', 'BALANCE', 'WISDOM', 'REUNIFICATION'];

const MARKS = ['strong', 'weak', 'missing'];

/** Score a build's marks: { POWERKEY: 'strong'|'weak'|'missing' } for all twelve. */
export function score(marks) {
  const m = obj(marks);
  if (!m) return { ok: false, why: 'marks must be an object of POWER → strong|weak|missing' };
  const missingKeys = POWERS.filter((p) => !(p.key in m)).map((p) => p.key);
  if (missingKeys.length) return { ok: false, why: 'unmarked power(s): ' + missingKeys.join(', ') + ' — all twelve must be answered; an unasked question is not a pass' };
  const bad = POWERS.filter((p) => !MARKS.includes(m[p.key])).map((p) => p.key + '=' + String(m[p.key]));
  if (bad.length) return { ok: false, why: 'marks must be strong|weak|missing — got ' + bad.join(', ') };
  const strong = POWERS.filter((p) => m[p.key] === 'strong').map((p) => p.key);
  const weak = POWERS.filter((p) => m[p.key] === 'weak').map((p) => p.key);
  const missing = POWERS.filter((p) => m[p.key] === 'missing').map((p) => p.key);
  const completeness = Math.round(((strong.length + 0.5 * weak.length) / 12) * 100);
  const next = CRITICALITY.find((k) => missing.includes(k)) || CRITICALITY.find((k) => weak.includes(k)) || null;
  const reading =
    missing.length === 0 && weak.length === 0 ? 'all twelve powers present — the court is full' :
    (m.MANIFESTATION !== 'missing' && m.IGNITION !== 'missing' && missing.length >= 6) ? 'a quick hack, not a system — it runs and outputs, and almost nothing else holds' :
    missing.includes('CONTAINMENT') ? 'no boundary — a liability before it is a product; contain it before anything else' :
    missing.includes('LIFE') ? 'static — it will not improve; dead-on-arrival for anything meant to learn' :
    missing.includes('UNION') ? 'bolted-on parts — it will fragment under load' :
    missing.includes('WHOLENESS') ? 'depends on crutches — not sovereign yet' :
    'the gaps are the to-do list — build the missing, harden the weak';
  return { ok: true, completeness, strong, weak, missing, next, reading };
}

/** The assisted-mode rubric: a prompt any model (local first) can answer deterministically-shaped. */
export function rubric(specText) {
  const text = typeof specText === 'string' ? specText.trim() : '';
  if (!text) return { ok: false, why: 'no spec text — the organ reads a build description, it does not imagine one' };
  const qs = POWERS.map((p) => `${p.n}. ${p.key} (${p.shape}): ${p.question}`).join('\n');
  return {
    ok: true,
    system: 'You are a completeness-linter. Judge ONLY from the text given. For each of the twelve powers answer exactly one of: strong, weak, missing. Missing means the text shows no evidence of it — absence of evidence IS missing here, by design. Reply as JSON: {"RELATION":"strong|weak|missing", ...} with all twelve keys and nothing else.',
    prompt: 'THE TWELVE POWERS:\n' + qs + '\n\nTHE BUILD:\n' + text.slice(0, 12000),
  };
}
