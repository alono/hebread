/** Per-item learning progress, persisted to localStorage. */
export interface ItemProgress {
  /** Consecutive first-try-correct answers; reset to 0 on any wrong answer (PRD §10). */
  strength: number;
  /** Number of distinct sessions in which the item reached strength ≥ 2. */
  masteryCredits: number;
  /** Session id of the last mastery credit (prevents double-counting within a session). */
  lastMasterySession: string | null;
  /** Lifetime wrong answers — drives the 70/30 review selection. */
  errorCount: number;
  /** Lifetime presentations. */
  seen: number;
}

/** Per-level record, persisted. */
export interface LevelRecord {
  /** Best star rating earned (0–3). */
  stars: number;
  roundsPlayed: number;
  /** Level completed (≥90% mastered or skip test passed). Set in Phase 4. */
  completed: boolean;
  /** Completed via fast-track / skip test. */
  fastTrack: boolean;
}

export const MASTERY_STRENGTH = 2; // strength threshold (PRD §10)
export const MASTERY_SESSIONS = 2; // in two different sessions
export const LEVEL_COMPLETE_FRACTION = 0.9; // ≥90% mastered

export const emptyItemProgress = (): ItemProgress => ({
  strength: 0,
  masteryCredits: 0,
  lastMasterySession: null,
  errorCount: 0,
  seen: 0,
});

export const emptyLevelRecord = (): LevelRecord => ({
  stars: 0,
  roundsPlayed: 0,
  completed: false,
  fastTrack: false,
});

export const isMastered = (p: ItemProgress): boolean => p.masteryCredits >= MASTERY_SESSIONS;
