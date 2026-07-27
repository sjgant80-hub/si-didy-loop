# si-didy-loop — agent instructions

The conductor — wires the five solids into a self-feeding loop (INIT to BUILD to VERIFY to REMEMBER to EXPLORE) that spirals instead of dead-orbiting, verified by the attractor liveness gate.

## Boundaries

- Keep si-didy-loop zero-dependency and deterministic. Do not add runtime dependencies.
- Every change to a source line must be covered by a test that fails when the line changes (witness gate).
- Do not skip, disable, or weaken a test to make the suite green. Fix the code or the test's premise.
- Structure and behaviour are gated by konomify; a change ships only when it stays konomified.
