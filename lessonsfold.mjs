// lessonsfold.mjs — fold the sandbox's own share log into recurring lesson SHAPES.
//
// The problem this closes: shares.json is a flat append-only log of "learned:"/"failure
// noted:" entries. Nothing ever asked "has this title come up before?" — so the same
// fix (HysteresisGate, TrustDecay, QuorumFold, CycleGuard, ...) gets independently
// rediscovered from scratch on separate nights, with no memory of its own prior nights.
// This kernel is pure and total: it takes the shares array (never reads a file itself —
// the runner wires that) and returns which titles recurred, how often, and one already-
// public sample reason per title — never the archived kernel/dream detail (rule 7 never
// put that in shares.json to begin with, so there is nothing private to leak here).

function isPlainObject(x) {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

// A share's bare title, stripped of the "learned: " / "failure noted: " prefix that the
// sandbox's own note-writer adds — recurrence is about the THING, not which night it was
// a success or a failure.
function bareTitle(title) {
  if (typeof title !== 'string') return null;
  const t = title.trim();
  if (!t) return null;
  const m = t.match(/^(?:learned|failure noted)\s*:\s*(.+)$/i);
  return (m ? m[1] : t).trim();
}

// foldLessons(shares, opts) -> { ok, lessons } | { ok:false, why }
//   shares         — the array as loaded from shares.json (or any equivalent array)
//   opts.minCount  — minimum recurrence to be reported (default 2 — "recurred" means
//                    more than once; a single mention is just a share, not a pattern)
// Each returned lesson: { title, count, firstAt, lastAt, sample }
//   - title  : the bare, de-prefixed name (e.g. "HysteresisGate")
//   - count  : how many shares matched this title
//   - firstAt/lastAt : ISO timestamps if the shares carried them, else null
//   - sample : the most recent non-empty reason text for this title (already public —
//              it is exactly what rule 7 already allowed out; never the archived detail)
// Sorted by count desc, then title asc, so the most-rediscovered lesson leads every time.
export function foldLessons(shares, opts = {}) {
  if (!Array.isArray(shares)) return { ok: false, why: 'shares must be an array' };
  if (opts === null || typeof opts !== 'object') return { ok: false, why: 'opts must be an object' };
  const minCount = opts.minCount === undefined ? 2 : opts.minCount;
  if (typeof minCount !== 'number' || !Number.isFinite(minCount) || minCount < 1) {
    return { ok: false, why: 'opts.minCount must be a finite number >= 1' };
  }

  const byTitle = new Map(); // bareTitle -> { count, firstAt, lastAt, sample }
  for (const s of shares) {
    if (!isPlainObject(s)) continue;
    const title = bareTitle(s.title);
    if (!title) continue;
    const at = typeof s.at === 'string' ? s.at : null;
    const reason = typeof s.reason === 'string' && s.reason.trim() ? s.reason.trim() : null;

    const entry = byTitle.get(title) || { count: 0, firstAt: null, lastAt: null, sample: null };
    entry.count += 1;
    if (at && (entry.firstAt === null || at < entry.firstAt)) entry.firstAt = at;
    if (at && (entry.lastAt === null || at >= entry.lastAt)) { entry.lastAt = at; if (reason) entry.sample = reason; }
    else if (!entry.sample && reason) entry.sample = reason; // keep SOME sample even with no timestamps
    byTitle.set(title, entry);
  }

  const lessons = [];
  for (const [title, e] of byTitle) {
    if (e.count < minCount) continue;
    lessons.push({ title, count: e.count, firstAt: e.firstAt, lastAt: e.lastAt, sample: e.sample });
  }
  // byTitle's keys are unique, so a.title === b.title never occurs here — localeCompare
  // (not a raw operator) also removes this line from the mutation-operator surface entirely.
  lessons.sort((a, b) => (b.count - a.count) || a.title.localeCompare(b.title));

  return { ok: true, lessons };
}
