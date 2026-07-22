import { describe, expect, it } from 'vitest';
import { LEVELS, SYLLABLES, getItem, getParagraph, levelItemIds } from './index';

describe('content — syllables', () => {
  it('defines all 12 levels and every level has content', () => {
    expect(SYLLABLES.length).toBeGreaterThan(0);
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const level of LEVELS) {
      expect(level.itemIds.length, `level ${level.id}`).toBeGreaterThan(0);
    }
  });

  // Phase 1 acceptance criterion.
  it('every item has >=2 distractors and every distractor exists', () => {
    for (const s of SYLLABLES) {
      expect(s.distractors.length, `${s.id} distractor count`).toBeGreaterThanOrEqual(2);
      for (const d of s.distractors) {
        expect(getItem(d), `${s.id} distractor ${d} must exist`).toBeDefined();
        expect(d, `${s.id} distractor must not be itself`).not.toBe(s.id);
      }
    }
  });

  // The hear-and-pick exercise plays a sound and asks for the spelling, so a
  // distractor that sounds identical to the target would be impossible to answer.
  it('no distractor is a homophone of its item (patach=kamatz, ס=שׂ, א=ע…)', () => {
    const soundById = new Map(SYLLABLES.map((s) => [s.id, s.sound]));
    for (const s of SYLLABLES) {
      expect(s.sound, `${s.id} has a sound`).toBeTruthy();
      for (const d of s.distractors) {
        expect(soundById.get(d), `${s.id} distractor ${d} shares sound "${s.sound}"`).not.toBe(s.sound);
      }
    }
  });

  it('every display is NFC-normalised and carries niqqud', () => {
    const niqqud = /[֑-ׇֽֿׁׂ]/;
    for (const s of SYLLABLES) {
      expect(s.display.normalize('NFC'), `${s.id} display NFC`).toBe(s.display);
      expect(niqqud.test(s.display), `${s.id} display has niqqud`).toBe(true);
    }
  });

  it('all ids are unique', () => {
    const ids = SYLLABLES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('level itemIds resolve to real items, and mixing is cumulative', () => {
    for (const level of LEVELS) {
      for (const id of level.itemIds) {
        expect(getItem(id) ?? getParagraph(id), `${id} in level ${level.id}`).toBeDefined();
      }
    }
    // Level 2 mixes level 1, so its available pool is strictly larger than its own items.
    const level2 = LEVELS.find((l) => l.id === 2)!;
    expect(levelItemIds(2).length).toBeGreaterThan(level2.itemIds.length);
  });
});
