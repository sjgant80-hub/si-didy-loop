// si-didy-loop · scripts/seam.mjs — THE SEAM MEASURED.
//
// v24 seed, §AA: the estate is the drawn torus. Shadow surface = what the operator prepares
// (doors queued, builds un-published); lit surface = what has actually risen (executed, live).
// The SEAM is the master-key ritual — and pass −2 of the recurse found it did not conduct:
// doors stood APPROVED with nothing shipped, and no record existed that could even say so.
//
// This kernel makes the seam a NUMBER. Two ratios, both honest:
//   decided = (approved + rejected) / prepared     — is the key-holder looking at all?
//   risen   = executed / approved                  — does approval actually conduct to the lit?
// The healthy seam sits in the κ-band [0.618, 0.687] on RISEN — enough rising to manifest,
// enough held back to stay deliberate. Below the floor the seam is closed; a flood is no better.
//
//   node scripts/seam.mjs        → measure the real queue + executions ledger, say the verdict
//
// Pure and total: garbage in → { ok:false, why }, never a throw mid-ritual.

const KAPPA_FLOOR = 0.618, KAPPA_CEIL = 0.687;
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;

/** The seam, measured. items = operator queue items; executions = [{seq,...}] lit-surface ledger. */
export function seamFlux(items, executions) {
  const list = Array.isArray(items) ? items.filter(obj) : null;
  if (!list) return { ok: false, why: 'the queue is not a list of doors' };
  const execs = Array.isArray(executions) ? executions.filter(obj) : [];
  const prepared = list.length;
  if (prepared === 0) return { ok: true, prepared: 0, approved: 0, rejected: 0, queued: 0, executed: 0, decided: 0, risen: 0, verdict: 'no doors — nothing to measure, which is its own finding' };
  const approved = list.filter((i) => i.status === 'approved').length;
  const rejected = list.filter((i) => i.status === 'rejected').length;
  const queued = prepared - approved - rejected;
  const approvedSeqs = new Set(list.filter((i) => i.status === 'approved').map((i) => i.seq));
  // an execution only counts if it names an APPROVED door — the wall holds in the metric too
  const executed = new Set(execs.map((e) => e.seq).filter((s) => approvedSeqs.has(s))).size;
  const decided = (approved + rejected) / prepared;
  const risen = approved === 0 ? 0 : executed / approved;
  const verdict =
    risen >= KAPPA_FLOOR && risen <= KAPPA_CEIL ? 'the seam is at κ — conducting and deliberate' :
    risen < KAPPA_FLOOR ? 'the seam is below the κ floor — approvals are not becoming lit; turn or execute' :
    'the seam is above the κ ceiling — everything approved rises at once; deliberation is thinning';
  return { ok: true, prepared, approved, rejected, queued, executed, decided: round3(decided), risen: round3(risen), verdict };
}

const round3 = (n) => Math.round(n * 1000) / 1000;
