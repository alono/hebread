import type { ExerciseType, WordItem } from '../content/types';

/**
 * Choose the exercise for a word item. wordToPic needs a picture, so a word with
 * no emoji always falls back to buildWord. Otherwise the level's word-capable
 * exercises alternate by the word's index (PRD §5.3/§5.4).
 */
export function wordExerciseType(
  types: ExerciseType[],
  word: WordItem,
  wordIndex: number,
): 'buildWord' | 'wordToPic' {
  if (!word.emoji) return 'buildWord';
  const wordTypes = types.filter((t): t is 'buildWord' | 'wordToPic' => t === 'buildWord' || t === 'wordToPic');
  if (wordTypes.length === 0) return 'buildWord';
  if (wordTypes.length === 1) return wordTypes[0];
  return wordTypes[((wordIndex % wordTypes.length) + wordTypes.length) % wordTypes.length];
}
