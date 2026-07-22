import { describe, expect, it } from 'vitest';
import { pickChoices, pickEmojiOptions, pickWordTiles } from './choices';
import { mulberry32 } from './rng';
import type { SyllableItem, WordItem } from '../content/types';

const item = (id: string, distractors: string[]): SyllableItem => ({
  id,
  display: 'בָּ',
  letter: 'ב',
  nikud: 'kamatz',
  distractors,
});

describe('pickChoices', () => {
  it('always includes the correct id', () => {
    const c = pickChoices(item('x', ['a', 'b', 'c']), () => true, mulberry32(1));
    expect(c).toContain('x');
  });

  it('returns 4 cards when enough distractors exist', () => {
    const c = pickChoices(item('x', ['a', 'b', 'c']), () => true, mulberry32(1));
    expect(c.length).toBe(4);
    expect(new Set(c).size).toBe(4);
  });

  it('returns 3 cards when only 2 distractors exist', () => {
    const c = pickChoices(item('x', ['a', 'b']), () => true, mulberry32(1));
    expect(c.length).toBe(3);
  });

  it('drops distractors that do not exist', () => {
    const c = pickChoices(item('x', ['a', 'ghost', 'b']), (id) => id !== 'ghost', mulberry32(1));
    expect(c).not.toContain('ghost');
    expect(c).toContain('x');
  });
});

const word = (syllables: string[], emoji?: string): WordItem => ({ id: 'w', display: syllables.join(''), syllables, emoji });

describe('pickWordTiles', () => {
  it('includes all of the word’s syllables plus one distractor', () => {
    const tiles = pickWordTiles(word(['אַ', 'בָּא']), ['גַּ', 'דָ'], mulberry32(1));
    expect(tiles.length).toBe(3);
    for (const s of ['אַ', 'בָּא']) expect(tiles).toContain(s);
  });

  it('never uses a distractor equal to one of the word’s syllables', () => {
    const tiles = pickWordTiles(word(['אַ', 'בָּא']), ['אַ', 'בָּא'], mulberry32(1));
    expect(tiles.length).toBe(2); // no valid distractor available
  });
});

describe('pickEmojiOptions', () => {
  it('includes the correct emoji plus two distractors', () => {
    const opts = pickEmojiOptions(word(['בָּ'], '🐕'), ['🐈', '🐄', '🐴'], mulberry32(1));
    expect(opts.length).toBe(3);
    expect(opts).toContain('🐕');
    expect(new Set(opts).size).toBe(3);
  });

  it('returns nothing when the word has no emoji', () => {
    expect(pickEmojiOptions(word(['בָּ']), ['🐈'], mulberry32(1))).toEqual([]);
  });
});
