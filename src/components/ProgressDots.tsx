interface ProgressDotsProps {
  total: number;
  done: number;
}

/** Round progress as filled/empty dots (PRD §9: ●●●○○). */
export function ProgressDots({ total, done }: ProgressDotsProps) {
  return (
    <div className="flex items-center justify-center gap-2" aria-label={`${done} מתוך ${total}`} data-testid="progress-dots">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-3 w-3 rounded-full transition-colors ${i < done ? 'bg-emerald-400' : 'bg-slate-300/70'}`}
        />
      ))}
    </div>
  );
}
