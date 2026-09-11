import { AlertTriangle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from './Button';
import Card from './Card';

interface DataStateProps {
  loading: boolean;
  error: string | null;
  /** True when the request succeeded but there is genuinely nothing to show. */
  empty?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
  /** Roughly how many rows this page shows, so the skeleton matches it. */
  skeletonRows?: number;
  onRetry?: () => void;
}

/**
 * One place for the three states every data screen has. Without this a failed
 * request looks identical to "you have no assignments", which is how a broken
 * backend ends up looking like an empty term.
 */
export default function DataState({
  loading, error, empty, emptyMessage = 'Nothing here yet.',
  loadingMessage = 'Loading…', skeletonRows = 3, onRetry,
}: DataStateProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 text-[var(--text-secondary)] text-sm mb-4">
          <Loader2 size={16} className="animate-spin text-[var(--color-accent)]" />
          {loadingMessage}
        </div>
        {/* Skeletons in the shape of the real rows, so the page does not jump
            when the data lands. */}
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.06 }}
            className="skeleton h-24 rounded-2xl"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card variant="glass" padding="lg" edge="var(--color-danger)" className="text-center">
        <div className="w-11 h-11 mx-auto mb-4 rounded-xl grid place-items-center bg-[rgba(255,92,122,0.12)] text-[var(--color-danger)]">
          <AlertTriangle size={20} />
        </div>
        <p className="font-medium mb-1.5">Could not load this</p>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto mb-5">{error}</p>
        {onRetry && (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => onRetry()}>Try again</Button>
          </div>
        )}
      </Card>
    );
  }

  if (empty) {
    return (
      <Card variant="glass" padding="lg" className="py-12 text-center">
        <p className="text-[var(--text-secondary)]">{emptyMessage}</p>
      </Card>
    );
  }

  return null;
}
