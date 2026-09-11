import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { tint } from '../../lib/format';

/* Small pieces that repeat across every signed-in screen. Keeping them here
   is what makes a badge on the dashboard and a badge on the calendar the
   same object rather than two similar ones. */

/** Uppercase pill carrying a status colour. */
export function Badge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10.5px] px-2.5 py-1 rounded-full uppercase tracking-[0.12em] font-semibold"
      style={{ backgroundColor: tint(color, 12), color, border: `1px solid ${tint(color, 22)}` }}
    >
      {children}
    </span>
  );
}

/** An instrument readout: one number, its colour, and what it counts. */
export function Metric({
  label, value, sublabel, color, icon, onClick, index = 0,
}: {
  label: string;
  value: number | string;
  sublabel?: string;
  color: string;
  icon?: ReactNode;
  onClick?: () => void;
  index?: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.05, duration: 0.45, ease: [0.22, 1, 0.32, 1] }}
      whileHover={onClick ? { y: -4 } : undefined}
      className={[
        'relative overflow-hidden rounded-2xl p-5 text-left',
        'bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)]',
        'shadow-[var(--glass-edge)] transition-[border-color,box-shadow] duration-300',
        onClick ? 'cursor-pointer hover:border-[var(--border-strong)]' : 'cursor-default',
      ].join(' ')}
    >
      {/* A wash of the metric's own colour, so a row of tiles reads as a
          spectrum of states rather than five grey boxes. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.10] pointer-events-none"
        style={{ background: `radial-gradient(circle at 18% 0%, ${color}, transparent 62%)` }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />

      <div className="relative flex items-start justify-between mb-5">
        {icon && (
          <span
            className="w-9 h-9 rounded-xl grid place-items-center"
            style={{ backgroundColor: tint(color, 12), color }}
          >
            {icon}
          </span>
        )}
        <span className="text-[9.5px] uppercase tracking-[0.18em] text-[var(--text-tertiary)] text-right">
          {label}
        </span>
      </div>

      <div className="relative numeric text-[34px] leading-none font-semibold" style={{ color }}>
        {typeof value === 'number' ? String(value).padStart(2, '0') : value}
      </div>
      {sublabel && (
        <div className="relative text-[13px] text-[var(--text-secondary)] mt-1.5">{sublabel}</div>
      )}
    </motion.button>
  );
}

/** Section heading with an optional action on the right. */
export function SectionTitle({
  children, action,
}: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <h2 className="text-[17px] font-semibold tracking-[-0.02em]">{children}</h2>
      {action}
    </div>
  );
}

/** Empty state with room for an icon and one line of guidance. */
export function Empty({
  icon, title, body, action,
}: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] backdrop-blur-xl py-12 px-6 text-center">
      {icon && (
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl grid place-items-center bg-[var(--bg-elevated)] text-[var(--text-tertiary)]">
          {icon}
        </div>
      )}
      <p className="font-medium mb-1.5">{title}</p>
      {body && <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">{body}</p>}
      {action && <div className="flex justify-center gap-3 mt-5">{action}</div>}
    </div>
  );
}

/** Thin progress track used for course completion. */
export function Meter({ value, color }: { value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-1.5 rounded-full overflow-hidden bg-[var(--bg-sunken)]"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.32, 1] }}
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${tint(color, 55)}, ${color})` }}
      />
    </div>
  );
}
