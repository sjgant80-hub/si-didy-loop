// si-didy-loop · wispwire.test.mjs — the wisp wire, every rule falsifiable.
// The field kernel (generative-estate) is imported REAL from the sibling checkout: template
// exams are proven against the actual verify() they will face, not a copy of it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { KAPPA, TEMPLATES, nameHash, specFromProposal, redactSpec, promptFor, extractCode } from './wispwire.mjs';

const estate = await import(pathToFileURL('C:/Users/sjgan/Downloads/generative-estate/estate.mjs').href);

const PROPOSAL = () => ({ move: 'soundcheck kiosks licensed per venue for structural surveys', grounds: ['soundcheck', 'the-ear', 'memory:airgap'], proposesOnly: true });

// reference implementations — what a competent wisp should produce; each exam must be PASSABLE
const REFERENCE = {
  bundleQuote: `function NAME(a, b, rate) { if (!Number.isInteger(a) || a < 0 || !Number.isInteger(b) || b < 0 || typeof rate !== 'number' || !isFinite(rate) || rate < 0 || rate > 1) return {ok:false}; var sum = a + b; var discount = Math.round(sum * rate); return {ok:true, sum: sum, discount: discount, price: sum - discount}; }`,
  licenceFee: `function NAME(seats, perSeat, minFee) { if (!Number.isInteger(seats) || seats < 0 || !Number.isInteger(perSeat) || perSeat < 0 || !Number.isInteger(minFee) || minFee < 0) return {ok:false}; return {ok:true, fee: Math.max(seats * perSeat, minFee)}; }`,
  savingsOnce: `function NAME(rentMo, once) { if (!Number.isInteger(rentMo) || rentMo <= 0 || !Number.isInteger(once) || once < 0) return {ok:false}; var rentYr = rentMo * 12; return {ok:true, rentYr: rentYr, saveY1: rentYr - once}; }`,
  escrowSplit: `function NAME(total, parts) { if (!Number.isInteger(total) || total < 0 || !Number.isInteger(parts) || parts <= 0) return {ok:false}; var base = Math.floor(total / parts); var rem = total - base * parts; var shares = []; for (var i = 0; i < parts; i++) shares.push(base + (i < rem ? 1 : 0)); return {ok:true, shares: shares}; }`,
  tierEarn: `function NAME(score) { if (typeof score !== 'number' || !isFinite(score) || score < 0 || score > 1) return {ok:false}; return {ok:true, tier: score >= 0.9 ? 'gold' : score >= 0.618 ? 'clean' : 'not-yet'}; }`,
};

test('EVERY TEMPLATE EXAM IS PASSABLE — a competent implementation scores 5/5 on the REAL field verify', () => {
  for (const t of TEMPLATES) {
    const name = t.fn + '_ref00000';
    const spec = { name, description: t.description, inputs: [...t.inputs], verify: t.verify.map(v => ({ in: [...v.in], out: v.out })), threshold: KAPPA };
    const v = estate.verify(spec, REFERENCE[t.fn].replace('NAME', name));
    assert.equal(v.holds, true, `${t.fn}: ${v.detail}`);
    assert.equal(v.score, 1, `${t.fn} must be fully passable, not marginally: ${v.detail}`);
  }
});

test('EVERY TEMPLATE EXAM CAN FAIL — a wrong implementation is held under κ, not waved through', () => {
  for (const t of TEMPLATES) {
    const name = t.fn + '_bad00000';
    const spec = { name, description: t.description, inputs: [...t.inputs], verify: t.verify.map(v => ({ in: [...v.in], out: v.out })), threshold: KAPPA };
    const v = estate.verify(spec, `function ${name}() { return {ok:true, everything: 'fine'}; }`);
    assert.equal(v.holds, false, `${t.fn}: a yes-man implementation must not stand`);
  }
});

test('SPECFROMPROPOSAL: deterministic template choice, the story rides, the exam is the template\'s own', () => {
  const a = specFromProposal(PROPOSAL());
  const b = specFromProposal(PROPOSAL());
  assert.equal(a.ok, true);
  assert.equal(a.spec.name, b.spec.name, 'the same move always specs the same name — no clock, no die');
  assert.match(a.spec.description, /Born of si-didy's proposal: "soundcheck kiosks/);
  assert.match(a.spec.description, /grounds: soundcheck, the-ear, memory:airgap/);
  const base = TEMPLATES.find(t => a.spec.name.startsWith(t.fn + '_'));
  assert.ok(base, 'the spec name carries its template');
  assert.deepEqual(a.spec.verify, base.verify.map(v => ({ in: [...v.in], out: v.out })), 'the exam is the template\'s, untouched by the proposal');
  assert.equal(a.spec.threshold, base.threshold, 'the spec carries its template\'s own bar');
});

test('MONEY EXAMS DEMAND PERFECTION — threshold 1 on every money kernel, κ only for the grader', () => {
  for (const t of TEMPLATES) {
    if (t.fn === 'tierEarn') assert.equal(t.threshold, KAPPA, 'the grader sits at κ');
    else assert.equal(t.threshold, 1, `${t.fn} handles money — a 4/5 money kernel loses pennies and must not stand`);
  }
  // the live run's exact failure: an escrow at 4/5 must be held under its bar by the REAL verify
  const t = TEMPLATES.find(x => x.fn === 'escrowSplit');
  const name = 'escrowSplit_liveslip';
  const spec = { name, description: t.description, inputs: [...t.inputs], verify: t.verify.map(v => ({ in: [...v.in], out: v.out })), threshold: t.threshold };
  const fourOfFive = `function ${name}(total, parts) { if (typeof total !== 'number' || total < 0 || !Number.isInteger(parts) || parts <= 0) return {ok:false}; var base = Math.floor(total / parts); var rem = total - base * parts; var shares = []; for (var i = 0; i < parts; i++) shares.push(base + (i < rem ? 1 : 0)); return {ok:true, shares: shares}; }`;
  const v = estate.verify(spec, fourOfFive);
  assert.equal(v.passed, 4, 'this is the exact live slip: fractional total accepted');
  assert.equal(v.holds, false, 'and under threshold 1 it no longer stands');
});

test('A RETRIED EXAM SHARPENS THE PROMPT, DETERMINISTICALLY — and a first sitting carries no scar', () => {
  const { spec } = specFromProposal(PROPOSAL());
  const first = promptFor(redactSpec(spec));
  const second = promptFor(redactSpec(spec), 1);
  assert.ok(!first.includes('Attempt'), 'the first sitting is clean');
  assert.match(second, /Attempt 2: a previous attempt failed validation/);
  assert.match(second, /Number\.isInteger/);
  assert.equal(promptFor(redactSpec(spec), 0), first, 'zero attempts is a first sitting');
  assert.equal(promptFor(redactSpec(spec), 2.5), first, 'a fractional attempt count is garbage, not a scar');
});

test('THIN PROPOSALS ARE REFUSED WITH THE REASON — a mutter is not a spec, a guess is not grounds', () => {
  assert.match(specFromProposal({ move: 'do a thing', grounds: ['abc', 'def'] }).why, /a mutter, not a proposal/);
  assert.match(specFromProposal({ move: 'a perfectly long and detailed move', grounds: ['x'] }).why, /a guess wearing a name/);
  assert.match(specFromProposal(null).why, /no proposal/);
});

test('THE EXAM STAYS SEALED — redactSpec strips verify and threshold, and the prompt never carries them', () => {
  const { spec } = specFromProposal(PROPOSAL());
  const r = redactSpec(spec);
  assert.deepEqual(Object.keys(r).sort(), ['description', 'inputs', 'name']);
  assert.ok(!('verify' in r) && !('threshold' in r));
  const prompt = promptFor(r);
  // the refusal SHAPE {ok:false} is contract and rightly public — the secrets are the vectors
  assert.ok(!prompt.includes('15300') && !prompt.includes('34, 33, 33') && !prompt.includes('604800') && !prompt.includes('0.95'),
    'no test vector leaks into the prompt');
  assert.match(prompt, /named exactly \w+_[0-9a-f]{8}/);
  assert.match(prompt, /must never throw/);
  assert.match(prompt, /Output ONLY the function declaration/);
});

test('EXTRACTCODE SCREENS REACH — fetch, eval, clocks, dice, and friends are refused before they can run', () => {
  for (const bad of ['fetch("http://x")', 'require("fs")', 'eval("1")', 'process.exit()', 'Math.random()', 'new Date()', 'globalThis.x', 'new Function("1")']) {
    const out = extractCode(`function f_00000000(a) { ${bad}; return {ok:false}; }`, 'f_00000000');
    assert.equal(out.ok, false, bad);
    assert.match(out.why, /pure computation only; refused before it can run/);
  }
});

test('EXTRACTCODE TAKES THE FUNCTION OUT OF THE CHATTER — fences and preamble stripped, wrong name refused', () => {
  const chatty = 'Sure! Here is the function:\n```javascript\nfunction good_12345678(a) { return {ok:false}; }\n```\nHope that helps!';
  const out = extractCode(chatty, 'good_12345678');
  assert.equal(out.ok, true);
  assert.ok(out.code.startsWith('function good_12345678'));
  assert.ok(!out.code.includes('```'));
  assert.match(extractCode(chatty, 'other_name').why, /did not produce a function named other_name/);
  assert.match(extractCode(null, '').why, /\(unnamed\)/);
});

test('THE FULL CIRCUIT AGAINST THE REAL FIELD — define, collapse with a competent wisp, stand; a cheat is discarded', () => {
  const field = estate.newField();
  const { spec } = specFromProposal(PROPOSAL());
  const d = estate.define(field, spec);
  assert.equal(d.ok, true);
  const base = TEMPLATES.find(t => spec.name.startsWith(t.fn + '_'));
  const good = estate.collapse(field, d.id, () => REFERENCE[base.fn].replace('NAME', spec.name), { ts: 1 });
  assert.equal(good.ok, true, good.why);
  assert.equal(good.verify.holds, true);
  assert.equal(estate.collapse(field, d.id, () => { throw new Error('never called'); }, { ts: 2 }).cached, true, 'built once — the second demand is a cache hit');
  // a cheating wisp on a fresh field: discarded, the spec stays possibility
  const field2 = estate.newField();
  const d2 = estate.define(field2, spec);
  const cheat = estate.collapse(field2, d2.id, () => `function ${spec.name}() { return {ok:true, everything: 'fine'}; }`, { ts: 3 });
  assert.equal(cheat.ok, false);
  assert.match(cheat.why, /discarded, the spec stays possibility/);
  assert.equal(estate.isBuilt(field2, d2.id), false);
});

test('TEMPLATES ARE FROZEN TO THE BOTTOM — an exam nobody can bend is the only kind worth sitting', () => {
  assert.throws(() => { TEMPLATES.push({ fn: 'x' }); });
  assert.throws(() => { TEMPLATES[0].verify.push({ in: [], out: { ok: true } }); });
  assert.throws(() => { TEMPLATES[0].verify[0].out.ok = false; });
  assert.throws(() => { TEMPLATES[2].inputs.push('extra'); });
});

// ─── round two: the gate found eight gaps — each dies here ───

test('CONTRACT PROSE AGREES WITH THE EXAM — the tier boundaries are stated INCLUSIVE, verbatim', () => {
  // the description is what the wisp reads; the verify vectors are what it faces. A description
  // saying ">" where the exam tests 0.618 → "clean" would send every honest wisp to a fail.
  const tier = TEMPLATES.find(t => t.fn === 'tierEarn');
  assert.ok(tier.description.includes('score >= 0.9'), 'gold is inclusive at 0.9, and the contract says so');
  assert.ok(tier.description.includes('score >= 0.618'), 'clean is inclusive at κ, and the contract says so');
  assert.ok(tier.verify.some(v => v.in[0] === 0.618 && v.out.tier === 'clean'), 'and the exam tests exactly that boundary');
});

test('THE PROPOSAL FLOORS ARE INCLUSIVE — fifteen characters is a move, two 3-char grounds are grounds', () => {
  const move15 = 'kelp wasp husks';
  assert.equal(move15.length, 15);
  const edge = specFromProposal({ move: move15, grounds: ['abc', 'def'] });
  assert.equal(edge.ok, true, 'exactly-at-floor proposals spec: ' + edge.why);
  assert.match(edge.spec.description, /grounds: abc, def/);
});

test('SHORT GROUNDS AND NON-STRING GROUNDS ARE NOT GROUNDS — however many there are', () => {
  const out = specFromProposal({ move: 'a perfectly long and grounded move', grounds: ['ab', 'cd', 'ee', 7, null] });
  assert.equal(out.ok, false);
  assert.match(out.why, /a guess wearing a name/);
});

test('A FUNCTION IS NOT A PROPOSAL — properties on an impostor do not spec', () => {
  const impostor = Object.assign(function proposal() {}, { move: 'a perfectly long and detailed move', grounds: ['abc', 'def'] });
  assert.match(specFromProposal(impostor).why, /no proposal/);
});

test('FUZZ: total on garbage', () => {
  specFromProposal(7); specFromProposal({}); specFromProposal({ move: 42, grounds: 'x' });
  redactSpec(null); redactSpec(7); promptFor(null); promptFor('x');
  extractCode(7, 9); nameHash(null); nameHash(7);
  assert.equal(nameHash('a'), nameHash('a'), 'the hash is stable');
  assert.notEqual(nameHash('a'), nameHash('b'));
  assert.ok(true);
});
