// ════════════════════════════════════════════════════════════════
// si-didy-loop · the conductor — wires the five solids into a loop that runs on its own output.
//
//   INIT(tetra) → BUILD(cube) → VERIFY(octa · κ-gate) → REMEMBER(dodeca · fall-remember) → EXPLORE(icosa)
//                                                                                              ↘ back to INIT
//
// A closed loop that runs on its own output is self-referential (the "self-fold"). But the honest finding
// from the proof holds: CLOSING the loop is trivial and DEAD — a naive loop re-seeds the same state forever
// (a flatline / dead orbit). The work is making it SPIRAL — bounded but never repeating — which is the
// attractor band, between the dead orbit (too little novelty) and the runaway (too much). The §3 spiral fix:
//   · GOLDEN ADVANCE   — EXPLORE offsets the phase by the golden angle each cycle (never the same point)
//   · STALL DETECTION  — if the next phase lands near a recent one, kick it (no settling)
//   · FAILURE-FORWARD  — VERIFY's rejection is signal: a runaway build backs complexity off (learn, don't retry)
//   · SUCCESSION       — re-center on the newest stored success (climb around your latest result)
//
// SANDBOXED: BUILD forges fold-signatures (pure data), VERIFY/REMEMBER/EXPLORE are pure/local. Nothing here
// touches the real world — the loop's *liveness* is proven before any organ is ever wired to a real action.
// The REMEMBER organ is INJECTABLE (constructor takes `memory`): pass a fall-remember for the real store, or
// use the built-in minimal one. Self-contained, zero-dependency, deterministic.
// ════════════════════════════════════════════════════════════════

export const KAPPA = (Math.sqrt(5) - 1) / 2;             // 1/φ — the κ-gate threshold
export const GOLDEN = 2.399963229728653;                 // golden angle in radians (137.507°)
const TAU = 2 * Math.PI;
const SPINE = [2, 3, 5, 7, 11, 13, 17];
const wrap = (x) => ((x % TAU) + TAU) % TAU;

// ── the five organs ──────────────────────────────────────────────────────────
export const INIT = (seed) => ({ theta: seed.theta, complexity: seed.complexity, spine: SPINE }); // tetra: genesis

// cube: forge a candidate fold-signature from the task (pure — no side effects). Generation scales with
// complexity; resolution is bounded and phase-dependent. High complexity ⇒ generation outruns resolution ⇒ runaway.
export function BUILD(task) {
  const gen = Math.max(1, Math.round(2 + task.complexity));
  const res = 3 + Math.round(3 * (1 + Math.cos(task.theta)));
  return { seed: 'fold-0', spine: SPINE, folds: [{ axis: 2, angleK: 0, depth: gen }, { axis: 17, angleK: 0, depth: res }] };
}

// octa: the κ-gate — a candidate is admissible only if it resolves at least κ of what it generates.
export function VERIFY(cand) {
  let forge = 0, resolve = 0;
  for (const f of cand.folds) { forge += f.depth; if (f.axis === 17) resolve += f.depth; }
  return { valid: forge > 0 && resolve >= KAPPA * forge, forge, resolve };
}

// the minimal REMEMBER — a store() sink, so the loop is self-contained; inject fall-remember for the real organ
export const minimalMemory = () => { const items = []; return { store(m) { items.push(m); return m; }, get size() { return items.length; }, items }; };

export class SiDidyLoop {
  constructor({ strategy = 'spiral', memory } = {}) {
    this.strategy = strategy;
    this.mem = memory || minimalMemory();                  // REMEMBER organ (injectable)
    this.state = { theta: 0.5, complexity: 3 };
    this.recent = []; this.lastRejected = false; this.newestStoredComplexity = 3;
    this.cycle = 0; this.stored = 0; this.rejected = 0;
    this.forgeSeries = []; this.visited = new Set();
  }

  step() {
    const task = INIT(this.state);
    const cand = BUILD(task);
    const v = VERIFY(cand);
    this.forgeSeries.push(v.forge);                        // the liveness series attractor will classify
    this.visited.add(`${Math.round(this.state.theta * 100)}:${Math.round(this.state.complexity)}`);
    if (v.valid) {
      this.mem.store({ text: `fold θ${this.state.theta.toFixed(3)} c${this.state.complexity}`, sig: cand });
      this.stored++; this.newestStoredComplexity = this.state.complexity; this.lastRejected = false;
    } else { this.rejected++; this.lastRejected = true; }
    this.recent.push(this.state.theta); if (this.recent.length > 8) this.recent.shift();
    this.state = this.EXPLORE(v);
    this.cycle++;
    return { cycle: this.cycle, stored: this.stored, rejected: this.rejected, forge: v.forge, valid: v.valid };
  }

  // icosa: scout the next seed. The strategy is where a loop lives or dies.
  EXPLORE() {
    if (this.strategy === 'naive') return { theta: this.state.theta, complexity: this.state.complexity };      // dead orbit
    if (this.strategy === 'unbounded') return { theta: this.state.theta + GOLDEN, complexity: this.state.complexity + 1.5 }; // runaway

    // spiral — the §3 fix:
    let theta = this.state.theta + GOLDEN;                                     // GOLDEN ADVANCE
    let g = 0;                                                                 // STALL DETECTION
    while (this.recent.some((r) => { const d = wrap(theta - r); return d < 0.06 || d > TAU - 0.06; }) && g++ < 6) theta += GOLDEN;
    let complexity = this.newestStoredComplexity;                             // SUCCESSION (climb around latest success)
    complexity += this.lastRejected ? -1 : 0.5;                               // FAILURE FEEDS FORWARD
    complexity = Math.max(1, Math.min(complexity, 12));
    return { theta, complexity };
  }

  run(cycles) { for (let i = 0; i < cycles; i++) this.step(); return this.report(); }
  report() { return { cycles: this.cycle, stored: this.stored, rejected: this.rejected, distinct: this.visited.size, forgeSeries: this.forgeSeries.slice() }; }
}

export default SiDidyLoop;
