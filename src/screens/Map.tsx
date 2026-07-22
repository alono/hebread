import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LEVELS } from '../content';
import type { Level } from '../content/types';
import { LOGO } from '../constants';
import { useStore } from '../store';
import { FAST } from '../ui/timing';
import { Companion } from '../components/Companion';

const PARENT_HOLD_MS = FAST ? 400 : 3000;

/** Home screen: the 12-station path (PRD §9). Shows progress and where the child is. */
export function Map() {
  const navigate = useNavigate();
  const levels = useStore((s) => s.levels);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const record = (id: number) => levels[id] ?? { stars: 0, roundsPlayed: 0, completed: false, fastTrack: false };
  const currentId = LEVELS.find((l) => !record(l.id).completed)?.id ?? LEVELS[LEVELS.length - 1].id;

  const startLevel = (level: Level) =>
    navigate(level.exerciseTypes.includes('readAloud') ? `/read/${level.id}` : `/play/${level.id}`);

  // Parent mode is gated behind a 3-second long-press so kids don't wander in.
  const startPress = () => {
    pressTimer.current = setTimeout(() => navigate('/parent'), PARENT_HOLD_MS);
  };
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  return (
    <main className="mx-auto flex min-h-full w-full max-w-xl flex-col items-center gap-6 p-5">
      <header className="relative flex w-full flex-col items-center gap-1 pt-2 text-center">
        <button
          type="button"
          data-testid="parent-gate"
          onPointerDown={startPress}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="מָסָךְ הוֹרֶה (לְחִיצָה אֲרֻכָּה)"
          className="absolute left-0 top-2 rounded-full bg-white/70 px-3 py-2 text-lg shadow-sm ring-1 ring-sky-200"
        >
          ⚙️
        </button>
        <h1 className="font-hebrew text-4xl font-bold leading-niqqud text-sky-900" data-testid="logo">
          {LOGO}
        </h1>
        <p className="text-base text-slate-600">מַפַּת הַשְּׁלַבִּים</p>
      </header>

      <ol className="relative flex w-full flex-col gap-3" data-testid="level-map">
        {/* connecting path */}
        <span className="pointer-events-none absolute inset-y-4 left-1/2 -z-10 w-1 -translate-x-1/2 rounded bg-sky-200" aria-hidden="true" />
        {LEVELS.map((level) => {
          const rec = record(level.id);
          const playable = level.itemIds.length > 0;
          const isCurrent = level.id === currentId;
          return (
            <li
              key={level.id}
              data-testid={`level-${level.id}-station`}
              data-playable={String(playable)}
              data-completed={String(rec.completed)}
              data-fasttrack={String(rec.fastTrack)}
              data-current={String(isCurrent)}
              data-rounds={rec.roundsPlayed}
              data-stars={rec.stars}
              className={`flex items-center gap-4 rounded-3xl p-3 ring-1 transition ${
                playable ? 'bg-white shadow-sm ring-sky-100' : 'bg-white/50 ring-slate-100'
              } ${isCurrent ? 'ring-2 ring-amber-300' : ''}`}
            >
              <div className="relative">
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl ${
                    rec.completed ? 'bg-emerald-100' : playable ? 'bg-sky-100' : 'bg-slate-100 opacity-60'
                  }`}
                >
                  <span aria-hidden="true">{level.icon}</span>
                </div>
                {rec.completed && (
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-xs text-white shadow">
                    {rec.fastTrack ? '⚡' : '✓'}
                  </span>
                )}
                {isCurrent && playable && <Companion className="absolute -bottom-3 -left-4 h-9 w-9 drop-shadow" />}
              </div>

              <div className="flex flex-1 flex-col">
                <span className="text-xs text-slate-600">שָׁלָב {level.id}</span>
                <bdi className="font-hebrew text-lg font-bold leading-tight text-slate-800">{level.name}</bdi>
                {playable ? (
                  <span className="text-sm text-amber-500" aria-label={`${rec.stars} כוכבים`}>
                    {[1, 2, 3].map((n) => (
                      <span key={n} className={n <= rec.stars ? '' : 'opacity-25 grayscale'}>⭐</span>
                    ))}
                  </span>
                ) : (
                  <span className="text-sm text-slate-600">בְּקָרוֹב…</span>
                )}
              </div>

              {playable && (
                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    type="button"
                    data-testid={`level-${level.id}-play`}
                    onClick={() => startLevel(level)}
                    className="rounded-full bg-amber-400 px-5 py-2 font-bold text-amber-950 shadow transition active:scale-95 hover:bg-amber-300"
                  >
                    {level.exerciseTypes.includes('readAloud') ? 'קְרָא 📖' : 'שַׂחֵק ▶'}
                  </button>
                  {!rec.completed && (
                    <button
                      type="button"
                      data-testid={`level-${level.id}-skip`}
                      onClick={() => navigate(`/skip/${level.id}`)}
                      className="rounded-full bg-white px-5 py-1.5 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 transition active:scale-95 hover:bg-amber-50"
                    >
                      ⚡ אֲנִי יוֹדֵעַ
                    </button>
                  )}
                  {rec.completed && (
                    <button
                      type="button"
                      data-testid={`level-${level.id}-turbo`}
                      onClick={() => navigate(`/turbo/${level.id}`)}
                      className="rounded-full bg-white px-5 py-1.5 text-sm font-semibold text-fuchsia-700 ring-1 ring-fuchsia-200 transition active:scale-95 hover:bg-fuchsia-50"
                    >
                      ⚡ טוּרְבּוֹ
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
