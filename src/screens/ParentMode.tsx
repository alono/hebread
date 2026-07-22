import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LEVELS } from '../content';
import { useStore } from '../store';
import { masteredFraction } from '../game/progress';

const iso = (d: Date) => d.toISOString().slice(0, 10);

function computeStreak(activity: Record<string, number>): number {
  const d = new Date();
  if (!(activity[iso(d)] > 0)) d.setDate(d.getDate() - 1); // today not required yet
  let streak = 0;
  while (activity[iso(d)] > 0) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function weeklySeconds(activity: Record<string, number>): number {
  const d = new Date();
  let total = 0;
  for (let i = 0; i < 7; i++) {
    total += activity[iso(d)] ?? 0;
    d.setDate(d.getDate() - 1);
  }
  return total;
}

/** Parent dashboard (PRD §9): progress per level, streak, practice time, reset, export/import. */
export function ParentMode() {
  const navigate = useNavigate();
  const items = useStore((s) => s.items);
  const levelsRec = useStore((s) => s.levels);
  const turboBest = useStore((s) => s.turboBest);
  const activity = useStore((s) => s.activity);
  const resetProgress = useStore((s) => s.resetProgress);
  const importState = useStore((s) => s.importState);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const getP = (id: string) => items[id];
  const streak = computeStreak(activity);
  const weekMin = Math.round(weeklySeconds(activity) / 60);

  const exportProgress = () => {
    const data = JSON.stringify(
      { schemaVersion: 1, items, levels: levelsRec, turboBest, activity },
      null,
      2,
    );
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hebread-progress.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importProgress = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      importState(data);
      setImportMsg('הַיִּבּוּא הִצְלִיחַ ✓');
    } catch {
      setImportMsg('הַקּוֹבֶץ אֵינוֹ תָּקִין ✗');
    }
  };

  return (
    <main dir="rtl" className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-6 p-5" data-testid="parent">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-sky-900">מָסָךְ הוֹרֶה</h1>
        <button onClick={() => navigate('/')} className="rounded-full bg-white px-4 py-2 text-sky-700 shadow ring-1 ring-sky-200">סְגֹר ✕</button>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow ring-1 ring-sky-100">
          <div className="text-3xl font-bold text-amber-500">{streak} 🌞</div>
          <div className="text-sm text-slate-600">רֶצֶף יָמִים</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow ring-1 ring-sky-100">
          <div className="text-3xl font-bold text-sky-600 tabular-nums">{weekMin}′</div>
          <div className="text-sm text-slate-600">תִּרְגּוּל הַשָּׁבוּעַ</div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow ring-1 ring-sky-100">
        <h2 className="mb-3 text-lg font-bold text-slate-700">הִתְקַדְּמוּת לְפִי שָׁלָב</h2>
        <ul className="flex flex-col gap-2" data-testid="parent-levels">
          {LEVELS.map((level) => {
            const rec = levelsRec[level.id];
            const frac = level.itemIds.length ? masteredFraction(level.itemIds, getP) : 0;
            const best = turboBest[level.id] ?? 0;
            return (
              <li key={level.id} className="flex items-center gap-3">
                <span className="w-6 text-center text-sm text-slate-600 tabular-nums">{level.id}</span>
                <span className="text-xl" aria-hidden="true">{level.icon}</span>
                <bdi className="flex-1 text-sm font-semibold text-slate-700">{level.name}</bdi>
                <div className="h-2.5 w-24 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.round(frac * 100)}%` }} />
                </div>
                <span className="w-16 text-right text-xs text-amber-500">
                  {rec?.completed ? (rec.fastTrack ? '⚡' : '✓') : ''}
                  {'⭐'.repeat(rec?.stars ?? 0)}
                </span>
                {best > 0 && <span className="text-[10px] text-fuchsia-700">טוּרְבּוֹ {best}</span>}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex gap-3">
          <button data-testid="export" onClick={exportProgress} className="flex-1 rounded-2xl bg-sky-600 px-4 py-3 font-semibold text-white shadow transition active:scale-95">
            יְצוּא הִתְקַדְּמוּת 📤
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex-1 rounded-2xl bg-white px-4 py-3 font-semibold text-sky-700 shadow ring-1 ring-sky-200 transition active:scale-95">
            יִבּוּא 📥
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importProgress(e.target.files[0])}
          />
        </div>
        {importMsg && <p className="text-center text-sm text-slate-600">{importMsg}</p>}

        {confirmReset ? (
          <div className="flex flex-col gap-2 rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-200">
            <p className="text-center text-sm text-rose-700">לְאַפֵּס אֶת כָּל הַהִתְקַדְּמוּת? לֹא נִתָּן לְבַטֵּל.</p>
            <div className="flex gap-3">
              <button data-testid="reset-confirm" onClick={() => { resetProgress(); setConfirmReset(false); }} className="flex-1 rounded-2xl bg-rose-500 px-4 py-3 font-semibold text-white active:scale-95">כֵּן, אַפֵּס</button>
              <button onClick={() => setConfirmReset(false)} className="flex-1 rounded-2xl bg-white px-4 py-3 font-semibold text-slate-600 ring-1 ring-slate-200 active:scale-95">בִּטּוּל</button>
            </div>
          </div>
        ) : (
          <button data-testid="reset" onClick={() => setConfirmReset(true)} className="rounded-2xl bg-white px-4 py-3 font-semibold text-rose-600 shadow ring-1 ring-rose-200 transition active:scale-95">
            אִפּוּס הִתְקַדְּמוּת
          </button>
        )}
      </section>
    </main>
  );
}
