/**
 * Pure round state machine for the hear-and-pick loop (PRD §5.1, §10).
 * Immutable: every transition returns a new state, so it drops straight into
 * React state. On a wrong answer the item is re-queued 2–3 places back (not
 * immediately) and the correct card is flashed by the UI.
 */
import { FASTTRACK_STREAK } from './promotion';

export interface RoundState {
  /** Upcoming item ids; index 0 is the current item. */
  queue: string[];
  /** Distinct item ids that make up this round (for progress + stars). */
  distinctIds: string[];
  /** Attempts made per item so far. */
  attempts: Record<string, number>;
  /** Final first-try correctness per item (true only if right on attempt #1). */
  firstTry: Record<string, boolean>;
  correct: number;
  wrong: number;
  /** Consecutive first-try-correct answers (resets on a wrong answer). */
  firstTryStreak: number;
  /** Whether the round was shortened by the fast-track rule (PRD §10). */
  fastTracked: boolean;
  /** Item just answered wrong (for the UI highlight), else null. */
  lastWrongId: string | null;
  done: boolean;
}

/** Distance (in items) a wrong item is re-queued before it reappears. */
const REQUEUE_DISTANCE = 3;

export function startRound(ids: string[]): RoundState {
  return {
    queue: [...ids],
    distinctIds: [...new Set(ids)],
    attempts: {},
    firstTry: {},
    correct: 0,
    wrong: 0,
    firstTryStreak: 0,
    fastTracked: false,
    lastWrongId: null,
    done: ids.length === 0,
  };
}

export const currentId = (s: RoundState): string | undefined => s.queue[0];

export const attemptsFor = (s: RoundState, id: string): number => s.attempts[id] ?? 0;

export const isFirstAttempt = (s: RoundState): boolean => {
  const id = currentId(s);
  return id !== undefined && attemptsFor(s, id) === 0;
};

export function answer(s: RoundState, isCorrect: boolean): RoundState {
  const id = currentId(s);
  if (id === undefined) return s;

  const firstAttempt = attemptsFor(s, id) === 0;
  const attempts = { ...s.attempts, [id]: attemptsFor(s, id) + 1 };
  const firstTry = { ...s.firstTry };
  let queue = s.queue.slice(1);
  let { correct, wrong, firstTryStreak, fastTracked, distinctIds } = s;
  let lastWrongId: string | null = null;

  if (isCorrect) {
    if (firstAttempt) {
      firstTry[id] = true;
      firstTryStreak += 1;
    }
    correct += 1;
    // resolved — not re-queued
  } else {
    firstTry[id] = false;
    wrong += 1;
    firstTryStreak = 0;
    lastWrongId = id;
    const pos = Math.min(REQUEUE_DISTANCE, queue.length);
    queue = [...queue.slice(0, pos), id, ...queue.slice(pos)];
  }

  // Fast-track: a streak of first-try-corrects drops half of the not-yet-shown
  // items to shorten the level (PRD §10). Deterministic (keeps every other).
  if (!fastTracked && firstTryStreak >= FASTTRACK_STREAK) {
    const kept: string[] = [];
    let unseen = 0;
    for (const qid of queue) {
      if ((attempts[qid] ?? 0) > 0) {
        kept.push(qid); // already engaged (e.g. re-queued miss) — always keep
      } else {
        if (unseen % 2 === 0) kept.push(qid);
        unseen += 1;
      }
    }
    queue = kept;
    fastTracked = true;
    // Dropped items were never shown → exclude them from progress/stars.
    distinctIds = [...new Set([...Object.keys(attempts), ...kept])];
  }

  return {
    ...s,
    queue,
    distinctIds,
    attempts,
    firstTry,
    correct,
    wrong,
    firstTryStreak,
    fastTracked,
    lastWrongId,
    done: queue.length === 0,
  };
}

/** Distinct items resolved (removed from the queue for good) vs total. */
export function progressCounts(s: RoundState): { answered: number; total: number } {
  const total = s.distinctIds.length;
  const remaining = new Set(s.queue);
  const answered = s.distinctIds.filter((id) => !remaining.has(id)).length;
  return { answered, total };
}

/** 1–3 stars by first-try accuracy (PRD §5: by accuracy, never speed). */
export function roundStars(s: RoundState): 1 | 2 | 3 {
  const total = s.distinctIds.length || 1;
  const firstTryCorrect = s.distinctIds.filter((id) => s.firstTry[id] === true).length;
  const acc = firstTryCorrect / total;
  if (acc >= 0.9) return 3;
  if (acc >= 0.6) return 2;
  return 1;
}
