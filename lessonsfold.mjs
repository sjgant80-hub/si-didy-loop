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

// ⚑ Kar's dream fold (2026-10-28, ask kar-ask-2026-10-25-001 answered): shares.json stopped
// moving on 2026-10-10 (every note since chose PRIVATE), so a lesson list folded from it
// named the same five shapes every night while the resident re-dreamed others it could not
// see (PathFinder 37 times). The resident's own private ledger holds every dream with its
// time, so the "you have been here before" list is folded from there: its own dream titles
// in the last few nights, counted. Titles only — never a dream's detail.
//
// foldDreams(ledger, opts) -> { ok, lessons } | { ok:false, why }
//   ledger        — the sandbox ledger array (entries { kind, title, ts, ... })
//   opts.now      — ISO time the window ends at (required: the kernel reads no clock)
//   opts.days     — how many nights back to look (default 14)
//   opts.minCount — the least times a title must recur to be named (default 2)
// Each returned lesson: { title, count, lastAt } — the title as most recently dreamed, how
// many times it was dreamed in the window, and when last. A revision's "(revision n)" suffix
// and spacing, case and punctuation do not make a title new. Sorted like foldLessons.
//
// ⚑ 2026-11-05, the one-week check: the 7B re-dreams a thing under a version marker — the
// real ledger's 14 nights to 2026-11-05 hold PathFinder++ 11x, PathFinder+++ 4x,
// PathFinderOptimized 2x, PathFinder Redux, PathFinderEnhanced, Color Harmonizer Pro,
// NoiseReducerEnhanced, and earlier PathFinderReduxV2 / PathFinderReduxLite. Punctuation-
// insensitive folding caught the plus runs but not the words, so the list named the latest
// spelling ("PathFinder+++") and split the family. dreamBase strips trailing version
// markers — runs of '+', and the words below or V<digits>, CamelCase-joined (capitalised,
// straight after a lower-case letter or digit) or set off by a space, '_' or '-' (any case)
// — so a family counts once, under its plain name. A marker is never the whole title
// ("Pro" stays "Pro"), and a thing is not a marker: PathOptimizer is not PathFinder.
// The rule is the one sealed in CLAIMS-dream-week.md.
export const VERSION_MARKERS = Object.freeze(['Redux', 'Optimized', 'Enhanced', 'Improved', 'Evolved', 'Refined', 'Revised', 'Advanced', 'Pro', 'Plus', 'Lite']);
//
// ⚑ 2026-11-06, the strict re-check: the rule shipped as ONE regex, (separators | marker)+$, whose
// nested repeats can split a run of separators in exponentially many ways before it fails. A title
// of 'PathFinder', 26 spaces and an 'x' took 2.1 s, and every two more spaces tripled it, so a model
// title with a long gap in it would hang the night's fold. The same rule is now read right to left, one marker at
// a time, in time linear in the title; the suite holds it to the old regex on 20,000 generated titles
// and every spelling above, and times a 100,000-character gap.
const SEP = /[\s_-]/;                       // sets a word marker off (any case)
const RUN = /[\s_+-]/;                      // a run of these, '+' included, is a marker by itself
const DIGIT = /\d/;
const JOIN = /[a-z0-9]/;                    // CamelCase-joined: straight after a lower-case letter or digit
const anyCase = (w) => w.replace(/[A-Za-z]/g, (c) => '[' + c.toUpperCase() + c.toLowerCase() + ']');
const ANY_CASE = new Map(VERSION_MARKERS.map((m) => [m, new RegExp('^' + anyCase(m) + '$')]));
// where the version marker that ends just before s[j] starts, or j when no marker ends there.
// Every character test reads one character (charAt gives '' past either end, which no class matches).
function markerStart(s, j) {
  let i = j;
  while (RUN.test(s.charAt(i - 1))) i -= 1;
  if (i < j) return i;
  while (DIGIT.test(s.charAt(i - 1))) i -= 1;
  let k = j, exact = false;
  if (i < j) {                                // V<digits>
    const v = s.charAt(i - 1);
    if (v === 'V' || v === 'v') { k = i - 1; exact = v === 'V'; }
  } else {
    for (const m of VERSION_MARKERS) {
      const w = s.slice(j - m.length, j);
      if (ANY_CASE.get(m).test(w)) { k = j - m.length; exact = w === m; }
    }
  }
  const before = s.charAt(k - 1);
  if (SEP.test(before)) return k;             // set off by a separator: any case
  if (exact && JOIN.test(before)) return k;   // joined: only as written
  return j;
}
export function dreamBase(title) {
  if (typeof title !== 'string') return '';
  const s = title.replace(/\(revision \d+\)/gi, '').trim();
  let j = s.length;
  for (let k = markerStart(s, j); k !== j; k = markerStart(s, j)) j = k;
  return s.slice(0, j).trim();
}
// the family a title belongs to: its base, with spacing, case and punctuation dropped
export function dreamFamily(title) {
  return dreamBase(title).toLowerCase().replace(/[^a-z0-9]/g, '');
}
const DAY_MS = 86400000;
export function foldDreams(ledger, opts = {}) {
  if (!Array.isArray(ledger)) return { ok: false, why: 'ledger must be an array' };
  if (opts === null || typeof opts !== 'object') return { ok: false, why: 'opts must be an object' };
  const end = typeof opts.now === 'string' ? Date.parse(opts.now) : NaN;
  if (!Number.isFinite(end)) return { ok: false, why: 'opts.now must be an ISO time' };
  const days = opts.days === undefined ? 14 : opts.days;
  if (typeof days !== 'number' || !Number.isFinite(days) || days <= 0) return { ok: false, why: 'opts.days must be a finite number > 0' };
  const minCount = opts.minCount === undefined ? 2 : opts.minCount;
  if (typeof minCount !== 'number' || !Number.isFinite(minCount) || minCount < 1) return { ok: false, why: 'opts.minCount must be a finite number >= 1' };
  const start = end - days * DAY_MS;

  const byKey = new Map(); // key -> { title, count, lastAt }
  for (const e of ledger) {
    if (!isPlainObject(e) || e.kind !== 'dream' || typeof e.ts !== 'string') continue;
    const t = Date.parse(e.ts);
    if (!(t > start && t <= end)) continue;
    const key = dreamFamily(e.title);
    if (!key) continue;
    const entry = byKey.get(key) || { title: '', count: 0, lastAt: '' };
    entry.count += 1;
    if (e.ts >= entry.lastAt) { entry.lastAt = e.ts; entry.title = dreamBase(e.title); }
    byKey.set(key, entry);
  }
  const lessons = [];
  for (const e of byKey.values()) if (e.count >= minCount) lessons.push({ title: e.title, count: e.count, lastAt: e.lastAt });
  lessons.sort((a, b) => (b.count - a.count) || a.title.localeCompare(b.title));
  return { ok: true, lessons };
}
