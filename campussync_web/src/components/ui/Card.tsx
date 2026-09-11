import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  /**
   * `glass` is the default surface of this design — it lets the 3D scene
   * through. `solid` is for anything with dense small text that has to stay
   * legible no matter what the scene does behind it. `accent` marks a single
   * card that needs to pull rank.
   */
  variant?: 'glass' | 'solid' | 'elevated' | 'accent' | 'default' | 'gradient';
  hover?: boolean;
  /** Adds a coloured light along the top edge — used to carry status colour. */
  edge?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const VARIANTS: Record<NonNullable<CardProps['variant']>, string> = {
  glass:
    'bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] ' +
    'shadow-[var(--glass-edge)]',
  solid:
    'bg-[color-mix(in_srgb,var(--bg-primary)_86%,transparent)] backdrop-blur-2xl ' +
    'border border-[var(--border-color)]',
  elevated:
    'bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--border-strong)] ' +
    'shadow-[var(--glass-edge),var(--shadow-lg)]',
  accent:
    'bg-[linear-gradient(140deg,rgba(124,108,255,0.16),rgba(52,224,255,0.07)_58%,transparent)] ' +
    'backdrop-blur-2xl border border-[rgba(124,108,255,0.28)] ' +
    'shadow-[var(--glass-edge)]',
  // Kept so older call sites keep rendering; both map onto the new surfaces.
  default: 'bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)]',
  gradient:
    'bg-[linear-gradient(140deg,rgba(124,108,255,0.16),rgba(52,224,255,0.07)_58%,transparent)] ' +
    'backdrop-blur-2xl border border-[rgba(124,108,255,0.28)]',
};

const PADDING = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-7' };

export default function Card({
  children,
  className = '',
  variant = 'glass',
  hover = false,
  edge,
  padding = 'md',
  onClick,
}: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -4 } : undefined}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      onClick={onClick}
      className={[
        'relative rounded-2xl overflow-hidden',
        'transition-[border-color,box-shadow] duration-300',
        VARIANTS[variant],
        PADDING[padding],
        hover ? 'cursor-pointer hover:border-[var(--border-strong)] hover:shadow-[var(--glass-edge),var(--shadow-lg)]' : '',
        className,
      ].join(' ')}
    >
      {edge && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${edge}, transparent)` }}
        />
      )}
      {children}
    </motion.div>
  );
}
