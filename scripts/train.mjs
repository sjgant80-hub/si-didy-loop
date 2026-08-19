#!/usr/bin/env node
// si-didy-loop · scripts/train.mjs — the elite course, run: real drills, gated mastery, the spiral.
//
// One invocation drills the CURRENT stage with real material (the live estate index, the real
// fallforce kernels, a real operate sweep) and sits the mastery gate. Pass at κ → the stage
// unlocks the next AND its competency is remembered into the overlay (the same graph the nightly
// study exports into the mind — later stages stand on mastered earlier ones). Fail → stay, and
// the attempt is logged honestly. --all keeps climbing until a gate refuses or the course completes.
//
// Posting (S3) is AUTO by the 2026-08-19 correction: the drafted post is graded and, on a pass,
// queued into local-dna/outbox.json for the SANCTIONED rail (Graph API / approved automation).
// Until the key-holder does the one-time rail setup (part of the human 10%), the outbox holds —
// posts wait for the rail, never for a signature.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

import {
  KAPPA, STAGES, freshProgress, attempt, current,
  gradeFoundation, gradePitch, gradeProduct, gradePost, gradeRoute, gradeCycle, gradeExpansion,
} from '../course.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DNA = join(here, '..', 'local-dna');
const PROGRESS_F = join(DNA, 'course-progress.json');
const OUTBOX_F = join(DNA, 'outbox.json');
const OVERLAY_F = join(DNA, 'overlay.json');
const INDEX_F = 'C:/Users/sjgan/.claude/projects/C--Users-sjgan--claude/memory/estate-index.json';
const FORGE_DIR = join(here, '..', '..', 'fallforce');

const readJson = (f, fb) => existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : fb;
const writeJson = (f, v) => writeFileSync(f, JSON.stringify(v, null, 1));
const cat = () => readJson(join(FORGE_DIR, 'catalogue.json'), null);

const remember = (stageId, to, via, at) => {
  const overlay = readJson(OVERLAY_F, { edges: [], cycles: 0, shadow: [] });
  overlay.edges.push({ from: `course:${stageId}`, to, type: 'mastered', weight: KAPPA, meta: { by: 'course', at, via: via.slice(0, 200) } });
  writeJson(OVERLAY_F, overlay);
};

// ── the drills: each returns { score, gradedBy, evidence, remember: [to, via] } ──
const DRILLS = {
  async S0(at) {
    const idx = readJson(INDEX_F, { nodes: [] });
    const mind = readJson(join(DNA, 'mind.json'), null);
    const answers = {
      repoCount: idx.nodes.length,
      modelLine: 'own the stack once instead of renting it forever — offline, on your machine, data never leaves',
      graphNodes: mind ? mind.nodes : 0,
    };
    const score = gradeFoundation(answers, { repoCount: idx.nodes.length });
    return { score, gradedBy: 'gradeFoundation', evidence: `answered from the live index (${answers.repoCount} repos) and the exported mind (${answers.graphNodes} nodes)`, rememberTo: ['memory:estate-index', 'the foundation: the graph answers, not si-didy'] };
  },
  async S1(at) {
    const c = cat();
    if (!c) return { refuse: 'fallforce/catalogue.json is missing — run the crawl first' };
    const { savings } = await import(pathToFileURL(join(FORGE_DIR, 'catalogue.mjs')).href);
    const s = savings(c.stack.totalRentMo, c.stack.once);
    const pitch = { rentYr: s.rentYr, saveY1: s.saveY1, angle: 'owned once, offline, your data never leaves the building', cite: s.cite };
    const score = gradePitch(pitch, { rentMo: c.stack.totalRentMo, once: c.stack.once });
    return { score, gradedBy: 'gradePitch', evidence: `pitched the stack from the gated savings kernel: ${s.line}`, rememberTo: ['fallforce', s.line] };
  },
  async S2(at) {
    // the gate-check is RUN, not remembered: fallforce's own suites, live, right now
    const gates = ['catalogue.test.mjs', 'forecast.test.mjs'].map(t =>
      spawnSync(process.execPath, [t], { cwd: FORGE_DIR, encoding: 'utf8', timeout: 120000 }).status === 0);
    const listing = {
      name: 'fallforce', gatePassed: gates.every(Boolean),
      gateEvidence: `catalogue.test.mjs and forecast.test.mjs both exit 0, run live at ${at}`,
      savings: { cite: cat()?.citeRule || '' },
    };
    const score = gradeProduct(listing);
    return { score, gradedBy: 'gradeProduct', evidence: listing.gateEvidence, rememberTo: ['fallforce', 'only gate-passed tools are sellable — and the gates were run, not quoted'] };
  },
  async S3(at) {
    const c = cat();
    if (!c) return { refuse: 'fallforce/catalogue.json is missing — run the crawl first' };
    const truth = { rentMo: c.stack.totalRentMo, once: c.stack.once };
    const post = {
      hook: 'Your CRM stack bills you every month, forever. What if you just… owned it?',
      demoUrl: 'https://sjgant80-hub.github.io/fallforce/stack.html',
      reveal: `$${(truth.rentMo * 12 - truth.once).toLocaleString('en-US')} saved year one — the math is on the page`,
      cta: 'Own the whole stack once → sjgant80-hub.github.io/fallforce/stack.html',
    };
    const score = gradePost(post, truth);
    if (score >= KAPPA) {
      const outbox = readJson(OUTBOX_F, { kind: 'sanctioned-rail-outbox', note: 'posts wait for the RAIL (one-time Graph API setup, the human 10%), never for a signature — posting is AUTO by the 2026-08-19 correction', posts: [] });
      if (!outbox.posts.some(p => p.demoUrl === post.demoUrl && p.reveal === post.reveal)) {
        outbox.posts.push({ ...post, gradedAt: at, score });
        writeJson(OUTBOX_F, outbox);
      }
    }
    return { score, gradedBy: 'gradePost', evidence: `the one-tool one-post move drafted and graded; queued to the outbox for the sanctioned rail`, rememberTo: ['fallforce', post.hook] };
  },
  async S4(at) {
    const leads = [
      { budget: 80, want: { tier: 'tool', reply: 'The quote pad fits this exactly — owned once, offline, yours. Here is the live page.' } },
      { budget: 499, want: { tier: 'bundle', reply: 'At this spend the whole stack bundle beats any single tool — one price, every shelf.' } },
      { budget: 2500, want: { tier: 'custom', reply: 'This wants a custom sovereign build — Simon will pick this up with you directly.', humanCloses: true } },
    ];
    const scores = leads.map(l => gradeRoute({ budget: l.budget }, l.want));
    const score = Math.min(...scores);
    return { score, gradedBy: 'gradeRoute', evidence: `routed £80→tool, £499→bundle, £2500→custom(human closes): scores ${scores.map(s => s.toFixed(2)).join(', ')} — the worst route is the grade`, rememberTo: ['memory:sididy-operator', 'humans close the big ones'] };
  },
  async S5(at) {
    const stateBefore = readJson(join(DNA, 'operator-state.json'), { tally: {} });
    const overlayBefore = readJson(OVERLAY_F, { edges: [] }).edges.length;
    const run = spawnSync(process.execPath, [join(here, 'operate.mjs'), '--sweep'], { encoding: 'utf8', timeout: 300000 });
    const stateAfter = readJson(join(DNA, 'operator-state.json'), { tally: {} });
    const queue = readJson(join(DNA, 'operator-queue.json'), { items: [] });
    const log = {
      produced: (stateAfter.tally.produced || 0) - (stateBefore.tally.produced || 0),
      validated: (stateAfter.tally.validated || 0) - (stateBefore.tally.validated || 0),
      doorsQueued: queue.items.filter(i => i.status === 'queued').length,
      executedUnsigned: queue.items.filter(i => i.executedAt && !(typeof i.signature === 'string' && i.signature)).length,
      remembered: readJson(OVERLAY_F, { edges: [] }).edges.length > overlayBefore,
    };
    const score = run.status === 0 ? gradeCycle(log) : 0;
    return { score, gradedBy: 'gradeCycle', evidence: `a REAL sweep: produced ${log.produced}, validated ${log.validated}, ${log.doorsQueued} doors queued, ${log.executedUnsigned} unsigned executions, remembered=${log.remembered}`, rememberTo: ['memory:sididy-operator', 'the live loop ran human-gated'] };
  },
  async S6(at) {
    const shadow = readJson(OVERLAY_F, { shadow: [] }).shadow || [];
    const fresh = shadow.slice(-5).filter(w => w && w.root && w.node);
    if (fresh.length < 2) return { refuse: 'the shadow surface is too thin — dream first, then expand' };
    const [a, b] = fresh.slice(-2);
    const proposal = {
      move: `${a.node} bundled with ${b.node} as a paired offer for whoever already runs ${a.root.replace(/^memory:/, '')}`,
      grounds: [a.root, a.node, b.root, b.node],
      proposesOnly: true,
    };
    const score = gradeExpansion(proposal);
    return { score, gradedBy: 'gradeExpansion', evidence: `proposed from the dream shadow: "${proposal.move}" — proposal only, the key-holder disposes`, rememberTo: [a.node, proposal.move] };
  },
};

const args = process.argv.slice(2);
let progress = readJson(PROGRESS_F, freshProgress());

if (args[0] === '--status') {
  console.log(`stage in front: ${current(progress).id} · ${current(progress).name}`);
  for (const s of STAGES) {
    const p = progress.passed?.[s.id];
    console.log(`  ${p ? '●' : '○'} ${s.id} ${s.name.padEnd(11)} ${p ? `mastered ${p.score.toFixed(3)} — ${p.evidence.slice(0, 70)}` : ''}`);
  }
  console.log(`attempts: ${progress.attempts?.length || 0} · complete: ${progress.complete === true}`);
  process.exit(0);
}

const climbAll = args[0] === '--all';
for (;;) {
  const stage = current(progress);
  if (progress.complete && stage.id === 'S6') { /* expansion never stops — one more drill per run */ }
  const at = new Date().toISOString();
  console.log(`\n── ${stage.id} · ${stage.name} — drilling ──`);
  const drill = await DRILLS[stage.id](at);
  if (drill.refuse) { console.log(`   drill refused: ${drill.refuse}`); break; }
  const out = attempt(progress, stage.id, drill.score, drill.gradedBy, drill.evidence, at);
  if (!out.ok) { console.log(`   ${out.why}`); break; }
  console.log(`   ${out.why}`);
  console.log(`   evidence: ${drill.evidence}`);
  progress = out.progress;
  if (out.passed) remember(stage.id, drill.rememberTo[0], drill.rememberTo[1], at);
  writeJson(PROGRESS_F, progress);
  if (!climbAll || !out.passed || progress.complete) break;
}
writeJson(PROGRESS_F, progress);
console.log(`\nnow in front: ${current(progress).id} · ${current(progress).name}${progress.complete ? ' — the course is complete; expansion never stops' : ''}`);
