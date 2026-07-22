import { isMastered, ItemProgress } from './types';
import { Rng, shuffle } from './rng';

export interface QueueOptions {
  /** Upper bound on round size (PRD §10: 8–12; the lower bound is only limited by how many items exist). */
  max?: number;
  /** Share of the round reserved for review (mistakes + earlier-level mixing). */
  errorRatio?: number;
  /** Item ids from earlier levels, for cumulative-mix review (PRD §4 ערבוב מצטבר). */
  mixIds?: string[];
}

const DEFAULTS = { max: 12, errorRatio: 0.3 };

/**
 * Build a round queue (PRD §10): 8–12 items, ~70% the level's OWN material /
 * ~30% review. The review share takes items with error history first (own or
 * earlier levels), then earlier-level items for cumulative mixing — so the
 * current level's new sound always dominates the round and older sounds return
 * in measured doses, never the other way around. Deterministic with a seeded rng.
 */
export function buildQueue(
  ownIds: string[],
  getProgress: (id: string) => ItemProgress | undefined,
  opts: QueueOptions = {},
  rng: Rng = Math.random,
): string[] {
  const { max, errorRatio, mixIds = [] } = { ...DEFAULTS, ...opts };
  const ownSet = new Set(ownIds);
  const mixOnly = [...new Set(mixIds)].filter((id) => !ownSet.has(id));
  const total = ownIds.length + mixOnly.length;
  if (total === 0) return [];
  const size = Math.min(max, total);

  const mastered = (id: string) => {
    const p = getProgress(id);
    return !!p && isMastered(p);
  };
  const hasErrors = (id: string) => (getProgress(id)?.errorCount ?? 0) > 0;
  const unseen = (id: string) => (getProgress(id)?.seen ?? 0) === 0;

  const picked: string[] = [];
  const used = new Set<string>();
  const takeUpTo = (pool: string[], n: number) => {
    let taken = 0;
    for (const id of shuffle(pool, rng)) {
      if (taken >= n) break;
      if (used.has(id)) continue;
      used.add(id);
      picked.push(id);
      taken += 1;
    }
  };

  // Review share (~30%): ONLY items with past mistakes (PRD §10 — "פריטים עם
  // היסטוריית שגיאות מהעבר"), whether from this level or mixed-in earlier ones.
  // Earlier levels NEVER inject audio otherwise: a level's round teaches its own
  // sound; earlier graphemes take part as answer cards, not as played sounds.
  const reviewWant = Math.round(size * errorRatio);
  takeUpTo([...ownIds, ...mixOnly].filter(hasErrors), reviewWant);

  // New share (the rest): the level's own material — unseen first, then unmastered.
  takeUpTo(ownIds.filter(unseen), size - picked.length);
  takeUpTo(ownIds.filter((id) => !mastered(id)), size - picked.length);
  takeUpTo(ownIds, size - picked.length);
  takeUpTo(mixOnly, size - picked.length); // only reachable if the level itself is tiny

  const queue = shuffle(picked, rng);
  // Lead with the level's own material so the intro glyph shows the NEW sound.
  const firstOwn = queue.findIndex((id) => ownSet.has(id));
  if (firstOwn > 0) [queue[0], queue[firstOwn]] = [queue[firstOwn], queue[0]];
  return queue;
}
