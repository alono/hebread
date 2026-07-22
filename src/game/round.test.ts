import { describe, expect, it } from 'vitest';
import { answer, currentId, isFirstAttempt, progressCounts, roundStars, startRound } from './round';

describe('round state machine', () => {
  it('advances through items on correct answers', () => {
    let s = startRound(['a', 'b', 'c']);
    expect(currentId(s)).toBe('a');
    s = answer(s, true);
    expect(currentId(s)).toBe('b');
    s = answer(s, true);
    expect(currentId(s)).toBe('c');
    s = answer(s, true);
    expect(s.done).toBe(true);
    expect(s.correct).toBe(3);
    expect(s.wrong).toBe(0);
  });

  it('re-queues a wrong item 2–3 places back, not immediately', () => {
    let s = startRound(['a', 'b', 'c', 'd', 'e']);
    s = answer(s, false); // 'a' wrong
    expect(s.lastWrongId).toBe('a');
    // 'a' must NOT be next; it reappears a few items later
    expect(currentId(s)).toBe('b');
    expect(s.queue).toEqual(['b', 'c', 'd', 'a', 'e']);
    expect(s.queue).toContain('a');
  });

  it('the mistaken item comes back and can then be resolved', () => {
    let s = startRound(['a', 'b', 'c']);
    s = answer(s, false); // a wrong -> requeued at end (distance capped by queue len)
    const seen: string[] = [];
    let guard = 0;
    while (!s.done && guard++ < 20) {
      seen.push(currentId(s)!);
      s = answer(s, true);
    }
    expect(s.done).toBe(true);
    expect(seen.filter((x) => x === 'a').length).toBeGreaterThanOrEqual(1); // 'a' reappeared
    expect(s.firstTry.a).toBe(false); // erred once → not a first-try success
  });

  it('marks first-try correctness for stars', () => {
    let s = startRound(['a', 'b']);
    expect(isFirstAttempt(s)).toBe(true);
    s = answer(s, true); // a: first try
    s = answer(s, false); // b wrong
    s = answer(s, true); // b again, correct but not first try
    expect(s.firstTry.a).toBe(true);
    expect(s.firstTry.b).toBe(false);
  });

  it('progressCounts reflects resolved distinct items', () => {
    let s = startRound(['a', 'b', 'c']);
    expect(progressCounts(s)).toEqual({ answered: 0, total: 3 });
    s = answer(s, true); // a resolved
    expect(progressCounts(s)).toEqual({ answered: 1, total: 3 });
    s = answer(s, false); // b wrong, re-queued → not resolved
    expect(progressCounts(s).answered).toBe(1);
  });

  it('fast-tracks after 8 first-try-correct answers, dropping half the unseen', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `i${i}`);
    let s = startRound(ids);
    for (let i = 0; i < 8; i++) s = answer(s, true);
    expect(s.fastTracked).toBe(true);
    // 8 resolved, 4 were unseen → keep 2 → total distinct 10, queue 2
    expect(s.queue.length).toBe(2);
    expect(s.distinctIds.length).toBe(10);
    expect(s.firstTryStreak).toBe(8);
  });

  it('does not fast-track if the streak is broken', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `i${i}`);
    let s = startRound(ids);
    for (let i = 0; i < 5; i++) s = answer(s, true);
    s = answer(s, false); // breaks streak
    let guard = 0;
    while (!s.done && guard++ < 50) s = answer(s, true);
    expect(s.fastTracked).toBe(false);
  });

  it('awards stars by first-try accuracy', () => {
    let perfect = startRound(['a', 'b', 'c', 'd']);
    for (let i = 0; i < 4; i++) perfect = answer(perfect, true);
    expect(roundStars(perfect)).toBe(3);

    let oneMiss = startRound(['a', 'b', 'c', 'd']);
    oneMiss = answer(oneMiss, false); // a wrong
    let guard = 0;
    while (!oneMiss.done && guard++ < 20) oneMiss = answer(oneMiss, true);
    // 3/4 first-try = 0.75 → 2 stars
    expect(roundStars(oneMiss)).toBe(2);
  });
});
