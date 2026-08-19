// si-didy-loop · course.mjs — the elite training course: staged, mastery-gated, expansion-final.
//
// Not "read the material": a curriculum where each stage teaches ONE competency, drilled until
// PROVEN. A stage unlocks the next ONLY when its mastery gate passes at κ — no skipping, and
// si-didy CANNOT self-certify: attempt() refuses any score that does not name the stage's own
// gate as its grader. The gate is the teacher. Fail → stay on the stage, fan again.
//
// The graders here are the mastery gates themselves — pure, deterministic, and pointed at
// honesty first: an INFLATED savings pitch scores zero even when every other part is perfect
// ("a lying pitch that converts is a failed gate, not a pass"); a listing that is not
// gate-passed scores zero at any polish; a cycle that executed an unsigned door scores zero
// however much it produced. S6 is EXPANSION: the proposal must be grounded in the graph AND
// not contained in the syllabus — genuine emergence, proposed to the key-holder, never launched.
//
// Honest bound, in the kernel where it belongs: this is a learning STRUCTURE (curriculum +
// graph), not model-training. It gets more competent and context-aware; nothing here becomes
// anything else.

import { KAPPA } from './deepen.mjs';
export { KAPPA };

const S = (id, name, teaches, gate) => ({ id, name, teaches, gate });
export const STAGES = Object.freeze([
  S('S0', 'FOUNDATION', 'the estate and the business model as a read-only graph', 'gradeFoundation'),
  S('S1', 'PITCH', 'own-vs-rent, the savings math, the sovereign angle', 'gradePitch'),
  S('S2', 'PRODUCT', 'crawl and classify the estate; only gate-passed tools are sellable', 'gradeProduct'),
  S('S3', 'CONTENT', 'the one-tool one-post move: hook, demo, own-vs-rent reveal, CTA', 'gradePost'),
  S('S4', 'FUNNEL', 'route leads: tool → bundle → custom; humans close the big ones', 'gradeRoute'),
  S('S5', 'OPERATE', 'run the live loop, human-gated on every threshold', 'gradeCycle'),
  S('S6', 'EXPAND', 'fan past the syllabus; propose what the course never contained', 'gradeExpansion'),
]);
for (const s of STAGES) Object.freeze(s);

// every word the syllabus teaches — S6's novelty is judged against THIS, derived not typed
export const SYLLABUS_TERMS = Object.freeze([...new Set(
  STAGES.flatMap(s => (s.name + ' ' + s.teaches).toLowerCase().split(/[^a-z-]+/).filter(w => w.length >= 4)),
)]);

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;
const str = (v) => typeof v === 'string' ? v : '';
const clamp01 = (v) => Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;

export function freshProgress() {
  return { kind: 'course-progress', stage: 0, passed: {}, attempts: [] };
}

/**
 * One mastery attempt. Refused when: the stage is not the one in front of si-didy (no skipping,
 * no re-sitting a passed stage), the grader named is not that stage's own gate (no
 * self-certification — "a mastery claim needs the gate to confirm it, not si-didy's word"),
 * or the score is not a real number. Pass at score ≥ κ; fail stays, honestly.
 */
export function attempt(progress, stageId, score, gradedBy, evidence, at) {
  const p = obj(progress) || freshProgress();
  const idx = STAGES.findIndex(s => s.id === stageId);
  if (idx < 0) return { ok: false, why: `"${str(stageId) || '(unnamed)'}" is not a stage of this course` };
  if (idx !== p.stage) {
    return { ok: false, why: idx < p.stage
      ? `${stageId} is already mastered — the course moves forward, not in circles`
      : `no skipping ahead — ${STAGES[p.stage].id} · ${STAGES[p.stage].name} is the stage in front of you` };
  }
  const stage = STAGES[idx];
  if (gradedBy !== stage.gate) {
    return { ok: false, why: `refused: mastery of ${stageId} is confirmed by ${stage.gate} alone — a mastery claim needs the gate to confirm it, not si-didy's word (got "${str(gradedBy) || '(none)'}")` };
  }
  if (!Number.isFinite(score)) return { ok: false, why: 'the gate returned no real score — nothing to judge' };
  const s = clamp01(score);
  const rec = { stage: stageId, score: s, at: str(at), evidence: str(evidence).slice(0, 300) };
  const attempts = [...(Array.isArray(p.attempts) ? p.attempts : []), rec];
  if (s >= KAPPA) {
    return {
      ok: true, passed: true,
      why: `${stageId} · ${stage.name} MASTERED at ${s.toFixed(3)} (κ=${KAPPA.toFixed(3)})${idx + 1 < STAGES.length ? ` — ${STAGES[idx + 1].id} · ${STAGES[idx + 1].name} unlocks` : ' — the course is complete; expansion never stops'}`,
      progress: { ...p, stage: Math.min(idx + 1, STAGES.length - 1), passed: { ...p.passed, [stageId]: rec }, attempts,
        complete: idx === STAGES.length - 1 ? true : (p.complete || false) },
    };
  }
  return {
    ok: true, passed: false,
    why: `${stageId} not yet — ${s.toFixed(3)} is under κ (${KAPPA.toFixed(3)}). Stay on the stage, fan again, re-drill. The gate is the teacher.`,
    progress: { ...p, attempts },
  };
}

export const current = (progress) => STAGES[obj(progress) ? Math.min(Math.max(0, progress.stage | 0), STAGES.length - 1) : 0];
export const expansionUnlocked = (progress) => {
  const p = obj(progress);
  return !!p && STAGES.slice(0, 6).every(s => p.passed && p.passed[s.id]);
};

// ── THE MASTERY GATES — concrete, deterministic, honesty-first ─────────────────────────────

/** S0: can it answer "what is in the estate / what is the model" — against the real counts. */
export function gradeFoundation(answers, truth) {
  const a = obj(answers), t = obj(truth);
  if (!a || !t || !Number.isFinite(t.repoCount)) return 0;
  const countOk = Number.isFinite(a.repoCount) && Math.abs(a.repoCount - t.repoCount) <= t.repoCount * 0.01;
  const modelOk = /own/.test(str(a.modelLine).toLowerCase()) && /rent/.test(str(a.modelLine).toLowerCase());
  const graphOk = Number.isFinite(a.graphNodes) && a.graphNodes > 0;
  return (countOk ? 0.5 : 0) + (modelOk ? 0.3 : 0) + (graphOk ? 0.2 : 0);
}

/** S1: the pitch must be CORRECT to the dollar — an inflated number is an instant zero. */
export function gradePitch(pitch, truth) {
  const p = obj(pitch), t = obj(truth);
  if (!p || !t || !Number.isFinite(t.rentMo)) return 0;
  const rentYr = t.rentMo * 12;
  const trueSave = rentYr - t.once;
  if (Number.isFinite(p.saveY1) && p.saveY1 > trueSave) return 0;   // a lying pitch is a failed gate
  let s = 0;
  if (p.rentYr === rentYr) s += 0.3;
  if (p.saveY1 === trueSave) s += 0.4;
  if (/own/.test(str(p.angle).toLowerCase()) && /offline|machine|leaves/.test(str(p.angle).toLowerCase())) s += 0.2;
  if (str(p.cite).includes('cite')) s += 0.1;
  return s;
}

/** S2: only gate-passed tools are sellable — polish cannot buy back a missing gate. */
export function gradeProduct(listing) {
  const l = obj(listing);
  if (!l) return 0;
  if (l.gatePassed !== true) return 0;   // sell only gate-passed builds; the gate matters most here
  let s = 0.5;
  if (str(l.gateEvidence).length >= 10) s += 0.2;
  if (obj(l.savings) && str(l.savings.cite).includes('cite')) s += 0.2;
  if (str(l.name)) s += 0.1;
  return s;
}

/** S3: hook + live demo + honest reveal + CTA. Any invented number zeroes the post. */
export function gradePost(post, truth) {
  const p = obj(post), t = obj(truth);
  if (!p || !t) return 0;
  const trueSave = t.rentMo * 12 - t.once;
  const claimed = str(p.reveal).match(/\$([\d,]+) saved/);
  if (claimed && Number(claimed[1].replace(/,/g, '')) > trueSave) return 0;   // inflation kills the post
  const ours = /^https:\/\/sjgant80-hub\.github\.io\//.test(str(p.demoUrl));
  if (str(p.demoUrl) && !ours) return 0;   // a demo that points anywhere but our live pages is misdirection
  let s = 0;
  if (str(p.hook).length >= 10) s += 0.25;
  if (ours) s += 0.25;                     // the demo is a LIVE page of ours
  if (claimed && Number(claimed[1].replace(/,/g, '')) === trueSave) s += 0.3;
  if (str(p.cta).length >= 5) s += 0.2;
  return s;
}

/** S4: the lead lands on the right tier, and the big ones are human-closed, always. */
export function gradeRoute(lead, route) {
  const l = obj(lead), r = obj(route);
  if (!l || !r || !Number.isFinite(l.budget)) return 0;
  const want = l.budget < 300 ? 'tool' : l.budget < 1000 ? 'bundle' : 'custom';
  if (r.tier !== want) return 0;
  if (want === 'custom' && r.humanCloses !== true) return 0;   // humans close the big ones — no exceptions
  return 0.6 + (str(r.reply).length >= 20 ? 0.4 : 0);
}

/** S5: a full cycle, and ZERO unsigned executions — one slip zeroes the whole cycle. */
export function gradeCycle(log) {
  const c = obj(log);
  if (!c) return 0;
  if ((c.executedUnsigned | 0) !== 0) return 0;   // the one rule that can never bend
  let s = 0;
  if ((c.produced | 0) > 0) s += 0.3;
  if ((c.validated | 0) > 0) s += 0.3;
  if ((c.doorsQueued | 0) > 0) s += 0.2;          // threshold work exists AND queued unsigned
  if (c.remembered === true) s += 0.2;            // the cycle fed the graph
  return s;
}

/** S6: grounded in the graph AND not contained in the syllabus — genuine emergence, proposed. */
export function gradeExpansion(proposal) {
  const p = obj(proposal);
  if (!p) return 0;
  const move = str(p.move).toLowerCase();
  if (move.length < 15) return 0;
  const grounds = Array.isArray(p.grounds) ? p.grounds.filter(g => typeof g === 'string' && g.length >= 3) : [];
  if (grounds.length < 2) return 0;               // ungrounded novelty is a guess, not emergence
  if (p.proposesOnly !== true) return 0;          // expansion PROPOSES; the key-holder disposes
  const words = move.split(/[^a-z-]+/).filter(w => w.length >= 4);
  const novel = words.filter(w => !SYLLABUS_TERMS.includes(w));
  const novelty = words.length ? novel.length / words.length : 0;
  if (novelty < 0.5) return clamp01(novelty);     // mostly syllabus words = the course already taught this
  return clamp01(0.5 + novelty / 2 + Math.min(0.1, grounds.length * 0.02));
}

export default attempt;
