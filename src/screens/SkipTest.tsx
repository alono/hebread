import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getItem, getLevel, getSyllable, hasItem, isWord, WORDS, WORDS_BY_LEVEL } from '../content';
import { useStore } from '../store';
import { useAudio } from '../hooks/useAudio';
import { pickChoices, pickWordChoices } from '../game/choices';
import { buildSkipTest, skipTestPassed } from '../game/promotion';
import { mulberry32 } from '../game/rng';
import { CORRECT_DELAY, FAST, WRONG_DELAY } from '../ui/timing';
import { Confetti } from '../components/Confetti';
import { ProgressDots } from '../components/ProgressDots';
import { SpeakerButton } from '../components/SpeakerButton';
import { SyllableCard, type CardState } from '../components/SyllableCard';

/**
 * Skip test (PRD §4): 10 random items from the level, one shot each, no re-queue.
 * 9/10 correct marks the level complete. Syllables use hear-and-pick; words use
 * word-to-picture recognition.
 */
export function SkipTest() {
  const { levelId } = useParams();
  const id = Number(levelId);
  const level = getLevel(id);
  const navigate = useNavigate();
  const audio = useAudio();
  const passSkipTest = useStore((s) => s.passSkipTest);

  const rng = useRef(mulberry32(FAST ? 424242 : (Date.now() >>> 0) || 1));
  const testIds = useMemo(() => (level ? buildSkipTest(level.itemIds, rng.current) : []), [level]);

  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ kind: 'correct' | 'wrong'; tappedId: string } | null>(null);
  const [locked, setLocked] = useState(false);
  const [done, setDone] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [started, setStarted] = useState(false);

  const cur = testIds[index];

  const prep = useCallback(
    (itemId: string | undefined) => {
      const item = itemId ? getItem(itemId) : undefined;
      if (isWord(item)) {
        setChoices(pickWordChoices(item, WORDS_BY_LEVEL[id] ?? WORDS, rng.current));
      } else {
        const syl = itemId ? getSyllable(itemId) : undefined;
        setChoices(syl ? pickChoices(syl, hasItem, rng.current) : []);
      }
      if (itemId) {
        audio.preload([itemId]);
        setTimeout(() => audio.play(itemId), 120);
      }
    },
    [audio, id],
  );

  const begin = () => {
    setStarted(true);
    prep(testIds[0]);
  };

  const passed = done && skipTestPassed(correctCount, testIds.length);

  const advanceSkip = (correct: boolean) => {
    const nextCorrect = correctCount + (correct ? 1 : 0);
    if (correct) setCorrectCount(nextCorrect);
    if (index + 1 >= testIds.length) {
      if (skipTestPassed(nextCorrect, testIds.length)) {
        passSkipTest(id);
        setConfetti((c) => c + 1);
      }
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      prep(testIds[index + 1]);
    }
  };

  const handleCardTap = (cardId: string) => {
    if (locked || !cur) return;
    const isCorrect = cardId === cur;
    setLocked(true);
    setFeedback({ kind: isCorrect ? 'correct' : 'wrong', tappedId: cardId });
    if (!isCorrect) audio.play(cur);
    setTimeout(() => {
      setFeedback(null);
      setLocked(false);
      advanceSkip(isCorrect);
    }, isCorrect ? CORRECT_DELAY : WRONG_DELAY);
  };

  const cardState = (cardId: string): CardState => {
    if (!feedback) return 'idle';
    if (feedback.kind === 'correct') return cardId === feedback.tappedId ? 'correct' : 'idle';
    if (cardId === feedback.tappedId) return 'wrong';
    if (cardId === cur) return 'reveal';
    return 'idle';
  };

  if (!level || testIds.length === 0) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-2xl">אֵין מִבְחָן לַשָּׁלָב הַזֶּה</p>
        <button className="rounded-full bg-sky-600 px-6 py-3 text-white" onClick={() => navigate('/')}>חֲזָרָה</button>
      </main>
    );
  }

  if (!started) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center" data-testid="skip-intro">
        <div className="text-6xl">⚡</div>
        <h1 className="text-3xl font-bold text-sky-800">אֲנִי כְּבָר יוֹדֵעַ!</h1>
        <p className="max-w-sm text-lg text-slate-600">
          {testIds.length} שְׁאֵלוֹת מִשָּׁלָב <bdi>{level.name}</bdi>. {skipThreshold(testIds.length)} נְכוֹנוֹת — וְאֶפְשָׁר לְדַלֵּג!
        </p>
        <button data-testid="skip-begin" onClick={begin} className="rounded-full bg-amber-400 px-10 py-4 text-2xl font-bold text-amber-950 shadow-lg transition active:scale-95 hover:bg-amber-300">
          מַתְחִילִים ⚡
        </button>
        <button data-testid="skip-cancel" onClick={() => navigate('/')} className="text-sky-600 underline">חֲזָרָה לַמַּפָּה</button>
      </main>
    );
  }

  if (done) {
    return (
      <main className="relative flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center" data-testid="skip-result" data-passed={String(passed)}>
        <Confetti burst={confetti} />
        <div className="text-6xl">{passed ? '⚡🎉' : '💪'}</div>
        <h1 className="text-3xl font-bold text-sky-800">{passed ? 'כָּל הַכָּבוֹד! דִּלַּגְתָּ עַל הַשָּׁלָב' : 'כִּמְעַט!'}</h1>
        <p className="text-xl text-slate-600">{correctCount}/{testIds.length}</p>
        <button data-testid="skip-done" onClick={() => navigate('/')} className="rounded-full bg-amber-400 px-10 py-4 text-2xl font-bold text-amber-950 shadow-lg transition active:scale-95 hover:bg-amber-300">
          {passed ? 'לַמַּפָּה 🗺️' : 'נִלְמַד יַחַד 📚'}
        </button>
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex min-h-full w-full max-w-2xl flex-col p-4" data-testid="skiptest" data-index={index} data-correct-count={correctCount}>
      <p className="text-center text-sm font-semibold text-amber-700">⚡ מִבְחָן קְפִיצָה · <bdi>{level.name}</bdi></p>
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <SpeakerButton big onClick={() => cur && audio.play(cur)} label="שְׁמַע" />
        <div className={`grid w-full max-w-md gap-4 ${choices.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {choices.map((cardId) => {
            const it = getItem(cardId);
            if (!it) return null;
            return (
              <SyllableCard
                key={cardId}
                id={cardId}
                display={it.display}
                isCorrectChoice={cardId === cur}
                state={cardState(cardId)}
                disabled={locked}
                onTap={() => handleCardTap(cardId)}
              />
            );
          })}
        </div>
      </div>
      <div className="pt-4">
        <ProgressDots total={testIds.length} done={index} />
      </div>
    </main>
  );
}

function skipThreshold(size: number): number {
  return size >= 10 ? 9 : Math.ceil(size * 0.9);
}
