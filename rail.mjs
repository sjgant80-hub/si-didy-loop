// si-didy-loop · rail.mjs — the sanctioned posting rail: Graph API, rate-disciplined, honest.
//
// Posting is AUTO (the 2026-08-19 correction) — but auto on the SANCTIONED rail only: a Meta
// app + Page Access Token that the key-holder sets up ONCE (the human 10%), posting to a page
// they admin, inside the platform's own automation rules. Staying sanctioned is what keeps the
// account alive; this kernel enforces the discipline the rail depends on:
//
//   railReady   — is the rail configured at all, said with the fix (the token lives ONLY in
//                 local-dna/rail-config.json, pasted there by the key-holder's own hand — it
//                 never rides through chat, a repo, or a prompt).
//   postable    — may THIS post go NOW: rail ready, post gate-scored at κ or better, the rate
//                 window open (spacing + daily cap — ToS-respect is not optional).
//   buildPost / buildMetrics — the exact Graph API requests, built not improvised.
//   redact      — any printable form of a request has the token STRUCK. No exceptions.
//   readMetrics — real engagement out of the Graph response, tolerant of partial shapes.
//   learn       — rank what actually converted so the next post starts from the best hook.
//
// The kernel is pure and never fetches; the runner (scripts/rail.mjs) owns the wire and may
// reach exactly one origin: https://graph.facebook.com/. Nothing here can spend, sign, or
// go-live — those stay doors.

export const GRAPH = 'https://graph.facebook.com/v21.0/';
export const KAPPA = (Math.sqrt(5) - 1) / 2;

export const LIMITS = Object.freeze({
  minGapMs: 3 * 60 * 60 * 1000,   // at least three hours between posts
  maxPerDay: 4,                    // and never more than four a day — a page, not a firehose
});

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;
const str = (v) => typeof v === 'string' ? v : '';

/** Is the rail configured? Refusals carry the one-time fix — the setup is the human 10%. */
export function railReady(config) {
  const c = obj(config);
  if (!c) return { ok: false, why: 'no rail config — run `node scripts/rail.mjs --init`, then do the one-time setup it prints (the human 10%)' };
  if (c.platform !== 'facebook-page') return { ok: false, why: `platform "${str(c.platform) || '(none)'}" is not a sanctioned rail this kernel knows — facebook-page is the one that exists` };
  if (!str(c.pageId)) return { ok: false, why: 'the pageId is empty — the numeric Page ID goes in local-dna/rail-config.json' };
  if (!str(c.token)) return { ok: false, why: 'the token is empty — paste the Page Access Token into local-dna/rail-config.json YOURSELF; it never rides through chat, a repo, or a prompt' };
  return { ok: true, why: `rail configured for page ${c.pageId} — the token stays in the config file and is never printed` };
}

/**
 * May THIS post go NOW? The rail must be ready, the post must carry its content-gate score at
 * κ or better (an ungraded post is not a post), and the rate window must be open — the
 * sanctioned rail stays sanctioned by respecting the platform's own automation rules.
 */
export function postable(post, config, history, nowMs) {
  const ready = railReady(config);
  if (!ready.ok) return ready;
  const p = obj(post);
  if (!p) return { ok: false, why: 'no post' };
  if (!Number.isFinite(p.score) || p.score < KAPPA) {
    return { ok: false, why: `the post has no passing content-gate score (${Number.isFinite(p.score) ? p.score.toFixed(3) : 'none'} < κ) — the gate grades it before the rail carries it` };
  }
  if (!str(p.hook) || !str(p.cta)) return { ok: false, why: 'a post without a hook and a CTA is not the move — draft it whole' };
  const now = Number.isFinite(nowMs) ? nowMs : 0;
  const sent = (Array.isArray(history) ? history : []).map(obj).filter(Boolean)
    .map(h => Number(h.sentAtMs)).filter(Number.isFinite);
  const last = sent.length ? Math.max(...sent) : -Infinity;
  if (now - last < LIMITS.minGapMs) {
    return { ok: false, why: `the rate window is closed — ${Math.ceil((LIMITS.minGapMs - (now - last)) / 60000)} minute(s) until the next slot. Spacing is what keeps the rail sanctioned.` };
  }
  const today = sent.filter(t => now - t < 24 * 60 * 60 * 1000).length;
  if (today >= LIMITS.maxPerDay) {
    return { ok: false, why: `${today} post(s) in the last day is the cap — a page, not a firehose. The next slot opens tomorrow.` };
  }
  return { ok: true, why: 'rail ready, post graded, window open — it may go' };
}

/** The exact Graph API publish request. The message is assembled, never improvised. */
export function buildPost(post, config) {
  const p = obj(post) || {}, c = obj(config) || {};
  const message = [str(p.hook), str(p.reveal), str(p.cta)].filter(Boolean).join('\n\n');
  return {
    url: GRAPH + str(c.pageId) + '/feed',
    method: 'POST',
    body: { message, ...(str(p.demoUrl) ? { link: p.demoUrl } : {}), access_token: str(c.token) },
  };
}

/** The engagement read-back for one published post id. */
export function buildMetrics(postId, config) {
  const c = obj(config) || {};
  return {
    url: GRAPH + str(postId) + '?fields=likes.summary(true),comments.summary(true),shares&access_token=' + encodeURIComponent(str(c.token)),
    method: 'GET',
  };
}

/** Any printable form of a request has the token STRUCK. No exceptions, no debug modes. */
export function redact(req) {
  const r = obj(req) || {};
  const body = obj(r.body) ? { ...r.body } : undefined;
  if (body && 'access_token' in body) body.access_token = '·struck·';
  return {
    url: str(r.url).replace(/access_token=[^&]*/g, 'access_token=·struck·'),
    method: str(r.method),
    ...(body ? { body } : {}),
  };
}

/** Real engagement out of a Graph response — partial shapes read as zeros, never as crashes. */
export function readMetrics(response) {
  const r = obj(response) || {};
  const n = (v) => (Number.isFinite(v) && v >= 0) ? v : 0;
  const likes = n(obj(obj(r.likes)?.summary)?.total_count);
  const comments = n(obj(obj(r.comments)?.summary)?.total_count);
  const shares = n(obj(r.shares)?.count);
  return { likes, comments, shares, engagement: likes + comments * 2 + shares * 3 };
}

/**
 * Learn-till-win, the measure→adjust half: rank what actually converted. Only posts that were
 * SENT and MEASURED count — a draft has no engagement and an unmeasured post is not evidence.
 * Returns strongest-first, so the next draft starts from the best hook that really landed.
 */
export function learn(history) {
  return (Array.isArray(history) ? history : []).map(obj).filter(Boolean)
    .filter(h => Number.isFinite(h.sentAtMs) && obj(h.metrics) && Number.isFinite(h.metrics.engagement))
    .map(h => ({ hook: str(h.hook), engagement: Math.max(0, h.metrics.engagement) }))
    .sort((a, b) => b.engagement - a.engagement || a.hook.localeCompare(b.hook));
}

export default postable;
