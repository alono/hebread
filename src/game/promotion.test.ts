import { describe, expect, it } from 'vitest';
import { buildSkipTest, FASTTRACK_STREAK, isLevelComplete, SKIP_TEST_SIZE, skipTestPassed } from './promotion';
import { mulberry32 } from './rng';
import { emptyItemProgress, ItemProgress } from './types';

const mastered: ItemProgress = { ...emptyItemProgress(), masteryCredits: 2, seen: 4 };

describe('isLevelComplete', () => {
  it('true only when ≥90% of items are mastered', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `i${i}`);
    const map: Record<string, ItemProgress> = {};
    ids.forEach((id, i) => (map[id] = i < 9 ? mastered : emptyItemProgress())); // 9/10
    expect(isLevelComplete(ids, (id) => map[id])).toBe(true);
    map['i8'] = emptyItemProgress(); // 8/10
    expect(isLevelComplete(ids, (id) => map[id])).toBe(false);
  });
});

describe('skip test', () => {
  it('builds 10 random items', () => {
    const ids = Array.from({ length: 52 }, (_, i) => `i${i}`);
    const t = buildSkipTest(ids, mulberry32(1));
    expect(t.length).toBe(SKIP_TEST_SIZE);
    expect(new Set(t).size).toBe(SKIP_TEST_SIZE);
  });

  it('passes at 9/10, fails at 8/10', () => {
    expect(skipTestPassed(9)).toBe(true);
    expect(skipTestPassed(10)).toBe(true);
    expect(skipTestPassed(8)).toBe(false);
  });

  it('scales the bar when a level has fewer than 10 items', () => {
    expect(skipTestPassed(5, 5)).toBe(true); // ceil(5*0.9)=5
    expect(skipTestPassed(4, 5)).toBe(false);
  });
});

describe('fast-track', () => {
  it('streak threshold is 8 (behaviour tested in round.test.ts)', () => {
    expect(FASTTRACK_STREAK).toBe(8);
  });
});
