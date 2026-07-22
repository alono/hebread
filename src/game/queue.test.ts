import { describe, expect, it } from 'vitest';
import { buildQueue } from './queue';
import { mulberry32 } from './rng';
import { emptyItemProgress, ItemProgress } from './types';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `i${i}`);

describe('buildQueue', () => {
  it('caps the round at 12 items when many are available', () => {
    const q = buildQueue(ids(52), () => undefined, {}, mulberry32(1));
    expect(q.length).toBe(12);
    expect(new Set(q).size).toBe(q.length); // no duplicates
  });

  it('uses all items when fewer than the max exist', () => {
    const q = buildQueue(ids(5), () => undefined, {}, mulberry32(1));
    expect(q.length).toBe(5);
  });

  it('is empty when nothing is available', () => {
    expect(buildQueue([], () => undefined, {}, mulberry32(1))).toEqual([]);
  });

  it('draws roughly 30% from the error pool when both pools are large', () => {
    const errorIds = new Set(ids(20).map((_, i) => `e${i}`));
    const all = [...ids(20).map((_, i) => `e${i}`), ...ids(20).map((_, i) => `n${i}`)];
    const getP = (id: string): ItemProgress | undefined =>
      errorIds.has(id) ? { ...emptyItemProgress(), seen: 3, errorCount: 2 } : undefined;
    const q = buildQueue(all, getP, {}, mulberry32(7));
    expect(q.length).toBe(12);
    const fromError = q.filter((id) => errorIds.has(id)).length;
    // 30% of 12 ≈ 4 (rounded), with new filling the rest
    expect(fromError).toBe(4);
  });

  it('backfills from new items when the error pool is small', () => {
    const errorIds = new Set(['e0']);
    const all = ['e0', ...ids(30).map((_, i) => `n${i}`)];
    const getP = (id: string): ItemProgress | undefined =>
      errorIds.has(id) ? { ...emptyItemProgress(), seen: 3, errorCount: 1 } : undefined;
    const q = buildQueue(all, getP, {}, mulberry32(3));
    expect(q.length).toBe(12);
    expect(q).toContain('e0');
  });

  it('is deterministic for a fixed seed', () => {
    const a = buildQueue(ids(52), () => undefined, {}, mulberry32(42));
    const b = buildQueue(ids(52), () => undefined, {}, mulberry32(42));
    expect(a).toEqual(b);
  });

  it('excludes mastered items from the primary pools but can backfill with them', () => {
    // 4 items, all mastered → nothing "new"/"error", but round must still fill.
    const getP = (): ItemProgress => ({ ...emptyItemProgress(), masteryCredits: 2, seen: 5 });
    const q = buildQueue(ids(4), getP, {}, mulberry32(1));
    expect(q.length).toBe(4);
  });

  // Regression (user report: "level 4 plays tzere"): with NO error history, a
  // level's round must play ONLY the level's own sound — earlier levels never
  // inject audio just because they're mixed in.
  it('a fresh player hears only the level’s own items, even with a large mix pool', () => {
    const own = Array.from({ length: 52 }, (_, i) => `own${i}`);
    const mix = Array.from({ length: 156 }, (_, i) => `mix${i}`);
    const q = buildQueue(own, () => undefined, { mixIds: mix }, mulberry32(5));
    expect(q.length).toBe(12);
    expect(q.every((id) => id.startsWith('own'))).toBe(true);
  });

  it('earlier-level items return ONLY when they carry error history', () => {
    const own = Array.from({ length: 52 }, (_, i) => `own${i}`);
    const mix = Array.from({ length: 156 }, (_, i) => `mix${i}`);
    const errored = new Set(['mix7', 'mix42']);
    const getP = (id: string): ItemProgress | undefined =>
      errored.has(id) ? { ...emptyItemProgress(), seen: 2, errorCount: 1 } : undefined;
    const q = buildQueue(own, getP, { mixIds: mix }, mulberry32(6));
    const mixItems = q.filter((id) => id.startsWith('mix'));
    expect(new Set(mixItems)).toEqual(errored); // exactly the mistakes, nothing else
    expect(q.filter((id) => id.startsWith('own')).length).toBe(10);
  });

  it('the queue leads with an own-level item (the intro shows the new sound)', () => {
    const own = Array.from({ length: 20 }, (_, i) => `own${i}`);
    const mix = Array.from({ length: 60 }, (_, i) => `mix${i}`);
    for (let seed = 1; seed <= 10; seed++) {
      const q = buildQueue(own, () => undefined, { mixIds: mix }, mulberry32(seed));
      expect(q[0].startsWith('own'), `seed ${seed} starts with own item`).toBe(true);
    }
  });

  it('review share prefers past mistakes over plain mixing', () => {
    const own = Array.from({ length: 20 }, (_, i) => `own${i}`);
    const mix = Array.from({ length: 20 }, (_, i) => `mix${i}`);
    const errored = new Set(['mix0', 'mix1', 'mix2', 'mix3']);
    const getP = (id: string): ItemProgress | undefined =>
      errored.has(id) ? { ...emptyItemProgress(), seen: 2, errorCount: 1 } : undefined;
    const q = buildQueue(own, getP, { mixIds: mix }, mulberry32(9));
    // all 4 review slots go to the erred items
    expect(q.filter((id) => errored.has(id)).length).toBe(4);
    expect(q.filter((id) => id.startsWith('mix') && !errored.has(id)).length).toBe(0);
  });
});
