import { masteredFraction } from './progress';
import { Rng, shuffle } from './rng';
import { ItemProgress, LEVEL_COMPLETE_FRACTION } from './types';

// PRD §4 "רצים מהר" + §10.
export const SKIP_TEST_SIZE = 10;
export const SKIP_TEST_PASS = 9;
export const FASTTRACK_STREAK = 8;

/** A level is complete when ≥90% of its own items are mastered (PRD §10). */
export function isLevelComplete(
  itemIds: string[],
  getProgress: (id: string) => ItemProgress | undefined,
): boolean {
  return masteredFraction(itemIds, getProgress) >= LEVEL_COMPLETE_FRACTION;
}

/** Skip test: 10 random items from the level, 9/10 correct passes (PRD §4). */
export function buildSkipTest(itemIds: string[], rng: Rng = Math.random): string[] {
  return shuffle(itemIds, rng).slice(0, Math.min(SKIP_TEST_SIZE, itemIds.length));
}

export function skipTestPassed(correctCount: number, size = SKIP_TEST_SIZE): boolean {
  // Scale the bar if a level somehow has fewer than 10 items.
  const required = size >= SKIP_TEST_SIZE ? SKIP_TEST_PASS : Math.ceil(size * 0.9);
  return correctCount >= required;
}

// Fast-track (the FASTTRACK_STREAK rule, PRD §10) is applied inline in the round
// engine (src/game/round.ts) where it can trim the live queue deterministically.
