// si-didy-loop · wispwire.mjs — the wisp wire: S6 proposals become SPECS, the local model
// becomes the WISP, and only a verified collapse stands.
//
// The circuit this closes: dream shadow → S6 proposal → spec held in the possibility field
// (generative-estate's gated kernel, linked by observation) → the wisp GENERATES an
// implementation → the field's κ-gate runs the spec's own tests → stands and is cached, or is
// discarded and the spec stays possibility. The operator stops walking a fixed palette and
// starts operating a field.
//
// The honesty that makes it real, held HERE:
//   · THE EXAM STAYS SEALED — redactSpec() strips the verify tests before anything reaches the
//     model. A student who writes its own mark scheme is not examined; the wisp sees the
//     contract (name, description, inputs) and never the tests.
//   · THE SCREEN BEFORE THE GATE — extractCode() refuses any generated code that reaches for
//     require/import/fetch/eval/process and friends. The field's verify() runs code in-process;
//     nothing impure gets that far.
//   · TESTS ARE DERIVED, NOT MODELLED — every template's verify cases are fixed determinism
//     (integer money, exact shapes, exact {ok:false} refusals). The proposal parameterizes the
//     STORY of the spec; it never touches the exam.
//   · A thin proposal is refused: no grounds, no spec. Emergence without grounds is a guess.

export const KAPPA = (Math.sqrt(5) - 1) / 2;

const str = (v) => typeof v === 'string' ? v : '';
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;

// a tiny stable hash for naming — deterministic, no Date, no randomness
export const nameHash = (s) => {
  let h = 5381;
  for (const ch of str(s)) h = ((h * 33) ^ ch.codePointAt(0)) >>> 0;
  return h.toString(16).padStart(8, '0').slice(0, 8);
};

// ── THE REPERTOIRE — business kernels the wisp can be examined on. The tests are the exam:
//    exact canonical equality, integer money (pence) so floats cannot drift a verdict, and
//    invalid input must return EXACTLY {ok:false}. threshold κ ⇒ 4/5 must pass. ──
// money kernels demand a PERFECT exam (threshold 1): a 4/5 escrow that loses a half-penny on
// garbage input contradicts its own name — the live run proved it. Only the non-money grader
// sits at κ.
const T = (fn, teaches, description, inputs, verify, threshold) => ({ fn, teaches, description, inputs, verify, threshold: threshold ?? 1 });
export const TEMPLATES = Object.freeze([
  T('bundleQuote', 'price a two-tool bundle',
    'Return {ok:true, sum, discount, price} for a paired-offer quote. All money is INTEGER PENCE. sum = a + b. discount = Math.round(sum * rate). price = sum - discount. If a or b is not a non-negative integer, or rate is not a finite number in [0,1], return exactly {ok:false}.',
    ['a', 'b', 'rate'],
    [
      { in: [10000, 8000, 0.15], out: { ok: true, sum: 18000, discount: 2700, price: 15300 } },
      { in: [5000, 0, 0.1], out: { ok: true, sum: 5000, discount: 500, price: 4500 } },
      { in: [100, 100, 0], out: { ok: true, sum: 200, discount: 0, price: 200 } },
      { in: [NaN, 5000, 0.1], out: { ok: false } },
      { in: [5000, 5000, 1.5], out: { ok: false } },
    ]),
  T('licenceFee', 'a per-seat licence with a floor',
    'Return {ok:true, fee} where fee = Math.max(seats * perSeat, minFee). All money is INTEGER PENCE; seats a non-negative integer. If seats, perSeat, or minFee is not a non-negative integer, return exactly {ok:false}.',
    ['seats', 'perSeat', 'minFee'],
    [
      { in: [10, 500, 2000], out: { ok: true, fee: 5000 } },
      { in: [2, 500, 2000], out: { ok: true, fee: 2000 } },
      { in: [0, 500, 2000], out: { ok: true, fee: 2000 } },
      { in: [-1, 500, 2000], out: { ok: false } },
      { in: [3, 'x', 2000], out: { ok: false } },
    ]),
  T('savingsOnce', 'own-once vs rent-forever',
    'Return {ok:true, rentYr, saveY1} where rentYr = rentMo * 12 and saveY1 = rentYr - once. All money is INTEGER PENCE. If rentMo is not a positive integer or once is not a non-negative integer, return exactly {ok:false}.',
    ['rentMo', 'once'],
    [
      { in: [50400, 49900], out: { ok: true, rentYr: 604800, saveY1: 554900 } },
      { in: [1000, 0], out: { ok: true, rentYr: 12000, saveY1: 12000 } },
      { in: [0, 100], out: { ok: false } },
      { in: [1000, -5], out: { ok: false } },
      { in: ['lots', 100], out: { ok: false } },
    ]),
  T('escrowSplit', 'split with no lost penny',
    'Return {ok:true, shares} where shares is an array of `parts` non-negative integers summing EXACTLY to total, as equal as possible, any remainder going to the EARLIEST shares (so [34,33,33] for 100 into 3). If total is not a non-negative integer or parts is not a positive integer, return exactly {ok:false}.',
    ['total', 'parts'],
    [
      { in: [100, 3], out: { ok: true, shares: [34, 33, 33] } },
      { in: [9, 4], out: { ok: true, shares: [3, 2, 2, 2] } },
      { in: [5, 5], out: { ok: true, shares: [1, 1, 1, 1, 1] } },
      { in: [100, 0], out: { ok: false } },
      { in: [1.5, 2], out: { ok: false } },
    ]),
  T('tierEarn', 'the κ-band grade',
    'Return {ok:true, tier} where tier is "gold" for score >= 0.9, "clean" for score >= 0.618, else "not-yet". If score is not a finite number in [0,1], return exactly {ok:false}.',
    ['score'],
    [
      { in: [0.95], out: { ok: true, tier: 'gold' } },
      { in: [0.618], out: { ok: true, tier: 'clean' } },
      { in: [0.5], out: { ok: true, tier: 'not-yet' } },
      { in: [1.2], out: { ok: false } },
      { in: [NaN], out: { ok: false } },
    ], KAPPA),
]);
for (const t of TEMPLATES) { Object.freeze(t.inputs); Object.freeze(t.verify); for (const v of t.verify) { Object.freeze(v.in); Object.freeze(v.out); Object.freeze(v); } Object.freeze(t); }

/**
 * An S6 proposal becomes a spec for the field. The proposal picks the template (deterministic —
 * a stable hash of the move, never a clock or a die) and parameterizes the STORY; the exam is
 * the template's own, untouched. Thin proposals are refused with the reason.
 */
export function specFromProposal(proposal) {
  const p = obj(proposal);
  if (!p) return { ok: false, why: 'no proposal' };
  const move = str(p.move).trim();
  if (move.length < 15) return { ok: false, why: 'the move is too thin to spec — under fifteen characters is a mutter, not a proposal' };
  const grounds = (Array.isArray(p.grounds) ? p.grounds : []).filter(g => typeof g === 'string' && g.length >= 3);
  if (grounds.length < 2) return { ok: false, why: 'ungrounded — a spec needs at least two real grounds from the graph, or it is a guess wearing a name' };
  const t = TEMPLATES[parseInt(nameHash(move), 16) % TEMPLATES.length];
  const suffix = nameHash(move);
  return {
    ok: true,
    why: `"${move.slice(0, 60)}" specs as ${t.fn} (${t.teaches})`,
    spec: {
      name: `${t.fn}_${suffix}`,
      description: `${t.description} Born of si-didy's proposal: "${move.slice(0, 140)}" — grounds: ${grounds.slice(0, 4).join(', ')}.`,
      inputs: [...t.inputs],
      verify: t.verify.map(v => ({ in: [...v.in], out: v.out })),
      threshold: t.threshold,
    },
  };
}

/** The exam stays sealed: what the model may see. Verify and threshold are STRUCK. */
export function redactSpec(spec) {
  const s = obj(spec) || {};
  return { name: str(s.name), description: str(s.description), inputs: Array.isArray(s.inputs) ? s.inputs.map(String) : [] };
}

/**
 * The exact prompt for the wisp. Deterministic; the redacted spec is all it carries. A retried
 * exam sharpens the prompt by attempt count — a temperature-zero wisp must not fail identically
 * forever, and the sharpening is itself deterministic.
 */
export function promptFor(redacted, attempt) {
  const r = obj(redacted) || {};
  const n = Number.isInteger(attempt) && attempt > 0 ? attempt : 0;
  return [
    `Write ONE pure JavaScript function declaration named exactly ${str(r.name)} taking (${(Array.isArray(r.inputs) ? r.inputs : []).join(', ')}).`,
    `Contract: ${str(r.description)}`,
    'Rules: plain JavaScript only. No imports, no require, no fetch, no console, no comments, no Math.random, no Date.',
    'The function must never throw — on any invalid input return exactly {ok:false}.',
    'Output ONLY the function declaration, nothing else. No markdown fences, no explanation.',
    ...(n > 0 ? [`Attempt ${n + 1}: a previous attempt failed validation. Check EVERY input strictly — integers with Number.isInteger, numbers with typeof and isFinite — BEFORE any arithmetic.`] : []),
  ].join('\n');
}

const BANNED = /\b(require|import|export|fetch|XMLHttpRequest|WebSocket|process|globalThis|eval|Function|setTimeout|setInterval|Math\.random|Date)\b/;

/**
 * Take the function out of whatever the model said, and SCREEN it before the field may run it.
 * Anything reaching beyond pure computation is refused here — the gate examines correctness,
 * this screen examines reach, and both must pass.
 */
export function extractCode(text, expectedName) {
  const t = str(text).replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');
  const at = t.indexOf('function ' + str(expectedName));
  if (at < 0) return { ok: false, why: `the wisp did not produce a function named ${str(expectedName) || '(unnamed)'}` };
  const code = t.slice(at).trim();
  const hit = code.match(BANNED);
  if (hit) return { ok: false, why: `the generated code reaches for "${hit[0]}" — pure computation only; refused before it can run` };
  return { ok: true, code };
}

export default specFromProposal;
