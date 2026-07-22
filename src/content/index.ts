import type { ContentItem, Level, ParagraphItem, SentenceItem, SyllableItem, WordItem } from './types';
import { LEVEL_META } from './levels';
import level1 from './syllables/level-1.json';
import level2 from './syllables/level-2.json';
import level3 from './syllables/level-3.json';
import level4 from './syllables/level-4.json';
import level5 from './syllables/level-5.json';
import level6 from './syllables/level-6.json';
import words6 from './words/level-6.json';
import words7 from './words/level-7.json';
import words8 from './words/level-8.json';
import wordsFrequent from './words/frequent.json';
import sentences9 from './sentences/level-9.json';
import sentences10 from './sentences/level-10.json';
import paragraphs11 from './paragraphs/level-11.json';
import paragraphs12 from './paragraphs/level-12.json';

// Syllable content, grouped by the level it is introduced in. JSON is imported
// as loose data, so we assert the shared schema type once here.
export const SYLLABLES_BY_LEVEL: Record<number, SyllableItem[]> = {
  1: level1 as unknown as SyllableItem[],
  2: level2 as unknown as SyllableItem[],
  3: level3 as unknown as SyllableItem[],
  4: level4 as unknown as SyllableItem[],
  5: level5 as unknown as SyllableItem[],
  6: level6 as unknown as SyllableItem[],
};

// Word content, grouped by level (level 8 = long words + the 100 frequent words).
export const WORDS_BY_LEVEL: Record<number, WordItem[]> = {
  6: words6 as unknown as WordItem[],
  7: words7 as unknown as WordItem[],
  8: [...(words8 as unknown as WordItem[]), ...(wordsFrequent as unknown as WordItem[])],
};

// Sentences (levels 9–10) and paragraphs (levels 11–12).
export const SENTENCES_BY_LEVEL: Record<number, SentenceItem[]> = {
  9: sentences9 as unknown as SentenceItem[],
  10: sentences10 as unknown as SentenceItem[],
};

export const PARAGRAPHS_BY_LEVEL: Record<number, ParagraphItem[]> = {
  11: paragraphs11 as unknown as ParagraphItem[],
  12: paragraphs12 as unknown as ParagraphItem[],
};

export const SYLLABLES: SyllableItem[] = Object.values(SYLLABLES_BY_LEVEL).flat();
export const WORDS: WordItem[] = Object.values(WORDS_BY_LEVEL).flat();
export const SENTENCES: SentenceItem[] = Object.values(SENTENCES_BY_LEVEL).flat();
export const PARAGRAPHS: ParagraphItem[] = Object.values(PARAGRAPHS_BY_LEVEL).flat();

/** Every addressable content item, indexed by id. */
const registry = new Map<string, ContentItem>();
for (const item of SYLLABLES) registry.set(item.id, item);
for (const item of WORDS) registry.set(item.id, item);
for (const item of SENTENCES) registry.set(item.id, item);

/** Paragraphs are addressed separately (they have no single `display`). */
const paragraphRegistry = new Map<string, ParagraphItem>();
for (const p of PARAGRAPHS) paragraphRegistry.set(p.id, p);
export const getParagraph = (id: string): ParagraphItem | undefined => paragraphRegistry.get(id);

export function getItem(id: string): ContentItem | undefined {
  return registry.get(id);
}

export function isWord(item: ContentItem | undefined): item is WordItem {
  return !!item && 'syllables' in item;
}

export function getSyllable(id: string): SyllableItem | undefined {
  const item = registry.get(id);
  return item && 'nikud' in item ? (item as SyllableItem) : undefined;
}

export function getWord(id: string): WordItem | undefined {
  const item = registry.get(id);
  return isWord(item) ? item : undefined;
}

export function getSentence(id: string): SentenceItem | undefined {
  const item = registry.get(id);
  return item && !('nikud' in item) && !('syllables' in item) ? (item as SentenceItem) : undefined;
}

export function hasItem(id: string): boolean {
  return registry.has(id);
}

export const allItems = (): ContentItem[] => [...registry.values()];

/** Full Level objects: metadata + itemIds derived from the content files. */
export const LEVELS: Level[] = LEVEL_META.map((meta) => ({
  ...meta,
  itemIds: [
    ...(SYLLABLES_BY_LEVEL[meta.id] ?? []).map((i) => i.id),
    ...(WORDS_BY_LEVEL[meta.id] ?? []).map((i) => i.id),
    ...(SENTENCES_BY_LEVEL[meta.id] ?? []).map((i) => i.id),
    ...(PARAGRAPHS_BY_LEVEL[meta.id] ?? []).map((i) => i.id),
  ],
  skipTestSize: 10,
  skipTestPassScore: 9,
}));

export function getLevel(id: number): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}

/** Item ids available in a level, including cumulative mix from earlier levels. */
export function levelItemIds(levelId: number): string[] {
  const level = getLevel(levelId);
  if (!level) return [];
  const mixed = level.mixFromLevels.flatMap((m) => getLevel(m)?.itemIds ?? []);
  return [...new Set([...level.itemIds, ...mixed])];
}
