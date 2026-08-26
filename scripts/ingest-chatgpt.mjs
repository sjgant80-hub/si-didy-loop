#!/usr/bin/env node
// si-didy-loop · scripts/ingest-chatgpt.mjs — give sididy your old ChatGPT chats.
//
//   node scripts/ingest-chatgpt.mjs <export.zip | conversations.json>
//
// The export is dead JSON; the INGESTION is the product (offramp doctrine). This wire:
//   1 · reads the ChatGPT export (a zip is opened in place via bsdtar; conversations.json direct);
//   2 · normalizes through offramp-v2's GATED chatgpt adapter (the mapping-graph linearized,
//       content-addressed, deduped — the same conversation twice costs nothing);
//   3 · writes one markdown file per conversation into local-dna/chatgpt-chats/ (LOCAL-ONLY,
//       gitignored — these are your private chats and never leave this machine);
//   4 · rebuilds the DNA (seed-dna.mjs) so the fan associates over them: each chat becomes a
//       chat-node with edges to every estate repo it mentions.
//
// Honest limits, said plainly: this is memory, not retraining — sididy READS your history, it does
// not become it. Attachments/images in the export are skipped (text is what carries the thinking).

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, execSync } from 'node:child_process';
import { normalize, makeArchive, ingest, archiveAll } from 'file:///C:/Users/sjgan/Downloads/offramp-v2/kernel/offramp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
let OUT = join(here, '..', 'local-dna', 'chatgpt-chats'); // switched to <vendor>-chats after detection
const src = process.argv[2];
if (!src || !existsSync(src)) {
  console.error('usage: node scripts/ingest-chatgpt.mjs <export.zip | conversations.json>');
  console.error('  (ChatGPT → Settings → Data controls → Export data → the email link gives you the zip)');
  process.exit(2);
}

// ── 1 · read the export ───────────────────────────────────────────────────────────────────────────
let raw;
if (/\.zip$/i.test(src)) {
  // Windows ships bsdtar as tar.exe, and bsdtar reads zip archives — extract just the one file to stdout
  try {
    raw = execFileSync('tar', ['-xOf', src, 'conversations.json'], { maxBuffer: 1024 * 1024 * 1024 }).toString('utf8');
  } catch (e) {
    console.error('could not read conversations.json out of the zip (' + (e.message || e) + ') — unzip it yourself and pass conversations.json directly');
    process.exit(1);
  }
} else if (/\.html?$/i.test(src)) {
  // the chat.html export embeds the same conversations array as `var jsonData = [...]` —
  // bracket-match it out (string-aware), because the array itself contains ']' characters everywhere
  const html = readFileSync(src, 'utf8');
  const at = html.indexOf('var jsonData');
  if (at < 0) { console.error('no embedded jsonData found — is this really the ChatGPT chat.html export?'); process.exit(1); }
  const start = html.indexOf('[', at);
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) { console.error('embedded jsonData never closes — file truncated?'); process.exit(1); }
  raw = html.slice(start, end + 1);
  console.log('extracted ' + (raw.length / 1048576).toFixed(1) + 'MB of conversation JSON from the HTML export');
} else {
  raw = readFileSync(src, 'utf8');
}
let parsed;
try { parsed = JSON.parse(raw); } catch (e) { console.error('that file is not valid JSON — is it really the ChatGPT export?'); process.exit(1); }

// ── 2 · normalize through the gated adapter + dedupe ─────────────────────────────────────────────
// vendor AUTO-DETECTED from the shape: claude.ai exports {chat_messages}, ChatGPT exports {mapping}
const first = Array.isArray(parsed) ? parsed.find(Boolean) : null;
const vendor = first && Array.isArray(first.chat_messages) ? 'claude' : 'chatgpt';
console.log('vendor detected: ' + vendor);
const envelopes = normalize(vendor, parsed);
OUT = join(here, '..', 'local-dna', vendor + '-chats');
const archive = makeArchive();
const res = ingest(archive, envelopes);
const kept = archiveAll(archive);
const withText = kept.filter((e) => e.messages && e.messages.length);
console.log(`export read: ${envelopes.length} conversation(s) · ${withText.length} with content · ${envelopes.length - (res.added ?? kept.length)} duplicate(s) folded`);

// ── 3 · one md per conversation, local-only ──────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });
const slug = (s) => String(s || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'untitled';
let written = 0;
withText.forEach((env, i) => {
  const name = String(i + 1).padStart(4, '0') + '-' + slug(env.title) + '.md';
  const body = '# ' + (env.title || '(untitled)') + '\n\nsource: ' + vendor + ' · imported ' + new Date().toISOString().slice(0, 10) + '\n\n' +
    env.messages.map((m) => '**' + m.role + ':** ' + m.text).join('\n\n');
  writeFileSync(join(OUT, name), body);
  written++;
});
console.log(`${written} conversation file(s) → local-dna/` + vendor + `-chats/ (gitignored, never leaves this machine)`);

// ── 4 · rebuild the DNA so the fan sees them ─────────────────────────────────────────────────────
try {
  const out = execSync('node "' + join(here, 'seed-dna.mjs') + '"', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  console.log(out.trim().split('\n').slice(-3).join('\n'));
} catch (e) {
  console.error('DNA rebuild failed — run node scripts/seed-dna.mjs by hand: ' + (e.message || e).split('\n')[0]);
  process.exit(1);
}
console.log('DONE — sididy now associates over your ' + vendor + ' history.');
