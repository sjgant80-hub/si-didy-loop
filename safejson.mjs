// si-didy-loop · safejson.mjs — state that survives a crash: JSON read loudly, written atomically.
//
// Found 2026-10-22: local-dna/overlay.json had been 0 bytes since a crash mid-write on 2026-10-15, so every nightly study
// died on JSON.parse('') and everything after it (sweeps, dream, course drill, mind export) failed with it — a week of
// nights with nothing learned, and nobody told. So:
//   · writeJsonSafe writes to file.tmp, keeps the last good copy as file.prev, then renames into place: a crash can leave a
//     stray .tmp, never a half-written state file.
//   · readJsonSafe never lets one unreadable file kill the night: it moves the bad bytes aside as file.broken-<when> (the
//     evidence is kept, not deleted), falls back to file.prev if that reads, else to the given fallback — and says so,
//     loudly, in the night's log.
import { existsSync, readFileSync, writeFileSync, renameSync, copyFileSync } from 'node:fs';

export function readJsonSafe(file, fallback, warn = (s) => console.error(s)) {
  if (!existsSync(file)) return fallback;
  const text = readFileSync(file, 'utf8');
  try { return JSON.parse(text); } catch {
    const kept = file + '.broken-' + new Date().toISOString().replace(/[:.]/g, '-');
    try { renameSync(file, kept); } catch { /* left in place; the fallback still stands */ }
    let back = fallback, from = 'a fresh start';
    if (existsSync(file + '.prev')) { try { back = JSON.parse(readFileSync(file + '.prev', 'utf8')); from = 'its last good copy (.prev)'; } catch { /* the .prev is unreadable too */ } }
    warn('⚠ ' + file + ' did not parse (' + text.length + ' bytes) — kept as ' + kept + '; going on from ' + from);
    return back;
  }
}

export function writeJsonSafe(file, value) {
  const tmp = file + '.tmp';
  writeFileSync(tmp, JSON.stringify(value, null, 1));
  if (existsSync(file)) { try { JSON.parse(readFileSync(file, 'utf8')); copyFileSync(file, file + '.prev'); } catch { /* never keep a bad copy as the good one */ } }
  renameSync(tmp, file);
}
