#!/usr/bin/env node
// si-didy-loop · scripts/rail.mjs — the sanctioned rail's runner: the only file that touches
// the wire, and the wire reaches exactly ONE origin: https://graph.facebook.com/.
//
//   node scripts/rail.mjs --init        write the config template + print the one-time setup
//   node scripts/rail.mjs --status      is the rail up — proves the connection with a real read
//   node scripts/rail.mjs --post-next   post the oldest draft the PROVEN rail allows (below)
//   node scripts/rail.mjs --measure     read real engagement back; print what converted
//
// The token lives ONLY in local-dna/rail-config.json (gitignored), pasted there by the
// key-holder's own hand — the one-time setup is the human 10%. This runner never prints it:
// everything printable goes through redact().
//
// --post-next goes through the PROVEN rail, rail.mjs postScrubbedProven, in the only honest order:
// SCRUB the prose of model-tells (the vendored, gated scrub.mjs = fallscrub's kernel), run the
// RECEIPT-GATE on the scrubbed text against the build-receipt the draft carries (post.receipt —
// receiptgate.mjs = post-proof's kernel), then the rail's score / spacing / daily-cap window.
// No receipt, no post. (2026-11-05: until today this runner called the bare postable() and a
// sibling fallscrub, so the receipt-gate the kernel composes never ran on a real post.)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { railReady, postScrubbedProven, buildPost, buildMetrics, redact, readMetrics, learn, KAPPA, GRAPH } from '../rail.mjs';

const here = dirname(fileURLToPath(import.meta.url));

const DNA = join(here, '..', 'local-dna');
const CONFIG_F = join(DNA, 'rail-config.json');
const OUTBOX_F = join(DNA, 'outbox.json');
const HISTORY_F = join(DNA, 'rail-history.json');

const readJson = (f, fb) => existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : fb;
const writeJson = (f, v) => writeFileSync(f, JSON.stringify(v, null, 1));

// the sanctioned-reach rule, enforced at the wire: one origin, checked as a literal prefix
async function graphFetch(req) {
  if (!req.url.startsWith(GRAPH)) throw new Error('REFUSED: the rail reaches ' + GRAPH + ' and nowhere else — got ' + redact(req).url);
  const res = await fetch(req.url, req.method === 'POST'
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body) }
    : { method: 'GET' });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

const config = readJson(CONFIG_F, null);
const args = process.argv.slice(2);

if (args[0] === '--init') {
  if (existsSync(CONFIG_F)) { console.log('a rail config already exists at ' + CONFIG_F + ' — this tool never overwrites it.'); process.exit(0); }
  writeJson(CONFIG_F, {
    kind: 'sanctioned-rail-config',
    platform: 'facebook-page',
    pageId: '',
    token: '',
    note: 'Paste the numeric Page ID and the Page Access Token here YOURSELF. This file is gitignored and the runner never prints the token.',
  });
  console.log('template written → ' + CONFIG_F + '\n');
  console.log('THE ONE-TIME SETUP (the human 10% — about five minutes, done once):');
  console.log('  1. developers.facebook.com → My Apps → Create App (type: Business). Dev mode is fine —');
  console.log('     an app you admin can post to a page you admin without app review.');
  console.log('  2. Add the "Facebook Login for Business" + pages products; open Graph API Explorer,');
  console.log('     pick your app, ask for pages_manage_posts + pages_read_engagement, Generate Token,');
  console.log('     then swap it for the PAGE access token of your page (Get Page Access Token).');
  console.log('  3. For a long-lived token: exchange it once in the Explorer (or Access Token Debugger → Extend).');
  console.log('  4. Open ' + CONFIG_F + ' in notepad and paste the Page ID and token into the two fields.');
  console.log('  5. node scripts/rail.mjs --status  — it proves the connection with a real read.');
  console.log('\nThe token never rides through chat, a repo, or a prompt — only that file.');
  process.exit(0);
}

if (args[0] === '--status') {
  const ready = railReady(config);
  console.log(ready.why);
  if (!ready.ok) process.exit(1);
  const probe = await graphFetch({ url: GRAPH + config.pageId + '?fields=name,id&access_token=' + encodeURIComponent(config.token), method: 'GET' });
  if (probe.status === 200 && probe.body.id === config.pageId) {
    console.log(`✓ the rail is UP — connected to page "${probe.body.name}" (${probe.body.id}). Posting is autonomous from here.`);
    process.exit(0);
  }
  console.log(`✗ the rail did not answer: HTTP ${probe.status} — ${probe.body?.error?.message || 'no error message'}`);
  console.log('  (a dead token usually means it was short-lived — step 3 of --init extends it)');
  process.exit(1);
}

if (args[0] === '--post-next') {
  const outbox = readJson(OUTBOX_F, { posts: [] });
  const history = readJson(HISTORY_F, { kind: 'rail-history', sent: [] });
  const candidates = (outbox.posts || []).filter(p => p && !p.sentAtMs);
  if (!candidates.length) { console.log('the outbox is empty — nothing drafted to post.'); process.exit(0); }
  // the oldest draft the proven rail lets through; a refused draft stays in the outbox, and the oldest
  // refusal is said, so a draft with no receipt never silently blocks the ones behind it
  const now = Date.now();
  let post = null, d = null, first = null, refused = 0;
  for (const p of candidates) {
    const r = postScrubbedProven(p, p.receipt, config, history.sent, now);
    if (r.ok) { post = p; d = r; break; }
    refused += 1; if (!first) first = r;
  }
  if (!d) { console.log(`not posting: ${refused} draft(s) waiting, none allowed — the oldest: ${first.why}`); process.exit(0); }
  if (refused) console.log(`${refused} older draft(s) refused and kept in the outbox — the oldest: ${first.why}`);
  const tells = Object.values(d.scrub).reduce((n, c) => n + c, 0);
  console.log(tells ? `scrubbed ${tells} model-tell(s) from the post before the receipt-gate read it` : 'post carried no model-tells');
  console.log('cleared the receipt-gate, then the rail: ' + d.why);

  const req = buildPost(d.post, config);   // exactly the bytes that were scrubbed AND claim-gated
  console.log('posting: ' + JSON.stringify(redact(req).body.message).slice(0, 120) + '…');
  const res = await graphFetch(req);
  if (res.status === 200 && res.body.id) {
    const sentAtMs = Date.now();
    history.sent.push({ postId: res.body.id, hook: post.hook, message: req.body.message, sentAtMs, metrics: null });
    post.sentAtMs = sentAtMs; post.postId = res.body.id;
    writeJson(HISTORY_F, history); writeJson(OUTBOX_F, outbox);
    console.log(`✓ POSTED on the sanctioned rail — post id ${res.body.id}. Measure follows on the next --measure.`);
    process.exitCode = 0;
  } else {
    const why = res.body?.error?.message || 'no error message';
    console.log(`✗ the rail refused the post: HTTP ${res.status} — ${why}. The draft stays in the outbox.`);
    // the refusal is kept, so the morning brief says the rail is refusing instead of "up" (2026-10-22)
    history.lastRefusal = { atMs: Date.now(), status: res.status, why: String(why).slice(0, 500) };
    writeJson(HISTORY_F, history);
    process.exitCode = 1;
  }
}

if (args[0] === '--measure') {
  const ready = railReady(config);
  if (!ready.ok) { console.log('not measuring: ' + ready.why); process.exit(0); }
  const history = readJson(HISTORY_F, { kind: 'rail-history', sent: [] });
  let measured = 0;
  for (const h of history.sent) {
    if (!h || !h.postId) continue;
    const res = await graphFetch(buildMetrics(h.postId, config));
    if (res.status !== 200) { console.log(`  ✗ ${h.postId}: HTTP ${res.status} — ${res.body?.error?.message || ''}`); continue; }
    h.metrics = { ...readMetrics(res.body), at: new Date().toISOString() };
    measured += 1;
    console.log(`  ${h.postId} · likes ${h.metrics.likes} · comments ${h.metrics.comments} · shares ${h.metrics.shares} → engagement ${h.metrics.engagement}`);
  }
  writeJson(HISTORY_F, history);
  const ranked = learn(history.sent);
  if (ranked.length) {
    console.log(`\nwhat converts (${measured} re-measured):`);
    for (const r of ranked.slice(0, 3)) console.log(`  ${r.engagement.toString().padStart(4)} — "${r.hook}"`);
    console.log('the next draft starts from the top hook — post, measure, adjust, post better.');
  } else console.log('nothing measured yet — post first, then measure.');
  process.exitCode = 0;
}

// after a fetch the process ENDS by itself (exitCode), never by process.exit: on Windows, Node 25 aborts with a libuv
// assertion (UV_HANDLE_CLOSING) when process.exit lands while a socket is still closing — found 2026-10-22, it ate the
// night's one line saying why the rail refused
if (args[0] !== '--post-next' && args[0] !== '--measure') {
  console.log('usage: --init | --status | --post-next | --measure');
  console.log(railReady(config).why);
  process.exit(1);
}
