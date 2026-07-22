import type { SyllableItem, WordItem } from '../content/types';
import { Rng, shuffle } from './rng';

/**
 * Answer cards for a hear-and-pick item: the correct id plus its (existing)
 * confusable distractors, 3–4 cards total, order randomised (PRD §5.1).
 */
export function pickChoices(
  item: SyllableItem,
  itemExists: (id: string) => boolean,
  rng: Rng = Math.random,
  maxCards = 4,
): string[] {
  const distractors = item.distractors.filter(itemExists);
  const count = Math.min(maxCards, distractors.length + 1);
  const chosen = shuffle(distractors, rng).slice(0, count - 1);
  return shuffle([item.id, ...chosen], rng);
}

/**
 * Syllable tiles for the build-word exercise (PRD §5.3): the word's own
 * syllables plus one distractor syllable from the pool, shuffled.
 */
export function pickWordTiles(word: WordItem, distractorPool: string[], rng: Rng = Math.random): string[] {
  const candidates = distractorPool.filter((s) => !word.syllables.includes(s));
  const distractor = shuffle(candidates, rng)[0];
  const tiles = distractor ? [...word.syllables, distractor] : [...word.syllables];
  return shuffle(tiles, rng);
}

/**
 * Emoji options for the word-to-picture exercise (PRD §5.4): the word's emoji
 * plus two distractor emojis, shuffled.
 */
export function pickEmojiOptions(word: WordItem, otherEmojis: string[], rng: Rng = Math.random): string[] {
  if (!word.emoji) return [];
  const pool = shuffle([...new Set(otherEmojis.filter((e) => e && e !== word.emoji))], rng).slice(0, 2);
  return shuffle([word.emoji, ...pool], rng);
}

/**
 * Read-the-word recognition cards: the heard word plus distractor words drawn
 * from the same pool, as ids (works for any word, emoji or not). Used in the
 * skip test and turbo round.
 */
export function pickWordChoices(word: WordItem, pool: WordItem[], rng: Rng = Math.random, maxCards = 4): string[] {
  const others = pool.filter((w) => w.id !== word.id).map((w) => w.id);
  const chosen = shuffle(others, rng).slice(0, maxCards - 1);
  return shuffle([word.id, ...chosen], rng);
}
