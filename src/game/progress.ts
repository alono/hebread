import { emptyItemProgress, isMastered, ItemProgress, MASTERY_STRENGTH } from './types';

export interface AnswerEvent {
  correct: boolean;
  /** True if this was the first attempt at the item in this round. */
  firstTry: boolean;
  /** Current session id (distinct per app run). */
  sessionId: string;
}

/**
 * Pure reducer for a single answer against one item's progress (PRD §10):
 * first-try-correct → strength += 1 (and a mastery credit once per session when
 * strength ≥ 2); wrong → strength = 0 and errorCount += 1. A correct answer that
 * is not the first try neither advances nor resets strength.
 */
export function applyAnswer(prev: ItemProgress | undefined, ev: AnswerEvent): ItemProgress {
  const base = prev ?? emptyItemProgress();
  const next: ItemProgress = { ...base, seen: base.seen + 1 };

  if (ev.correct) {
    if (ev.firstTry) {
      next.strength = base.strength + 1;
      if (next.strength >= MASTERY_STRENGTH && base.lastMasterySession !== ev.sessionId) {
        next.masteryCredits = base.masteryCredits + 1;
        next.lastMasterySession = ev.sessionId;
      }
    }
  } else {
    next.strength = 0;
    next.errorCount = base.errorCount + 1;
  }
  return next;
}

/** Fraction of the given items that are mastered (0..1). */
export function masteredFraction(
  itemIds: string[],
  getProgress: (id: string) => ItemProgress | undefined,
): number {
  if (itemIds.length === 0) return 0;
  const mastered = itemIds.filter((id) => {
    const p = getProgress(id);
    return p ? isMastered(p) : false;
  }).length;
  return mastered / itemIds.length;
}
