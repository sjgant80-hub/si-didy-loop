#!/usr/bin/env node
// si-didy-loop · scripts/rail.mjs — the sanctioned rail's runner: the only file that touches
// the wire, and the wire reaches exactly ONE origin: https://graph.facebook.com/.
//
//   node scripts/rail.mjs --init        write the config template + print the one-time setup
//   node scripts/rail.mjs --status      is the rail up — proves the connection with a real read
//   node scripts/rail.mjs --post-next   post the oldest graded post the window allows
//   node scripts/rail.mjs --measure     read real engagement back; print what converted
//
// The token lives ONLY in local-dna/rail-config.json (gitignored), pasted there by the
// key-holder's own hand — the one-time setup is the human 10%. This runner never prints it:
// everything printable goes through redact().

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { railReady, postable, buildPost, buildMetrics, redact, readMetrics, learn, KAPPA, GRAPH } from '../rail.mjs';

const here = dirname(fileURLToPath(import.meta.url));

// THE SOVEREIGNTY GATE before the rail: every post is scrubbed of model-tells (which local model
// wrote it) by fallscrub, linked by observation from the sibling checkout. No scrubber, no post —
// posting unscrubbed would leak the stack, which is the whole thing the rail exists to protect.
const FALLSCRUB = join(here, '..', '..', 'fallscrub', 'scrub.mjs');
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
  const post = candidates[0];
  const may = postable(post, config, history.sent, Date.now());
  if (!may.ok) { console.log('not posting: ' + may.why); process.exit(0); }

  // scrub the post of model-tells before it can go — no scrubber, no post
  if (!existsSync(FALLSCRUB)) {
    console.error('STOP: fallscrub is not checked out next door (' + FALLSCRUB + ').');
    console.error('The rail will not post text it has not scrubbed of model-tells — clone fallscrub beside si-didy-loop first.');
    process.exit(1);
  }
  const { scrub } = await import(pathToFileURL(FALLSCRUB).href);
  let scrubbed = 0;
  for (const f of ['hook', 'reveal', 'cta']) {
    if (typeof post[f] === 'string') { const r = scrub(post[f]); scrubbed += r.report.chatTokens + r.report.selfId + r.report.boilerplate + r.report.wordSwaps + r.report.unicode; post[f] = r.text; }
  }
  console.log(scrubbed ? `scrubbed ${scrubbed} model-tell(s) from the post before posting` : 'post carried no model-tells');

  const req = buildPost(post, config);
  console.log('posting: ' + JSON.stringify(redact(req).body.message).slice(0, 120) + '…');
  const res = await graphFetch(req);
  if (res.status === 200 && res.body.id) {
    const sentAtMs = Date.now();
    history.sent.push({ postId: res.body.id, hook: post.hook, message: req.body.message, sentAtMs, metrics: null });
    post.sentAtMs = sentAtMs; post.postId = res.body.id;
    writeJson(HISTORY_F, history); writeJson(OUTBOX_F, outbox);
    console.log(`✓ POSTED on the sanctioned rail — post id ${res.body.id}. Measure follows on the next --measure.`);
    process.exit(0);
  }
  console.log(`✗ the rail refused the post: HTTP ${res.status} — ${res.body?.error?.message || 'no error message'}. The draft stays in the outbox.`);
  process.exit(1);
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
  process.exit(0);
}

console.log('usage: --init | --status | --post-next | --measure');
console.log(railReady(config).why);
process.exit(1);
