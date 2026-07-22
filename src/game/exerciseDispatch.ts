import type { ExerciseType, WordItem } from '../content/types';

/**
 * Choose the exercise for a word item. wordToPic needs a picture, so a word with
 * no emoji always falls back to buildWord. Build-word (הרכב מילה) is the flagship
 * word exercise, so 2 of every 3 emoji words use it; the third maps meaning via
 * word-to-picture (PRD §5.3/§5.4).
 */
export function wordExerciseType(
  types: ExerciseType[],
  word: WordItem,
  wordIndex: number,
): 'buildWord' | 'wordToPic' {
  if (!word.emoji) return 'buildWord';
  const wordTypes = types.filter((t): t is 'buildWord' | 'wordToPic' => t === 'buildWord' || t === 'wordToPic');
  if (!wordTypes.includes('wordToPic')) return 'buildWord';
  if (!wordTypes.includes('buildWord')) return 'wordToPic';
  return ((wordIndex % 3) + 3) % 3 === 1 ? 'wordToPic' : 'buildWord';
}
