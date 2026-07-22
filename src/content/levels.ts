import type { ExerciseType } from './types';

/**
 * Per-level metadata (names, icons, exercise mix). `itemIds` is intentionally
 * NOT here — it is derived from the content files in index.ts so the two can
 * never drift. Level names are child-facing → fully niqqud-ed.
 */
export interface LevelMeta {
  id: number;
  name: string;
  icon: string;
  exerciseTypes: ExerciseType[];
  mixFromLevels: number[];
}

export const LEVEL_META: LevelMeta[] = [
  {
    id: 1,
    // Citation forms of the two vowel names, comma-joined — avoids the
    // begadkefat-after-vav sandhi debate on "וּפַתָח" while still reading
    // "kamatz, patach" (both forms confirmed by nikud-reviewer).
    name: 'קָמָץ, פַּתָח',
    icon: '🌱',
    exerciseTypes: ['seeHear', 'hearPick'],
    mixFromLevels: [],
  },
  {
    id: 2,
    name: 'חִירִיק',
    icon: '🌿',
    exerciseTypes: ['seeHear', 'hearPick'],
    mixFromLevels: [1],
  },
  // Levels 3–12: metadata for the map now; content JSON arrives in Phases 5–6,
  // so their itemIds stay empty (and the level is "not yet playable") until then.
  {
    id: 3,
    name: 'צֵירֵי, סֶגּוֹל',
    icon: '🌸',
    exerciseTypes: ['seeHear', 'hearPick'],
    mixFromLevels: [1, 2],
  },
  {
    id: 4,
    name: 'חוֹלָם',
    icon: '☀️',
    exerciseTypes: ['seeHear', 'hearPick'],
    mixFromLevels: [1, 2, 3],
  },
  {
    id: 5,
    name: 'שׁוּרוּק, קֻבּוּץ',
    icon: '🌙',
    exerciseTypes: ['seeHear', 'hearPick'],
    mixFromLevels: [1, 2, 3, 4],
  },
  {
    id: 6,
    name: 'שְׁוָא וְסוֹפִיּוֹת',
    icon: '⭐',
    exerciseTypes: ['seeHear', 'hearPick'],
    mixFromLevels: [1, 2, 3, 4, 5],
  },
  {
    id: 7,
    name: 'מִלִּים רִאשׁוֹנוֹת',
    icon: '🧩',
    exerciseTypes: ['buildWord', 'wordToPic', 'hearPick'],
    mixFromLevels: [],
  },
  {
    id: 8,
    name: 'מִלִּים שְׁכִיחוֹת',
    icon: '📚',
    exerciseTypes: ['buildWord', 'wordToPic', 'hearPick'],
    mixFromLevels: [7],
  },
  {
    id: 9,
    name: 'מִשְׁפָּטִים קְצָרִים',
    icon: '💬',
    exerciseTypes: ['wordToPic', 'readAloud'],
    mixFromLevels: [],
  },
  {
    id: 10,
    name: 'מִשְׁפָּטִים אֲרֻכִּים',
    icon: '📝',
    exerciseTypes: ['wordToPic', 'readAloud'],
    mixFromLevels: [9],
  },
  {
    id: 11,
    name: 'פִּסְקָה קְצָרָה',
    icon: '📖',
    exerciseTypes: ['readAloud'],
    mixFromLevels: [],
  },
  {
    id: 12,
    name: 'פִּסְקָה שְׁלֵמָה',
    icon: '🏆',
    exerciseTypes: ['readAloud'],
    mixFromLevels: [11],
  },
];
