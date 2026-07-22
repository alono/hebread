import { useEffect, useMemo, useRef, useState } from 'react';
import type { WordItem } from '../../content/types';
import { WORDS } from '../../content';
import { pickWordTiles } from '../../game/choices';
import { mulberry32 } from '../../game/rng';
import { CORRECT_DELAY, FAST } from '../../ui/timing';
import { SpeakerButton } from '../SpeakerButton';

export interface ExerciseResult {
  correct: boolean;
  /** Solved with no wrong taps (feeds the first-try / strength rule). */
  clean: boolean;
}

interface BuildWordProps {
  word: WordItem;
  onResult: (r: ExerciseResult) => void;
  onReplay: () => void;
}

/** Assemble the heard word from syllable tiles, in order (PRD §5.3). */
export function BuildWord({ word, onResult, onReplay }: BuildWordProps) {
  const rng = useRef(mulberry32(FAST ? 7 : (Date.now() >>> 0) || 1));
  const pool = useMemo(() => WORDS.flatMap((w) => w.syllables), []);
  const [tiles] = useState<string[]>(() => pickWordTiles(word, pool, rng.current));
  const [placed, setPlaced] = useState<number[]>([]);
  const [clean, setClean] = useState(true);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);

  const solved = placed.length === word.syllables.length;
  const nextNeeded = word.syllables[placed.length];

  useEffect(() => {
    if (!solved) return;
    const t = setTimeout(() => onResult({ correct: true, clean }), CORRECT_DELAY);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved]);

  const tap = (i: number) => {
    if (placed.includes(i) || solved) return;
    if (tiles[i] === nextNeeded) {
      setPlaced((p) => [...p, i]);
    } else {
      setClean(false);
      setWrongIdx(i);
      onReplay();
      setTimeout(() => setWrongIdx(null), 400);
    }
  };

  return (
    <div
      className="flex w-full max-w-md flex-col items-center gap-6"
      data-testid="buildword"
      data-word-id={word.id}
      data-target={JSON.stringify(word.syllables)}
      data-solved={String(solved)}
    >
      <div className="flex flex-col items-center gap-3">
        {word.emoji && <div className="text-7xl" aria-hidden="true">{word.emoji}</div>}
        <SpeakerButton onClick={onReplay} label="שְׁמַע אֶת הַמִּלָּה" />
        <p className="text-base text-slate-600">הַרְכִּיבוּ אֶת הַמִּלָּה</p>
      </div>

      {/* assembled slots — explicit RTL so slot 0 (the word's FIRST syllable) is
          the rightmost box and the word builds right→left, as Hebrew is read.
          (flex-row-reverse here would double-reverse under the page's dir="rtl".) */}
      <div dir="rtl" className="flex items-center justify-center gap-2" data-testid="word-slots">
        {word.syllables.map((s, i) => (
          <div
            key={i}
            className={`flex h-20 min-w-[3.5rem] items-center justify-center rounded-2xl border-2 px-2 ${
              i < placed.length ? 'border-emerald-300 bg-emerald-50' : 'border-dashed border-slate-300 bg-white/60'
            }`}
          >
            <span className="font-hebrew text-4xl font-bold leading-niqqud text-slate-800" dir="rtl">
              {i < placed.length ? s : ''}
            </span>
          </div>
        ))}
      </div>

      {/* tray */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {tiles.map((t, i) =>
          placed.includes(i) ? null : (
            <button
              key={i}
              type="button"
              data-testid="tile"
              data-syllable={t}
              onClick={() => tap(i)}
              className={`flex h-20 min-w-[3.5rem] items-center justify-center rounded-2xl bg-white px-3 shadow-md ring-2 transition active:scale-95 ${
                wrongIdx === i ? 'animate-shake ring-rose-400' : 'ring-sky-200 hover:ring-sky-400'
              }`}
            >
              <span className="font-hebrew text-4xl font-bold leading-niqqud text-slate-800" dir="rtl">
                {t}
              </span>
            </button>
          ),
        )}
      </div>
    </div>
  );
}
