// si-didy-loop · operator.mjs — the autonomous business operator, and the doors it cannot open.
//
// Two layers, one rule:
//   OPERATIONAL — si-didy's own thing, no human in the loop: produce, validate, mint internally,
//                 track, propose, improve. Learn-till-win on an INTERNAL quality metric only.
//   THRESHOLD   — money, legal, irreversible, external. si-didy PREPARES these fully, they QUEUE,
//                 and they execute ONLY with the master key's Ed25519 signature. The key is yours,
//                 lives outside si-didy's reach, and this kernel never sees a private key at all —
//                 it only verifies.
//
// The classification is FIXED (frozen): si-didy cannot reclassify a door, cannot self-sign, cannot
// move the threshold. An action this kernel does not recognise is treated as THRESHOLD — the
// unknown is the dangerous, never the convenient.
//
// The win metric is quality, never money: validated-output rate, gate-pass rate, internal supply,
// reuse depth. No term of it can reference real money by construction — the scoreboard literally
// has no field for it.
//
// Pure and total; crypto and clocks are injected; the runner wires the studio, the ledger, the
// graph, and the queue file. Not financial or legal advice — the day a threshold door opens onto
// real money, counsel comes before the key turns.

export const THRESHOLD_KINDS = Object.freeze([
  'payment-rail',      // set up Stripe or any way money can move
  'pay',               // authorize a real payment
  'spend',             // spend real money
  'commit',            // send a binding commitment
  'sign-legal',        // sign or agree to anything legal
  'publish-external',  // put anything in front of the outside world
]);

export const AUTO_KINDS = Object.freeze([
  'produce',           // compose or generate a build
  'validate',          // run the gates
  'mint-internal',     // mint into the baby ledger (internal KONO, not money)
  'draft',             // draft a proposal, outreach, scoping — words, unsent
  'post',              // CONTENT on the sanctioned rail (Graph API / approved automation) — the
                       // learn-till-win loop only closes if si-didy can post, measure, adjust,
                       // and post better. Corrected 2026-08-19: posting is AUTO, not a door.
                       // Venture GO-LIVE stays 'publish-external' — a door, as ever.
  'track',             // update the pipeline and the scoreboard
  'propose',           // propose a venture or a next move
  'remember',          // deepen the graph
]);

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};

/**
 * Classify an action. THRESHOLD wins over everything: any money/legal/irreversible/external flag
 * makes it threshold no matter what the kind claims, an unknown kind is threshold by default, and
 * there is no input on earth that reclassifies a threshold kind to auto.
 */
export function classify(action) {
  const a = obj(action);
  const kind = typeof a.kind === 'string' ? a.kind : '';
  if (a.money === true || a.legal === true || a.irreversible === true || a.external === true) {
    return { lane: 'threshold', why: 'flagged money/legal/irreversible/external — the door needs the key regardless of its name' };
  }
  if (THRESHOLD_KINDS.includes(kind)) return { lane: 'threshold', why: `"${kind}" is a threshold kind — fixed, not reclassifiable` };
  if (AUTO_KINDS.includes(kind)) return { lane: 'auto', why: `"${kind}" is operational — si-didy runs it as its own thing` };
  return { lane: 'threshold', why: `"${kind || '(unnamed)'}" is not a kind this kernel knows — the unknown is treated as the dangerous, never the convenient` };
}

const canon = (v) => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
};

/** What the master key signs: the queued item with its signature fields excluded. */
export function signableItem(item) {
  const i = obj(item);
  const rest = { ...i };
  delete rest.signature;
  delete rest.status;
  return canon(rest);
}

export function makeQueue() {
  return { kind: 'threshold-queue', items: [] };
}

/**
 * PREPARE a threshold action: si-didy does all the work (the prep rides whole), the item queues,
 * nothing executes. An auto action is REFUSED here — it does not queue, it just runs; letting auto
 * work pile into the approval queue would bury the doors that matter under noise.
 */
export function prepare(queue, action, prep, at) {
  const q = obj(queue);
  const items = Array.isArray(q.items) ? q.items : [];
  const lane = classify(action);
  if (lane.lane !== 'threshold') {
    return { ok: false, why: 'an auto action does not queue — it just runs. The queue is for the doors.' };
  }
  const item = {
    seq: items.length,
    action: obj(action),
    prep: obj(prep),
    at: typeof at === 'string' ? at : '',
    why: lane.why,
    status: 'queued',
    signature: null,
  };
  return { ok: true, why: `queued: ${lane.why}`, queue: { ...q, items: [...items, item] }, item };
}

/**
 * APPROVE with the master key. `verify` is async (canonicalString, sigB64, pubB64) => boolean —
 * injected; the kernel holds no crypto and NEVER a private key. Only a signature that verifies
 * against the MASTER public key approves; the operator's own identity, or anyone else's, fails —
 * si-didy cannot self-sign by construction, because its key is simply not the master key.
 */
export async function approve(item, sigB64, masterPubB64, verify) {
  const i = obj(item);
  if (i.status !== 'queued') return { ok: false, why: `only a queued item can be approved — this one is "${i.status}"` };
  if (typeof sigB64 !== 'string' || !sigB64) return { ok: false, why: 'no signature — prepared and queued, never sent' };
  if (typeof masterPubB64 !== 'string' || !masterPubB64) return { ok: false, why: 'no master key is configured — nothing can cross the threshold at all' };
  if (typeof verify !== 'function') return { ok: false, why: 'no verifier — a signature that cannot be checked is not a signature' };
  let good = false;
  try { good = (await verify(signableItem(i), sigB64, masterPubB64)) === true; } catch { good = false; }
  if (!good) return { ok: false, why: 'the signature does not verify against the MASTER key — si-didy cannot self-sign, and nobody else holds the key' };
  return { ok: true, why: 'the master key turned — approved', item: { ...i, status: 'approved', signature: sigB64 } };
}

/** EXECUTE only what the key approved. Everything else is said, not done. */
export function executable(item) {
  const i = obj(item);
  if (i.status === 'approved' && typeof i.signature === 'string' && i.signature) {
    return { ok: true, why: 'approved under the master key — may execute' };
  }
  return { ok: false, why: i.status === 'rejected' ? 'rejected by the key-holder — closed' : 'unsigned — prepared and queued, never sent' };
}

/** REJECT closes a door without opening it. si-didy prepares again if the mandate still wants it. */
export function reject(item, note) {
  const i = obj(item);
  if (i.status !== 'queued') return { ok: false, why: `only a queued item can be rejected — this one is "${i.status}"` };
  return { ok: true, item: { ...i, status: 'rejected', note: typeof note === 'string' ? note : '' } };
}

/**
 * THE SCOREBOARD — learn-till-win on quality, and structurally incapable of wanting money:
 * there is no field for real money in this object, and the composite is built only from
 * validated-rate, gate-pass-rate, internal supply growth and reuse depth. The win is
 * "produce provably good work", forever.
 */
export function scoreboard(tally) {
  const t = obj(tally);
  const n = (v) => (Number.isFinite(v) && v >= 0) ? v : 0;
  const produced = n(t.produced), validated = n(t.validated);
  const gates = n(t.gatesRun), gatesPassed = n(t.gatesPassed);
  const validatedRate = produced > 0 ? validated / produced : null;
  const gatePassRate = gates > 0 ? gatesPassed / gates : null;
  return {
    produced,
    validated,
    validatedRate,
    gatePassRate,
    internalSupply: n(t.internalSupply),
    reuseDepth: n(t.reuseDepth),
    // the composite: quality only. null rates mean NO SCORE — an operator that has produced
    // nothing scores nothing, never a flattering default.
    win: (validatedRate === null || gatePassRate === null) ? null
      : Number(((validatedRate + gatePassRate) / 2 + Math.log10(1 + n(t.internalSupply)) * 0.1 + Math.min(0.2, n(t.reuseDepth) * 0.02)).toFixed(4)),
    verdict: produced === 0 ? 'nothing produced yet — there is nothing to be proud of, and the scoreboard says so'
      : `produced ${produced} · validated ${validated} · win ${((validatedRate + (gatePassRate ?? 0)) / 2).toFixed(2)} band`,
  };
}

export default classify;
