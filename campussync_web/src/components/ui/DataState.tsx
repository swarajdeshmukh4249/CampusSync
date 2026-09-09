import { AlertCircle, Loader2 } from 'lucide-react';
import Button from './Button';
import Card from './Card';

interface DataStateProps {
  loading: boolean;
  error: string | null;
  /** True when the request succeeded but there is genuinely nothing to show. */
  empty?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
  onRetry?: () => void;
}

/**
 * One place for the three states every data screen has. Without this a failed
 * request looks identical to "you have no assignments", which is how a broken
 * backend ends up looking like an empty term.
 */
export default function DataState({
  loading, error, empty, emptyMessage = 'Nothing here yet.',
  loadingMessage = 'Loading…', onRetry,
}: DataStateProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--text-secondary)]">
        <Loader2 size={28} className="animate-spin text-[var(--color-accent)]" />
        <p className="text-sm">{loadingMessage}</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card variant="glass" className="py-10 text-center">
        <AlertCircle size={32} className="mx-auto mb-3 text-[var(--color-danger)]" />
        <p className="font-medium mb-1">Could not load this</p>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto mb-4">{error}</p>
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
      <Card variant="glass" className="py-12 text-center">
        <p className="text-[var(--text-secondary)]">{emptyMessage}</p>
      </Card>
    );
  }

  return null;
}
