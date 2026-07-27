// ════════════════════════════════════════════════════════════════
// The acceptance gate — is the loop a SPIRAL or a DEAD ORBIT? The pass/fail test the spec asked for
// ("run 100 cycles: new territory or dead orbit?"), made concrete by the estate's own liveness organ:
// take the loop's trajectory and classify it with `attractor` — FLATLINE (dead), ESCAPED (runaway), or
// ATTRACTOR (the alive spiral). The conductor is only complete when the spiral strategy lands in the
// attractor band while the two failure strategies land in the two failure modes.
// Run:  node examples/spiral.mjs   (requires the sibling ../../attractor repo)
// ════════════════════════════════════════════════════════════════

import { SiDidyLoop } from '../si-didy-loop.mjs';
import { classify, CLASS } from '../../attractor/attractor.mjs';

const CYCLES = 200;
const expect = { naive: CLASS.FLATLINE, unbounded: CLASS.ESCAPED, spiral: CLASS.ATTRACTOR };

console.log(`si-didy-loop · LIVENESS GATE  (${CYCLES} cycles, classified by attractor)\n`);

let allPass = true;
for (const strategy of ['naive', 'unbounded', 'spiral']) {
  const loop = new SiDidyLoop({ strategy });
  const r = loop.run(CYCLES);
  const verdict = classify(r.forgeSeries);
  const ok = verdict.class === expect[strategy];
  allPass = allPass && ok;
  const label = strategy === 'spiral' ? 'spiral (the §3 fix)' : strategy === 'naive' ? 'naive (no fix)' : 'unbounded (no gate)';
  console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(22)} → ${verdict.class.toUpperCase().padEnd(10)} ` +
    `stored ${String(r.stored).padStart(3)} · rejected ${String(r.rejected).padStart(3)} · distinct states ${String(r.distinct).padStart(3)}` +
    `  (expected ${expect[strategy]})`);
}

console.log('');
console.log(allPass
  ? '✓ PASS — the conductor spirals. The naive loop dead-orbits (FLATLINE), the ungated loop runs away\n' +
    '  (ESCAPED), and the spiral fix lands in the ATTRACTOR band — bounded, never repeating, storing as it\n' +
    '  climbs. The self-fold is alive, not a circle. attractor (VERIFY) judges si-didy-loop — the mesh eats itself.'
  : '✗ a strategy did not land in its expected regime — the spiral fix or the metric needs work before this closes.');
