// si-didy-loop · rail.test.mjs — the sanctioned rail, every rule falsifiable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GRAPH, KAPPA, LIMITS, railReady, postable, buildPost, buildMetrics, redact, readMetrics, learn } from './rail.mjs';

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
