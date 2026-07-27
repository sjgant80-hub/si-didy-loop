# si-didy-loop

The conductor — wires the five solids into a self-feeding loop (INIT to BUILD to VERIFY to REMEMBER to EXPLORE) that spirals instead of dead-orbiting, verified by the attractor liveness gate.

## What it is

si-didy-loop is a deterministic, zero-dependency estate tool. The conductor — wires the five solids into a self-feeding loop (INIT to BUILD to VERIFY to REMEMBER to EXPLORE) that spirals instead of dead-orbiting, verified by the attractor liveness gate. It never throws on hostile input and
produces the same result on every machine.

## API

- `BUILD`
- `INIT`
- `SiDidyLoop`
- `VERIFY`
- `default`
- `minimalMemory`

## Verify

```bash
npm test
```

Every source line is guarded by a test (mutation-checked with witness). Structure and behaviour are gated by
konomify before this build joins the mesh.

## License

MIT © 2026 sjgant80-hub
