// si-didy-loop · scripts/twelve-crawl.mjs — THE TWELVE-POWERS LINTER · estate-crawl mode.
//
// Run the twelve across every repo and surface the ready-to-sell
// shortlist. The honest-instrument law ([[organ-declarations]]) holds: an index row can only
// answer SOME of the twelve questions. So the crawl MEASURES four powers from hard evidence and
// names the other eight UNREAD — a power we cannot see is never marked, in either direction.
//
//   MANIFESTATION — a live page IS real output        (live → strong · pages/desc → weak)
//   IGNITION      — a URL that opens IS an entry      (live → strong · desc, unarchived → weak)
//   STRUCTURE     — a CI tier IS a frame that held    (works/proven → strong · desc → weak)
//   LIFE          — pushes ARE the growth signal      (<30d → strong · <90d → weak)
//
// sellable = MANIFESTATION strong AND STRUCTURE strong (the spec's own filter: output + frame,
// both proven). nearly = live but never CI'd — one workflow away. Pure and total.

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;
export const MEASURED = ['MANIFESTATION', 'IGNITION', 'STRUCTURE', 'LIFE'];
export const UNREAD = ['RELATION', 'CONTAINMENT', 'BALANCE', 'WISDOM', 'FLOW', 'UNION', 'WHOLENESS', 'REUNIFICATION'];

const DAY = 86400000;

/** Derive the four measurable marks for one repo. nowMs anchors recency (no clock in the kernel). */
export function crawlMarks(repo, worldItem, nowMs) {
  const r = obj(repo);
  if (!r || typeof r.name !== 'string' || !r.name) return { ok: false, why: 'a repo needs at least a name' };
  if (!Number.isFinite(nowMs)) return { ok: false, why: 'nowMs must be a finite timestamp — the crawl does not own a clock' };
  const w = obj(worldItem);
  const desc = typeof r.desc === 'string' && r.desc.trim().length > 0;
  const live = r.live === true;
  const tier = w && obj(w.proof) ? String(w.proof.tier || '') : '';
  const pushedMs = r.pushed ? Date.parse(r.pushed) : NaN;
  const ageDays = Number.isFinite(pushedMs) ? (nowMs - pushedMs) / DAY : Infinity;
  const marks = {
    MANIFESTATION: live ? 'strong' : ((r.pages === true || desc) && r.archived !== true ? 'weak' : 'missing'),
    IGNITION: live ? 'strong' : (desc && r.archived !== true ? 'weak' : 'missing'),
    STRUCTURE: (tier === 'works' || tier === 'proven') ? 'strong' : (desc ? 'weak' : 'missing'),
    LIFE: ageDays < 30 ? 'strong' : (ageDays < 90 ? 'weak' : 'missing'),
  };
  const vals = MEASURED.map((k) => marks[k]);
  const measured = Math.round(((vals.filter((v) => v === 'strong').length + 0.5 * vals.filter((v) => v === 'weak').length) / 4) * 100);
  const sellable = marks.MANIFESTATION === 'strong' && marks.STRUCTURE === 'strong';
  const nearly = live && tier !== 'works' && tier !== 'proven';
  return { ok: true, name: r.name, marks, measured, tier: tier || null, sellable, nearly, unread: UNREAD };
}

/** The whole-estate sweep: every repo, never a subset. worldByName joins ladder evidence. */
export function crawlEstate(repos, worldByName, nowMs) {
  const list = Array.isArray(repos) ? repos : null;
  if (!list) return { ok: false, why: 'the estate must be a list of repos — never a sample' };
  const byName = obj(worldByName) || {};
  const rows = []; let refused = 0;
  for (const r of list) {
    const m = crawlMarks(r, byName[r && r.name], nowMs);
    if (m.ok) rows.push(m); else refused++;
  }
  const sellable = rows.filter((x) => x.sellable).sort((a, b) => b.measured - a.measured || a.name.localeCompare(b.name));
  const nearly = rows.filter((x) => x.nearly && !x.sellable);
  const dark = rows.filter((x) => x.marks.MANIFESTATION === 'missing');
  const stale = rows.filter((x) => x.marks.LIFE === 'missing');
  return {
    ok: true, swept: rows.length, refused,
    sellable, nearlyCount: nearly.length, nearly: nearly.slice(0, 400),
    darkCount: dark.length, staleCount: stale.length,
    note: 'four powers measured from evidence (live, CI tier, pushes); eight UNREAD per repo — reading them needs the spec/README (assisted mode), never a guess.',
  };
}
