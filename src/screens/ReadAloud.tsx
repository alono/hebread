import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getLevel, getSentence, levelItemIds, PARAGRAPHS_BY_LEVEL } from '../content';
import type { Comprehension } from '../content/types';
import { useStore } from '../store';
import { useAudio } from '../hooks/useAudio';
import { mulberry32, shuffle } from '../game/rng';
import { FAST } from '../ui/timing';
import { Confetti } from '../components/Confetti';
import { SpeakerButton } from '../components/SpeakerButton';

type ReadStep = { kind: 'read'; ownerId: string; text: string; audioId: string };
type CompStep = { kind: 'comp'; ownerId: string; audioId: string; comp: Comprehension; optionAudio: (string | null)[] };
type Step = ReadStep | CompStep;

const HEB = /[א-ת]/;

/**
 * Read-aloud with parent approval (PRD §5.6, §6): the child reads each sentence
 * aloud, the parent marks ✓/✗, and a spoken comprehension question follows. This
 * is the bridge to real text (levels 9–12). Sentences (9–10) are scored per item;
 * a paragraph (11–12) is scored as a whole.
 */
export function ReadAloud() {
  const { levelId } = useParams();
  const id = Number(levelId);
  const level = getLevel(id);
  const navigate = useNavigate();
  const audio = useAudio();
  const recordAnswer = useStore((s) => s.recordAnswer);
  const finishRound = useStore((s) => s.finishRound);
  const logActivity = useStore((s) => s.logActivity);

  const rng = useRef(mulberry32(FAST ? 31337 : (Date.now() >>> 0) || 1));
  const startedAt = useRef(FAST ? 0 : Date.now());
  const isParagraph = !!PARAGRAPHS_BY_LEVEL[id];

  const { steps, ownerIds } = useMemo(() => {
    if (!level) return { steps: [] as Step[], ownerIds: [] as string[] };
    const built: Step[] = [];
    if (isParagraph) {
      const pool = PARAGRAPHS_BY_LEVEL[id] ?? [];
      const p = shuffle(pool, rng.current)[0];
      if (p) {
        p.sentences.forEach((text, i) => built.push({ kind: 'read', ownerId: p.id, text, audioId: `${p.id}::s${i}` }));
        p.comprehension.forEach((comp, ci) =>
          built.push({
            kind: 'comp',
            ownerId: p.id,
            audioId: `${p.id}::q${ci}`,
            comp,
            optionAudio: comp.options.map((o, i) => (HEB.test(o) ? `${p.id}::q${ci}opt${i}` : null)),
          }),
        );
      }
      return { steps: built, ownerIds: p ? [p.id] : [] };
    }
    // sentence levels: a handful of sentences, each read then (if any) its question
    const ids = shuffle(levelItemIds(id), rng.current).slice(0, 6);
    for (const sid of ids) {
      const s = getSentence(sid);
      if (!s) continue;
      built.push({ kind: 'read', ownerId: sid, text: s.display, audioId: sid });
      if (s.comprehension) {
        built.push({
          kind: 'comp',
          ownerId: sid,
          audioId: `${sid}::q`,
          comp: s.comprehension,
          optionAudio: s.comprehension.options.map((o, i) => (HEB.test(o) ? `${sid}::opt${i}` : null)),
        });
      }
    }
    return { steps: built, ownerIds: ids };
  }, [id, isParagraph, level]);

  const [index, setIndex] = useState(0);
  const [okById, setOkById] = useState<Record<string, boolean>>({});
  const [compResults, setCompResults] = useState<boolean[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [phase, setPhase] = useState<'run' | 'summary'>('run');
  const [stars, setStars] = useState(0);
  const [confetti, setConfetti] = useState(0);

  const step = steps[index];

  // Only comprehension QUESTIONS are spoken. The sentences themselves are never
  // read by the app — the CHILD reads them aloud and the parent approves; TTS
  // reading the text first would give the answer away.
  useEffect(() => {
    if (phase !== 'run' || !step || step.kind !== 'comp') return;
    const t = setTimeout(() => audio.play(step.audioId), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase]);

  const finish = (okMap: Record<string, boolean>, comps: boolean[]) => {
    const totalUnits = steps.length || 1;
    const good = Object.values(okMap).filter(Boolean).length + comps.filter(Boolean).length;
    const acc = good / totalUnits;
    const earned: 1 | 2 | 3 = acc >= 0.9 ? 3 : acc >= 0.6 ? 2 : 1;
    setStars(earned);
    setConfetti((c) => c + 1);
    // Record progress on the owner items.
    if (isParagraph) {
      const allOk = ownerIds.every((oid) => okMap[oid] !== false) && comps.every(Boolean);
      for (const oid of ownerIds) recordAnswer(oid, allOk, true);
    } else {
      for (const oid of ownerIds) recordAnswer(oid, okMap[oid] === true, true);
    }
    finishRound(id, earned);
    if (!FAST) logActivity(Math.round((Date.now() - startedAt.current) / 1000));
    setPhase('summary');
  };

  const advance = (nextOk: Record<string, boolean>, nextComps: boolean[]) => {
    if (index + 1 >= steps.length) finish(nextOk, nextComps);
    else {
      setIndex((i) => i + 1);
      setPicked(null);
    }
  };

  const markRead = (ok: boolean) => {
    if (!step || step.kind !== 'read') return;
    const nextOk = { ...okById, [step.ownerId]: okById[step.ownerId] === false ? false : ok };
    setOkById(nextOk);
    advance(nextOk, compResults);
  };

  const answerComp = (optionIndex: number) => {
    if (!step || step.kind !== 'comp' || picked !== null) return;
    setPicked(optionIndex);
    const correct = optionIndex === step.comp.correctIndex;
    const nextComps = [...compResults, correct];
    setCompResults(nextComps);
    setTimeout(() => advance(okById, nextComps), FAST ? 80 : 900);
  };

  if (!level || steps.length === 0) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-2xl">אֵין טֶקְסְט לַשָּׁלָב הַזֶּה</p>
        <button className="rounded-full bg-sky-600 px-6 py-3 text-white" onClick={() => navigate('/')}>חֲזָרָה</button>
      </main>
    );
  }

  if (phase === 'summary') {
    return (
      <main className="relative flex min-h-full flex-col items-center justify-center gap-8 p-6 text-center" data-testid="read-summary" data-stars={stars}>
        <Confetti burst={confetti} />
        <h1 className="text-3xl font-bold text-sky-800">קָרָאתָ יָפֶה! 🎉</h1>
        <div className="flex gap-3 text-6xl" aria-label={`${stars} כּוֹכָבִים`}>
          {[1, 2, 3].map((n) => (<span key={n} className={n <= stars ? '' : 'opacity-25 grayscale'}>⭐</span>))}
        </div>
        <button data-testid="read-to-map" onClick={() => navigate('/')} className="rounded-full bg-amber-400 px-10 py-4 text-2xl font-bold text-amber-950 shadow-lg transition active:scale-95 hover:bg-amber-300">
          חֲזָרָה לַמַּפָּה 🗺️
        </button>
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex min-h-full w-full max-w-2xl flex-col p-4" data-testid="readaloud" data-mode={isParagraph ? 'paragraph' : 'sentence'} data-step={index} data-total={steps.length}>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => navigate('/')} aria-label="חֲזָרָה" className="rounded-full bg-white/70 px-3 py-2 text-lg shadow-sm ring-1 ring-sky-200">🗺️</button>
        <p className="text-sm font-semibold text-sky-700">שָׁלָב {level.id} · <bdi>{level.name}</bdi></p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        {step.kind === 'read' ? (
          <>
            <p className="text-base text-slate-600">קִרְאוּ בְּקוֹל רָם, וְהַהוֹרֶה יְסַמֵּן</p>
            <p data-testid="read-sentence" className="max-w-xl text-center font-hebrew text-4xl font-bold leading-niqqud text-slate-800 sm:text-5xl" dir="rtl">
              {step.text}
            </p>
            <div className="flex gap-4">
              <button data-testid="mark-again" onClick={() => markRead(false)} className="flex h-20 w-24 items-center justify-center rounded-3xl bg-rose-50 text-4xl shadow ring-2 ring-rose-200 transition active:scale-95" aria-label="עוֹד תִּרְגּוּל">✗</button>
              <button data-testid="mark-ok" onClick={() => markRead(true)} className="flex h-20 w-24 items-center justify-center rounded-3xl bg-emerald-50 text-4xl shadow ring-2 ring-emerald-300 transition active:scale-95" aria-label="קָרָא נָכוֹן">✓</button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-6" data-testid="comprehension">
            <div className="flex items-center gap-3">
              <p className="font-hebrew text-2xl font-bold leading-niqqud text-sky-900" dir="rtl">{step.comp.question}</p>
              <SpeakerButton onClick={() => audio.play(step.audioId)} />
            </div>
            <div className={`grid gap-4 ${step.comp.options.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {step.comp.options.map((opt, i) => {
                const isCorrect = i === step.comp.correctIndex;
                const cls = picked === null ? 'ring-sky-200 hover:ring-sky-400'
                  : isCorrect ? 'ring-emerald-400 bg-emerald-50 animate-pop'
                  : i === picked ? 'ring-rose-400 bg-rose-50 animate-shake' : 'ring-slate-200 opacity-60';
                return (
                  <button
                    key={i}
                    data-testid="comp-option"
                    data-correct={String(isCorrect)}
                    disabled={picked !== null}
                    onClick={() => answerComp(i)}
                    aria-label={HEB.test(opt) ? undefined : 'תְּמוּנָה'}
                    className={`flex min-h-[88px] min-w-[88px] items-center justify-center rounded-3xl bg-white p-3 text-4xl shadow ring-2 transition active:scale-95 ${cls}`}
                  >
                    {HEB.test(opt) ? (
                      <span className="font-hebrew text-2xl font-bold leading-niqqud text-slate-800" dir="rtl">{opt}</span>
                    ) : (
                      <span aria-hidden="true">{opt}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-1.5 pt-4" aria-hidden="true">
        {steps.map((_, i) => (<span key={i} className={`h-2.5 w-2.5 rounded-full ${i <= index ? 'bg-emerald-400' : 'bg-slate-300/70'}`} />))}
      </div>
    </main>
  );
}
