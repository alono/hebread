import { useEffect, useState } from 'react';

interface ConfettiProps {
  /** Increment to fire a new burst. */
  burst: number;
}

const COLORS = ['#ff8fab', '#fff3c4', '#8b6fd0', '#5ec8a0', '#f5a524', '#7cc5ff'];

interface Piece {
  id: number;
  left: number;
  dx: number;
  rot: number;
  color: string;
  delay: number;
}

/** Lightweight one-shot confetti; auto-clears and honours prefers-reduced-motion. */
export function Confetti({ burst }: ConfettiProps) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (burst === 0) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const next: Piece[] = Array.from({ length: 22 }, (_, i) => ({
      id: burst * 100 + i,
      left: 50 + (Math.random() - 0.5) * 60,
      dx: (Math.random() - 0.5) * 160,
      rot: (Math.random() - 0.5) * 720,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 0.15,
    }));
    setPieces(next);
    const t = setTimeout(() => setPieces([]), 1200);
    return () => clearTimeout(t);
  }, [burst]);

  if (pieces.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece absolute top-1/3 h-2.5 w-2.5 rounded-sm"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            ['--dx' as string]: `${p.dx}px`,
            ['--rot' as string]: `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}
