interface CompanionProps {
  /** Bob happily (e.g. after a correct answer). */
  cheer?: boolean;
  className?: string;
}

/**
 * The learning companion — a small friendly owl (original art, no existing IP).
 * It climbs the ladder with every correct answer (PRD §5). Decorative.
 */
export function Companion({ cheer, className }: CompanionProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${cheer ? 'animate-bob' : ''} ${className ?? ''}`}
      role="img"
      aria-label="הַיַּנְשׁוּף"
    >
      {/* ears */}
      <path d="M28 24 L38 40 L20 38 Z" fill="#7c5cbf" />
      <path d="M72 24 L62 40 L80 38 Z" fill="#7c5cbf" />
      {/* body */}
      <ellipse cx="50" cy="58" rx="34" ry="36" fill="#8b6fd0" />
      {/* belly */}
      <ellipse cx="50" cy="64" rx="22" ry="26" fill="#f4ead0" />
      {/* eyes */}
      <circle cx="39" cy="48" r="13" fill="#fff" />
      <circle cx="61" cy="48" r="13" fill="#fff" />
      <circle cx="41" cy="49" r="6" fill="#2b2140" />
      <circle cx="59" cy="49" r="6" fill="#2b2140" />
      <circle cx="43" cy="47" r="2" fill="#fff" />
      <circle cx="61" cy="47" r="2" fill="#fff" />
      {/* beak */}
      <path d="M50 56 L45 62 L55 62 Z" fill="#f5a524" />
      {/* feet */}
      <path d="M40 92 l-5 5 M40 92 l0 6 M40 92 l5 5" stroke="#f5a524" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M60 92 l-5 5 M60 92 l0 6 M60 92 l5 5" stroke="#f5a524" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
