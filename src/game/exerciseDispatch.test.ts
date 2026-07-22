import { describe, expect, it } from 'vitest';
import { wordExerciseType } from './exerciseDispatch';
import type { ExerciseType, WordItem } from '../content/types';

const withEmoji: WordItem = { id: 'a', display: 'אַבָּא', syllables: ['אַ', 'בָּא'], emoji: '👨' };
const noEmoji: WordItem = { id: 'b', display: 'שֶׁל', syllables: ['שֶׁל'] };
const TYPES: ExerciseType[] = ['buildWord', 'wordToPic', 'hearPick'];

describe('wordExerciseType', () => {
  it('build-word dominates 2:1 for words with an emoji', () => {
    expect(wordExerciseType(TYPES, withEmoji, 0)).toBe('buildWord');
    expect(wordExerciseType(TYPES, withEmoji, 1)).toBe('wordToPic');
    expect(wordExerciseType(TYPES, withEmoji, 2)).toBe('buildWord');
    expect(wordExerciseType(TYPES, withEmoji, 3)).toBe('buildWord');
    expect(wordExerciseType(TYPES, withEmoji, 4)).toBe('wordToPic');
    expect(wordExerciseType(TYPES, withEmoji, 5)).toBe('buildWord');
  });

  it('never routes an emoji-less word to wordToPic', () => {
    for (let i = 0; i < 6; i++) expect(wordExerciseType(TYPES, noEmoji, i)).toBe('buildWord');
  });

  it('falls back to buildWord when the level declares no word exercises', () => {
    expect(wordExerciseType(['seeHear', 'hearPick'], withEmoji, 0)).toBe('buildWord');
  });
});
