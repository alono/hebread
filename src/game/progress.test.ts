import { describe, expect, it } from 'vitest';
import { applyAnswer, masteredFraction } from './progress';
import { emptyItemProgress, isMastered, ItemProgress } from './types';

const S1 = 'sess-1';
const S2 = 'sess-2';

describe('applyAnswer', () => {
  it('first-try correct increments strength and seen', () => {
    const p = applyAnswer(undefined, { correct: true, firstTry: true, sessionId: S1 });
    expect(p.strength).toBe(1);
    expect(p.seen).toBe(1);
    expect(p.errorCount).toBe(0);
  });

  it('wrong resets strength and bumps errorCount', () => {
    let p = applyAnswer(undefined, { correct: true, firstTry: true, sessionId: S1 });
    p = applyAnswer(p, { correct: false, firstTry: true, sessionId: S1 });
    expect(p.strength).toBe(0);
    expect(p.errorCount).toBe(1);
    expect(p.seen).toBe(2);
  });

  it('correct but not first try does not change strength', () => {
    let p: ItemProgress = { ...emptyItemProgress(), strength: 0, errorCount: 1 };
    p = applyAnswer(p, { correct: true, firstTry: false, sessionId: S1 });
    expect(p.strength).toBe(0);
    expect(p.seen).toBe(1);
  });

  it('awards at most one mastery credit per session', () => {
    // Two first-try-corrects in the SAME session → strength 2, but only 1 credit.
    let p = applyAnswer(undefined, { correct: true, firstTry: true, sessionId: S1 });
    p = applyAnswer(p, { correct: true, firstTry: true, sessionId: S1 });
    expect(p.strength).toBe(2);
    expect(p.masteryCredits).toBe(1);
    expect(isMastered(p)).toBe(false);
  });

  it('mastery requires two different sessions', () => {
    let p = applyAnswer(undefined, { correct: true, firstTry: true, sessionId: S1 });
    p = applyAnswer(p, { correct: true, firstTry: true, sessionId: S1 }); // strength 2, credit 1
    expect(isMastered(p)).toBe(false);
    p = applyAnswer(p, { correct: true, firstTry: true, sessionId: S2 }); // strength 3, credit 2
    expect(p.masteryCredits).toBe(2);
    expect(isMastered(p)).toBe(true);
  });
});

describe('masteredFraction', () => {
  it('computes the fraction of mastered items', () => {
    const map: Record<string, ItemProgress> = {
      a: { ...emptyItemProgress(), masteryCredits: 2 },
      b: { ...emptyItemProgress(), masteryCredits: 2 },
      c: emptyItemProgress(),
      d: emptyItemProgress(),
    };
    expect(masteredFraction(['a', 'b', 'c', 'd'], (id) => map[id])).toBeCloseTo(0.5);
    expect(masteredFraction([], () => undefined)).toBe(0);
  });
});
