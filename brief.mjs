// si-didy-loop · brief.mjs — the morning brief: everything the night did, on one page,
// ending in ONE first action.
//
// The overnight machine writes across half a dozen files — study log, operator state, the
// door queue, the outbox, course progress, rail history. The key-holder should not have to
// open any of them. distill() folds them into one brief; renderBrief() makes the page.
// LOCAL-ONLY by design: the brief carries queue preps and private names, so it lives in
// local-dna and is never a Pages app (the soul rule).
//
// The one hard rule, enforced and tested: NO TOKEN, EVER. distill() never copies the rail
// config's token, and no printable form of the brief may contain it.
//
// firstAction is a ranked decision, not a list: the single most-leveraged thing the
// key-holder can do today, chosen by fixed rules — rail before doors before proposals,
// because distribution unblocks everything and doors are waiting work.

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;
const arr = (v) => Array.isArray(v) ? v : [];
const str = (v) => typeof v === 'string' ? v : '';
const esc = (s) => str(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const DAY = 24 * 60 * 60 * 1000;

/**
 * Fold the night's files into one brief. Inputs are the parsed local-dna files (any may be
 * null — a missing file reads as an honest empty, never a crash). nowMs anchors the windows.
 */
export function distill(inputs, nowMs) {
  const i = obj(inputs) || {};
  const now = Number.isFinite(nowMs) ? nowMs : 0;
  const state = obj(i.state) || {};
  const tally = obj(state.tally) || {};

  const builds = arr(state.builds).filter(b => {
    const t = Date.parse(str(obj(b)?.at));
    return Number.isFinite(t) && now - t < DAY && now - t >= 0;
  }).map(b => ({ slug: str(b.slug), kpid: str(b.kpid), gen: b.gen === 2 ? 2 : 1 }));

  const doors = arr(obj(i.queue)?.items).map(obj).filter(Boolean)
    .filter(d => d.status === 'queued')
    .map(d => ({ seq: d.seq, stream: str(obj(d.action)?.stream) || '?', cap: str(obj(d.action)?.cap) || str(obj(d.action)?.kind) }));

  const outboxWaiting = arr(obj(i.outbox)?.posts).map(obj).filter(Boolean).filter(p => !p.sentAtMs).length;

  const railConf = obj(i.railConfig);
  const railUp = !!railConf && railConf.platform === 'facebook-page' && !!str(railConf.pageId) && !!str(railConf.token);
  const sentLastDay = arr(obj(i.railHistory)?.sent).map(obj).filter(Boolean)
    .filter(h => Number.isFinite(h.sentAtMs) && now - h.sentAtMs < DAY).length;

  const progress = obj(i.progress) || {};
  const s6 = arr(progress.attempts).map(obj).filter(Boolean).filter(a => a.stage === 'S6' && str(a.evidence)).at(-1);
  const proposal = s6 ? str(s6.evidence) : '';

  // the brief reports the tally RAW — the win number belongs to the scoreboard kernel, and a
  // second derivation here would be a second source of truth waiting to drift
  const firstAction = !railUp
    ? { what: 'Paste the rail token — five minutes, then posting is autonomous', how: 'node scripts/rail.mjs --init  (steps printed; token goes in local-dna/rail-config.json by your hand)' }
    : doors.length
      ? { what: `Turn or close ${doors.length} waiting door(s)`, how: 'node scripts/master-key.mjs --list' }
      : proposal
        ? { what: 'Read si-didy’s freshest proposal and dispose', how: proposal }
        : { what: 'Nothing needs your hand today — the loop is running', how: 'node scripts/operate.mjs --status any time' };

  return {
    kind: 'morning-brief',
    at: new Date(now).toISOString(),
    builds, doors, outboxWaiting,
    rail: railUp ? { up: true, why: `up — ${sentLastDay} post(s) in the last day` } : { up: false, why: 'not configured — the outbox holds' },
    tally: { produced: Number(tally.produced) || 0, validated: Number(tally.validated) || 0, internalSupply: Number(tally.internalSupply) || 0, reuseDepth: Number(tally.reuseDepth) || 0 },
    courseComplete: progress.complete === true,
    proposal,
    firstAction,
  };
}

/** The page. Dark, one screen, first action on top. Never a token in it — tested, not hoped. */
export function renderBrief(brief) {
  const b = obj(brief) || {};
  const fa = obj(b.firstAction) || { what: '(no action derived)', how: '' };
  const t = obj(b.tally) || {};
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>the morning brief</title>
<style>
body{font-family:Georgia,serif;background:#0b0a0f;color:#d8d2c4;max-width:680px;margin:0 auto;padding:26px 18px;line-height:1.5}
h1{font-size:1.35rem;color:#d4a017;margin-bottom:.2rem}.when{opacity:.6;font-size:.85em}
.first{border:1px solid #d4a017;border-radius:10px;padding:14px 18px;margin:1.2rem 0;background:rgba(212,160,23,.07)}
.first .w{font-size:1.05em;font-weight:bold}.first .h{font-size:.88em;opacity:.8;margin-top:6px;font-family:monospace;word-break:break-all}
h2{font-size:.85em;letter-spacing:.1em;text-transform:uppercase;color:#d4a017;opacity:.8;margin:1.4rem 0 .4rem}
.row{font-size:.94em;margin:3px 0}.dim{opacity:.55}.num{font-variant-numeric:tabular-nums}
footer{margin-top:2rem;padding-top:.8rem;border-top:1px solid #3a3630;font-size:.78em;opacity:.6}
</style></head><body>
<h1>the morning brief</h1>
<div class="when">${esc(b.at)}</div>
<div class="first"><div class="w">→ ${esc(fa.what)}</div><div class="h">${esc(fa.how)}</div></div>
<h2>overnight</h2>
${arr(b.builds).length ? arr(b.builds).map(x => `<div class="row">built <b>${esc(x.slug)}</b>${x.gen === 2 ? ' <span class="dim">(gen-2)</span>' : ''} · <span class="dim">${esc(x.kpid)}</span></div>`).join('') : '<div class="row dim">no new builds in the last day</div>'}
<div class="row num">tally: ${Number(t.produced) || 0} produced · ${Number(t.validated) || 0} validated · ${Number(t.internalSupply) || 0} KCC internal · reuse ${Number(t.reuseDepth) || 0}</div>
<h2>your key</h2>
${arr(b.doors).length ? arr(b.doors).map(d => `<div class="row">[${d.seq}] ${esc(d.stream)} · ${esc(d.cap)} — <span class="dim">queued unsigned</span></div>`).join('') : '<div class="row dim">no doors waiting</div>'}
<h2>the rail</h2>
<div class="row">${obj(b.rail)?.up ? '●' : '○'} ${esc(obj(b.rail)?.why)} · ${Number(b.outboxWaiting) || 0} draft(s) in the outbox</div>
<h2>si-didy proposes</h2>
<div class="row">${b.proposal ? esc(b.proposal) : '<span class="dim">no fresh proposal — the next dream brings one</span>'}</div>
<footer>generated from local-dna — private, local only, never published · the course ${b.courseComplete ? 'is complete; expansion never stops' : 'is climbing'}</footer>
</body></html>`;
}

export default distill;
