import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

/**
 * The one dialog in the app. It sits above the 3D stage and dims it hard —
 * a modal is the only moment where the scene should stop competing entirely.
 */
export default function Modal({ title, subtitle, icon, onClose, children, width = 460 }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    // Stop the page behind the dialog scrolling under it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[rgba(2,3,8,0.72)] backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 14 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0, y: 8 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.32, 1] }}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: width }}
        className="panel-opaque w-full rounded-[26px] p-6 shadow-[var(--glass-edge),var(--shadow-xl)] max-h-[90svh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex items-start gap-3.5 mb-5">
          {icon && (
            <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0 bg-[rgba(124,108,255,0.14)] text-[var(--color-accent)]">
              {icon}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-[19px] font-semibold tracking-[-0.025em]">{title}</h3>
            {subtitle && <p className="text-[13px] text-[var(--text-secondary)] mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shell__icon-btn shrink-0"
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

/** Shared input styling, so a select on one screen matches a text field on
 *  another instead of each dialog inventing its own. */
export const fieldClass =
  'w-full px-4 py-3 rounded-xl bg-[var(--bg-sunken)] border border-[var(--border-color)] ' +
  'text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] ' +
  'transition-[border-color,background,box-shadow] duration-200 focus:outline-none ' +
  'focus:border-[rgba(124,108,255,0.6)] focus:bg-[var(--bg-surface)] ' +
  'focus:shadow-[0_0_0_4px_rgba(124,108,255,0.12)]';

export function Label({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)] mb-2.5"
    >
      {children}
    </label>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-sm bg-[rgba(255,92,122,0.1)] border border-[rgba(255,92,122,0.25)] text-[var(--color-danger)]">
      <span className="shrink-0 mt-0.5">⚠</span>
      <span>{children}</span>
    </div>
  );
}
