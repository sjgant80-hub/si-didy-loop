// scripts/rail-runner.test.mjs — the rail's runner posts only through the PROVEN rail (postScrubbedProven):
// scrubbed prose, receipt-gated claims, then the window. The runner is run for real on a copy in a temp folder,
// with the network replaced by a stub that records every call and answers like the Graph API — so no test can
// ever reach a platform, and a refusal is proven by the stub never being called.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// the dogfood receipt the receipt-gate's own suite uses (agent-proof: live, CI green, 130/133)
const RECEIPT = {
  url: 'https://sjgant80-hub.github.io/agent-proof/', live: true, ci: 'success',
  witness: { clean: true, killed: 130, total: 133 }, does: 'a deterministic policy gate',
  facts: [{ key: 'no-judge', value: 'no LLM judge' }],
};
// what the operator drafts today (scripts/operate.mjs): a graded post with no build receipt
const UNRECEIPTED = { about: 'kp1', hook: 'Built overnight, owned forever: thing one.', demoUrl: 'https://sjgant80-hub.github.io/sididy-catalogue/builds/x.html', cta: 'Open it — one file, offline, yours.', score: 0.9 };
// an honest post with a model tell in it
const HONEST = { about: 'kp2', hook: 'We shipped agent-proof. As an AI language model, I think it is great.', reveal: 'It is live, CI green, and witness-clean 130/133.', cta: 'See it: https://sjgant80-hub.github.io/agent-proof/', score: 0.9, receipt: RECEIPT };
// a post whose claims outrun the same receipt
const HYPED = { about: 'kp3', hook: 'agent-proof is live and 100% bulletproof.', reveal: 'Witness 200/200, CI green.', cta: 'See it: https://sjgant80-hub.github.io/agent-proof/', score: 0.9, receipt: RECEIPT };

const STUB = `
import { appendFileSync } from 'node:fs';
globalThis.fetch = async (url, init) => {
  appendFileSync(process.env.RAIL_CALLS, JSON.stringify({ url: String(url), method: init && init.method, body: init && init.body }) + '\\n');
  return { status: 200, json: async () => ({ id: 'stub-post-1' }) };
};`;

function night(posts) {
  const d = mkdtempSync(join(tmpdir(), 'rail-runner-'));
  mkdirSync(join(d, 'scripts')); mkdirSync(join(d, 'local-dna'));
  for (const f of ['rail.mjs', 'receiptgate.mjs', 'scrub.mjs', 'package.json']) copyFileSync(join(ROOT, f), join(d, f));
  copyFileSync(join(ROOT, 'scripts', 'rail.mjs'), join(d, 'scripts', 'rail.mjs'));
  writeFileSync(join(d, 'local-dna', 'rail-config.json'), JSON.stringify({ kind: 'sanctioned-rail-config', platform: 'facebook-page', pageId: '111', token: 'STUB-NOT-A-TOKEN' }));
  writeFileSync(join(d, 'local-dna', 'outbox.json'), JSON.stringify({ posts }));
  writeFileSync(join(d, 'stub.mjs'), STUB);
  const calls = join(d, 'calls.jsonl');
  const run = () => {
    const r = spawnSync(process.execPath, ['--import', pathToFileURL(join(d, 'stub.mjs')).href, join(d, 'scripts', 'rail.mjs'), '--post-next'],
      { cwd: d, encoding: 'utf8', env: { ...process.env, RAIL_CALLS: calls } });
    return { out: (r.stdout || '') + (r.stderr || ''), status: r.status,
      calls: existsSync(calls) ? readFileSync(calls, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [] };
  };
  const outbox = () => JSON.parse(readFileSync(join(d, 'local-dna', 'outbox.json'), 'utf8'));
  return { run, outbox, done: () => rmSync(d, { recursive: true, force: true }) };
}

test('a draft with no build receipt never reaches the wire: no receipt, no post', () => {
  const n = night([UNRECEIPTED]);
  const r = n.run();
  assert.equal(r.status, 0);
  assert.equal(r.calls.length, 0);
  assert.match(r.out, /not posting: 1 draft\(s\) waiting, none allowed/);
  assert.match(r.out, /the receipt-gate refused it before the rail: cannot gate against an invalid receipt/);
  assert.equal(n.outbox().posts[0].sentAtMs, undefined);
  n.done();
});

test('a post whose claims outrun its receipt is refused before the rail, however well it is graded', () => {
  const n = night([HYPED]);
  const r = n.run();
  assert.equal(r.calls.length, 0);
  assert.match(r.out, /unbacked claim\(s\) — refused before the rail/);
  n.done();
});

test('an honest receipted post goes out scrubbed, as exactly the bytes the gate read; an older refused draft stays', () => {
  const n = night([UNRECEIPTED, HONEST]);
  const r = n.run();
  assert.equal(r.status, 0, r.out);
  assert.equal(r.calls.length, 1);
  assert.ok(r.calls[0].url.startsWith('https://graph.facebook.com/'));
  assert.equal(r.calls[0].method, 'POST');
  const message = JSON.parse(r.calls[0].body).message;
  assert.ok(!/as an ai language model/i.test(message), 'the model tell was scrubbed before the wire');
  assert.ok(message.includes('witness-clean 130/133') && message.includes('https://sjgant80-hub.github.io/agent-proof/'), 'every backed claim rides intact');
  assert.match(r.out, /1 older draft\(s\) refused and kept in the outbox/);
  assert.match(r.out, /scrubbed \d+ model-tell\(s\) from the post before the receipt-gate read it/);
  assert.ok(!r.out.includes('STUB-NOT-A-TOKEN'), 'the runner never prints the token');
  const posts = n.outbox().posts;
  assert.equal(posts[0].sentAtMs, undefined);
  assert.equal(typeof posts[1].sentAtMs, 'number');
  assert.equal(posts[1].postId, 'stub-post-1');
  // the window then closes: the next run sends nothing more
  const again = n.run();
  assert.equal(again.calls.length, 1);
  n.done();
});
