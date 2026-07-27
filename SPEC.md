# si-didy-loop — specification

## Purpose

The conductor — wires the five solids into a self-feeding loop (INIT to BUILD to VERIFY to REMEMBER to EXPLORE) that spirals instead of dead-orbiting, verified by the attractor liveness gate.

## Contract

- **BUILD** — part of the si-didy-loop public surface; deterministic, total (never throws).
- **INIT** — part of the si-didy-loop public surface; deterministic, total (never throws).
- **SiDidyLoop** — part of the si-didy-loop public surface; deterministic, total (never throws).
- **VERIFY** — part of the si-didy-loop public surface; deterministic, total (never throws).
- **default** — part of the si-didy-loop public surface; deterministic, total (never throws).
- **minimalMemory** — part of the si-didy-loop public surface; deterministic, total (never throws).

## Guarantees

- **Deterministic** — the same input yields the same output on any machine, any run.
- **Total** — hostile or malformed input returns a defined value, never an exception.
- **Zero-dependency** — no third-party runtime code inside the trust boundary.

## Verification

The suite exercises the public surface directly and is mutation-checked: a change to any guarded line makes a
test fail. konomify admits si-didy-loop only when both the structure rubric (acg-assessor) and the behaviour gate
(witness) pass.
