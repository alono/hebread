import { Companion } from './Companion';

interface LadderProps {
  /** 0..1 — how far up the companion has climbed this round. */
  progress: number;
  cheer?: boolean;
}

/**
 * The signature climb: a ladder up the side of the round with the companion
 * standing on the rung matching progress (PRD §5, §9). Starts at the bottom.
 */
export function Ladder({ progress, cheer }: LadderProps) {
  const rungs = 6;
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <div className="flex w-16 shrink-0 flex-col self-stretch" aria-hidden="true">
      <div className="relative mx-auto min-h-[220px] w-8 flex-1">
        {/* rails */}
        <span className="absolute inset-y-0 left-0 w-1.5 rounded-full bg-amber-300/70" />
        <span className="absolute inset-y-0 right-0 w-1.5 rounded-full bg-amber-300/70" />
        {/* rungs */}
        {Array.from({ length: rungs }).map((_, i) => (
          <span
            key={i}
            className="absolute left-0 right-0 h-1.5 rounded-full bg-amber-300/70"
            style={{ bottom: `${(i / (rungs - 1)) * 100}%` }}
          />
        ))}
        {/* companion climbs from bottom (0) to top (1) */}
        <div
          className="climb-transition absolute left-1/2 -translate-x-1/2 translate-y-1/2 transition-[bottom] duration-500 ease-out"
          style={{ bottom: `${clamped * 100}%` }}
        >
          <Companion cheer={cheer} className="h-12 w-12 drop-shadow" />
        </div>
      </div>
    </div>
  );
}
