#!/usr/bin/env node
// Build-time TTS (PRD §6). Generates one MP3 per content audio unit using
// edge-tts (voice he-IL-HilaNeural) and writes a manifest mapping item id →
// { file, text }. Files are content-addressed by a hash of the exact spoken
// text, so identical text is generated once and regeneration only rewrites what
// changed. The MP3s and manifest are committed; runtime never calls the network.
//
// Usage:
//   node scripts/generate-audio.mjs           # generate missing files
//   node scripts/generate-audio.mjs --force   # regenerate everything
//   node scripts/generate-audio.mjs --check   # no synthesis; report gaps, exit 1 if any
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'src', 'content');
const audioDir = join(root, 'public', 'audio');
const manifestPath = join(contentDir, 'audio-manifest.json');

const VOICE = 'he-IL-HilaNeural';
const CONCURRENCY = 6;
const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const CHECK_ONLY = args.has('--check');

// ---- locate the edge-tts binary -------------------------------------------
function findEdgeTts() {
  const venv = join(root, '.venv', 'bin', 'edge-tts');
  if (existsSync(venv)) return venv;
  return 'edge-tts'; // fall back to PATH
}

// ---- collect audio units from content -------------------------------------
function collectJson(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectJson(full));
    else if (entry.name.endsWith('.json') && entry.name !== 'audio-manifest.json') out.push(full);
  }
  return out;
}

/** @returns {{id:string, text:string, rate?:string}[]} */
function collectUnits() {
  const units = [];
  const seenIds = new Set();
  const add = (id, text, rate) => {
    if (!id || !text) return;
    if (seenIds.has(id)) return;
    seenIds.add(id);
    const unit = { id, text: text.normalize('NFC') };
    if (rate) unit.rate = rate; // prosody rate override (e.g. "+100%" for shva)
    units.push(unit);
  };
  for (const file of collectJson(contentDir)) {
    const r = relative(root, file).replace(/\\/g, '/');
    const data = JSON.parse(readFileSync(file, 'utf8'));
    if (!Array.isArray(data)) continue;
    const HEB = /[א-ת]/; // only speak Hebrew options — emoji options are visual
    if (r.includes('/syllables/') || r.includes('/words/')) {
      for (const item of data) add(item.id, item.spokenForm ?? item.display, item.spokenRate);
    } else if (r.includes('/sentences/')) {
      for (const item of data) {
        add(item.id, item.spokenForm ?? item.display);
        if (item.comprehension) {
          add(`${item.id}::q`, item.comprehension.question);
          (item.comprehension.options ?? []).forEach((o, i) => HEB.test(o) && add(`${item.id}::opt${i}`, o));
        }
      }
    } else if (r.includes('/paragraphs/')) {
      for (const item of data) {
        (item.sentences ?? []).forEach((s, i) => add(`${item.id}::s${i}`, s));
        (item.comprehension ?? []).forEach((c, ci) => {
          if (!c) return;
          add(`${item.id}::q${ci}`, c.question);
          (c.options ?? []).forEach((o, i) => HEB.test(o) && add(`${item.id}::q${ci}opt${i}`, o));
        });
      }
    }
  }
  return units;
}

// Content-addressed by text AND rate, so a rate change regenerates the clip.
const hashOf = (text, rate) => createHash('sha256').update(`${text}|${rate ?? ''}`, 'utf8').digest('hex').slice(0, 16);

// ---- synthesis -------------------------------------------------------------
function synth(bin, { text, rate }, outPath) {
  return new Promise((resolve, reject) => {
    const args = ['--voice', VOICE, '--text', text, '--write-media', outPath];
    if (rate) args.push(`--rate=${rate}`);
    const p = spawn(bin, args, {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0 && existsSync(outPath)) resolve();
      else reject(new Error(`edge-tts exit ${code}: ${err.trim() || 'no output'}`));
    });
  });
}

async function synthWithRetry(bin, unit, outPath, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await synth(bin, unit, outPath);
      return;
    } catch (e) {
      if (i === attempts) throw e;
    }
  }
}

async function runPool(tasks, limit, worker) {
  let idx = 0;
  let done = 0;
  const total = tasks.length;
  async function next() {
    const i = idx++;
    if (i >= total) return;
    await worker(tasks[i]);
    done++;
    if (done % 20 === 0 || done === total) process.stdout.write(`\r  synthesising ${done}/${total}`);
    await next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, total) }, next));
  if (total) process.stdout.write('\n');
}

// ---- main ------------------------------------------------------------------
const units = collectUnits();
if (!units.length) {
  console.log('generate-audio — no content units found. Nothing to do.');
  process.exit(0);
}

mkdirSync(audioDir, { recursive: true });

// map id → { file, text }, and the set of unique clips (text+rate) to synthesise
const manifest = {};
const clipByKey = new Map(); // `${rate}|${text}` → { file, text, rate }
for (const { id, text, rate } of units) {
  const file = `${hashOf(text, rate)}.mp3`;
  manifest[id] = rate ? { file, text, rate } : { file, text };
  const key = `${rate ?? ''}|${text}`;
  if (!clipByKey.has(key)) clipByKey.set(key, { file, text, rate });
}

const clips = [...clipByKey.values()];
const missing = clips.filter(({ file }) => FORCE || !existsSync(join(audioDir, file)));

if (CHECK_ONLY) {
  const gaps = clips.filter(({ file }) => !existsSync(join(audioDir, file)));
  if (gaps.length) {
    console.error(`generate-audio --check: ${gaps.length} missing MP3(s).`);
    process.exit(1);
  }
  console.log(`generate-audio --check: OK. ${clips.length} MP3s cover ${units.length} units.`);
  process.exit(0);
}

console.log(`generate-audio — ${units.length} units, ${clips.length} unique clips; ${missing.length} to synthesise.`);

if (missing.length) {
  const bin = findEdgeTts();
  const failures = [];
  await runPool(missing, CONCURRENCY, async (clip) => {
    try {
      await synthWithRetry(bin, clip, join(audioDir, clip.file));
    } catch (e) {
      failures.push(`${JSON.stringify(clip.text)} → ${e.message}`);
    }
  });
  if (failures.length) {
    console.error(`\ngenerate-audio — ${failures.length} synthesis failure(s):`);
    for (const f of failures) console.error('  ✗ ' + f);
    console.error('Is edge-tts installed and is the network reachable? See README.');
    process.exit(1);
  }
}

// sort manifest keys for stable diffs
const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');

// prune MP3s no longer referenced by any unit (e.g. after a spokenForm change)
const referenced = new Set(clips.map((c) => c.file));
let pruned = 0;
for (const name of readdirSync(audioDir)) {
  if (name.endsWith('.mp3') && !referenced.has(name)) {
    unlinkSync(join(audioDir, name));
    pruned++;
  }
}
console.log(`generate-audio — done. Manifest: ${relative(root, manifestPath)} (${units.length} ids)${pruned ? `; pruned ${pruned} orphan clip(s)` : ''}.`);
