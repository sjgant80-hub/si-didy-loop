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
// The kernel is pure and never fetches; the runner (scripts/rail.mjs) owns the wire and may reach
// only the sanctioned origins: https://graph.facebook.com/ (facebook-page) and
// https://api.linkedin.com/ (linkedin). Nothing here can spend, sign, or go-live — those stay doors.
//
// Two platforms, one discipline: `config.platform` is 'facebook-page' or 'linkedin'. facebook-page
// carries its Page token in the request body/url; linkedin carries an OAuth token in the
// Authorization: Bearer header — redact() strikes it from ALL of those. Each token lives ONLY in
// local-dna/rail-config.json, pasted by the key-holder's own hand.

import { gatePost } from './receiptgate.mjs';
import { scrub } from './scrub.mjs';

export const GRAPH = 'https://graph.facebook.com/v21.0/';
export const LINKEDIN = 'https://api.linkedin.com/v2/';
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
  if (c.platform === 'facebook-page') {
    if (!str(c.pageId)) return { ok: false, why: 'the pageId is empty — the numeric Page ID goes in local-dna/rail-config.json' };
    if (!str(c.token)) return { ok: false, why: 'the token is empty — paste the Page Access Token into local-dna/rail-config.json YOURSELF; it never rides through chat, a repo, or a prompt' };
    return { ok: true, why: `rail configured for page ${c.pageId} — the token stays in the config file and is never printed` };
  }
  if (c.platform === 'linkedin') {
    if (!/^urn:li:(person|organization):.+/.test(str(c.authorUrn))) return { ok: false, why: 'the authorUrn is empty or malformed — a urn:li:person:… or urn:li:organization:… goes in local-dna/rail-config.json' };
    if (!str(c.token)) return { ok: false, why: 'the token is empty — paste the LinkedIn access token into local-dna/rail-config.json YOURSELF; it never rides through chat, a repo, or a prompt' };
    return { ok: true, why: `rail configured for LinkedIn author ${c.authorUrn} — the token stays in the config file and is never printed` };
  }
  return { ok: false, why: `platform "${str(c.platform) || '(none)'}" is not a sanctioned rail this kernel knows — facebook-page and linkedin are the ones that exist` };
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

/** The exact publish request for the configured platform. The message is assembled, never improvised. */
export function buildPost(post, config) {
  const p = obj(post) || {}, c = obj(config) || {};
  const message = [str(p.hook), str(p.reveal), str(p.cta)].filter(Boolean).join('\n\n');
  if (c.platform === 'linkedin') {
    // LinkedIn UGC Posts: the token rides in the Authorization header (never the url or body), the
    // body is JSON, and a demoUrl becomes an ARTICLE share. Same message, the platform's own shape.
    const share = {
      shareCommentary: { text: message },
      shareMediaCategory: str(p.demoUrl) ? 'ARTICLE' : 'NONE',
      ...(str(p.demoUrl) ? { media: [{ status: 'READY', originalUrl: p.demoUrl }] } : {}),
    };
    return {
      url: LINKEDIN + 'ugcPosts',
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + str(c.token), 'X-Restli-Protocol-Version': '2.0.0', 'Content-Type': 'application/json' },
      body: {
        author: str(c.authorUrn),
        lifecycleState: 'PUBLISHED',
        specificContent: { 'com.linkedin.ugc.ShareContent': share },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      },
    };
  }
  return {
    url: GRAPH + str(c.pageId) + '/feed',
    method: 'POST',
    body: { message, ...(str(p.demoUrl) ? { link: p.demoUrl } : {}), access_token: str(c.token) },
  };
}

/** The engagement read-back for one published post id, on the configured platform. */
export function buildMetrics(postId, config) {
  const c = obj(config) || {};
  if (c.platform === 'linkedin') {
    return {
      url: LINKEDIN + 'socialActions/' + encodeURIComponent(str(postId)),
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + str(c.token) },
    };
  }
  return {
    url: GRAPH + str(postId) + '?fields=likes.summary(true),comments.summary(true),shares&access_token=' + encodeURIComponent(str(c.token)),
    method: 'GET',
  };
}

/** Any printable form of a request has the token STRUCK — url query, JSON body, AND Authorization
 *  header (LinkedIn's Bearer). No exceptions, no debug modes. */
export function redact(req) {
  const r = obj(req) || {};
  const body = obj(r.body) ? { ...r.body } : undefined;
  if (body && 'access_token' in body) body.access_token = '·struck·';
  const headers = obj(r.headers) ? { ...r.headers } : undefined;
  if (headers && 'Authorization' in headers) headers.Authorization = 'Bearer ·struck·';
  return {
    url: str(r.url).replace(/access_token=[^&]*/g, 'access_token=·struck·'),
    method: str(r.method),
    ...(headers ? { headers } : {}),
    ...(body ? { body } : {}),
  };
}

/** Real engagement out of a response — Facebook Graph OR LinkedIn socialActions shape, whichever is
 *  present. Partial shapes read as zeros, never as crashes. */
export function readMetrics(response) {
  const r = obj(response) || {};
  const n = (v) => (Number.isFinite(v) && v >= 0) ? v : 0;
  const likes = n(obj(obj(r.likes)?.summary)?.total_count) || n(obj(r.likesSummary)?.totalLikes);
  const comments = n(obj(obj(r.comments)?.summary)?.total_count) || n(obj(r.commentsSummary)?.count);
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

/**
 * The PROVEN rail (post-proof wired in): a post may go NOW only if it clears the receipt-gate FIRST
 * — every checkable claim (a url, a K/N witness score, CI-green, "live", a percent) backed by a
 * verifiable build-receipt — AND THEN clears the rail's own rate/score discipline. The receipt-gate
 * runs before postable, never instead of it: an inflated post is refused even when the window is
 * open and the score is high, and a truthful post still waits for the window. No receipt, no post.
 */
export function postableProven(post, receipt, config, history, nowMs) {
  const proof = gatePost(post, receipt);
  if (!proof.ok) return { ok: false, why: 'the receipt-gate refused it before the rail: ' + proof.why, unbacked: proof.unbacked };
  return postable(post, config, history, nowMs);
}

/**
 * The sovereignty scrub applied to output ([[fallscrub]]), injected between the draft and the wire:
 * strip every tell of WHICH model wrote the prose — the hidden-watermark channel (zero-width, bidi,
 * variation selectors, the Unicode TAGS block that can smuggle a whole hidden string), homoglyphs,
 * chat-template tokens, self-identification, boilerplate, filler tell-words, and cosmetic unicode —
 * deterministically, with a transparent per-category report. Only the PROSE fields (hook/reveal/cta)
 * are scrubbed; claim tokens (urls, K/N scores, percents, "CI", "live") are not in the tell set, and
 * the receipt-gate re-checks them on the scrubbed text anyway. swapWords is on unless
 * config.scrubSwapWords === false (some operators want verbatim copy).
 */
export function scrubPost(post, config) {
  const p = obj(post) || {};
  const c = obj(config) || {};
  const opts = { swapWords: c.scrubSwapWords !== false };
  const report = { chatTokens: 0, selfId: 0, boilerplate: 0, wordSwaps: 0, hidden: 0, homoglyphs: 0, cosmetic: 0 };
  const out = { ...p };
  for (const f of ['hook', 'reveal', 'cta']) {
    if (typeof p[f] !== 'string') continue;
    const r = scrub(p[f], opts);
    out[f] = r.text;
    for (const k in report) report[k] += r.report[k];
  }
  return { post: out, report };
}

/**
 * The SCRUBBED-AND-PROVEN rail — fallscrub injected between the draft and the wire, in the only
 * honest order: SCRUB the prose first, then run the receipt-gate ON THE SCRUBBED TEXT (so a scrub
 * that ever altered a backing claim would be caught and refused here, never shipped), then the
 * rate/score discipline. Returns the decision PLUS the scrubbed post to build from, so
 * buildPost(result.post, config) ships exactly the bytes that were both tell-scrubbed AND
 * claim-gated. No receipt, no post; and no model-tell rides out on a post that does go.
 */
export function postScrubbedProven(post, receipt, config, history, nowMs) {
  const scrubbed = scrubPost(post, config);
  const decision = postableProven(scrubbed.post, receipt, config, history, nowMs);
  return { ...decision, post: scrubbed.post, scrub: scrubbed.report };
}

/** One config or an array of them, normalised to a clean array of config objects. Total. */
export function railConfigs(configs) {
  return (Array.isArray(configs) ? configs : [configs]).map(obj).filter(Boolean);
}

/** The subset of configs whose rail is ready, each tagged with its platform — the platforms that
 *  will actually receive a post. Total. */
export function readyRails(configs) {
  return railConfigs(configs)
    .map((c) => ({ platform: str(c.platform), config: c, ready: railReady(c) }))
    .filter((r) => r.ready.ok);
}

/**
 * Fan the SAME draft out across EVERY configured platform (facebook-page AND linkedin, or any
 * subset), each judged on ITS OWN rate window — the platforms are independent rails, one draft.
 * historyByPlatform maps a platform name → that platform's own sent-history. Returns one decision
 * per config, scrubbed + receipt-gated + rate-checked, so the runner fires buildPost(d.post, d.config)
 * for each d.ok. A post that the receipt-gate clears but one platform's window does not still goes
 * on the others whose window is open. No receipt, no post — on any platform.
 */
export function postScrubbedProvenAll(post, receipt, configs, historyByPlatform, nowMs) {
  const byPlat = obj(historyByPlatform) || {};
  return railConfigs(configs).map((config) => {
    const platform = str(config.platform);
    const history = Array.isArray(byPlat[platform]) ? byPlat[platform] : [];
    const d = postScrubbedProven(post, receipt, config, history, nowMs);
    return { platform, config, ...d };
  });
}

export default postable;
