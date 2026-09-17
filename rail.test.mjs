// si-didy-loop · rail.test.mjs — the sanctioned rail, every rule falsifiable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GRAPH, LINKEDIN, KAPPA, LIMITS, railReady, postable, postableProven, scrubPost, postScrubbedProven, buildPost, buildMetrics, redact, readMetrics, learn } from './rail.mjs';

const CONFIG = () => ({ platform: 'facebook-page', pageId: '1234567890', token: 'EAAG-fake-token-for-tests' });
const POST = () => ({ hook: 'own it once', reveal: '$5,549 saved year one', cta: 'open the page', demoUrl: 'https://sjgant80-hub.github.io/fallforce/stack.html', score: 1 });
const HOUR = 60 * 60 * 1000;

test('RAILREADY REFUSES WITH THE FIX — and the fix is the human 10%, not a workaround', () => {
  assert.match(railReady(null).why, /--init.*the human 10%/);
  assert.match(railReady({ platform: 'twitter' }).why, /not a sanctioned rail this kernel knows/);
  assert.match(railReady({ platform: 'facebook-page', pageId: '', token: 'x' }).why, /pageId is empty/);
  const noToken = railReady({ platform: 'facebook-page', pageId: '123', token: '' });
  assert.match(noToken.why, /paste the Page Access Token.*YOURSELF/);
  assert.match(noToken.why, /never rides through chat, a repo, or a prompt/);
  const ok = railReady(CONFIG());
  assert.equal(ok.ok, true);
  assert.ok(!ok.why.includes('EAAG'), 'even the ready line never carries the token');
});

test('POSTABLE: ungraded and under-κ posts are refused — the gate grades before the rail carries', () => {
  assert.match(postable({ ...POST(), score: undefined }, CONFIG(), [], 0).why, /no passing content-gate score \(none/);
  assert.match(postable({ ...POST(), score: KAPPA - 0.01 }, CONFIG(), [], 0).why, /< κ/);
  assert.equal(postable({ ...POST(), score: KAPPA }, CONFIG(), [], 0).ok, true, 'κ exactly passes — the bar is ≥');
  assert.match(postable({ ...POST(), hook: '' }, CONFIG(), [], 0).why, /without a hook and a CTA/);
});

test('THE RATE WINDOW: three hours between posts, four a day, both inclusive edges exact', () => {
  const now = 100 * HOUR;
  const justSent = [{ sentAtMs: now - LIMITS.minGapMs + 1 }];
  assert.match(postable(POST(), CONFIG(), justSent, now).why, /rate window is closed.*Spacing is what keeps the rail sanctioned/);
  const gapExact = [{ sentAtMs: now - LIMITS.minGapMs }];
  assert.equal(postable(POST(), CONFIG(), gapExact, now).ok, true, 'exactly three hours IS the open window');
  const fourToday = [1, 2, 3, 4].map(i => ({ sentAtMs: now - i * 4 * HOUR }));
  assert.match(postable(POST(), CONFIG(), fourToday, now).why, /4 post\(s\) in the last day is the cap — a page, not a firehose/);
  const threeToday = [1, 2, 3].map(i => ({ sentAtMs: now - i * 4 * HOUR }));
  assert.equal(postable(POST(), CONFIG(), threeToday, now).ok, true);
  const fourButOldest25h = [{ sentAtMs: now - 25 * HOUR }, { sentAtMs: now - 12 * HOUR }, { sentAtMs: now - 8 * HOUR }, { sentAtMs: now - 4 * HOUR }];
  assert.equal(postable(POST(), CONFIG(), fourButOldest25h, now).ok, true, 'a post older than a day has left the window');
});

test('BUILDPOST IS THE EXACT GRAPH CALL — assembled message, page feed, link riding', () => {
  const r = buildPost(POST(), CONFIG());
  assert.equal(r.url, GRAPH + '1234567890/feed');
  assert.equal(r.method, 'POST');
  assert.equal(r.body.message, 'own it once\n\n$5,549 saved year one\n\nopen the page');
  assert.equal(r.body.link, 'https://sjgant80-hub.github.io/fallforce/stack.html');
  assert.equal(r.body.access_token, 'EAAG-fake-token-for-tests');
  const noLink = buildPost({ ...POST(), demoUrl: '' }, CONFIG());
  assert.ok(!('link' in noLink.body), 'no demo means no link field, not an empty one');
});

test('REDACT STRIKES THE TOKEN EVERYWHERE — body and query string alike, no exceptions', () => {
  const p = redact(buildPost(POST(), CONFIG()));
  assert.equal(p.body.access_token, '·struck·');
  assert.ok(!JSON.stringify(p).includes('EAAG'), 'no printable form carries the token');
  const m = redact(buildMetrics('999_888', CONFIG()));
  assert.match(m.url, /access_token=·struck·/);
  assert.ok(!m.url.includes('EAAG'));
  assert.equal(redact(null).url, '', 'garbage redacts to empty, never crashes');
});

test('READMETRICS: real shapes, partial shapes, and the engagement weighting', () => {
  const full = readMetrics({ likes: { summary: { total_count: 10 } }, comments: { summary: { total_count: 3 } }, shares: { count: 2 } });
  assert.deepEqual(full, { likes: 10, comments: 3, shares: 2, engagement: 22 }, 'likes + 2·comments + 3·shares');
  assert.deepEqual(readMetrics({}), { likes: 0, comments: 0, shares: 0, engagement: 0 }, 'a bare response reads as zeros');
  assert.deepEqual(readMetrics(null).engagement, 0);
  assert.equal(readMetrics({ likes: { summary: { total_count: -5 } } }).likes, 0, 'a negative count is garbage, zeroed');
});

test('LEARN RANKS ONLY WHAT WAS SENT AND MEASURED — a draft is not evidence', () => {
  const history = [
    { hook: 'draft never sent', metrics: { engagement: 999 } },                       // no sentAtMs
    { hook: 'sent never measured', sentAtMs: 1 },                                     // no metrics
    { hook: 'the quiet one', sentAtMs: 2, metrics: { engagement: 3 } },
    { hook: 'the winner', sentAtMs: 3, metrics: { engagement: 40 } },
    null, 7,
  ];
  const ranked = learn(history);
  assert.deepEqual(ranked.map(r => r.hook), ['the winner', 'the quiet one']);
  assert.equal(ranked[0].engagement, 40);
  assert.deepEqual(learn(null), []);
});

test('THE LIMITS ARE FROZEN — si-didy cannot widen its own window', () => {
  assert.throws(() => { LIMITS.maxPerDay = 400; });
  assert.throws(() => { LIMITS.minGapMs = 1; });
});

// ─── round two: the gate found four gaps — each dies here ───

test('EXACTLY 24 HOURS AGO IS OUTSIDE THE DAY — the daily window is strict', () => {
  const now = 100 * HOUR;
  const fourWithOldestAt24h = [{ sentAtMs: now - 24 * HOUR }, { sentAtMs: now - 12 * HOUR }, { sentAtMs: now - 8 * HOUR }, { sentAtMs: now - 4 * HOUR }];
  assert.equal(postable(POST(), CONFIG(), fourWithOldestAt24h, now).ok, true,
    'a post sent exactly a day ago has left the window — only three remain inside it');
});

test('A FUNCTION IS NOT A CONFIG — the impostor refuses as no-config, not as wrong-platform', () => {
  const impostor = function facebookPage() {};
  impostor.platform = 'facebook-page'; impostor.pageId = '123'; impostor.token = 'x';
  assert.match(railReady(impostor).why, /no rail config/,
    'a function carrying config properties must not read as a config');
});

test('A MISSING PLATFORM IS SAID AS (none), never as an empty quote', () => {
  assert.match(railReady({ pageId: '1', token: 'x' }).why, /platform "\(none\)"/);
});

test('FUZZ: total on garbage', () => {
  railReady(7); railReady('x'); postable(null, null, null, null); postable(POST(), CONFIG(), 'x', NaN);
  buildPost(null, null); buildMetrics(null, null); redact(7); readMetrics('x'); learn('x');
  const nanNow = postable(POST(), CONFIG(), [], NaN);
  assert.equal(typeof nanNow.ok, 'boolean');
  assert.ok(true);
});

// ── post-proof wired in: the receipt-gate runs BEFORE the rail's discipline, never instead of it ──
const RECEIPT = () => ({ url: 'https://sjgant80-hub.github.io/agent-proof/', live: true, ci: 'success', witness: { clean: true, killed: 130, total: 133 }, facts: [] });
const PROVEN = () => ({ hook: 'agent-proof is live and witness-clean 130/133', reveal: 'CI green on the runner', cta: 'see https://sjgant80-hub.github.io/agent-proof/', score: 1 });
const INFLATED = () => ({ hook: 'agent-proof is live and witness-clean 999/999', reveal: '100% flawless, CI green', cta: 'go now', score: 1 });

test('postableProven: a receipt-backed post with the window open MAY go', () => {
  const r = postableProven(PROVEN(), RECEIPT(), CONFIG(), [], 10 * HOUR);
  assert.equal(r.ok, true);
});

test('postableProven: an INFLATED post is refused even with a high score and the window open', () => {
  const r = postableProven(INFLATED(), RECEIPT(), CONFIG(), [], 10 * HOUR);
  assert.equal(r.ok, false);
  assert.match(r.why, /the receipt-gate refused it before the rail/);
  assert.ok(r.unbacked.some((u) => u.raw === '999/999'));   // the fabricated witness score is named
  assert.ok(r.unbacked.some((u) => u.raw === '100%'));       // the unbacked metric is named
});

test('postableProven: composes — a TRUTHFUL post still waits for the rate window', () => {
  // the receipt backs every claim, but a post went out 30 min ago → the rail's own gap rule still bites
  const history = [{ sentAtMs: 10 * HOUR - 30 * 60 * 1000 }];
  const r = postableProven(PROVEN(), RECEIPT(), CONFIG(), history, 10 * HOUR);
  assert.equal(r.ok, false);
  assert.match(r.why, /rate window is closed/);
});

test('postableProven: the receipt-gate refuses BEFORE the rail even checks readiness', () => {
  // no token in the config (rail not ready) AND an inflated post — the receipt-gate speaks first
  const r = postableProven(INFLATED(), RECEIPT(), { platform: 'facebook-page', pageId: '1', token: '' }, [], 10 * HOUR);
  assert.equal(r.ok, false);
  assert.match(r.why, /the receipt-gate refused it before the rail/);
});

// ── fallscrub wired in: the sovereignty scrub is injected between the draft and the wire ──
// A post that IS receipt-backed but carries model-tells: a boilerplate opener, filler tell-words,
// a chat-template token, and a zero-width watermark char — none of which touch the backing claims.
const PROVEN_TELLS = () => ({
  hook: 'Certainly! agent-proof is live and witness-clean 130/133',
  reveal: 'We utilize a seamless, robust runner​ — CI green on the runner<|im_end|>',
  cta: 'see https://sjgant80-hub.github.io/agent-proof/',
  score: 1,
});

test('postScrubbedProven: strips the model-tells AND keeps every backing claim, so it MAY go', () => {
  const r = postScrubbedProven(PROVEN_TELLS(), RECEIPT(), CONFIG(), [], 10 * HOUR);
  assert.equal(r.ok, true, r.why);
  // the tells were found and removed (transparent per-category report)
  assert.ok(r.scrub.boilerplate >= 1, 'the "Certainly!" opener was stripped');
  assert.ok(r.scrub.chatTokens >= 1, 'the <|im_end|> chat token was stripped');
  assert.ok(r.scrub.hidden >= 1, 'the zero-width watermark char was stripped');
  assert.ok(r.scrub.wordSwaps >= 1, 'the filler tell-words were swapped');
  // the SHIPPED prose (what buildPost sends) carries no tell
  const msg = buildPost(r.post, CONFIG()).body.message;
  assert.ok(!/Certainly!|utilize|<\|im_end\|>/.test(msg), 'no boilerplate/tell-word/token rides out: ' + msg);
  assert.ok(!msg.includes('​'), 'no zero-width char rides out');
  // ⚑ THE INVARIANT: every backing claim SURVIVED the scrub — a rewriter before the wire must
  // never be able to break the receipt-gate. url + K/N score + CI + live all still present.
  assert.ok(msg.includes('130/133'), 'the witness score survives the scrub');
  assert.ok(msg.includes('CI green'), 'the CI claim survives the scrub');
  assert.ok(msg.includes('live'), 'the live claim survives the scrub');
  assert.ok(msg.includes('https://sjgant80-hub.github.io/agent-proof/'), 'the demo url survives the scrub untouched');
});

test('postScrubbedProven: the gate runs on the SCRUBBED text — scrub cannot launder a fabrication', () => {
  // an inflated post dressed in tells: the tells go, but the fabricated 999/999 and 100% survive
  // and are still refused, because the receipt-gate runs AFTER the scrub, on what actually ships.
  const inflatedTells = { ...INFLATED(), hook: 'Certainly! agent-proof is witness-clean 999/999', reveal: 'utilize 100% flawless, CI green<|im_end|>' };
  const r = postScrubbedProven(inflatedTells, RECEIPT(), CONFIG(), [], 10 * HOUR);
  assert.equal(r.ok, false);
  assert.match(r.why, /the receipt-gate refused it before the rail/);
  assert.ok(r.unbacked.some((u) => u.raw === '999/999'), 'the fabricated witness score is still named after the scrub');
});

test('postScrubbedProven: config.scrubSwapWords===false keeps the copy verbatim (tokens/hidden still go)', () => {
  const cfg = { ...CONFIG(), scrubSwapWords: false };
  const r = postScrubbedProven(PROVEN_TELLS(), RECEIPT(), cfg, [], 10 * HOUR);
  assert.equal(r.ok, true, r.why);
  const msg = buildPost(r.post, cfg).body.message;
  assert.ok(msg.includes('utilize'), 'word-swaps off → the tell-word stays');
  assert.ok(!/Certainly!/.test(msg) && !/<\|im_end\|>/.test(msg), 'but boilerplate and chat tokens still go');
});

test('postScrubbedProven / scrubPost: total on garbage', () => {
  assert.doesNotThrow(() => postScrubbedProven(null, null, null, null, null));
  assert.equal(typeof postScrubbedProven(null, null, null, null, null).ok, 'boolean');
  const s = scrubPost(null, null);
  assert.ok(s.post && typeof s.report.hidden === 'number');
  assert.doesNotThrow(() => scrubPost(7, 'x'));
});

// ── the LinkedIn adapter — same discipline, the platform's own shape ──
const LI_CONFIG = () => ({ platform: 'linkedin', authorUrn: 'urn:li:person:ABC123', token: 'AQV-fake-li-token-for-tests' });

test('RAILREADY accepts a valid LinkedIn config and refuses the bad ones — never carrying the token', () => {
  const ok = railReady(LI_CONFIG());
  assert.equal(ok.ok, true);
  assert.match(ok.why, /LinkedIn author urn:li:person:ABC123/);
  assert.ok(!ok.why.includes('AQV'), 'even the ready line never carries the token');
  assert.match(railReady({ platform: 'linkedin', authorUrn: '', token: 'x' }).why, /authorUrn is empty or malformed/);
  assert.match(railReady({ platform: 'linkedin', authorUrn: 'not-a-urn', token: 'x' }).why, /authorUrn is empty or malformed/);
  const noTok = railReady({ platform: 'linkedin', authorUrn: 'urn:li:organization:42', token: '' });
  assert.match(noTok.why, /paste the LinkedIn access token.*YOURSELF/);
  assert.match(noTok.why, /never rides through chat, a repo, or a prompt/);
  // an unknown platform still names both sanctioned rails
  assert.match(railReady({ platform: 'twitter' }).why, /facebook-page and linkedin are the ones that exist/);
});

test('buildPost(linkedin) is the exact UGC Posts request — Bearer header, JSON body, ARTICLE on a demoUrl', () => {
  const req = buildPost(POST(), LI_CONFIG());
  assert.equal(req.url, LINKEDIN + 'ugcPosts');
  assert.equal(req.method, 'POST');
  assert.equal(req.headers.Authorization, 'Bearer AQV-fake-li-token-for-tests');
  assert.equal(req.headers['X-Restli-Protocol-Version'], '2.0.0');
  assert.equal(req.body.author, 'urn:li:person:ABC123');
  assert.equal(req.body.lifecycleState, 'PUBLISHED');
  const share = req.body.specificContent['com.linkedin.ugc.ShareContent'];
  assert.match(share.shareCommentary.text, /own it once/);           // the hook is in the message
  assert.equal(share.shareMediaCategory, 'ARTICLE');                  // POST has a demoUrl
  assert.equal(share.media[0].originalUrl, POST().demoUrl);
  assert.equal(req.body.visibility['com.linkedin.ugc.MemberNetworkVisibility'], 'PUBLIC');
  // no demoUrl → NONE, no media
  const bare = buildPost({ hook: 'h', cta: 'c', score: 1 }, LI_CONFIG());
  assert.equal(bare.body.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory, 'NONE');
  assert.equal('media' in bare.body.specificContent['com.linkedin.ugc.ShareContent'], false);
});

test('redact strikes the LinkedIn Bearer token from the header, everywhere', () => {
  const red = redact(buildPost(POST(), LI_CONFIG()));
  assert.equal(red.headers.Authorization, 'Bearer ·struck·');
  assert.ok(!JSON.stringify(red).includes('AQV'), 'the token appears nowhere in a printable request');
});

test('buildMetrics(linkedin) reads socialActions with the Bearer header', () => {
  const m = buildMetrics('urn:li:share:999', LI_CONFIG());
  assert.match(m.url, /socialActions\/urn%3Ali%3Ashare%3A999/);
  assert.equal(m.headers.Authorization, 'Bearer AQV-fake-li-token-for-tests');
  assert.ok(!m.url.includes('AQV'), 'the token is not in the metrics url');
});

test('readMetrics reads the LinkedIn socialActions shape too', () => {
  const r = readMetrics({ likesSummary: { totalLikes: 5 }, commentsSummary: { count: 2 } });
  assert.deepEqual({ likes: r.likes, comments: r.comments, shares: r.shares }, { likes: 5, comments: 2, shares: 0 });
  assert.equal(r.engagement, 5 + 2 * 2 + 0);
  // the Facebook shape still reads
  const fb = readMetrics({ likes: { summary: { total_count: 3 } }, comments: { summary: { total_count: 1 } }, shares: { count: 4 } });
  assert.deepEqual({ likes: fb.likes, comments: fb.comments, shares: fb.shares }, { likes: 3, comments: 1, shares: 4 });
});

test('the rate/receipt discipline is platform-blind — postable works on a linkedin config', () => {
  assert.equal(postable(POST(), LI_CONFIG(), [], 10 * HOUR).ok, true);
  assert.doesNotThrow(() => buildPost(null, { platform: 'linkedin' }));  // total on garbage
});
