#!/usr/bin/env node
// si-didy-loop · scripts/master-key.mjs — the KEY-HOLDER'S tool. Simon runs this; si-didy never does.
//
// The master private key lives at ~/.sididy-master-key.json — the key-holder's home directory,
// OUTSIDE the repo and outside everything the operator loop reads. The operator only ever holds
// the PUBLIC key (local-dna/master.pub) and can only verify. This file is the one place the
// private key is touched, and it is touched by a human running a command.
//
//   node scripts/master-key.mjs --init             make the keypair (refuses to overwrite)
//   node scripts/master-key.mjs --list             the doors waiting
//   node scripts/master-key.mjs --approve <seq>    turn the key on one door
//   node scripts/master-key.mjs --reject <seq> [note]
//
// Counsel note: the day an approval moves real money for the first time, counsel comes first.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';

import { signableItem, approve, reject, executable } from '../operator.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const KEY_F = join(homedir(), '.sididy-master-key.json');
const PUB_F = join(here, '..', 'local-dna', 'master.pub');
const QUEUE_F = join(here, '..', 'local-dna', 'operator-queue.json');

const subtle = webcrypto.subtle;
const enc = new TextEncoder();
const verify = async (s, sigB64, pubB64) => {
  const key = await subtle.importKey('raw', Buffer.from(pubB64, 'base64'), { name: 'Ed25519' }, false, ['verify']);
  return subtle.verify({ name: 'Ed25519' }, key, Buffer.from(sigB64, 'base64'), enc.encode(s));
};

const args = process.argv.slice(2);

if (args[0] === '--init') {
  if (existsSync(KEY_F)) {
    console.error(`a master key already exists at ${KEY_F} — this tool never overwrites a key.`);
    console.error('If you truly mean to rotate it, delete that file yourself first.');
    process.exit(1);
  }
  const kp = await subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const privPkcs8B64 = Buffer.from(new Uint8Array(await subtle.exportKey('pkcs8', kp.privateKey))).toString('base64');
  const pubB64 = Buffer.from(new Uint8Array(await subtle.exportKey('raw', kp.publicKey))).toString('base64');
  writeFileSync(KEY_F, JSON.stringify({ kind: 'sididy-master-key', created: new Date().toISOString(), pubB64, privPkcs8B64 }, null, 1));
  writeFileSync(PUB_F, pubB64 + '\n');
  console.log('master key made.');
  console.log(`  PRIVATE → ${KEY_F}  (yours; outside the repo; si-didy’s loop never reads it)`);
  console.log(`  public  → ${PUB_F}  (all the operator ever holds — it can verify, never sign)`);
  process.exit(0);
}

const queue = existsSync(QUEUE_F) ? JSON.parse(readFileSync(QUEUE_F, 'utf8')) : { items: [] };

if (args[0] === '--list' || !args[0]) {
  if (!queue.items.length) { console.log('no doors waiting.'); process.exit(0); }
  for (const i of queue.items) {
    console.log(`[${i.seq}] ${i.action.kind} · ${i.status} · ${i.at}`);
    console.log(`     ${i.why}`);
    console.log(`     prep: ${Object.keys(i.prep).map(k => `${k}(${String(i.prep[k]).length}b)`).join(' · ')}`);
    console.log(`     ${executable(i).why}`);
  }
  process.exit(0);
}

const seq = Number(args[1]);
const idx = queue.items.findIndex(i => i.seq === seq);
if (idx < 0) { console.error(`no item ${args[1]} in the queue.`); process.exit(1); }

if (args[0] === '--approve') {
  if (!existsSync(KEY_F)) { console.error('no master key — run --init first.'); process.exit(1); }
  const k = JSON.parse(readFileSync(KEY_F, 'utf8'));
  const priv = await subtle.importKey('pkcs8', Buffer.from(k.privPkcs8B64, 'base64'), { name: 'Ed25519' }, false, ['sign']);
  const sig = Buffer.from(new Uint8Array(await subtle.sign({ name: 'Ed25519' }, priv, enc.encode(signableItem(queue.items[idx]))))).toString('base64');
  const out = await approve(queue.items[idx], sig, k.pubB64, verify);
  if (!out.ok) { console.error(`refused: ${out.why}`); process.exit(1); }
  queue.items[idx] = out.item;
  writeFileSync(QUEUE_F, JSON.stringify(queue, null, 1));
  console.log(`✓ the master key turned on seq ${seq} — ${executable(out.item).why}`);
  process.exit(0);
}

if (args[0] === '--reject') {
  const out = reject(queue.items[idx], args.slice(2).join(' '));
  if (!out.ok) { console.error(`refused: ${out.why}`); process.exit(1); }
  queue.items[idx] = out.item;
  writeFileSync(QUEUE_F, JSON.stringify(queue, null, 1));
  console.log(`✗ seq ${seq} rejected — the door is closed, si-didy prepares again only if the mandate still wants it.`);
  process.exit(0);
}

console.error('usage: --init | --list | --approve <seq> | --reject <seq> [note]');
process.exit(1);
