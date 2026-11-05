# si-didy-loop

**Live page: https://sjgant80-hub.github.io/si-didy-loop/** — what it is, start here, how it works (one real night traced), the week check, try the doors in your browser, the blueprint, adoption, and the business case.

The night shift of a local AI, kept honest. Every night a small model on one laptop dreams up a small piece of
software, writes it, tests it and keeps notes. This repo is the set of tested rules that keep that night honest:
what the model is reminded of before it dreams (`lessonsfold`), which notes may leave the machine (`sharedoor`),
what it may post (`rail` + `receiptgate` + `scrub`), which actions wait for a person's signature (`operator`,
`scope`), how a dreamed route is said in plain words (`deepen`, `plainsay`), the morning page (`brief`), and how a
change to the night is measured (`dreamweek`, claims sealed first).

## Gated

Every kernel is pure (no clock, no files, no network) and mutation-gated by [witness](https://github.com/sjgant80-hub/witness)
v0.6 on GitHub's runner on every push (`.github/workflows/ci.yml`). `receipts/gates.json` holds each kernel's test
count and verdict; `scripts/gates-check.mjs` re-derives it from the runner's own output on every push and CI fails
if one number differs. Argued exemptions, each with its reason, are in `witness.baseline.json`.

```bash
git clone https://github.com/sjgant80-hub/si-didy-loop
git clone --depth 1 https://github.com/sjgant80-hub/missig            # the conductor's sibling
git clone --depth 1 https://github.com/sjgant80-hub/generative-estate # the wisp's exams run on its field
cd si-didy-loop && npm test
```

## The week check (2026-11-05)

Sealed in `CLAIMS-dream-week.md` before the measuring code (`dreamweek.mjs`, `scripts/dreamweek-cli.mjs`); result in
`receipts/dream-week.json`: W1 (more dreams became code after the move to the 7B) HOLDS; W2 (the named repeat fell)
FAILS and is kept. The fold now counts a title's whole family (version markers like `++`, Optimized, Redux) so the
prompt names the real repeat.

## Vendored

- `receiptgate.mjs` = sjgant80-hub/post-proof@4cfa12b `kernel.mjs`, with that commit's suite as `receiptgate.test.mjs`.
- `scrub.mjs` = sjgant80-hub/fallscrub `scrub.mjs`, with its suite as `scrub.test.mjs`.
- `vendor/liveware/` = liveware@48205c7's cost-case kernel, its suite and the estate's sourced `basis.json`, byte for byte, pinned in `vendor/liveware/PINS.json` (checked by `vendor.test.mjs`).

## Credits

Powered by the Konomi architecture, created by Thomas Frumkin. The deepening loop's remember step was specified as
"remember like Gary": Gary W. Floyd, Lumiea Systems Research Division — ThunderStruck Service, LLC. Supplied by
[AI Native Solutions](https://www.ai-nativesolutions.com).

## License

MIT © 2026 sjgant80-hub
