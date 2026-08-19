// si-didy-loop · course.test.mjs — the elite course, every rule falsifiable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  KAPPA, STAGES, SYLLABUS_TERMS, freshProgress, attempt, current, expansionUnlocked,
  gradeFoundation, gradePitch, gradeProduct, gradePost, gradeRoute, gradeCycle, gradeExpansion,
} from './course.mjs';

const near = (got, want, label) => assert.ok(Math.abs(got - want) < 1e-9, (label || '') + ' — got ' + got + ', wanted ' + want);

test('THE COURSE IS SEVEN STAGES IN ORDER, FROZEN — expansion is last and cannot move', () => {
  assert.equal(STAGES.length, 7);
  assert.deepEqual(STAGES.map(s => s.id), ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6']);
  assert.equal(STAGES[6].name, 'EXPAND');
  assert.throws(() => { STAGES.push({ id: 'S7' }); });
  assert.throws(() => { STAGES[0].gate = 'gradeNothing'; });
});

test('NO SKIPPING, NO CIRCLES — only the stage in front of you accepts an attempt', () => {
  const p = freshProgress();
  const skip = attempt(p, 'S3', 1, 'gradePost', 'e', 't');
  assert.equal(skip.ok, false);
  assert.match(skip.why, /no skipping ahead — S0 · FOUNDATION is the stage in front of you/);
  const passed = attempt(p, 'S0', 0.9, 'gradeFoundation', 'e', 't');
  assert.equal(passed.passed, true);
  const back = attempt(passed.progress, 'S0', 1, 'gradeFoundation', 'e', 't');
  assert.equal(back.ok, false);
  assert.match(back.why, /already mastered — the course moves forward, not in circles/);
});

test('SI-DIDY CANNOT SELF-CERTIFY — a mastery claim needs the stage\'s own gate, by name', () => {
  const p = freshProgress();
  for (const grader of ['self', '', null, 'gradePitch']) {
    const r = attempt(p, 'S0', 1, grader, 'e', 't');
    assert.equal(r.ok, false, String(grader));
    assert.match(r.why, /not si-didy's word/);
  }
});

test('κ IS THE BAR, EXACTLY — 0.618 passes, a hair under stays, and staying is said honestly', () => {
  const p = freshProgress();
  const under = attempt(p, 'S0', KAPPA - 0.001, 'gradeFoundation', 'e', 't');
  assert.equal(under.passed, false);
  assert.match(under.why, /Stay on the stage, fan again/);
  assert.equal(under.progress.stage, 0, 'a fail does not move the course');
  assert.equal(under.progress.attempts.length, 1, 'but the attempt is remembered');
  const at = attempt(p, 'S0', KAPPA, 'gradeFoundation', 'e', 't');
  assert.equal(at.passed, true, 'κ exactly is mastery — the bar is ≥, not >');
  assert.match(at.why, /S1 · PITCH unlocks/);
});

test('THE FULL CLIMB — six masteries unlock expansion, the seventh completes without leaving it', () => {
  let p = freshProgress();
  for (const s of STAGES.slice(0, 6)) p = attempt(p, s.id, 0.9, s.gate, 'drill', 't').progress;
  assert.equal(expansionUnlocked(p), true);
  assert.equal(current(p).id, 'S6');
  const done = attempt(p, 'S6', 0.9, 'gradeExpansion', 'a novel proposal', 't');
  assert.equal(done.passed, true);
  assert.match(done.why, /the course is complete; expansion never stops/);
  assert.equal(current(done.progress).id, 'S6', 'S6 is a place the course stays, not a door it exits');
  assert.equal(done.progress.complete, true);
});

test('S1 GATE: AN INFLATED SAVINGS NUMBER IS AN INSTANT ZERO — however perfect the rest', () => {
  const truth = { rentMo: 195, once: 100 };  // true save = 2240
  const honest = { rentYr: 2340, saveY1: 2240, angle: 'owned, offline, data never leaves', cite: 'cite before live' };
  assert.ok(gradePitch(honest, truth) >= KAPPA, 'the honest pitch masters the stage');
  const inflated = { ...honest, saveY1: 2500 };
  assert.equal(gradePitch(inflated, truth), 0, 'a lying pitch that converts is a failed gate, not a pass');
  const undersold = { ...honest, saveY1: 2000 };
  assert.ok(gradePitch(undersold, truth) < KAPPA && gradePitch(undersold, truth) > 0,
    'a wrong-but-not-inflated number fails on accuracy, not honesty');
});

test('S2 GATE: NOT GATE-PASSED MEANS ZERO AT ANY POLISH', () => {
  const polished = { name: 'gorgeous-tool', gatePassed: false, gateEvidence: 'CI was green last month, promise', savings: { cite: 'cite rule here' } };
  assert.equal(gradeProduct(polished), 0);
  const proven = { name: 'fallforce', gatePassed: true, gateEvidence: 'gate.yml green at dfe9043', savings: { cite: 'cite before live' } };
  assert.ok(gradeProduct(proven) >= KAPPA);
});

test('S3 GATE: THE DEMO MUST BE OUR LIVE PAGE AND THE REVEAL MUST BE TRUE', () => {
  const truth = { rentMo: 504, once: 499 };  // true save = 5549
  const good = { hook: 'your CRM bill, forever?', demoUrl: 'https://sjgant80-hub.github.io/fallforce/', reveal: '$5,549 saved year one', cta: 'own it once' };
  assert.ok(gradePost(good, truth) >= KAPPA);
  assert.equal(gradePost({ ...good, reveal: '$9,999 saved year one' }, truth), 0, 'an invented number zeroes the post');
  assert.ok(gradePost({ ...good, demoUrl: 'https://evil.example/fake' }, truth) < KAPPA, 'a demo that is not our live page cannot master content');
});

test('S4 GATE: THE RIGHT TIER, AND HUMANS CLOSE THE BIG ONES — NO EXCEPTIONS', () => {
  assert.ok(gradeRoute({ budget: 100 }, { tier: 'tool', reply: 'here is the tool that fits, owned once' }) >= KAPPA);
  assert.ok(gradeRoute({ budget: 500 }, { tier: 'bundle', reply: 'the whole stack fits your spend better' }) >= KAPPA);
  assert.equal(gradeRoute({ budget: 2000 }, { tier: 'custom', reply: 'a custom build fits', humanCloses: false }), 0);
  assert.ok(gradeRoute({ budget: 2000 }, { tier: 'custom', reply: 'Simon will pick this up with you', humanCloses: true }) >= KAPPA);
  assert.equal(gradeRoute({ budget: 100 }, { tier: 'bundle', reply: 'upsell everything always' }), 0, 'wrong tier is a failed route');
});

test('S5 GATE: ONE UNSIGNED EXECUTION ZEROES THE WHOLE CYCLE', () => {
  const clean = { produced: 1, validated: 1, doorsQueued: 3, executedUnsigned: 0, remembered: true };
  assert.ok(gradeCycle(clean) >= KAPPA);
  assert.equal(gradeCycle({ ...clean, executedUnsigned: 1 }), 0, 'the one rule that can never bend');
});

test('S6 GATE: EMERGENCE MUST BE GROUNDED, NOVEL, AND PROPOSED — NEVER LAUNCHED', () => {
  const novel = { move: 'acoustic diagnostics subscriptions replaced: structural soundcheck kiosks licensed per venue', grounds: ['soundcheck', 'the-ear', 'memory:airgap'], proposesOnly: true };
  assert.ok(gradeExpansion(novel) >= KAPPA, 'grounded novelty masters expansion: ' + gradeExpansion(novel));
  assert.equal(gradeExpansion({ ...novel, proposesOnly: false }), 0, 'expansion proposes; the key-holder disposes');
  assert.equal(gradeExpansion({ ...novel, grounds: ['x'] }), 0, 'ungrounded novelty is a guess');
  const taught = { move: 'crawl the estate and classify tools into the catalogue with savings math', grounds: ['fallforce', 'catalogue'], proposesOnly: true };
  assert.ok(gradeExpansion(taught) < KAPPA, 'the course already taught this — syllabus words are not emergence');
});

test('THE SYLLABUS TERMS ARE DERIVED FROM THE STAGES, NOT TYPED', () => {
  assert.ok(SYLLABUS_TERMS.includes('savings'));
  assert.ok(SYLLABUS_TERMS.includes('estate'));
  assert.ok(!SYLLABUS_TERMS.includes('the'), 'short words are not terms');
});

test('S0 GATE: THE COUNT MUST MATCH THE REAL INDEX WITHIN ONE PERCENT', () => {
  const truth = { repoCount: 1635 };
  assert.ok(gradeFoundation({ repoCount: 1635, modelLine: 'own the stack once instead of renting it forever', graphNodes: 1753 }, truth) >= KAPPA);
  assert.ok(gradeFoundation({ repoCount: 1200, modelLine: 'own vs rent', graphNodes: 10 }, truth) < KAPPA, 'a wrong estate count is not foundation');
});

// ─── round two: the gate found forty gaps — every component weight and boundary pins here ───

test('PROGRESSION EDGES: unnamed stages, unnamed graders, the stage number after completion', () => {
  assert.match(attempt(freshProgress(), null, 1, 'x', 'e', 't').why, /"\(unnamed\)" is not a stage/);
  assert.match(attempt(freshProgress(), 'S0', 1, null, 'e', 't').why, /got "\(none\)"/);
  let p = freshProgress();
  for (const s of STAGES) p = attempt(p, s.id, 0.9, s.gate, 'drill', 't').progress;
  assert.strictEqual(p.stage, 6, 'after S6 the stage number IS six — not seven clamped into looking like six');
  assert.strictEqual(current({ stage: 99 }).id, 'S6', 'an over-range stage clamps to expansion');
  const early = attempt(freshProgress(), 'S0', 0.9, 'gradeFoundation', 'e', 't');
  assert.ok(!early.progress.complete, 'passing S0 does not complete the course');
  const carried = attempt({ kind: 'course-progress', stage: 0, passed: {}, attempts: [], complete: true }, 'S0', 0.9, 'gradeFoundation', 'e', 't');
  assert.strictEqual(carried.progress.complete, true, 'a true complete flag survives a round-trip, never dropped');
});

test('S0 EXACT COMPONENTS: 0.5 count (1% inclusive) + 0.3 own-AND-rent + 0.2 real positive nodes', () => {
  const t = { repoCount: 100 };
  const full = { repoCount: 101, modelLine: 'own the stack once instead of renting', graphNodes: 5 };
  near(gradeFoundation(full, t), 1, 'a 1% count miss is INSIDE tolerance — the boundary is inclusive');
  near(gradeFoundation({ ...full, modelLine: 'own it all' }, t), 0.7, '"own" without "rent" is not the model');
  near(gradeFoundation({ ...full, graphNodes: 0 }, t), 0.8, 'zero nodes is no graph');
  near(gradeFoundation({ ...full, graphNodes: '5' }, t), 0.8, 'a string count is not a count');
  assert.strictEqual(gradeFoundation(null, t), 0);
  assert.strictEqual(gradeFoundation(full, null), 0);
  assert.strictEqual(gradeFoundation(full, { repoCount: 'many' }), 0);
});

test('S1 EXACT COMPONENTS: 0.3 rentYr + 0.4 saveY1 + 0.2 full angle + 0.1 cite', () => {
  const t = { rentMo: 195, once: 100 };
  const full = { rentYr: 2340, saveY1: 2240, angle: 'owned, offline, data never leaves', cite: 'cite before live' };
  near(gradePitch(full, t), 1);
  near(gradePitch({ ...full, rentYr: 9999 }, t), 0.7, 'a wrong yearly rent loses its component exactly');
  near(gradePitch({ ...full, angle: 'own it' }, t), 0.8, '"own" without the offline half is half an angle, worth nothing');
  assert.strictEqual(gradePitch(null, t), 0);
  assert.strictEqual(gradePitch(full, null), 0);
  assert.strictEqual(gradePitch(full, { rentMo: 'lots' }), 0);
});

test('S2 EXACT COMPONENTS: 0.5 gate + 0.2 evidence (10 inclusive) + 0.2 cited savings + 0.1 name', () => {
  const ten = 'abcdefghij';
  assert.equal(ten.length, 10);
  near(gradeProduct({ gatePassed: true, gateEvidence: ten, savings: { cite: 'cite rule' }, name: 'x' }), 1,
    'ten characters of evidence is evidence — the floor is inclusive');
  assert.strictEqual(gradeProduct({ gatePassed: true, name: 'x' }), 0.6,
    'no savings object means no cite component — and must not crash reaching for one');
});

test('S3 EXACT COMPONENTS: 0.25 hook (10 incl) + 0.25 our demo + 0.3 true reveal + 0.2 cta (5 incl)', () => {
  const t = { rentMo: 504, once: 499 };
  const hook10 = 'aaaaaaaaaa', cta5 = 'own->';
  assert.equal(hook10.length, 10); assert.equal(cta5.length, 5);
  const full = { hook: hook10, demoUrl: 'https://sjgant80-hub.github.io/fallforce/', reveal: '$5,549 saved year one', cta: cta5 };
  near(gradePost(full, t), 1, 'inclusive floors: a 10-char hook and 5-char cta count');
  near(gradePost({ ...full, reveal: 'huge savings, trust us' }, t), 0.7, 'a reveal with no dollar claim earns nothing for the claim — and must not crash');
  near(gradePost({ ...full, reveal: '$100 saved year one' }, t), 0.7, 'an undersold claim is not the true reveal');
  assert.strictEqual(gradePost(null, t), 0);
  assert.strictEqual(gradePost(full, null), 0);
});

test('S4 TIER BOUNDARIES ARE EXACT: 300 is bundle territory, 1000 is custom territory', () => {
  assert.strictEqual(gradeRoute({ budget: 300 }, { tier: 'tool', reply: 'a tool then, owned once and yours' }), 0, '£300 exactly is not tool money');
  assert.ok(gradeRoute({ budget: 300 }, { tier: 'bundle', reply: 'the stack fits this spend exactly so' }) >= KAPPA);
  assert.strictEqual(gradeRoute({ budget: 1000 }, { tier: 'bundle', reply: 'the bundle will do nicely here, yes' }), 0, '£1000 exactly is custom territory');
  assert.ok(gradeRoute({ budget: 1000 }, { tier: 'custom', reply: 'Simon closes this one personally now', humanCloses: true }) >= KAPPA);
  const twenty = 'xxxxxxxxxxxxxxxxxxxx';
  assert.equal(twenty.length, 20);
  near(gradeRoute({ budget: 100 }, { tier: 'tool', reply: twenty }), 1, 'a 20-char reply counts — inclusive floor');
  near(gradeRoute({ budget: 100 }, { tier: 'tool', reply: 'short' }), 0.6);
  assert.strictEqual(gradeRoute(null, { tier: 'tool' }), 0);
  assert.strictEqual(gradeRoute({ budget: 100 }, null), 0);
  assert.strictEqual(gradeRoute({ budget: 'lots' }, { tier: 'tool' }), 0);
});

test('S5 EXACT COMPONENTS: zeros score nothing, and a truthy-but-not-true remembered is not memory', () => {
  assert.strictEqual(gradeCycle({ produced: 0, validated: 0, doorsQueued: 0, executedUnsigned: 0, remembered: true }), 0.2,
    'zero produced, zero validated, zero doors — only the memory component stands');
  assert.strictEqual(gradeCycle({ produced: 1, validated: 1, doorsQueued: 1, executedUnsigned: 0, remembered: 'yes' }), 0.8,
    'remembered must be strictly true');
  near(gradeCycle({ produced: 1, validated: 1, doorsQueued: 1, executedUnsigned: 0, remembered: true }), 1);
});

test('S6 BOUNDARIES: a 15-char move stands, 3-char grounds count, short grounds are not grounds', () => {
  const move15 = 'zzzq wwwk vvvvj';
  assert.equal(move15.length, 15);
  assert.ok(gradeExpansion({ move: move15, grounds: ['abc', 'def'], proposesOnly: true }) > 0,
    'fifteen characters exactly is a move, and two 3-char grounds are grounds — floors are inclusive');
  assert.strictEqual(gradeExpansion({ move: move15, grounds: ['ab', 'cd', 'ee'], proposesOnly: true }), 0,
    'two-character grounds are not grounds, however many there are');
});

test('THE SYLLABUS KEEPS ITS FOUR-LETTER WORDS — math is a term', () => {
  assert.ok(SYLLABUS_TERMS.includes('math'), 'a 4-letter word is a term — the floor is inclusive');
});

test('S6 NOVELTY EDGES: four-letter words count as words, and exactly-half novelty proceeds', () => {
  const allNovel = { move: 'kelp wasp husk yurt', grounds: ['abc', 'def'], proposesOnly: true };
  assert.ok(gradeExpansion(allNovel) >= KAPPA,
    'a move of novel 4-letter words is fully novel — the word floor is inclusive: ' + gradeExpansion(allNovel));
  const half = { move: 'estate savings kelp fjor', grounds: ['abc', 'def'], proposesOnly: true };
  assert.ok(gradeExpansion(half) >= KAPPA,
    'exactly half novel is ON the line and proceeds — the cut is strictly below half: ' + gradeExpansion(half));
});

test('FUZZ: total on garbage', () => {
  attempt(null, null, null, null, null, null); attempt(7, 'S0', 'x', 'gradeFoundation');
  current(null); expansionUnlocked(null); expansionUnlocked({});
  for (const g of [gradeFoundation, gradePitch, gradeProduct, gradePost, gradeRoute, gradeCycle, gradeExpansion]) {
    assert.equal(typeof g(null, null), 'number'); assert.equal(g(7, 'x'), 0);
  }
  const r = attempt(freshProgress(), 'S0', NaN, 'gradeFoundation', 'e', 't');
  assert.match(r.why, /no real score/);
  assert.ok(true);
});
