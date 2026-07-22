#!/usr/bin/env node
// Deterministic generator for syllable content (PRD levels 1–6).
// Builds every syllable string from Unicode components and NFC-normalises it,
// so canonical ordering (consonant → vowel → dagesh/dot) is guaranteed and no
// niqqud is hand-typed. Emits one JSON file per level into src/content/syllables/.
//
// Output JSON is the committed source of truth the app reads and the
// nikud-reviewer checks. Re-running regenerates it. See DECISIONS.md.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'syllables');

// ---- Unicode building blocks ----------------------------------------------
const DAGESH = 'ּ';
const SHIN_DOT = 'ׁ';
const SIN_DOT = 'ׂ';
const YOD = 'י';
const VAV = 'ו';
const HOLAM = 'ֹ'; // U+05B9, sits on the consonant (haser) or on the vav (male)
const VOWEL = {
  kamatz: 'ָ',
  patach: 'ַ',
  hirik: 'ִ',
  hirikMale: 'ִ', // + yod mater
  tzere: 'ֵ',
  segol: 'ֶ',
  holam: HOLAM, // holam haser (on the consonant)
  kubutz: 'ֻ',
  shvaNa: 'ְ',
  // holamMale + shuruk carry their vowel on a following vav — see buildDisplay.
};

// ---- Letter forms ----------------------------------------------------------
// One entry per distinct phoneme a child must map to a spelling. בג"ד כפ"ת take
// dagesh lene word-initially (grammatically correct); ב/כ/פ also appear soft
// (v/kh/f) because that distinction is taught explicitly (PRD §8). ש splits into
// שׁ (shin) / שׂ (sin).
const FORMS = [
  { key: 'alef', base: 'א' },
  { key: 'bet', base: 'ב', dagesh: true },
  { key: 'vet', base: 'ב' },
  { key: 'gimel', base: 'ג', dagesh: true },
  { key: 'dalet', base: 'ד', dagesh: true },
  { key: 'he', base: 'ה' },
  { key: 'vav', base: 'ו' },
  { key: 'zayin', base: 'ז' },
  { key: 'het', base: 'ח' },
  { key: 'tet', base: 'ט' },
  { key: 'yod', base: 'י' },
  { key: 'kaf', base: 'כ', dagesh: true },
  { key: 'khaf', base: 'כ' },
  { key: 'lamed', base: 'ל' },
  { key: 'mem', base: 'מ' },
  { key: 'nun', base: 'נ' },
  { key: 'samekh', base: 'ס' },
  { key: 'ayin', base: 'ע' },
  { key: 'pe', base: 'פ', dagesh: true },
  { key: 'fe', base: 'פ' },
  { key: 'tsadi', base: 'צ' },
  { key: 'qof', base: 'ק' },
  { key: 'resh', base: 'ר' },
  { key: 'shin', base: 'ש', dot: 'shin' },
  { key: 'sin', base: 'ש', dot: 'sin' },
  { key: 'tav', base: 'ת', dagesh: true },
];

const FORM_BY_KEY = Object.fromEntries(FORMS.map((f) => [f.key, f]));

// Confusability graph — phonetic (same/near sound) or visual (similar shape).
// Used to pick motivated distractors; random distractors are a defect (see
// nikud-reviewer). Every list has ≥2 entries so we can always build 3 distractors.
const CONFUSE = {
  alef: ['ayin', 'he'],
  bet: ['kaf', 'pe', 'vet'],
  vet: ['khaf', 'nun', 'bet'],
  gimel: ['nun', 'zayin'],
  dalet: ['resh', 'khaf'],
  he: ['het', 'tav'],
  vav: ['zayin', 'resh', 'yod'],
  zayin: ['vav', 'gimel', 'nun'],
  het: ['he', 'tav'],
  tet: ['mem', 'samekh'],
  yod: ['vav', 'zayin'],
  kaf: ['bet', 'pe', 'khaf'],
  khaf: ['vet', 'dalet', 'resh'],
  lamed: ['nun', 'vav'],
  mem: ['tet', 'samekh'],
  nun: ['gimel', 'vav', 'zayin'],
  samekh: ['mem', 'sin', 'tet'],
  ayin: ['alef', 'tsadi'],
  pe: ['bet', 'kaf', 'fe'],
  fe: ['khaf', 'vet', 'pe'],
  tsadi: ['ayin', 'samekh'],
  qof: ['kaf', 'he'],
  resh: ['dalet', 'vav'],
  shin: ['sin', 'samekh'],
  sin: ['shin', 'samekh'],
  tav: ['he', 'het', 'dalet'],
};

// Nikud presented per level.
const LEVEL_NIKUD = {
  1: ['kamatz', 'patach'],
  2: ['hirik', 'hirikMale'],
  3: ['tzere', 'segol'],
  4: ['holam', 'holamMale'],
  5: ['shuruk', 'kubutz'],
  6: ['shvaNa'], // final-letter recognition is taught via short words (see words/level-6.json)
};

// ---- Phoneme model (modern Israeli Hebrew) --------------------------------
// The hear-and-pick exercise plays a sound and asks for the spelling, so a
// distractor must NEVER be a homophone of the target — the child can't tell
// identical sounds apart by ear. These maps let us guarantee sound-distinct
// distractors. Homophones that this collapses on purpose:
//   letters: א=ע (—), ב=ו (v), כ=ח (x), כּ=ק (k), ט=תּ (t), ס=שׂ (s)
//   vowels:  patach=kamatz (a), tzere=segol (e), hirik=hirikMale (i),
//            holam=holamMale (o), shuruk=kubutz (u)
const CONSONANT_SOUND = {
  alef: '', ayin: '', // silent / glottal in modern Hebrew
  bet: 'b', vet: 'v', vav: 'v',
  gimel: 'g', dalet: 'd', he: 'h', zayin: 'z',
  het: 'x', khaf: 'x',
  tet: 't', tav: 't',
  yod: 'y', kaf: 'k', qof: 'k',
  lamed: 'l', mem: 'm', nun: 'n',
  samekh: 's', sin: 's', shin: 'sh',
  pe: 'p', fe: 'f', tsadi: 'ts', resh: 'r',
};
const VOWEL_SOUND = {
  kamatz: 'a', patach: 'a',
  hirik: 'i', hirikMale: 'i',
  tzere: 'e', segol: 'e', shvaNa: 'e', // shva-na ≈ short /e/ with the ה-helper
  holam: 'o', holamMale: 'o',
  shuruk: 'u', kubutz: 'u',
};
const soundOf = (formKey, nikudKey) => `${CONSONANT_SOUND[formKey]}_${VOWEL_SOUND[nikudKey]}`;
// Vowel learning order — used to prefer /a/ (the anchor) then /i/ … as vowel-contrast distractors.
const VOWEL_ORDER = { a: 0, i: 1, e: 2, o: 3, u: 4 };

const id = (formKey, nikudKey) => `${formKey}-${nikudKey}`;

const HE = 'ה';

// Nikud whose display already ends in a vowel-letter (mater) — TTS reads them
// directly. Everything else is a bare open syllable that TTS renders poorly, so
// we append a consonantal ה to force a clean CV sound (PRD §6: "בָּה").
const MATER_NIKUD = new Set(['hirikMale', 'holamMale', 'shuruk']);

// גּ דּ תּ carry a dagesh lene in the display (grammatically correct word-initially),
// but in modern Hebrew it is phonetically inert — גּ=ג, דּ=ד, תּ=ת. edge-tts
// mispronounces the dagesh-marked forms, so we strip the dagesh from the SPOKEN
// form only (the on-screen display keeps it). בּ/כּ/פּ are NOT stripped — there the
// dagesh is phonemic (b/v, k/kh, p/f).
const NON_PHONEMIC_DAGESH = new Set(['gimel', 'dalet', 'tav']);

// Several letters collide with REAL words in the vav-vowel spellings, so the
// TTS reads the word instead of the syllable: בוֹ→"bo", כוֹ→"ko", קו→"kav",
// תו→"tav". Where a homophone letter exists we speak through it instead:
// ב→ו (/v/), כ→ח (/x/), ק→כּ (/k/), ת→ט (/t/). The on-screen display keeps the
// real letter. (Soft פ /f/ and צ /ts/ have no substitute letter — their forms
// are chosen by direct listening; see FE/TSADI notes below.)
const SPOKEN_SUBSTITUTE = { vet: 'ו', khaf: 'ח', qof: 'כּ', tav: 'ט' };

// פ (/f/) and צ (/ts/) have no homophone letter, but their bare vav-vowel forms
// collide with real words too (פוֹ→"po", צו→"tzav"). A FINAL SILENT א breaks the
// word-collision and forces sounding-out: פוֹא→"fo", צוֹא→"tso". Verified by
// voiced-duration analysis (fricative band) + user listening.
const ALEF = 'א';
const VAV_VOWEL_FINAL_ALEF = new Set(['fe', 'tsadi']);

// The consonant + its phonemic marks for TTS: keep dagesh on ב/כ/פ (b/k/p), drop
// the inert dagesh on ג/ד/ת, keep the shin/sin dot.
function spokenBase(form) {
  const sub = SPOKEN_SUBSTITUTE[form.key];
  if (sub) return sub;
  let s = form.base;
  if (form.dagesh && !NON_PHONEMIC_DAGESH.has(form.key)) s += DAGESH;
  if (form.dot === 'shin') s += SHIN_DOT;
  if (form.dot === 'sin') s += SIN_DOT;
  return s;
}

function spokenFor(form, display, nikudKey) {
  // All four vav-vowels (/o/ and /u/) speak through the male spelling built on
  // spokenBase: this fixes holam-haser + kubutz rendering (בֹּ→בּוֹ, בֻּ→בּוּ) AND
  // routes soft ב/כ through ו/ח so the fricative survives (בֹ→"ווֹ" /vo/, not
  // "בוֹ"="bo"; כוֹ→"חוֹ" /xo/). The on-screen display keeps the original mark.
  const finalAlef = VAV_VOWEL_FINAL_ALEF.has(form.key) ? ALEF : '';
  if (nikudKey === 'holam' || nikudKey === 'holamMale') {
    const spoken = (spokenBase(form) + VAV + HOLAM + finalAlef).normalize('NFC');
    return spoken === display ? undefined : spoken;
  }
  if (nikudKey === 'shuruk' || nikudKey === 'kubutz') {
    const spoken = (spokenBase(form) + VAV + DAGESH + finalAlef).normalize('NFC');
    return spoken === display ? undefined : spoken;
  }

  const spoken = NON_PHONEMIC_DAGESH.has(form.key) ? display.replace(DAGESH, '') : display;
  if (MATER_NIKUD.has(nikudKey)) {
    // Remaining mater form (hirik male) speaks as-is — unless we stripped an
    // inert dagesh, in which case the differing spoken form must be recorded.
    return spoken === display ? undefined : spoken.normalize('NFC');
  }
  return (spoken + HE).normalize('NFC');
}

function buildDisplay(form, nikudKey) {
  let s = form.base;
  if (form.dagesh) s += DAGESH;
  if (form.dot === 'shin') s += SHIN_DOT;
  if (form.dot === 'sin') s += SIN_DOT;
  // holam male / shuruk carry the vowel on a following vav.
  if (nikudKey === 'holamMale') return (s + VAV + HOLAM).normalize('NFC');
  if (nikudKey === 'shuruk') return (s + VAV + DAGESH).normalize('NFC');
  s += VOWEL[nikudKey];
  if (nikudKey === 'hirikMale') s += YOD;
  return s.normalize('NFC');
}

// Build every item (with its level + phoneme) across all configured levels.
const levels = Object.keys(LEVEL_NIKUD).map(Number);
const allItems = [];
for (const lvl of levels) {
  for (const form of FORMS) {
    for (const nikudKey of LEVEL_NIKUD[lvl]) {
      allItems.push({ form, nikudKey, level: lvl, id: id(form.key, nikudKey), sound: soundOf(form.key, nikudKey) });
    }
  }
}

/**
 * Distractors for a hear-and-pick item. Rules:
 *  - Only from graphemes taught by this item's level (cumulative levels 1..L).
 *  - NEVER a homophone: every distractor has a different sound from the target,
 *    and no two chosen cards share a sound.
 *  - Motivated ranking: a visually-confusable letter (same vowel = classic minimal
 *    pair) first, then a confusable letter with another vowel, then the same letter
 *    with an audibly different vowel (vowel discrimination), then any distinct sound.
 */
function distractorsFor(item) {
  const confuse = new Set(CONFUSE[item.form.key] ?? []);
  const rank = (c) => {
    const cc = confuse.has(c.form.key);
    const sameV = c.nikudKey === item.nikudKey;
    const sameC = c.form.key === item.form.key;
    if (cc && sameV) return 0;
    if (cc) return 1;
    if (sameC) return 2;
    return 3;
  };
  const pool = allItems
    .filter((c) => c.level <= item.level && c.id !== item.id && c.sound !== item.sound)
    .sort((a, b) => rank(a) - rank(b) || (a.id < b.id ? -1 : 1));

  const chosen = [];
  const usedSounds = new Set([item.sound]);
  const add = (c) => {
    if (c && chosen.length < 3 && !usedSounds.has(c.sound)) {
      chosen.push(c.id);
      usedSounds.add(c.sound);
    }
  };

  // One confusable-letter card (consonant discrimination)…
  add(pool.find((c) => confuse.has(c.form.key)));
  // …then same-letter cards in audibly-different vowels, ordered by learning
  // order (VOWEL_ORDER) so /a/ (patach/kamatz, the anchor vowel) always comes
  // first, then /i/, etc. This makes a vowel level contrast the new vowel against
  // the earlier ones (e.g. tzere /e/ vs /a/ AND /i/), not only ever /i/.
  pool
    .filter((c) => c.form.key === item.form.key)
    .sort((a, b) => (VOWEL_ORDER[a.sound.slice(-1)] ?? 9) - (VOWEL_ORDER[b.sound.slice(-1)] ?? 9))
    .forEach(add);
  // …fill any remaining slot by rank (more confusable letters, etc.).
  for (const c of pool) add(c);
  return chosen;
}

// Shva-na is pedagogically a VERY SHORT /e/ ("tzere, but clipped"). The bare
// "בְּה" text made the TTS guess inconsistent vowels, so instead each shva item
// speaks its letter's TZERE text (consonants verified by listening) at double
// prosody rate — a uniform, clipped /e/ (voiced ≈0.15s vs ≈0.29s normal).
const SHVA_RATE = '+100%';

mkdirSync(OUT_DIR, { recursive: true });
let total = 0;
for (const lvl of levels) {
  const items = allItems
    .filter((it) => it.level === lvl)
    .map((it) => {
      const display = buildDisplay(it.form, it.nikudKey);
      const item = { id: it.id, display };
      if (it.nikudKey === 'shvaNa') {
        const tzereDisplay = buildDisplay(it.form, 'tzere');
        item.spokenForm = spokenFor(it.form, tzereDisplay, 'tzere') ?? tzereDisplay;
        item.spokenRate = SHVA_RATE;
      } else {
        const spokenForm = spokenFor(it.form, display, it.nikudKey);
        if (spokenForm) item.spokenForm = spokenForm;
      }
      item.letter = it.form.base;
      item.nikud = it.nikudKey;
      item.sound = it.sound;
      item.distractors = distractorsFor(it);
      return item;
    });
  const file = join(OUT_DIR, `level-${lvl}.json`);
  writeFileSync(file, JSON.stringify(items, null, 2) + '\n', 'utf8');
  total += items.length;
  console.log(`level ${lvl}: ${items.length} syllables → ${file}`);
}
console.log(`Done. ${total} syllables across ${levels.length} level(s).`);
