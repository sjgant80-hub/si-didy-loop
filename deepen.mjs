// si-didy-loop · deepen.mjs — the DEEPENING LOOP: fan → gate → remember (+ dream on idle).
//
// charlies is FAN only: a wide, fluent, ungated possibility-fan — deep-SEEMING, never deepening,
// and dangerous exactly where it is impressive (a real specific woven into an ungrounded frame).
// si-didy generic is GATE only: grounded but narrow — it never fans, so it feels generic.
// This kernel is BOTH, in order, per turn:
//
//   FAN      — free-associate WIDE over the typed knowledge graph: edge-walk from the context,
//              hold many branches open, weight decaying by κ per hop (association fades honestly).
//   GATE     — collapse the fan to the coherent: drop contradicted-without-support, drop the
//              ungrounded, drop the too-faint. Nothing ungrounded ships. Every drop is a sentence.
//   REMEMBER — each kept multi-hop branch becomes ONE new typed edge with provenance, so the next
//              fan reads a DENSER graph. The deepening is a function of USE, not retraining.
//   DREAM    — on idle: fan→gate over the graph itself, deterministically seeded; what survives is
//              HELD OPEN (returned, never written) — the shadow surface holds possibilities, the
//              ground graph holds only what the gate passed in a real turn.
//
// The graph is INJECTED by contract (the kg.mjs shape, adapted): { node(id), edgesFrom(id),
// addEdge(from,to,type,opts), hasEdge(from,type,to) }. The kernel judges; the runner wires the
// real graph and the real store. Pure, total, no clock, no I/O — timestamps are handed in.
//
// HONEST BOUND: this is accumulating MEMORY, not model-training and not a mind waking up. It gets
// richer-associating and more context-aware per use because the graph compounds — nothing more,
// and that is already the thing charlies cannot do.

export const KAPPA = (Math.sqrt(5) - 1) / 2;   // 1/φ — the decay per hop AND the gate band

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
const arr = (v) => Array.isArray(v) ? v : [];
const fns = (g) => {
  const G = obj(g);
  return typeof G.node === 'function' && typeof G.edgesFrom === 'function'
    && typeof G.addEdge === 'function' && typeof G.hasEdge === 'function' ? G : null;
};

export const DEFAULTS = Object.freeze({
  depth: 3,          // hops the fan may reach
  width: 34,         // branches held open (a fibonacci, because of course)
  floor: KAPPA * KAPPA, // normalized weight below this is too faint to keep
  contradicts: 'clash',
  rememberAs: 'kin',
});

/**
 * FAN — breadth-first association from the context nodes. Follows every edge type EXCEPT the
 * contradicting one (a clash is recorded onto the branch it touches, never walked through — the
 * type-awareness is the whole point of a typed graph). Weight = Π(edge weights) · κ^(hops−1):
 * distant association fades at the golden rate rather than pretending hop five is as sure as hop
 * one. Returns branches sorted strongest-first, capped at width — MANY held open, like charlies.
 */
export function fan(g, contextIds, opts) {
  const G = fns(g);
  if (!G) return [];
  const o = { ...DEFAULTS, ...obj(opts) };
  const roots = arr(contextIds).map(String).filter(id => G.node(id));
  const branches = [];
  const seen = new Set(roots);
  let frontier = roots.map(id => ({ node: id, path: [], weight: 1 }));
  for (let hop = 1; hop <= o.depth && frontier.length; hop++) {
    const next = [];
    for (const b of frontier) {
      for (const e of arr(G.edgesFrom(b.node))) {
        if (!e || typeof e.to !== 'string') continue;
        if (e.type === o.contradicts) continue;            // never walk THROUGH a contradiction
        if (seen.has(e.to)) continue;
        seen.add(e.to);
        const w = Number.isFinite(e.weight) && e.weight > 0 ? e.weight : 1;
        const weight = b.weight * w * (hop === 1 ? 1 : KAPPA);
        const clash = arr(G.edgesFrom(e.to)).some(x => x && x.type === o.contradicts);
        const branch = {
          node: e.to,
          root: b.path.length ? b.path[0].from : b.node,
          path: [...b.path, { from: e.from, type: e.type, to: e.to }],
          hops: hop,
          weight,
          clash,                                           // touched by a contradiction — the gate weighs it
          grounded: !!(obj(G.node(e.to)).meta && obj(G.node(e.to)).meta.src),
        };
        branches.push(branch);
        next.push({ node: e.to, path: branch.path, weight });
      }
    }
    frontier = next;
  }
  branches.sort((a, b) => b.weight - a.weight || String(a.node).localeCompare(String(b.node)));
  return branches.slice(0, o.width);
}

/**
 * GATE — the collapse. Three refusals, each its own sentence:
 *   contradicted without support — the branch's node is touched by a clash edge and carries no
 *     supporting kin/complementary edge back into the fan (charlies' real-patent-in-a-fantasy);
 *   ungrounded — the node has no provenance (no meta.src): the fan may HOLD it, the gate will not SHIP it;
 *   too faint — normalized weight under the floor: an association that faded past κ² is a whisper.
 * What survives is the near-κ band and above. Nothing ungrounded ships.
 */
export function gate(branches, opts) {
  const o = { ...DEFAULTS, ...obj(opts) };
  const list = arr(branches).filter(b => b && typeof b === 'object');
  const max = list.reduce((m, b) => Math.max(m, Number.isFinite(b.weight) ? b.weight : 0), 0);
  const kept = [], dropped = [];
  // support = the un-clashed nodes of the fan AND the roots themselves — the context is
  // trivially supported, or nothing adjacent to it could ever be
  const supported = new Set(list.filter(b => !b.clash).map(b => b.node));
  for (const b of list) if (typeof b.root === 'string') supported.add(b.root);
  for (const b of list) {
    const norm = max > 0 ? (Number.isFinite(b.weight) ? b.weight : 0) / max : 0;
    if (b.clash && !arr(b.path).some(e => e && (e.type === 'kin' || e.type === 'complementary') && supported.has(e.from))) {
      dropped.push({ branch: b, why: 'contradicted without support — a clash touches it and nothing in the fan backs it' });
      continue;
    }
    if (!b.grounded) {
      dropped.push({ branch: b, why: 'ungrounded — no provenance on the node; the fan may hold it, the gate will not ship it' });
      continue;
    }
    if (norm < o.floor) {
      dropped.push({ branch: b, why: `too faint — the association faded to ${norm.toFixed(3)}, under the κ² floor` });
      continue;
    }
    kept.push({ ...b, norm });
  }
  return { kept, dropped };
}

/**
 * REMEMBER — each kept MULTI-hop branch becomes one new typed edge (root → node), with provenance
 * in the meta: who wrote it (deepen), when (the stamp the caller supplies), and the path it was
 * discovered along. One-hop branches are edges the graph already has — remembering them again
 * would be an echo, not a deepening. Existing edges are skipped, never overwritten.
 */
export function remember(g, kept, stamp, opts) {
  const G = fns(g);
  if (!G) return { added: 0, skipped: 0 };
  const o = { ...DEFAULTS, ...obj(opts) };
  let added = 0, skipped = 0;
  for (const b of arr(kept)) {
    if (!b || b.hops < 2 || typeof b.root !== 'string' || typeof b.node !== 'string') { skipped++; continue; }
    if (G.hasEdge(b.root, o.rememberAs, b.node)) { skipped++; continue; }
    G.addEdge(b.root, b.node, o.rememberAs, {
      weight: Number.isFinite(b.norm) ? b.norm : KAPPA,
      meta: {
        by: 'deepen',
        at: typeof stamp === 'string' ? stamp : '',
        via: arr(b.path).map(e => `${e.from} -${e.type}→ ${e.to}`).join(' · '),
      },
    });
    added++;
  }
  return { added, skipped };
}

/**
 * DREAM — the idle pass: fan→gate over the graph itself, seeds chosen DETERMINISTICALLY (the
 * caller names them, or provides the node list and the golden index rotates through it by the
 * cycle count — no randomness, so the same graph and cycle always dream the same dream). What
 * survives the gate is HELD, not written: the ground graph only ever grows in a real turn.
 */
export function dream(g, seedIds, cycle, opts) {
  const G = fns(g);
  if (!G) return { held: [], seeds: [] };
  const pool = arr(seedIds).map(String).filter(id => G.node(id));
  if (!pool.length) return { held: [], seeds: [] };
  const c = Number.isFinite(cycle) && cycle >= 0 ? Math.floor(cycle) : 0;
  const idx = Math.floor((c * KAPPA * pool.length)) % pool.length;   // the golden advance over the pool
  const seeds = [pool[idx], pool[(idx + 1) % pool.length]].filter((v, i, a) => a.indexOf(v) === i);
  // a dream fans WIDER than a turn: dense seeds fill a narrow fan with one-hop neighbours and
  // the two-hop discoveries — the only thing a dream is for — never fit under the cap
  const fanned = fan(G, seeds, { width: 89, ...obj(opts) });
  const { kept } = gate(fanned, opts);
  return {
    seeds,
    held: kept.filter(b => b.hops >= 2).map(b => ({
      node: b.node, root: b.root, norm: b.norm,
      why: 'held open on the shadow surface — interesting, gate-passed in a dream, unconfirmed by a real turn',
    })),
  };
}

/** The whole turn: fan wide → gate to coherent → remember as edges. Returns the full account. */
export function deepenTurn(g, contextIds, stamp, opts) {
  const fanned = fan(g, contextIds, opts);
  const { kept, dropped } = gate(fanned, opts);
  const { added, skipped } = remember(g, kept, stamp, opts);
  return {
    fanned: fanned.length,
    kept: kept.length,
    dropped,
    added,
    skipped,
    account: `fanned ${fanned.length} · kept ${kept.length} · dropped ${dropped.length}, each with its reason · `
      + (added > 0 ? `${added} new edge(s) — the graph is denser than it was` : 'nothing new — the graph already knew this ground'),
  };
}

export default deepenTurn;
