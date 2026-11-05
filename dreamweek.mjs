// dreamweek.mjs — the dream fold's one-week check, as a kernel (claims sealed first in CLAIMS-dream-week.md).
//
// The night's sandbox appends to one private ledger, in order: a `dream`, then (if the model answered) a
// `render` of its code and a `gate` of that code's own tests, maybe revision rounds of both, then a `note`.
// This kernel reads that order and counts, for one window of time, how many dreams there were, how many
// became code, how many had code that passed its own gate, and how many belonged to one title family. Then
// `verdict` compares two windows exactly as the sealed claims say. It reads only kinds, titles, times and
// whether a gate's detail records "clean":true — never a dream's or a render's text.
//
// PURE and TOTAL: no clock, no file; garbage in gives { ok:false, why }, never a throw.

import { dreamFamily } from './lessonsfold.mjs';

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const CLEAN = /"clean"\s*:\s*true/;
const rate = (n, d) => (d > 0 ? Math.round((n / d) * 10000) / 10000 : null);

// windowCounts(ledger, { from, to, family }) -> { ok, from, to, dreams, becameCode, passedGate, familyDreams,
//   renderRate, passedRate, familyShare } | { ok:false, why }
//   from, to — ISO times; a dream counts when from < ts <= to
//   family   — a title whose family is counted (e.g. 'PathFinder'); optional
export function windowCounts(ledger, opts) {
  if (!Array.isArray(ledger)) return { ok: false, why: 'ledger must be an array' };
  if (!isObj(opts)) return { ok: false, why: 'opts must be an object' };
  const from = typeof opts.from === 'string' ? Date.parse(opts.from) : NaN;
  const to = typeof opts.to === 'string' ? Date.parse(opts.to) : NaN;
  if (!Number.isFinite(from) || !Number.isFinite(to)) return { ok: false, why: 'opts.from and opts.to must be ISO times' };
  if (!(to > from)) return { ok: false, why: 'opts.to must be after opts.from' };
  const family = opts.family === undefined ? '' : dreamFamily(opts.family);
  if (opts.family !== undefined && !family) return { ok: false, why: 'opts.family must be a title' };

  let dreams = 0, becameCode = 0, passedGate = 0, familyDreams = 0;
  let open = null;                                   // the dream in the window that later entries belong to
  const close = () => {
    if (!open) return;
    if (open.rendered) becameCode += 1;
    if (open.clean) passedGate += 1;
    open = null;
  };
  for (const e of ledger) {
    if (!isObj(e)) continue;
    if (e.kind === 'dream') {
      close();
      const t = typeof e.ts === 'string' ? Date.parse(e.ts) : NaN;
      if (!(t > from && t <= to)) continue;            // a dream outside the window still closes the one before it
      dreams += 1;
      if (family && dreamFamily(e.title) === family) familyDreams += 1;
      open = { rendered: false, clean: false };
      continue;
    }
    if (!open) continue;
    if (e.kind === 'render') open.rendered = true;
    if (e.kind === 'gate' && typeof e.detail === 'string' && CLEAN.test(e.detail)) open.clean = true;
  }
  close();
  return {
    ok: true, from: opts.from, to: opts.to, dreams, becameCode, passedGate, familyDreams,
    renderRate: rate(becameCode, dreams), passedRate: rate(passedGate, dreams), familyShare: family ? rate(familyDreams, dreams) : null,
  };
}

// verdict(before, after) -> { ok, W1, W2 } — the sealed claims, read off two windowCounts results.
//   W1 HOLDS when the after window's render rate is higher; W2 HOLDS when its family share is lower.
//   Either is UNMEASURED when a window had no dreams (or no family was counted).
function judge(a, b, holds) {
  if (a === null || b === null) return 'UNMEASURED';
  return holds(a, b) ? 'HOLDS' : 'FAILS';
}
export function verdict(before, after) {
  if (!isObj(before) || !isObj(after) || before.ok !== true || after.ok !== true) return { ok: false, why: 'two measured windows' };
  return {
    ok: true,
    W1: judge(before.renderRate, after.renderRate, (a, b) => b > a),
    W2: judge(before.familyShare, after.familyShare, (a, b) => b < a),
  };
}

export default { windowCounts, verdict };
