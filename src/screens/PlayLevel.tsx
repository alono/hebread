import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getItem, getLevel, getSyllable, hasItem, isWord, levelItemIds, WORDS_BY_LEVEL } from '../content';
import { useStore } from '../store';
import { useAudio } from '../hooks/useAudio';
import { buildQueue } from '../game/queue';
import { pickChoices } from '../game/choices';
import { wordExerciseType } from '../game/exerciseDispatch';
import { mulberry32 } from '../game/rng';
import {
  answer,
  currentId,
  isFirstAttempt,
  progressCounts,
  roundStars,
  type RoundState,
  startRound,
} from '../game/round';
import { CORRECT_DELAY, FAST, WRONG_DELAY } from '../ui/timing';
import { Ladder } from '../components/Ladder';
import { Confetti } from '../components/Confetti';
import { ProgressDots } from '../components/ProgressDots';
import { SpeakerButton } from '../components/SpeakerButton';
import { SyllableCard, type CardState } from '../components/SyllableCard';
import { BuildWord, type ExerciseResult } from '../components/exercises/BuildWord';
import { WordToPic } from '../components/exercises/WordToPic';

type Phase = 'intro' | 'round' | 'summary';
type Feedback = { kind: 'correct' | 'wrong'; tappedId: string } | null;

export function PlayLevel() {
  const { levelId } = useParams();
  const id = Number(levelId);
  const level = getLevel(id);
  const navigate = useNavigate();
  const audio = useAudio();
  const recordAnswer = useStore((s) => s.recordAnswer);
  const finishRound = useStore((s) => s.finishRound);

  const rng = useRef(mulberry32(FAST ? 20260721 : (Date.now() >>> 0) || 1));

  const makeRound = useCallback((): RoundState => {
    // The level's own items are the ~70% "new" share; earlier levels enter only
    // through the ~30% review share (cumulative mixing, PRD §4/§10).
    const own = getLevel(id)?.itemIds ?? [];
    const ownSet = new Set(own);
    const mixIds = levelItemIds(id).filter((itemId) => !ownSet.has(itemId));
    const ids = buildQueue(own, (itemId) => useStore.getState().items[itemId], { mixIds }, rng.current);
    return startRound(ids);
  }, [id]);

  const [round, setRound] = useState<RoundState>(makeRound);
  const [phase, setPhase] = useState<Phase>('intro');
  const [choices, setChoices] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [locked, setLocked] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [stars, setStars] = useState(0);

  const cur = currentId(round);
  const curItem = cur ? getItem(cur) : undefined;
  const introItem = useMemo(() => getItem(round.queue[0] ?? ''), [round.queue]);

  const prepChoices = useCallback((itemId: string | undefined) => {
    const syl = itemId ? getSyllable(itemId) : undefined;
    setChoices(syl ? pickChoices(syl, hasItem, rng.current) : []);
  }, []);

  useEffect(() => {
    if (phase !== 'round' || !cur) return;
    audio.preload([cur, ...choices]);
    const t = setTimeout(() => audio.play(cur), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, phase]);

  const startPlaying = () => {
    prepChoices(cur);
    setPhase('round');
  };

  // Shared resolution: record the answer, advance the queue (or finish).
  const advance = useCallback(
    (correct: boolean, clean: boolean) => {
      const activeId = currentId(round);
      if (!activeId) return;
      const firstTry = isFirstAttempt(round) && clean;
      recordAnswer(activeId, correct, firstTry);
      const next = answer(round, correct);
      if (next.done) {
        const earned = roundStars(next);
        setStars(earned);
        finishRound(id, earned, next.fastTracked);
        setRound(next);
        setConfetti((c) => c + 1);
        setPhase('summary');
      } else {
        setRound(next);
        prepChoices(currentId(next));
      }
    },
    [round, recordAnswer, finishRound, id, prepChoices],
  );

  const handleCardTap = (cardId: string) => {
    if (phase !== 'round' || locked || !cur) return;
    const isCorrect = cardId === cur;
    setLocked(true);
    setFeedback({ kind: isCorrect ? 'correct' : 'wrong', tappedId: cardId });
    if (isCorrect) setConfetti((c) => c + 1);
    else audio.play(cur);
    setTimeout(() => {
      setFeedback(null);
      setLocked(false);
      advance(isCorrect, isCorrect);
    }, isCorrect ? CORRECT_DELAY : WRONG_DELAY);
  };

  const onWordResult = (r: ExerciseResult) => {
    if (r.correct) setConfetti((c) => c + 1);
    advance(r.correct, r.clean);
  };

  const playAgain = () => {
    const fresh = makeRound();
    setStars(0);
    setFeedback(null);
    setLocked(false);
    setRound(fresh);
    prepChoices(currentId(fresh));
    setPhase('round');
  };

  if (!level) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-2xl">הַשָּׁלָב לֹא נִמְצָא</p>
        <button className="rounded-full bg-sky-600 px-6 py-3 text-white" onClick={() => navigate('/')}>חֲזָרָה</button>
      </main>
    );
  }

  const { answered, total } = progressCounts(round);

  const cardState = (cardId: string): CardState => {
    if (!feedback) return 'idle';
    if (feedback.kind === 'correct') return cardId === feedback.tappedId ? 'correct' : 'idle';
    if (cardId === feedback.tappedId) return 'wrong';
    if (cardId === cur) return 'reveal';
    return 'idle';
  };

  // ---- intro (seeHear) -----------------------------------------------------
  if (phase === 'intro') {
    return (
      <main className="relative flex min-h-full flex-col items-center justify-center gap-8 p-6 text-center" data-testid="intro">
        <p className="text-xl text-sky-800">שָׁלָב {level.id} · <bdi className="font-bold">{level.name}</bdi></p>
        <button
          type="button"
          data-testid="intro-sound"
          onClick={() => introItem && audio.play(introItem.id)}
          className="flex h-52 w-52 items-center justify-center rounded-[2.5rem] bg-white shadow-xl ring-2 ring-sky-200 transition active:scale-95"
          aria-label="הַקְשֵׁב לַצְּלִיל"
        >
          <span className="font-hebrew leading-niqqud text-7xl font-bold text-slate-800" dir="rtl">{introItem?.display}</span>
        </button>
        <p className="text-lg text-slate-600">הַקִּישׁוּ כְּדֵי לִשְׁמֹעַ 🔊</p>
        <button
          type="button"
          data-testid="intro-start"
          onClick={startPlaying}
          className="rounded-full bg-amber-400 px-10 py-4 text-2xl font-bold text-amber-950 shadow-lg transition active:scale-95 hover:bg-amber-300"
        >
          בּוֹאוּ נַתְחִיל!
        </button>
      </main>
    );
  }

  // ---- summary -------------------------------------------------------------
  if (phase === 'summary') {
    return (
      <main className="relative flex min-h-full flex-col items-center justify-center gap-8 p-6 text-center" data-testid="summary" data-stars={stars}>
        <Confetti burst={confetti} />
        <h1 className="text-3xl font-bold text-sky-800">כָּל הַכָּבוֹד! 🎉</h1>
        <div className="flex gap-3 text-6xl" aria-label={`${stars} כּוֹכָבִים`}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= stars ? '' : 'opacity-25 grayscale'}>⭐</span>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <button type="button" data-testid="again" onClick={playAgain} className="rounded-full bg-amber-400 px-10 py-4 text-2xl font-bold text-amber-950 shadow-lg transition active:scale-95 hover:bg-amber-300">
            עוֹד סִבּוּב 🔁
          </button>
          <button type="button" data-testid="to-map" onClick={() => navigate('/')} className="rounded-full bg-white px-8 py-3 text-lg font-semibold text-sky-700 shadow ring-1 ring-sky-200 transition active:scale-95">
            חֲזָרָה לַמַּפָּה 🗺️
          </button>
        </div>
      </main>
    );
  }

  // ---- round ---------------------------------------------------------------
  const wordItem = isWord(curItem) ? curItem : undefined;
  const wordIndex = wordItem ? (WORDS_BY_LEVEL[id] ?? []).findIndex((w) => w.id === wordItem.id) : -1;
  const wordEx = wordItem ? wordExerciseType(level.exerciseTypes, wordItem, wordIndex < 0 ? 0 : wordIndex) : null;

  return (
    <main
      className="relative mx-auto flex min-h-full w-full max-w-2xl flex-col p-4"
      data-testid="round"
      data-current-id={cur ?? ''}
      data-answered={answered}
      data-total={total}
    >
      <Confetti burst={confetti} />
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => navigate('/')} aria-label="חֲזָרָה לַמַּפָּה" className="rounded-full bg-white/70 px-3 py-2 text-lg shadow-sm ring-1 ring-sky-200">🗺️</button>
        <p className="text-sm font-semibold text-sky-700">שָׁלָב {level.id} · <bdi>{level.name}</bdi></p>
      </div>

      <div className="flex flex-1 items-stretch gap-3">
        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          {wordItem && wordEx === 'buildWord' && (
            <BuildWord key={wordItem.id} word={wordItem} onResult={onWordResult} onReplay={() => cur && audio.play(cur)} />
          )}
          {wordItem && wordEx === 'wordToPic' && (
            <WordToPic key={wordItem.id} word={wordItem} onResult={onWordResult} onReplay={() => cur && audio.play(cur)} />
          )}
          {!wordItem && (
            <>
              <div className="flex flex-col items-center gap-3">
                <SpeakerButton big onClick={() => cur && audio.play(cur)} label="שְׁמַע אֶת הַצְּלִיל" />
                <p className="text-base text-slate-600">אֵיזֶה כַּרְטִיס שָׁמַעְתָּ?</p>
              </div>
              <div className={`grid w-full max-w-md gap-4 ${choices.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {choices.map((cardId) => {
                  const syl = getSyllable(cardId);
                  if (!syl) return null;
                  return (
                    <SyllableCard
                      key={cardId}
                      id={cardId}
                      display={syl.display}
                      isCorrectChoice={cardId === cur}
                      state={cardState(cardId)}
                      disabled={locked}
                      onTap={() => handleCardTap(cardId)}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>

        <Ladder progress={total ? answered / total : 0} cheer={feedback?.kind === 'correct'} />
      </div>

      <div className="pt-4">
        <ProgressDots total={total} done={answered} />
      </div>
    </main>
  );
}
