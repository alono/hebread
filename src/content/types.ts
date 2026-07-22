// Content model — mirrors PRD §8. Content items live as JSON under src/content/;
// these types are the single schema the validator and the app share.

export type Nikud =
  | 'kamatz'
  | 'patach'
  | 'hirik'
  | 'hirikMale'
  | 'tzere'
  | 'segol'
  | 'holam'
  | 'holamMale'
  | 'shuruk'
  | 'kubutz'
  | 'shvaNa'
  | 'shvaNach';

export type ExerciseType = 'hearPick' | 'seeHear' | 'buildWord' | 'wordToPic' | 'readAloud';

export interface SyllableItem {
  /** e.g. "bet-kamatz" */
  id: string;
  /** Unicode with niqqud, NFC-normalised, e.g. "בָּ". */
  display: string;
  /** What is sent to TTS if it differs from the display (PRD §6). */
  spokenForm?: string;
  /** TTS prosody-rate override, e.g. "+100%" (shva = a clipped, very short /e/). */
  spokenRate?: string;
  /** Base consonant, e.g. "ב". */
  letter: string;
  nikud: Nikud;
  /**
   * Modern-Hebrew phoneme, e.g. "b_a". Homophones share it (patach=kamatz,
   * ס=שׂ, א=ע…). A hear-and-pick distractor must NEVER share the target's sound,
   * or the child couldn't tell them apart by ear.
   */
  sound?: string;
  /** ids of phonetically/visually confusable distractors (must exist, sound-distinct). */
  distractors: string[];
}

export interface WordItem {
  id: string;
  display: string;
  syllables: string[];
  emoji?: string;
  frequencyRank?: number;
}

export interface Comprehension {
  /** Read aloud via TTS. */
  question: string;
  /** 3 options (emoji or words). */
  options: string[];
  correctIndex: number;
}

export interface SentenceItem {
  id: string;
  display: string;
  comprehension?: Comprehension;
}

export interface ParagraphItem {
  id: string;
  title: string;
  /** Each sentence is one parent-approval unit. */
  sentences: string[];
  /** 1–2 comprehension questions. */
  comprehension: Comprehension[];
}

export interface Level {
  id: number;
  name: string;
  icon: string;
  exerciseTypes: ExerciseType[];
  itemIds: string[];
  mixFromLevels: number[];
  skipTestSize: 10;
  skipTestPassScore: 9;
}

/** Any addressable, audio-bearing content item. */
export type ContentItem = SyllableItem | WordItem | SentenceItem;
