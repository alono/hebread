interface SpeakerButtonProps {
  onClick: () => void;
  /** Larger, primary presentation for the main "listen" prompt. */
  big?: boolean;
  label?: string;
}

/** The universal 🔊 replay control (PRD §6.4 — every screen can re-speak). */
export function SpeakerButton({ onClick, big, label = 'שְׁמַע שׁוּב' }: SpeakerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-testid="speaker"
      className={`inline-flex items-center justify-center rounded-full bg-white text-sky-700 shadow-md ring-1 ring-sky-200 transition active:scale-95 hover:bg-sky-50 ${
        big ? 'h-28 w-28 text-6xl' : 'h-16 w-16 text-3xl'
      }`}
    >
      <span aria-hidden="true">🔊</span>
    </button>
  );
}
