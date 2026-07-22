import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getItem, getLevel, getSyllable, hasItem, isWord, levelItemIds, WORDS, WORDS_BY_LEVEL } from '../content';
import { useStore } from '../store';
import { useAudio } from '../hooks/useAudio';
import { pickChoices, pickWordChoices } from '../game/choices';
import { mulberry32, shuffle } from '../game/rng';
import { FAST } from '../ui/timing';
import { SpeakerButton } from '../components/SpeakerButton';

const DURATION = FAST ? 3 : 60; // seconds

/** Optional 60-second speed round; builds automaticity, saves a personal best (PRD §5.5). */
export function Turbo() {
  const { levelId } = useParams();
  const id = Number(levelId);
  const level = getLevel(id);
  const navigate = useNavigate();
  const audio = useAudio();
  const recordTurbo = useStore((s) => s.recordTurbo);
  const best = useStore((s) => s.turboBest[id] ?? 0);

  const rng = useRef(mulberry32(FAST ? 999 : (Date.now() >>> 0) || 1));
  const poolRef = useRef<string[]>(level ? shuffle(levelItemIds(id), rng.current) : []);

  const [phase, setPhase] = useState<'ready' | 'run' | 'done'>('ready');
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [score, setScore] = useState(0);
  const [pos, setPos] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const scoreRef = useRef(0);

  const curId = poolRef.current.length ? poolRef.current[pos % poolRef.current.length] : undefined;

  const prep = useCallback(
    (itemId: string | undefined) => {
      if (!itemId) return;
      const item = getItem(itemId);
      if (isWord(item)) setOptions(pickWordChoices(item, WORDS_BY_LEVEL[id] ?? WORDS, rng.current));
      else {
        const syl = getSyllable(itemId);
        setOptions(syl ? pickChoices(syl, hasItem, rng.current) : []);
      }
      setTimeout(() => audio.play(itemId), 60);
    },
    [audio, id],
  );

  useEffect(() => {
    if (phase !== 'run') return;
    if (timeLeft <= 0) {
      recordTurbo(id, scoreRef.current);
      setPhase('done');
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, id, recordTurbo]);

  const start = () => {
    scoreRef.current = 0;
    setScore(0);
    setPos(0);
    setTimeLeft(DURATION);
    setPhase('run');
    prep(poolRef.current[0]);
  };

  const answer = (correct: boolean) => {
    if (phase !== 'run') return;
    if (correct) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }
    setPos((p) => {
      const np = p + 1;
      prep(poolRef.current[np % poolRef.current.length]);
      return np;
    });
  };

  if (!level || poolRef.current.length === 0) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-2xl">אֵין טוּרְבּוֹ לַשָּׁלָב הַזֶּה</p>
        <button className="rounded-full bg-sky-600 px-6 py-3 text-white" onClick={() => navigate('/')}>חֲזָרָה</button>
      </main>
    );
  }

  if (phase === 'ready') {
    return (
      <main className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center" data-testid="turbo-ready">
        <div className="text-6xl">⚡</div>
        <h1 className="text-3xl font-bold text-sky-800">סִבּוּב טוּרְבּוֹ</h1>
        <p className="max-w-sm text-lg text-slate-600">{DURATION} שְׁנִיּוֹת — כַּמָּה שֶׁיּוֹתֵר נְכוֹנוֹת!</p>
        {best > 0 && <p className="text-base text-amber-700">שִׂיא: {best} ⭐</p>}
        <button data-testid="turbo-start" onClick={start} className="rounded-full bg-amber-400 px-10 py-4 text-2xl font-bold text-amber-950 shadow-lg transition active:scale-95 hover:bg-amber-300">
          יוֹצְאִים! ⚡
        </button>
        <button onClick={() => navigate('/')} className="text-sky-600 underline">חֲזָרָה לַמַּפָּה</button>
      </main>
    );
  }

  if (phase === 'done') {
    const isRecord = score >= best && score > 0;
    return (
      <main className="flex min-h-full flex-col items-center justify-center gap-5 p-6 text-center" data-testid="turbo-done">
        <div className="text-6xl">🏁</div>
        <h1 className="text-3xl font-bold text-sky-800">{score} נְכוֹנוֹת!</h1>
        {isRecord ? <p className="text-xl text-amber-700">שִׂיא אִישִׁי חָדָשׁ! 🎉</p> : <p className="text-lg text-slate-600">שִׂיא: {best} ⭐</p>}
        <div className="flex flex-col gap-3">
          <button onClick={start} className="rounded-full bg-amber-400 px-10 py-4 text-2xl font-bold text-amber-950 shadow-lg transition active:scale-95 hover:bg-amber-300">שׁוּב ⚡</button>
          <button data-testid="turbo-back" onClick={() => navigate('/')} className="rounded-full bg-white px-8 py-3 text-lg font-semibold text-sky-700 shadow ring-1 ring-sky-200">חֲזָרָה לַמַּפָּה 🗺️</button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex min-h-full w-full max-w-2xl flex-col p-4" data-testid="turbo">
      <div className="flex items-center justify-between text-lg font-bold">
        <span className="text-sky-700">{score} ⭐</span>
        <span className={`tabular-nums ${timeLeft <= 10 ? 'text-rose-500' : 'text-slate-600'}`}>⏱️ {timeLeft}</span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <SpeakerButton big onClick={() => curId && audio.play(curId)} />
        <div className={`grid w-full max-w-md gap-4 ${options.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {options.map((cardId) => {
            const it = getItem(cardId);
            if (!it) return null;
            return (
              <button
                key={cardId}
                onClick={() => answer(cardId === curId)}
                className="flex min-h-[96px] items-center justify-center rounded-3xl bg-white p-4 shadow ring-2 ring-sky-200 transition active:scale-95"
              >
                <span className="font-hebrew text-5xl font-bold leading-niqqud text-slate-800" dir="rtl">{it.display}</span>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
