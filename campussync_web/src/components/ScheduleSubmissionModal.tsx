import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CalendarClock, CheckCircle, Loader2, Paperclip, X } from 'lucide-react';
import Button from './ui/Button';
import { api } from '../api';
import type { Assignment } from '../api';
import { formatBytes, formatDateTime, toLocalInputValue } from '../lib/format';

interface Props {
  userId: number;
  assignment: Assignment;
  onClose: () => void;
  onScheduled: () => void;
}

/**
 * Hand a file to CampusSync now, and it signs into VOLP and submits at the
 * time you choose — including while you are asleep or in a lecture.
 */
export default function ScheduleSubmissionModal({ userId, assignment, onClose, onScheduled }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [when, setWhen] = useState(() => defaultWhen(assignment.due_date));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit = Boolean(file) && Boolean(when) && !busy;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !when) return;
    setBusy(true);
    setError(null);

    const form = new FormData();
    form.append('user_id', String(userId));
    form.append('assignment_id', assignment.assignment_id);
    form.append('assignment_name', assignment.assignment_name);
    form.append('course_name', assignment.course_name);
    form.append('crsid', String(assignment.crsid ?? ''));
    form.append('colid', String(assignment.colid ?? ''));
    form.append('scheduled_for', when);
    form.append('file', file);

    try {
      await api.scheduleSubmission(form);
      setDone(true);
      onScheduled();
      setTimeout(onClose, 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not schedule this submission');
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Schedule submission"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="bg-[var(--bg-elevated)] rounded-2xl w-full max-w-lg border border-[var(--border-color)] shadow-2xl"
      >
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold mb-1">Schedule submission</h3>
            <p className="text-sm text-[var(--text-secondary)] truncate">
              {assignment.assignment_name} · {assignment.course_name}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg hover:bg-[var(--bg-surface)] transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="px-6 pb-8 text-center">
            <CheckCircle size={40} className="mx-auto mb-3 text-[var(--color-success)]" />
            <p className="font-medium mb-1">Scheduled</p>
            <p className="text-sm text-[var(--text-secondary)]">
              CampusSync will submit {file?.name} on {formatDateTime(when)}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-sm bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/25 text-[var(--color-danger)]">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="submission-file" className="block text-sm font-medium mb-2">
                Your file
              </label>
              <label
                htmlFor="submission-file"
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-[var(--border-color)] hover:border-[var(--color-accent)] cursor-pointer transition-colors"
              >
                <Paperclip size={18} className="text-[var(--text-secondary)] shrink-0" />
                <span className="text-sm min-w-0">
                  {file ? (
                    <>
                      <span className="block font-medium truncate">{file.name}</span>
                      <span className="block text-xs text-[var(--text-secondary)]">
                        {formatBytes(file.size)}
                      </span>
                    </>
                  ) : (
                    <span className="text-[var(--text-secondary)]">Choose the file to hand in</span>
                  )}
                </span>
              </label>
              <input
                id="submission-file"
                type="file"
                className="sr-only"
                onChange={e => {
                  setFile(e.target.files?.[0] ?? null);
                  setError(null);
                }}
              />
            </div>

            <div>
              <label htmlFor="submission-when" className="block text-sm font-medium mb-2">
                Submit at
              </label>
              <input
                id="submission-when"
                type="datetime-local"
                value={when}
                min={toLocalInputValue(new Date(Date.now() + 60000))}
                onChange={e => setWhen(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
              {assignment.due_date && (
                <p className="text-xs text-[var(--text-secondary)] mt-2 flex items-center gap-1.5">
                  <CalendarClock size={13} />
                  Deadline on VOLP: {formatDateTime(assignment.due_date)}
                </p>
              )}
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              CampusSync holds your file and signs into VOLP with your saved login at that
              moment to hand it in. You'll get a notification either way. You can cancel any
              time before it runs, from Settings.
            </p>

            <div className="flex gap-3 pt-1">
              <Button variant="ghost" size="md" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                type="submit"
                disabled={!canSubmit}
                icon={busy ? <Loader2 size={16} className="animate-spin" /> : <CalendarClock size={16} />}
                iconPosition="left"
              >
                {busy ? 'Scheduling…' : 'Schedule'}
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

/** Default to 30 minutes before the deadline, or an hour from now. */
function defaultWhen(dueDate?: string | null): string {
  const due = dueDate ? new Date(dueDate) : null;
  const inAnHour = new Date(Date.now() + 3600_000);
  if (due && !Number.isNaN(due.getTime())) {
    const halfHourBefore = new Date(due.getTime() - 30 * 60000);
    if (halfHourBefore.getTime() > Date.now()) return toLocalInputValue(halfHourBefore);
  }
  return toLocalInputValue(inAnHour);
}
