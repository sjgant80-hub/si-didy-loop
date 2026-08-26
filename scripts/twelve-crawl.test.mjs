// scripts/twelve-crawl.test.mjs — the crawl law, falsifiable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crawlMarks, crawlEstate, MEASURED, UNREAD } from './twelve-crawl.mjs';

const NOW = Date.parse('2026-08-26T12:00:00Z');
const days = (n) => new Date(NOW - n * 86400000).toISOString();

test('CRAWL MARKS — the four evidence rules, exactly', () => {
  const live = crawlMarks({ name: 'a', desc: 'x', live: true, pushed: days(5) }, { proof: { tier: 'works' } }, NOW);
  assert.deepEqual(live.marks, { MANIFESTATION: 'strong', IGNITION: 'strong', STRUCTURE: 'strong', LIFE: 'strong' });
  assert.equal(live.measured, 100);
  assert.equal(live.sellable, true);
  assert.equal(live.nearly, false, 'works-tier is not "nearly" — it arrived');
  const darkStale = crawlMarks({ name: 'b', pushed: days(200) }, null, NOW);
  assert.deepEqual(darkStale.marks, { MANIFESTATION: 'missing', IGNITION: 'missing', STRUCTURE: 'missing', LIFE: 'missing' });
  assert.equal(darkStale.measured, 0);
  const descOnly = crawlMarks({ name: 'c', desc: 'a tool', pushed: days(45) }, null, NOW);
  assert.deepEqual(descOnly.marks, { MANIFESTATION: 'weak', IGNITION: 'weak', STRUCTURE: 'weak', LIFE: 'weak' });
  assert.equal(descOnly.measured, 50);
});

test('CRAWL MARKS — archived kills the weak paths; pages counts for manifestation only', () => {
  const arch = crawlMarks({ name: 'a', desc: 'x', archived: true, pushed: days(5) }, null, NOW);
  assert.equal(arch.marks.MANIFESTATION, 'missing', 'archived cannot be weakly-manifest');
  assert.equal(arch.marks.IGNITION, 'missing');
  assert.equal(arch.marks.STRUCTURE, 'weak', 'a described frame is still a described frame');
  const pages = crawlMarks({ name: 'p', pages: true, pushed: days(5) }, null, NOW);
  assert.equal(pages.marks.MANIFESTATION, 'weak', 'pages enabled but not live = weak output');
  assert.equal(pages.marks.IGNITION, 'missing', 'no desc, not live — nothing says how it starts');
});

test('CRAWL MARKS — the LIFE boundaries are exact: 30 and 90 days', () => {
  const at = (n) => crawlMarks({ name: 'x', pushed: days(n) }, null, NOW).marks.LIFE;
  assert.equal(at(29.9), 'strong');
  assert.equal(at(30), 'weak', 'exactly 30 days is no longer strong');
  assert.equal(at(89.9), 'weak');
  assert.equal(at(90), 'missing', 'exactly 90 days is no longer weak');
  assert.equal(crawlMarks({ name: 'x' }, null, NOW).marks.LIFE, 'missing', 'no pushed date = no growth signal');
});

test('CRAWL MARKS — sellable law and the nearly list; proven counts like works', () => {
  const proven = crawlMarks({ name: 'a', live: true, pushed: days(5) }, { proof: { tier: 'proven' } }, NOW);
  assert.equal(proven.sellable, true);
  const liveNoCi = crawlMarks({ name: 'b', live: true, desc: 'x', pushed: days(5) }, { proof: { tier: 'prototype' } }, NOW);
  assert.equal(liveNoCi.sellable, false);
  assert.equal(liveNoCi.nearly, true, 'live without CI = one workflow away');
  assert.deepEqual(liveNoCi.unread, UNREAD, 'the eight unread powers are named, never guessed');
  assert.equal(MEASURED.length + UNREAD.length, 12, 'the court is whole: measured + unread = twelve');
});

test('CRAWL MARKS — guards are exact: blank desc is no desc, junk shapes refuse not throw, tier rides', () => {
  const blank = crawlMarks({ name: 'x', desc: '   ', pushed: days(400) }, null, NOW);
  assert.equal(blank.marks.MANIFESTATION, 'missing', 'whitespace-only desc is not a description');
  const arrWorn = []; arrWorn.proof = { tier: 'works' };
  const aw = crawlMarks({ name: 'x', desc: 'd', pushed: days(5) }, arrWorn, NOW);
  assert.equal(aw.marks.STRUCTURE, 'weak', 'an array wearing a proof is not a world item');
  assert.equal(crawlMarks(null, null, NOW).ok, false, 'null repo refuses, never throws');
  assert.equal(crawlMarks({ name: 123 }, null, NOW).ok, false, 'a numeric name is not a name');
  assert.equal(crawlMarks({ name: '' }, null, NOW).ok, false);
  const t = crawlMarks({ name: 'a', live: true, pushed: days(5) }, { proof: { tier: 'works' } }, NOW);
  assert.equal(t.tier, 'works', 'the tier rides through verbatim');
  assert.equal(crawlMarks({ name: 'a' }, null, NOW).tier, null, 'no tier reads null, not empty-string');
});

test('CRAWL — equal-measured sellables order alphabetically, not by insertion luck', () => {
  const repos = [
    { name: 'zeta', live: true, desc: 'x', pushed: days(3) },
    { name: 'alpha', live: true, desc: 'x', pushed: days(3) },
  ];
  const world = { zeta: { proof: { tier: 'works' } }, alpha: { proof: { tier: 'proven' } } };
  const r = crawlEstate(repos, world, NOW);
  assert.deepEqual(r.sellable.map((x) => x.name), ['alpha', 'zeta']);
});

test('CRAWL — sweeps everything, refuses junk rows without dying, refuses a non-list estate', () => {
  const repos = [
    { name: 'sell', live: true, desc: 'x', pushed: days(3) },
    { name: 'near', live: true, desc: 'x', pushed: days(3) },
    { name: 'dark', pushed: days(400) },
    null, { desc: 'nameless' },
  ];
  const world = { sell: { proof: { tier: 'works' } }, near: { proof: { tier: 'prototype' } } };
  const r = crawlEstate(repos, world, NOW);
  assert.equal(r.ok, true);
  assert.equal(r.swept, 3); assert.equal(r.refused, 2);
  assert.deepEqual(r.sellable.map((x) => x.name), ['sell']);
  assert.equal(r.nearlyCount, 1);
  assert.equal(r.darkCount, 1);
  assert.equal(r.staleCount, 1);
  assert.match(r.note, /eight UNREAD per repo/, 'the cap is said, never silent');
  assert.equal(crawlEstate(null, {}, NOW).ok, false);
  assert.equal(crawlEstate('all', {}, NOW).ok, false);
  assert.equal(crawlMarks({ name: 'x' }, null, NaN).ok, false, 'no clock in the kernel');
});
