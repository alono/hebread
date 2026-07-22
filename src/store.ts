import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEY } from './constants';
import { getLevel } from './content';
import { applyAnswer } from './game/progress';
import { isLevelComplete } from './game/promotion';
import { emptyLevelRecord, type ItemProgress, type LevelRecord } from './game/types';

interface PersistedState {
  schemaVersion: number;
  items: Record<string, ItemProgress>;
  levels: Record<number, LevelRecord>;
  /** Personal-best turbo score per level (PRD §5.5). */
  turboBest: Record<number, number>;
  /** Practice seconds per ISO date (drives streak + weekly time in parent mode). */
  activity: Record<string, number>;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

interface Store extends PersistedState {
  /** Fresh per app run (not persisted) — used for the two-sessions mastery rule. */
  sessionId: string;
  recordAnswer: (itemId: string, correct: boolean, firstTry: boolean) => void;
  finishRound: (levelId: number, stars: number, fastTracked?: boolean) => void;
  passSkipTest: (levelId: number) => void;
  recordTurbo: (levelId: number, score: number) => void;
  logActivity: (seconds: number) => void;
  itemProgress: (id: string) => ItemProgress | undefined;
  levelRecord: (id: number) => LevelRecord;
  resetProgress: () => void;
  importState: (data: Partial<PersistedState>) => void;
}

const newSessionId = () => `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      schemaVersion: 1,
      items: {},
      levels: {},
      turboBest: {},
      activity: {},
      sessionId: newSessionId(),

      recordAnswer: (itemId, correct, firstTry) =>
        set((s) => ({
          items: {
            ...s.items,
            [itemId]: applyAnswer(s.items[itemId], { correct, firstTry, sessionId: s.sessionId }),
          },
        })),

      finishRound: (levelId, stars, fastTracked = false) =>
        set((s) => {
          const prev = s.levels[levelId] ?? emptyLevelRecord();
          const ownItems = getLevel(levelId)?.itemIds ?? [];
          const completed = prev.completed || isLevelComplete(ownItems, (id) => s.items[id]);
          return {
            levels: {
              ...s.levels,
              [levelId]: {
                stars: Math.max(prev.stars, stars),
                roundsPlayed: prev.roundsPlayed + 1,
                completed,
                fastTrack: prev.fastTrack || fastTracked,
              },
            },
          };
        }),

      passSkipTest: (levelId) =>
        set((s) => {
          const prev = s.levels[levelId] ?? emptyLevelRecord();
          return {
            levels: {
              ...s.levels,
              [levelId]: { ...prev, completed: true, fastTrack: true, stars: Math.max(prev.stars, 3) },
            },
          };
        }),

      recordTurbo: (levelId, score) =>
        set((s) => ({ turboBest: { ...s.turboBest, [levelId]: Math.max(s.turboBest[levelId] ?? 0, score) } })),

      logActivity: (seconds) =>
        set((s) => {
          const day = todayISO();
          return { activity: { ...s.activity, [day]: (s.activity[day] ?? 0) + Math.max(0, seconds) } };
        }),

      itemProgress: (id) => get().items[id],
      levelRecord: (id) => get().levels[id] ?? emptyLevelRecord(),
      resetProgress: () => set({ items: {}, levels: {}, turboBest: {}, activity: {} }),
      importState: (data) =>
        set({
          items: data.items ?? {},
          levels: data.levels ?? {},
          turboBest: data.turboBest ?? {},
          activity: data.activity ?? {},
        }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      // sessionId is intentionally excluded so every reload counts as a new session.
      partialize: (s) => ({
        schemaVersion: s.schemaVersion,
        items: s.items,
        levels: s.levels,
        turboBest: s.turboBest,
        activity: s.activity,
      }),
    },
  ),
);
