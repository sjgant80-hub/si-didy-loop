// si-didy-loop · sharedoor.mjs — THE SHARE DOOR. Kar's own weekly choice, 2026-10-25.
//
// The resident's rule 4 says a share needs "an explicit reason, logged and justified".
// sandbox.mjs's shareOf() enforced only "three real words" — so by October the door was
// passing platitudes ("Clear communication prevents project ambiguities and ensures
// successful collaboration.") that name nothing a reader could go and look at. That is a
// silent narrowing of rule 4: "justified" had shrunk to "long enough".
//
// And of 137 shares only 2 carried a time, so nobody could tell whether a lesson the
// ledger already knew (HysteresisGate, 7×) was being re-dreamed AFTER the ledger was
// wired into the dream step, or only before. A share with no time can't be folded by when.
//
// judgeShare(share, { now, known, anchors }) — pure and total, never throws:
//   · refuses anything that is not a share, and refuses a missing/invalid clock
//   · stamps `at` from the caller's clock (the kernel never reads one itself)
//   · SHUTS a reason that names nothing in the estate — a reason must point at a real
//     thing: an estate anchor word, or a code-shaped name (file.ext, camelCase, PascalCase).
//     The addressees (Simon, claudedidy, Kar) and the share's own title do not count.
//   · MARKS (never shuts) a share whose lesson the ledger already holds ≥2 times as a
//     repeat, unless the reason says what is new ("new:"). Rule 4 is the resident's pen —
//     a justified repeat may still go out; it just goes out labelled.
// This is a floor, not a ceiling: a reason can name an anchor and still be thin. It stops
// the reasons that point at nothing; it does not grade the ones that point at something.

export const DEFAULT_ANCHORS = [
  'gate', 'kernel', 'witness', 'mutant', 'mutation', 'baseline', 'fold', 'organ', 'ledger',
  'preflight', 'door-queue', 'bell', 'health-gate', 'recurse', 'proof-of-play', 'falljustice',
  'triad', 'seat', 'soul', 'wisp', 'mesh', 'sandbox', 'render', 'probe', 'verifier', 'doctrine',
  'threshold', 'checksum', 'quorum', 'boundary', 'door', 'memory', 'refusal', 'survivor',
  'estate', 'debrief', 'reuse', 'leak', 'seal', 'wall',
];

const ADDRESSEES = ['simon', 'claudedidy', 'kar', 'sididy', 'resident'];
const PREFIX = /^(learned|failure noted|lesson|share)\s*:\s*/i;

export function lessonKey(title) {
  if (typeof title !== 'string') return '';
  return title.replace(PREFIX, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The concrete things a reason names — anchors and code-shaped tokens, minus addressees and its own title. */
export function anchorsIn(reason, title, anchors) {
  if (typeof reason !== 'string') return [];
  const own = new Set(lessonKey(title).split(/[^a-z0-9]+/).filter(Boolean));
  const ownWhole = lessonKey(title).replace(/\s+/g, '');
  const found = [];
  for (const a of anchors) {
    if (typeof a !== 'string' || !a.trim()) continue;
    const re = new RegExp('(^|[^a-z0-9])' + esc(a.trim().toLowerCase()) + 's?(?=$|[^a-z0-9])', 'i');
    if (re.test(reason) && !own.has(a.trim().toLowerCase())) found.push(a.trim().toLowerCase());
  }
  const code = reason.match(/[A-Za-z_][\w-]*\.(?:mjs|js|json|html|ps1|md)\b|\b[a-z]+[A-Z]\w*\b|\b[A-Z][a-z]+[A-Z]\w*\b/g) || [];
  // a sandbox rule by number, or a gate score — both point at something a reader can check
  code.push(...(reason.match(/\brule\s*\d\b|\b\d+\/\d+\b/gi) || []));
  for (const c of code) {
    const k = c.toLowerCase();
    if (k === ownWhole || ADDRESSEES.includes(k)) continue;
    found.push(c);
  }
  return [...new Set(found)];
}

export function judgeShare(share, opts) {
  if (!share || typeof share !== 'object' || Array.isArray(share)) return { ok: false, why: 'not a share — the door judges shares only' };
  const { kind, title, reason } = share;
  if (typeof title !== 'string' || !title.trim()) return { ok: false, why: 'an untitled share points at nothing' };
  if (typeof reason !== 'string' || !reason.trim()) return { ok: false, why: 'rule 4: no reason, no share' };
  if (!opts || typeof opts !== 'object' || Array.isArray(opts)) return { ok: false, why: 'the door needs its options — at least the clock' };
  const t = typeof opts.now === 'string' ? Date.parse(opts.now) : NaN;
  if (!Number.isFinite(t)) return { ok: false, why: 'no clock, no share — a share with no time cannot be folded by when' };
  if (opts.anchors !== undefined && !Array.isArray(opts.anchors)) return { ok: false, why: 'anchors must be a list of words' };
  if (opts.known !== undefined && !Array.isArray(opts.known)) return { ok: false, why: 'known must be the ledger\'s list of lessons' };
  const anchors = opts.anchors === undefined ? DEFAULT_ANCHORS : opts.anchors;
  const at = new Date(t).toISOString();

  const named = anchorsIn(reason, title, anchors);
  if (named.length === 0) {
    return { ok: true, open: false, repeat: false, named, at,
      why: 'rule 4 asks for a reason that is justified — this one names nothing in the estate a reader could go and look at' };
  }

  const key = lessonKey(title);
  let seen = 0;
  for (const l of opts.known || []) {
    if (l && typeof l === 'object' && lessonKey(l.title) === key && Number.isInteger(l.count)) seen = Math.max(seen, l.count);
  }
  const saysNew = /(^|[^a-z])new\s*:/i.test(reason);
  const repeat = seen >= 2 && !saysNew;
  const out = { kind: typeof kind === 'string' ? kind : 'note', title: title.trim(), reason: reason.trim(), at };
  if (repeat) out.repeat = seen;
  return { ok: true, open: true, repeat, named, at, share: out,
    why: repeat ? 'open, labelled a repeat — the ledger already holds this lesson ' + seen + '×; say "new:" to show what this one adds'
                : 'open — the reason names ' + named.slice(0, 3).join(', ') };
}
