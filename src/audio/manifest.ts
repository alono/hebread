import manifest from '../content/audio-manifest.json';

export interface AudioEntry {
  /** File under public/audio/, e.g. "55c88c893932a766.mp3". */
  file: string;
  /** Exact text that was spoken (used for the speechSynthesis fallback). */
  text: string;
}

const M = manifest as Record<string, AudioEntry>;

export const hasAudio = (id: string): boolean => id in M;

export const audioText = (id: string): string | undefined => M[id]?.text;

/** URL for the prebuilt MP3, or undefined if the id has no audio. */
export function audioUrl(id: string): string | undefined {
  const entry = M[id];
  if (!entry) return undefined;
  return `${import.meta.env.BASE_URL}audio/${entry.file}`;
}

export const AUDIO_IDS: string[] = Object.keys(M);
