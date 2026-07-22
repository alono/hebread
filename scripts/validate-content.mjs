#!/usr/bin/env node
// Content schema validator (PRD §8, npm run validate:content).
// Validates every content JSON under src/content/ against the shared schema and
// niqqud invariants. Exits non-zero on any error. A niqqud error is a blocking
// bug, so canonical (NFC) ordering and presence of vowel marks are enforced here.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'src', 'content');

const NIKUD = new Set([
  'kamatz', 'patach', 'hirik', 'hirikMale', 'tzere', 'segol',
  'holam', 'holamMale', 'shuruk', 'kubutz', 'shvaNa', 'shvaNach',
]);

const errors = [];
const rel = (p) => relative(root, p);

if (!existsSync(contentDir)) {
  console.log('validate:content — no content directory yet. OK.');
  process.exit(0);
}

// ---- collect JSON files, classified by their directory --------------------
function collect(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collect(full));
    // audio-manifest.json is generated build data, not content — skip it.
    else if (entry.name.endsWith('.json') && entry.name !== 'audio-manifest.json') out.push(full);
  }
  return out;
}

const files = collect(contentDir);

// ---- shared checks ---------------------------------------------------------
const RE_HEB_LETTER = /^[א-ת]$/;
const RE_NIQQUD = /[֑-ׇֽֿׁׂ]/; // vowel points, dagesh, shin/sin dots
const RE_LETTER_ONLY = /[א-ת]/;

const allIds = new Set();
const soundById = new Map(); // syllable id → phoneme, for the homophone check
const syllableItems = [];
const parsed = [];

for (const file of files) {
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    errors.push(`${rel(file)}: invalid JSON — ${e.message}`);
    continue;
  }
  if (!Array.isArray(data)) {
    errors.push(`${rel(file)}: expected a top-level array`);
    continue;
  }
  const r = rel(file).replace(/\\/g, '/');
  const kind = r.includes('/syllables/') ? 'syllable'
    : r.includes('/words/') ? 'word'
    : r.includes('/sentences/') ? 'sentence'
    : r.includes('/paragraphs/') ? 'paragraph'
    : 'unknown';
  if (kind === 'unknown') {
    errors.push(`${rel(file)}: JSON in an unrecognized content location (expected under syllables/ words/ sentences/ paragraphs/)`);
  }
  parsed.push({ file, data, kind });
  for (const item of data) {
    if (item && typeof item.id === 'string') {
      if (allIds.has(item.id)) errors.push(`${rel(file)}: duplicate id "${item.id}"`);
      allIds.add(item.id);
      if (kind === 'syllable' && typeof item.sound === 'string') soundById.set(item.id, item.sound);
    }
  }
}

function checkNfc(file, field, value) {
  if (typeof value !== 'string') return;
  if (value.normalize('NFC') !== value) {
    errors.push(`${rel(file)}: ${field} "${value}" is not NFC-normalised (canonical niqqud order)`);
  }
}

for (const { file, data, kind } of parsed) {
  data.forEach((item, idx) => {
    const where = `${rel(file)}[${idx}]`;
    if (!item || typeof item !== 'object') {
      errors.push(`${where}: not an object`);
      return;
    }
    if (typeof item.id !== 'string' || !item.id) errors.push(`${where}: missing id`);

    if (kind === 'syllable') {
      syllableItems.push({ item, where });
      if (typeof item.display !== 'string' || !item.display) {
        errors.push(`${where}: missing display`);
      } else {
        checkNfc(file, `display of ${item.id}`, item.display);
        if (!RE_NIQQUD.test(item.display)) errors.push(`${where} (${item.id}): display has no niqqud`);
        if (!RE_LETTER_ONLY.test(item.display)) errors.push(`${where} (${item.id}): display has no Hebrew letter`);
      }
      if (typeof item.letter !== 'string' || !RE_HEB_LETTER.test(item.letter)) {
        errors.push(`${where} (${item.id}): letter must be a single Hebrew consonant`);
      }
      if (!NIKUD.has(item.nikud)) errors.push(`${where} (${item.id}): invalid nikud "${item.nikud}"`);
      if (typeof item.sound !== 'string' || !item.sound) errors.push(`${where} (${item.id}): missing sound (phoneme)`);
      if (item.spokenForm !== undefined) checkNfc(file, `spokenForm of ${item.id}`, item.spokenForm);
      if (item.spokenRate !== undefined && !/^[+-]\d{1,3}%$/.test(item.spokenRate)) {
        errors.push(`${where} (${item.id}): spokenRate must look like "+100%"`);
      }
      if (!Array.isArray(item.distractors)) {
        errors.push(`${where} (${item.id}): distractors must be an array`);
      } else {
        if (item.distractors.length < 2) errors.push(`${where} (${item.id}): needs >=2 distractors, has ${item.distractors.length}`);
        const seen = new Set();
        for (const d of item.distractors) {
          if (d === item.id) errors.push(`${where} (${item.id}): distractor references itself`);
          if (seen.has(d)) errors.push(`${where} (${item.id}): duplicate distractor "${d}"`);
          seen.add(d);
          if (!allIds.has(d)) errors.push(`${where} (${item.id}): distractor "${d}" does not exist`);
          // Homophone rule: a distractor must not sound identical to the target.
          else if (soundById.has(d) && soundById.get(d) === item.sound) {
            errors.push(`${where} (${item.id}): distractor "${d}" is a homophone (both sound "${item.sound}") — impossible to hear apart`);
          }
        }
      }
    }

    if (kind === 'word') {
      if (typeof item.display !== 'string' || !item.display) {
        errors.push(`${where}: missing display`);
      } else {
        checkNfc(file, `display of ${item.id}`, item.display);
        if (!RE_NIQQUD.test(item.display)) errors.push(`${where} (${item.id}): display has no niqqud`);
      }
      if (!Array.isArray(item.syllables) || item.syllables.length === 0) {
        errors.push(`${where} (${item.id}): syllables must be a non-empty array`);
      } else {
        item.syllables.forEach((s, i) => checkNfc(file, `syllable[${i}] of ${item.id}`, s));
        // The syllable pieces must reconstruct the display exactly (glyph-boundary split).
        const joined = item.syllables.join('').normalize('NFC');
        if (joined !== (item.display ?? '').normalize('NFC')) {
          errors.push(`${where} (${item.id}): syllables join "${joined}" != display "${item.display}"`);
        }
      }
      if (item.emoji !== undefined && (typeof item.emoji !== 'string' || !item.emoji)) {
        errors.push(`${where} (${item.id}): emoji must be a non-empty string when present`);
      }
      if (item.frequencyRank !== undefined && typeof item.frequencyRank !== 'number') {
        errors.push(`${where} (${item.id}): frequencyRank must be a number when present`);
      }
      if (item.spokenForm !== undefined) checkNfc(file, `spokenForm of ${item.id}`, item.spokenForm);
    }

    const checkHeb = (label, value) => {
      if (typeof value !== 'string' || !value) {
        errors.push(`${where} (${item.id}): missing ${label}`);
        return;
      }
      checkNfc(file, `${label} of ${item.id}`, value);
      if (RE_LETTER_ONLY.test(value) && !RE_NIQQUD.test(value)) {
        errors.push(`${where} (${item.id}): ${label} has Hebrew without niqqud`);
      }
    };
    const checkComprehension = (c, label) => {
      if (!c || typeof c !== 'object') return;
      checkHeb(`${label} question`, c.question);
      if (!Array.isArray(c.options) || c.options.length < 2) {
        errors.push(`${where} (${item.id}): ${label} needs >=2 options`);
      } else {
        for (const o of c.options) checkHeb(`${label} option`, o);
        if (typeof c.correctIndex !== 'number' || c.correctIndex < 0 || c.correctIndex >= c.options.length) {
          errors.push(`${where} (${item.id}): ${label} correctIndex out of range`);
        }
      }
    };

    if (kind === 'sentence') {
      checkHeb('display', item.display);
      if (item.comprehension) checkComprehension(item.comprehension, 'comprehension');
    }

    if (kind === 'paragraph') {
      checkHeb('title', item.title);
      if (!Array.isArray(item.sentences) || item.sentences.length === 0) {
        errors.push(`${where} (${item.id}): sentences must be a non-empty array`);
      } else {
        item.sentences.forEach((s, i) => checkHeb(`sentence[${i}]`, s));
      }
      if (!Array.isArray(item.comprehension) || item.comprehension.length === 0) {
        errors.push(`${where} (${item.id}): paragraph needs >=1 comprehension question`);
      } else {
        item.comprehension.forEach((c, i) => checkComprehension(c, `comprehension[${i}]`));
      }
    }
  });
}

// ---- report ----------------------------------------------------------------
if (errors.length) {
  console.error(`validate:content — ${errors.length} error(s):`);
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}
console.log(`validate:content — OK. ${allIds.size} items across ${files.length} file(s); ${syllableItems.length} syllables validated.`);
process.exit(0);
