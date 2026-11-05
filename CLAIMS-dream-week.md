# CLAIMS — the dream fold's one-week check (sealed 2026-11-05, before the code that measures it)

This file is sealed. It is never edited after this commit. A result that fails stays on the record.

## Where the check comes from

On 2026-10-28 two changes went into the resident's night (si-didy `sandbox-run.mjs`, which vendors this
repo's `lessonsfold.mjs`): the dream prompt began naming the resident's own top-5 dream titles of the last 14
nights (`foldDreams`, commit 8a757fa), and the sandbox model default moved from `qwen2.5:14b` (which does not
fit the 15.7 GB laptop and timed out) to `qwen2.5:7b`. The build's memory set the check then: *"after a week
of 7B nights, fold renders/dreams and PathFinder's count — did more dreams become code, and did the named
repeats fall?"* It fell due on 2026-11-04. This file states exactly how it is measured, before the measuring
code exists.

## Not blind — said up front

Two rough looks at the ledger came before this seal: an auditor's read-only regex count on 2026-11-04
(44 dreams, 63 renders, 58 gates since 2026-10-28 12:00) and Kar's own read-only title count on 2026-11-05
(PathFinder spellings were the most dreamed titles since 2026-10-28). So these are a recorded check of a
prediction made on 2026-10-28, not a blind test. The predictions below are the ones the memory wrote on
2026-10-28, unchanged; nothing here was tuned to the look.

## Source and windows

- Source: the resident's private sandbox ledger `~/.si-didy/sandbox/ledger.json` (entries `{kind, title, detail, ts}`,
  kinds `dream`, `render`, `gate`, `note`). Read only. Nothing from a dream's or render's detail is published;
  the receipt carries counts and titles only.
- Window A (before, the 14B default): 2026-10-14T12:00:00Z < ts <= 2026-10-28T12:00:00Z.
- Window B (the first week on the 7B): 2026-10-28T12:00:00Z < ts <= 2026-11-04T12:00:00Z.
- Window B+ (through the check date, reported beside B, no claim of its own): 2026-10-28T12:00:00Z < ts <= 2026-11-05T12:00:00Z.

## Definitions

- A **dream** is a ledger entry of kind `dream` whose `ts` falls in the window.
- A dream **became code** when at least one `render` entry follows it in ledger order before the next `dream` entry.
- A dream's code **passed its own gate** when at least one `gate` entry follows it before the next `dream` and that
  gate's detail records `"clean":true`.
- The **render rate** of a window is dreams that became code / dreams.
- A title's **family**: the title with any `(revision n)` removed, then trailing version markers removed again and
  again — runs of `+`, and the words Redux, Optimized, Enhanced, Improved, Evolved, Refined, Revised, Advanced,
  Pro, Plus, Lite and V followed by digits, when joined in CamelCase (capitalised, straight after a lower-case
  letter or digit) or set off by a space, underscore or hyphen (any case) —
  then lower-cased with everything but letters and digits dropped. A marker is never removed when it is the
  whole title. So `PathFinder++`, `PathFinder+++`, `PathFinderOptimized` and `PathFinder Redux` are one family,
  `pathfinder`; `PathOptimizer` is not in it (Optimizer is a thing, not a version marker).
- The **PathFinder share** of a window is dreams whose family is `pathfinder` / dreams.

## The claims

- **W1 — more dreams became code.** The render rate of window B is higher than the render rate of window A.
  HOLDS if B > A, FAILS otherwise.
- **W2 — the named repeat fell.** The PathFinder share of window B is lower than the PathFinder share of window A.
  HOLDS if B < A, FAILS otherwise. (PathFinder was the top title the prompt named on 2026-10-28.)
- **W3 — reported, no bar.** Dreams whose code passed its own gate, in A and in B, as counts and as a share of
  dreams. No prediction was made for this on 2026-10-28, so none is made now.

## The fold fix this check sits beside

The same session fixes `foldDreams` so the prompt's list counts a title's family (the definition above) rather
than its exact spelling. That is a code change gated by tests and witness, not a measured claim; its effect on
the real ledger (the top-5 before and after) is reported in the receipt as description only.

Receipt: `receipts/dream-week.json`, written by `scripts/dreamweek-cli.mjs` from the gated kernel `dreamweek.mjs`.
