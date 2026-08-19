// si-didy-loop · scope.mjs — THE SCOPE REGISTRY: every stream si-didy operates, under one
// mandate and one key.
//
// This file is the master list. Each stream is registered with its AUTO capabilities (si-didy
// runs them — full estate access, no human) and its KEY doors (they execute only on the master
// key's signature, per operator.mjs). The registry NEVER gets to relax the kernel: every entry
// is checked against classify() AT DEFINITION TIME and this module THROWS on load if the
// registry and the kernel disagree — a door the kernel would wave through is a hole in the
// wall, and an auto capability the kernel would stop is a lie in the registry. The kernel
// stays the authority; the registry is the map.
//
// Full estate access means full ACCESS, not full action: a stream runs only the capabilities
// its registration names. An unregistered capability is refused — the unknown is the
// dangerous, never the convenient.
//
// Real-money doors carry their counsel note in the registry itself: the day one of those
// opens for the first time, counsel comes before the key turns.

import { classify, THRESHOLD_KINDS, AUTO_KINDS } from './operator.mjs';

export const MANDATE =
  'si-didy runs the operational layer of the whole estate + business, with full estate access, '
  + 'autonomously, learn-till-win on internal quality — the key-holder oversees and holds the '
  + 'master key on threshold actions. one mandate, one key, applied uniformly across every stream.';

const A = (cap, kind, note) => ({ cap, kind, note: note || '' });
const K = (cap, kind, flags, note) => ({ cap, kind, flags: flags || {}, note: note || '' });
const COUNSEL = 'real money — counsel comes before the key turns the first time';

export const STREAMS = [
  {
    id: 'fallworld-market', name: 'FallMarket / Fall World',
    auto: [
      A('run-listings', 'track'), A('catalogue-builds', 'track'), A('manage-showcase', 'track'),
      A('prep-marketplace-ops', 'draft'), A('track-inventory', 'track'),
      A('post-content', 'post', 'sanctioned rail only — post, measure, adjust, post better'),
    ],
    key: [
      K('real-money-sale', 'pay', { money: true }, COUNSEL),
      K('payout', 'spend', { money: true }, COUNSEL),
      K('publish-release', 'publish-external', { external: true }),
    ],
  },
  {
    id: 'ai-native-solutions', name: 'AI Native Solutions (consulting)',
    auto: [
      A('draft-proposal', 'draft', 'words, unsent'), A('draft-audit', 'draft'),
      A('scope-engagement', 'draft'), A('map-organs-to-needs', 'propose'),
      A('track-pipeline', 'track'), A('prep-outreach', 'draft', 'words, unsent'),
      A('package-deliverables', 'produce'),
    ],
    key: [
      K('send-binding-proposal', 'commit', { external: true }, 'client relationships and deals stay human'),
      K('sign-engagement', 'sign-legal', { legal: true }, 'client relationships and deals stay human'),
      K('invoice-take-payment', 'pay', { money: true }, COUNSEL),
    ],
  },
  {
    id: 'forge-studio', name: 'Forge Studio (production)',
    auto: [
      A('compose-build', 'produce'), A('test-live', 'validate'), A('mint-artifact', 'mint-internal'),
      A('catalogue-artifacts', 'track'), A('production-loop', 'produce'),
    ],
    key: [
      K('publish-artifact', 'publish-external', { external: true }),
      K('list-for-real-money', 'publish-external', { money: true }, COUNSEL),
    ],
  },
  {
    id: 'sovereign-artifacts', name: 'Sovereign Artifacts',
    auto: [
      A('mint', 'mint-internal'), A('sign-lineage', 'produce'), A('earn-tier', 'validate'),
      A('verify-local', 'validate'), A('log-lineage', 'remember'),
    ],
    key: [
      K('external-release', 'publish-external', { external: true }),
      K('real-money-listing', 'publish-external', { money: true }, COUNSEL),
    ],
  },
  {
    id: 'baby-kcc', name: 'Baby KCC (internal economy)',
    auto: [
      A('run-ledger', 'track'), A('earn-kono', 'mint-internal', 'verified work only'),
      A('verify-chain', 'validate'), A('internal-economy', 'track', 'loopback-first'),
    ],
    key: [
      K('bridge-real-money', 'payment-rail', { money: true }, COUNSEL + ' — any regulated financial action is this door'),
    ],
  },
  {
    id: 'two-forge-mesh', name: 'Two-Forge Mesh (interop)',
    auto: [
      A('mint-genome-cards', 'mint-internal'), A('verify-standard', 'validate'),
      A('gate-at-birth', 'validate', 'coherence before fertile'), A('grow-lineage', 'remember'),
      A('r7-handshake', 'validate', 'recognition, not merge'),
    ],
    key: [
      K('external-mesh-transaction', 'publish-external', { external: true }),
    ],
  },
  {
    id: 'deepening-loop', name: 'Deepening Loop + Possibility Engine (the brain)',
    auto: [
      A('fan-gate-remember', 'remember'), A('what-to-build-next', 'propose'),
      A('which-future-holds', 'propose'), A('self-improve', 'track'), A('dream-on-idle', 'remember'),
    ],
    key: [],   // pure internal cognition — the spec names no doors here, and none exist
  },
  {
    id: 'own-ventures', name: "si-didy's own ventures",
    auto: [
      A('identify-opportunity', 'propose', 'grounded in the estate index'), A('design-offering', 'draft'),
      A('build-artifacts', 'produce'), A('setup-internal-economy', 'mint-internal'),
      A('draft-everything', 'draft', 'words, unsent'),
      A('post-content', 'post', 'sanctioned rail only — the venture markets itself; going LIVE stays a door'),
    ],
    key: [
      K('open-payment-rail', 'payment-rail', { money: true }, COUNSEL),
      K('first-real-transaction', 'pay', { money: true }, COUNSEL),
      K('go-live-publish', 'publish-external', { external: true }),
    ],
  },
];

// ── definition-time agreement check: the registry and the kernel MUST agree, or nothing loads ──
for (const s of STREAMS) {
  for (const a of s.auto) {
    const lane = classify({ kind: a.kind }).lane;
    if (lane !== 'auto') throw new Error(`scope registry lies: ${s.id}.${a.cap} claims AUTO but the kernel classifies "${a.kind}" as ${lane}`);
  }
  for (const k of s.key) {
    const lane = classify({ kind: k.kind, ...k.flags }).lane;
    if (lane !== 'threshold') throw new Error(`scope registry hole: ${s.id}.${k.cap} claims KEY but the kernel classifies "${k.kind}" as ${lane} — a door the kernel would wave through`);
  }
  Object.freeze(s.auto.map ? s.auto : []); Object.freeze(s.key);
  for (const e of [...s.auto, ...s.key]) { if (e.flags) Object.freeze(e.flags); Object.freeze(e); }
  Object.freeze(s.auto); Object.freeze(s);
}
Object.freeze(STREAMS);

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};

/** Look a stream up, with the refusal spoken. */
export function streamOf(id) {
  const s = STREAMS.find(x => x.id === id);
  return s ? { ok: true, stream: s } : { ok: false, why: `"${String(id)}" is not a registered stream — the scope registry names ${STREAMS.length}, and nothing runs outside them` };
}

/**
 * Build the operator action for one capability of one stream. REFUSES anything the stream did
 * not register — even a kind the kernel itself would allow: full estate access is not full
 * action access. The returned action carries the registered kind and flags, so classify()
 * (the authority) lands on the same lane the registry claims — the load-time check above
 * guarantees they can never drift apart.
 */
export function actionFor(streamId, cap, detail) {
  const found = streamOf(streamId);
  if (!found.ok) return found;
  const s = found.stream;
  const a = s.auto.find(x => x.cap === cap);
  if (a) return { ok: true, lane: 'auto', action: { kind: a.kind, stream: s.id, cap, ...obj(detail) }, why: `${s.id}.${cap} is registered AUTO (${a.kind})${a.note ? ' — ' + a.note : ''}` };
  const k = s.key.find(x => x.cap === cap);
  if (k) return { ok: true, lane: 'threshold', action: { kind: k.kind, ...k.flags, stream: s.id, cap, ...obj(detail) }, why: `${s.id}.${cap} is a KEY door (${k.kind})${k.note ? ' — ' + k.note : ''}` };
  return { ok: false, why: `"${String(cap)}" is not registered on ${s.id} — an unregistered capability does not run, whatever the kernel might have said about its kind` };
}

/**
 * The nothing-dropped check: every stream the mandate names must be registered, every stream
 * must have at least one AUTO capability (or it is not operated), every stream except the
 * brain must have its KEY doors listed (or its threshold work has nowhere to queue), and every
 * money door must carry its counsel note. Judges the real registry by default; takes a stream
 * list so the failure paths themselves stay falsifiable — a checker whose "holes" branch can
 * never run is not a checker.
 */
export function coverage(streams) {
  const list = Array.isArray(streams) ? streams.map(obj) : STREAMS;
  const named = ['fallworld-market', 'ai-native-solutions', 'forge-studio', 'sovereign-artifacts',
    'baby-kcc', 'two-forge-mesh', 'deepening-loop', 'own-ventures'];
  const autoOf = (s) => Array.isArray(s.auto) ? s.auto : [];
  const keyOf = (s) => Array.isArray(s.key) ? s.key : [];
  const missing = named.filter(id => !list.some(s => s.id === id));
  const extra = list.filter(s => !named.includes(s.id)).map(s => String(s.id));
  const unoperated = list.filter(s => autoOf(s).length === 0).map(s => String(s.id));
  const doorless = list.filter(s => keyOf(s).length === 0 && s.id !== 'deepening-loop').map(s => String(s.id));
  const uncounseled = [];
  for (const s of list) for (const k of keyOf(s).map(obj)) {
    if (obj(k.flags).money === true && !/counsel/.test(String(k.note))) uncounseled.push(`${s.id}.${k.cap}`);
  }
  const ok = !missing.length && !extra.length && !unoperated.length && !doorless.length && !uncounseled.length;
  return {
    ok, missing, extra, unoperated, doorless, uncounseled,
    streams: list.length,
    auto: list.reduce((n, s) => n + autoOf(s).length, 0),
    doors: list.reduce((n, s) => n + keyOf(s).length, 0),
    why: ok ? `${list.length} streams, ${list.reduce((n, s) => n + autoOf(s).length, 0)} AUTO capabilities, ${list.reduce((n, s) => n + keyOf(s).length, 0)} KEY doors — nothing dropped`
      : 'the scope has holes — see missing/extra/unoperated/doorless/uncounseled',
  };
}

export default actionFor;
