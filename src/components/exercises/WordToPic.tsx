import { useMemo, useRef, useState } from 'react';
import type { WordItem } from '../../content/types';
import { WORDS } from '../../content';
import { pickEmojiOptions } from '../../game/choices';
import { mulberry32 } from '../../game/rng';
import { CORRECT_DELAY, FAST, WRONG_DELAY } from '../../ui/timing';
import type { ExerciseResult } from './BuildWord';

interface WordToPicProps {
  word: WordItem;
  onResult: (r: ExerciseResult) => void;
  onReplay: () => void;
}

/** Read the word, pick the matching picture from three (PRD §5.4). */
export function WordToPic({ word, onResult, onReplay }: WordToPicProps) {
  const rng = useRef(mulberry32(FAST ? 11 : (Date.now() >>> 0) || 1));
  const otherEmojis = useMemo(() => WORDS.map((w) => w.emoji).filter(Boolean) as string[], []);
  const [options] = useState<string[]>(() => pickEmojiOptions(word, otherEmojis, rng.current));
  const [picked, setPicked] = useState<string | null>(null);

  const choose = (emoji: string) => {
    if (picked) return;
    const correct = emoji === word.emoji;
    setPicked(emoji);
    if (!correct) onReplay();
    setTimeout(() => onResult({ correct, clean: correct }), correct ? CORRECT_DELAY : WRONG_DELAY);
  };

  const state = (emoji: string): string => {
    if (!picked) return 'ring-sky-200 hover:ring-sky-400';
    if (emoji === word.emoji) return 'ring-emerald-400 bg-emerald-50 animate-pop';
    if (emoji === picked) return 'ring-rose-400 bg-rose-50 animate-shake';
    return 'ring-slate-200 opacity-60';
  };

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6" data-testid="wordtopic" data-word-id={word.id}>
      <button
        type="button"
        onClick={onReplay}
        className="flex flex-col items-center gap-2 rounded-3xl bg-white px-8 py-5 shadow-md ring-1 ring-sky-100 transition active:scale-95"
        aria-label="שְׁמַע וְקִרְאוּ אֶת הַמִּלָּה"
      >
        <span className="font-hebrew text-6xl font-bold leading-niqqud text-slate-800" dir="rtl">{word.display}</span>
        <span className="text-2xl" aria-hidden="true">🔊</span>
      </button>
      <p className="text-base text-slate-600">אֵיזוֹ תְּמוּנָה מַתְאִימָה?</p>
      <div className="grid grid-cols-3 gap-4">
        {options.map((emoji) => (
          <button
            key={emoji}
            type="button"
            data-testid="pic-option"
            data-emoji={emoji}
            data-correct={String(emoji === word.emoji)}
            disabled={!!picked}
            onClick={() => choose(emoji)}
            aria-label="תְּמוּנָה"
            className={`flex h-24 w-24 items-center justify-center rounded-3xl bg-white text-5xl shadow-md ring-2 transition active:scale-95 ${state(emoji)}`}
          >
            <span aria-hidden="true">{emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
