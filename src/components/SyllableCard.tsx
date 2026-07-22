export type CardState = 'idle' | 'correct' | 'wrong' | 'reveal';

interface SyllableCardProps {
  id: string;
  display: string;
  isCorrectChoice: boolean;
  state: CardState;
  disabled?: boolean;
  onTap: () => void;
}

const STATE_CLASS: Record<CardState, string> = {
  idle: 'bg-white ring-slate-200 hover:ring-sky-300 hover:-translate-y-0.5',
  correct: 'bg-emerald-50 ring-emerald-400 animate-pop',
  wrong: 'bg-rose-50 ring-rose-400 animate-shake',
  reveal: 'bg-emerald-50 ring-emerald-400 animate-flash',
};

/** A giant tappable answer card (PRD §5.1, §7 — huge glyph, ≥64px target). */
export function SyllableCard({ id, display, isCorrectChoice, state, disabled, onTap }: SyllableCardProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      disabled={disabled}
      data-testid="answer"
      data-id={id}
      data-correct={String(isCorrectChoice)}
      data-state={state}
      className={`flex min-h-[112px] items-center justify-center rounded-3xl p-4 shadow-md ring-2 transition disabled:cursor-default ${STATE_CLASS[state]}`}
    >
      <span className="font-hebrew leading-niqqud text-6xl font-bold text-slate-800 sm:text-7xl" dir="rtl">
        {display}
      </span>
    </button>
  );
}
