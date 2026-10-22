// si-didy-loop · brief.test.mjs — the morning brief, every rule falsifiable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distill, renderBrief } from './brief.mjs';

const NOW = Date.parse('2026-08-20T06:00:00Z');
const iso = (msAgo) => new Date(NOW - msAgo).toISOString();
const HOUR = 60 * 60 * 1000;

const INPUTS = () => ({
  state: {
    tally: { produced: 30, validated: 30, internalSupply: 101, reuseDepth: 8 },
    builds: [
      { slug: 'old-bench', kpid: 'kcc:old:gen0:aaaaaaaa', at: iso(30 * HOUR) },
      { slug: 'fresh-workshop', kpid: 'kcc:fresh:gen0:bbbbbbbb', at: iso(3 * HOUR) },
      { slug: 'fresh-heir', kpid: 'kcc:heir:fork:cccccccc', at: iso(2 * HOUR), gen: 2, parent: 'kcc:fresh:gen0:bbbbbbbb' },
    ],
  },
  queue: { items: [
    { seq: 0, status: 'approved', action: { stream: 'x', cap: 'y' } },
    { seq: 9, status: 'queued', action: { stream: 'baby-kcc', cap: 'bridge-real-money' } },
    { seq: 11, status: 'rejected', action: { stream: 'z', cap: 'w' } },
  ] },
  outbox: { posts: [{ hook: 'a', sentAtMs: 1 }, { hook: 'b' }, { hook: 'c' }] },
  railConfig: { platform: 'facebook-page', pageId: '123', token: 'EAAG-secret-token' },
  railHistory: { sent: [{ sentAtMs: NOW - 2 * HOUR }, { sentAtMs: NOW - 30 * HOUR }] },
  progress: { complete: true, attempts: [
    { stage: 'S6', evidence: 'proposed: soundcheck kiosks for venues' },
    { stage: 'S6', evidence: 'proposed: the freshest pairing' },
  ] },
});

test('DISTILL WINDOWS THE NIGHT — a 30-hour-old build is yesterday\'s news, strictly', () => {
  const b = distill(INPUTS(), NOW);
  assert.deepEqual(b.builds.map(x => x.slug), ['fresh-workshop', 'fresh-heir']);
  assert.equal(b.builds[1].gen, 2);
  assert.equal(b.rail.up, true);
  assert.match(b.rail.why, /1 post\(s\) in the last day/, 'the 30-hour-old post left the window');
  assert.equal(b.outboxWaiting, 2, 'a sent post is not waiting');
  assert.deepEqual(b.doors.map(d => d.seq), [9], 'only QUEUED doors ask for the key — approved and rejected do not');
  assert.equal(b.proposal, 'proposed: the freshest pairing', 'the LAST S6 attempt is the freshest');
});

test('FIRSTACTION IS RANKED, NOT LISTED — rail beats doors beats proposal beats quiet', () => {
  const noRail = distill({ ...INPUTS(), railConfig: null }, NOW);
  assert.match(noRail.firstAction.what, /Paste the rail token/);
  assert.match(noRail.firstAction.how, /by your hand/);
  const railButDoors = distill(INPUTS(), NOW);
  assert.match(railButDoors.firstAction.what, /Turn or close 1 waiting door/);
  const quietQueue = distill({ ...INPUTS(), queue: { items: [] } }, NOW);
  assert.match(quietQueue.firstAction.what, /freshest proposal/);
  const nothing = distill({ ...INPUTS(), queue: { items: [] }, progress: { attempts: [] } }, NOW);
  assert.match(nothing.firstAction.what, /Nothing needs your hand today/);
});

test('AN EMPTY TOKEN MEANS THE RAIL IS DOWN — configuration is all three fields', () => {
  const b = distill({ ...INPUTS(), railConfig: { platform: 'facebook-page', pageId: '123', token: '' } }, NOW);
  assert.equal(b.rail.up, false);
  assert.match(b.rail.why, /not configured — the outbox holds/);
  assert.match(b.firstAction.what, /Paste the rail token/);
});

test('NO TOKEN, EVER — neither the brief nor the page may carry it, even with the rail configured', () => {
  const b = distill(INPUTS(), NOW);
  assert.ok(!JSON.stringify(b).includes('EAAG'), 'the distilled brief never copies the token');
  const html = renderBrief(b);
  assert.ok(!html.includes('EAAG'), 'the rendered page never carries the token');
});

test('THE PAGE SAYS THE NIGHT — first action on top, doors named, the proposal spoken', () => {
  const html = renderBrief(distill(INPUTS(), NOW));
  assert.match(html, /→ Turn or close 1 waiting door/);
  assert.match(html, /fresh-workshop/);
  assert.match(html, /\(gen-2\)/);
  assert.match(html, /baby-kcc · bridge-real-money/);
  assert.match(html, /queued unsigned/);
  assert.match(html, /2 draft\(s\) in the outbox/);
  assert.match(html, /proposed: the freshest pairing/);
  assert.match(html, /course is complete; expansion never stops/);
  assert.match(html, /private, local only, never published/);
  assert.ok(html.indexOf('→ Turn or close') < html.indexOf('overnight'), 'the first action comes before everything');
});

test('EMPTY FILES READ AS AN HONEST QUIET MORNING — never a crash, never an invention', () => {
  const b = distill({}, NOW);
  assert.deepEqual(b.builds, []);
  assert.deepEqual(b.doors, []);
  assert.equal(b.rail.up, false);
  const html = renderBrief(b);
  assert.match(html, /no new builds in the last day/);
  assert.match(html, /no doors waiting/);
  assert.match(html, /no fresh proposal — the next dream brings one/);
  assert.match(html, /course is climbing/);
});

test('MARKUP IN DATA IS ESCAPED — a build slug cannot script the brief', () => {
  const html = renderBrief(distill({ state: { builds: [{ slug: '<script>alert(1)</script>', kpid: 'k', at: iso(HOUR) }], tally: {} } }, NOW));
  assert.ok(!html.includes('<script>alert'), 'angle brackets from data are escaped');
  assert.match(html, /&lt;script&gt;/);
});

// ─── round two: the gate found the gaps — boundaries, tally passthrough, the impostor ───

test('THE DAY WINDOW IS EXACT ON BOTH EDGES — 24h is out, this very moment is in', () => {
  const onEdge = distill({ state: { builds: [
    { slug: 'exactly-a-day', kpid: 'k1', at: iso(24 * HOUR) },
    { slug: 'right-now', kpid: 'k2', at: iso(0) },
  ], tally: {} } }, NOW);
  assert.deepEqual(onEdge.builds.map(x => x.slug), ['right-now'],
    'a build exactly a day old has left the window; one from this instant is in it');
  const railEdge = distill({ ...INPUTS(), railHistory: { sent: [{ sentAtMs: NOW - 24 * HOUR }] } }, NOW);
  assert.match(railEdge.rail.why, /0 post\(s\) in the last day/, 'a post exactly a day old has left the rail window too');
});

test('THE TALLY RIDES THROUGH EXACTLY — real numbers, not zeroed, not invented', () => {
  const b = distill(INPUTS(), NOW);
  assert.deepEqual(b.tally, { produced: 30, validated: 30, internalSupply: 101, reuseDepth: 8 });
  const html = renderBrief(b);
  assert.match(html, /30 produced · 30 validated · 101 KCC internal · reuse 8/);
});

test('ONLY AN S6 WITH EVIDENCE IS A PROPOSAL — an eloquent S5 is not, a mute S6 is not', () => {
  const s5loud = distill({ ...INPUTS(), progress: { attempts: [
    { stage: 'S6', evidence: 'the real proposal' },
    { stage: 'S5', evidence: 'a cycle log, not a proposal' },
  ] } }, NOW);
  assert.equal(s5loud.proposal, 'the real proposal');
  const s6mute = distill({ ...INPUTS(), queue: { items: [] }, progress: { attempts: [{ stage: 'S6' }] } }, NOW);
  assert.equal(s6mute.proposal, '');
  assert.match(s6mute.firstAction.what, /Nothing needs your hand/, 'a mute S6 does not fake a proposal action');
});

test('THE GEN-2 MARK SITS ONLY ON GEN-2 — a first-generation build never wears it', () => {
  const html = renderBrief(distill({ state: { builds: [{ slug: 'plain-gen1', kpid: 'k', at: iso(HOUR) }], tally: {} } }, NOW));
  assert.ok(!html.includes('(gen-2)'), 'no gen-2 mark anywhere when no fork was built');
});

test('A FUNCTION IS NOT AN INPUTS BAG — the impostor reads as an empty quiet morning', () => {
  const impostor = Object.assign(function inputs() {}, INPUTS());
  const b = distill(impostor, NOW);
  assert.deepEqual(b.builds, [], 'properties on a function are not the night\'s files');
  assert.equal(b.rail.up, false);
});

test('FUZZ: total on garbage', () => {
  distill(null, null); distill(7, NaN); distill({ state: 'x', queue: 9, outbox: [], railHistory: 'h', progress: [] }, NOW);
  renderBrief(null); renderBrief(7); renderBrief({ firstAction: 'x', tally: 'y', builds: 'z' });
  const b = distill({ state: { builds: [{ at: 'not-a-date' }, null, 7] } }, NOW);
  assert.deepEqual(b.builds, [], 'undateable builds are not last night');
  assert.ok(true);
});

test('CONFIGURED IS NOT WORKING — a refusal newer than the last post that went says so, with the platform\'s reason', () => {
  // 2026-10-22: the brief said "● up" every morning while the platform refused every post
  const why = 'requires both pages_read_engagement and pages_manage_posts';
  const refused = distill({ ...INPUTS(), railHistory: { sent: [{ sentAtMs: NOW - 30 * HOUR }], lastRefusal: { atMs: NOW - HOUR, status: 403, why } } }, NOW);
  assert.equal(refused.rail.up, false);
  assert.equal(refused.rail.why, 'configured, but the platform refused the last post: ' + why);
  assert.equal(refused.firstAction.what, 'The rail is set up but the platform refuses every post — the page token needs what it names');
  assert.equal(refused.firstAction.how, why);
  // a refusal before the last post that went is history: the rail worked after it
  const healed = distill({ ...INPUTS(), railHistory: { sent: [{ sentAtMs: NOW - 2 * HOUR }], lastRefusal: { atMs: NOW - 3 * HOUR, why } } }, NOW);
  assert.equal(healed.rail.up, true);
  assert.match(healed.firstAction.what, /Turn or close/);
  // at the very same moment as the last send it is not newer, so it is not a refusal now
  const tie = distill({ ...INPUTS(), railHistory: { sent: [{ sentAtMs: NOW - 2 * HOUR }], lastRefusal: { atMs: NOW - 2 * HOUR, why } } }, NOW);
  assert.equal(tie.rail.up, true);
  // never sent at all: any refusal is newer
  const never = distill({ ...INPUTS(), railHistory: { sent: [], lastRefusal: { atMs: 5, why } } }, NOW);
  assert.equal(never.rail.up, false);
  // a refusal with no time is not dated, so it is not said
  assert.equal(distill({ ...INPUTS(), railHistory: { sent: [], lastRefusal: { why } } }, NOW).rail.up, true);
  // an empty reason still says a refusal happened
  assert.equal(distill({ ...INPUTS(), railHistory: { sent: [], lastRefusal: { atMs: 5, why: '   ' } } }, NOW).rail.why, 'configured, but the platform refused the last post: no reason given');
  // the not-configured rail still ranks first, refusal or none
  assert.match(distill({ ...INPUTS(), railConfig: null, railHistory: { sent: [], lastRefusal: { atMs: 5, why } } }, NOW).firstAction.what, /Paste the rail token/);
});

test('A REFUSAL NEVER CARRIES THE TOKEN — cut out wherever it appears, and long reasons are cut at 300', () => {
  const why = 'bad token EAAG-secret-token for page, again EAAG-secret-token';
  const b = distill({ ...INPUTS(), railHistory: { sent: [], lastRefusal: { atMs: 5, why } } }, NOW);
  assert.ok(!JSON.stringify(b).includes('EAAG-secret-token'), 'the distilled brief carries no token');
  assert.ok(!renderBrief(b).includes('EAAG-secret-token'), 'the page carries no token');
  assert.equal(b.firstAction.how, 'bad token [token] for page, again [token]');
  const long = distill({ ...INPUTS(), railHistory: { sent: [], lastRefusal: { atMs: 5, why: 'x'.repeat(400) } } }, NOW);
  assert.equal(long.firstAction.how.length, 300);
  assert.equal(distill({ ...INPUTS(), railHistory: { sent: [], lastRefusal: { atMs: 5, why: 'a\n   b\tc' } } }, NOW).firstAction.how, 'a b c', 'whitespace folds to single spaces');
});

test('THE DREAM IS SAID AS THE RUNNER SAID IT — five at most, blanks dropped, escaped on the page', () => {
  const said = ['one', '', '  ', 7, 'two', 'three', 'four', 'five', 'six'];
  const b = distill({ ...INPUTS(), dreamt: said }, NOW);
  assert.deepEqual(b.dreamt, ['one', 'two', 'three', 'four', 'five']);
  assert.deepEqual(distill({ ...INPUTS(), dreamt: 'not a list' }, NOW).dreamt, []);
  const html = renderBrief(distill({ ...INPUTS(), dreamt: ['<b>x</b> led me to y'] }, NOW));
  assert.match(html, /what I dreamed, in plain words/);
  assert.match(html, /◌ &lt;b&gt;x&lt;\/b&gt; led me to y/);
  assert.match(renderBrief(distill(INPUTS(), NOW)), /the dream kept nothing it could say a reason for last night/);
});

test('A PROPOSAL WITH PLAIN WORDS LEADS WITH THEM — the machine handle sits under it, dim', () => {
  const ev = 'proposed from the dream shadow: "a bundled with b" — proposal only. In plain words: I think a and b belong together.';
  const html = renderBrief(distill({ ...INPUTS(), progress: { attempts: [{ stage: 'S6', evidence: ev }] } }, NOW));
  assert.ok(html.includes('<div class="row">I think a and b belong together.</div><div class="row dim">the machine\'s handle: proposed from the dream shadow: "a bundled with b" — proposal only.</div>'));
  // the very start counts: a proposal that is ONLY plain words still splits
  const only = renderBrief(distill({ ...INPUTS(), progress: { attempts: [{ stage: 'S6', evidence: 'x In plain words: y' }] } }, NOW));
  assert.ok(only.includes('<div class="row">y</div><div class="row dim">the machine\'s handle: x</div>'));
  const none = renderBrief(distill({ ...INPUTS(), progress: { attempts: [{ stage: 'S6', evidence: 'no plain part' }] } }, NOW));
  assert.ok(none.includes('<div class="row">no plain part</div>'));
});

test('PLAIN WORDS AT THE VERY START STILL SPLIT — position zero is a place, not an absence', () => {
  const html = renderBrief(distill({ ...INPUTS(), progress: { attempts: [{ stage: 'S6', evidence: ' In plain words: y' }] } }, NOW));
  assert.ok(html.includes('<div class="row">y</div><div class="row dim">the machine\'s handle: </div>'));
});
