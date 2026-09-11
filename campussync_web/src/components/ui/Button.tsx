import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  /**
   * `primary` is the gradient action — one per view.
   * `secondary` is glass, for anything that sits over the 3D scene.
   * `ghost` disappears until hovered; `outline` is the quiet confirm;
   * `danger` is destructive only.
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  /** Accessible name, for icon-only buttons where the label is visual. */
  ariaLabel?: string;
  title?: string;
  type?: 'button' | 'submit';
}

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  // The gradient sits on a pseudo-less stack: a base gradient plus an inset
  // top highlight, which is what stops it looking like a flat coloured box
  // once there is a moving 3D scene behind everything.
  primary:
    'text-white bg-[image:var(--gradient-action)] ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_24px_rgba(124,108,255,0.34)] ' +
    'hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_12px_34px_rgba(124,108,255,0.5)] ' +
    'hover:-translate-y-px',
  secondary:
    'text-[var(--text-primary)] bg-[var(--glass-bg)] backdrop-blur-xl ' +
    'border border-[var(--glass-border)] shadow-[var(--glass-edge)] ' +
    'hover:bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]',
  ghost:
    'text-[var(--text-secondary)] hover:text-[var(--text-primary)] ' +
    'hover:bg-[var(--bg-surface)]',
  outline:
    'border border-[rgba(124,108,255,0.55)] text-[var(--color-accent)] ' +
    'hover:bg-[var(--color-accent)] hover:border-[var(--color-accent)] hover:text-white',
  danger:
    'border border-[rgba(255,92,122,0.45)] text-[var(--color-danger)] ' +
    'hover:bg-[var(--color-danger)] hover:border-[var(--color-danger)] hover:text-white',
};

const SIZES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3.5 py-2 text-[13px] rounded-xl gap-1.5',
  md: 'px-5 py-2.5 text-[14.5px] rounded-xl gap-2',
  lg: 'px-7 py-3.5 text-[15.5px] rounded-2xl gap-2.5',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  disabled = false,
  icon,
  iconPosition = 'right',
  ariaLabel,
  title,
  type = 'button',
}: ButtonProps) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.015 }}
      whileTap={disabled ? undefined : { scale: 0.975 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className={[
        'font-medium inline-flex items-center justify-center whitespace-nowrap',
        'transition-[background,border-color,box-shadow,color,transform] duration-200',
        VARIANTS[variant],
        SIZES[size],
        disabled ? 'opacity-45 cursor-not-allowed pointer-events-none' : '',
        className,
      ].join(' ')}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      type={type}
    >
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
    </motion.button>
  );
}
