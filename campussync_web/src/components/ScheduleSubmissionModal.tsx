import { useState } from 'react';
import { CalendarClock, CheckCircle, FileUp, Loader2, Paperclip, ShieldCheck, X } from 'lucide-react';
import Button from './ui/Button';
import Modal, { ErrorNote, Label, fieldClass } from './ui/Modal';
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
  // The earliest time the picker will accept. Read once on mount — recomputing
  // it every render makes the component's output depend on the clock.
  const [earliest] = useState(() => toLocalInputValue(new Date(Date.now() + 60_000)));

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
    <Modal
      title="Schedule submission"
      subtitle={`${assignment.assignment_name} · ${assignment.course_name}`}
      icon={<CalendarClock size={19} />}
      onClose={onClose}
      width={520}
    >
      {done ? (
        <div className="py-4 text-center">
          <CheckCircle size={40} className="mx-auto mb-4 text-[var(--color-success)]" />
          <p className="font-medium mb-1.5">Queued for hand-in</p>
          <p className="text-sm text-[var(--text-secondary)]">
            CampusSync will submit <strong className="text-[var(--text-primary)] font-medium">{file?.name}</strong>{' '}
            on {formatDateTime(when)}.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <ErrorNote>{error}</ErrorNote>}

          <div>
            <Label htmlFor="submission-file">Your file</Label>
            <label
              htmlFor="submission-file"
              className={[
                'flex items-center gap-3.5 p-4 rounded-xl border-2 border-dashed cursor-pointer',
                'transition-[border-color,background] duration-200',
                file
                  ? 'border-[rgba(61,220,151,0.4)] bg-[rgba(61,220,151,0.06)]'
                  : 'border-[var(--border-strong)] hover:border-[rgba(124,108,255,0.55)] hover:bg-[var(--bg-surface)]',
              ].join(' ')}
            >
              <span
                className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
                style={
                  file
                    ? { backgroundColor: 'rgba(61,220,151,0.14)', color: 'var(--color-success)' }
                    : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }
                }
              >
                {file ? <Paperclip size={18} /> : <FileUp size={18} />}
              </span>
              <span className="text-sm min-w-0 flex-1">
                {file ? (
                  <>
                    <span className="block font-medium truncate">{file.name}</span>
                    <span className="block text-xs text-[var(--text-secondary)] mt-0.5">
                      {formatBytes(file.size)} · click to replace
                    </span>
                  </>
                ) : (
                  <span className="text-[var(--text-secondary)]">Choose the file to hand in</span>
                )}
              </span>
              {file && (
                <button
                  type="button"
                  aria-label="Remove file"
                  onClick={event => {
                    // The label wraps this, so without stopping the event the
                    // file picker reopens the moment you try to clear it.
                    event.preventDefault();
                    event.stopPropagation();
                    setFile(null);
                  }}
                  className="shell__icon-btn shrink-0"
                >
                  <X size={15} />
                </button>
              )}
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
            <Label htmlFor="submission-when">Submit at</Label>
            <input
              id="submission-when"
              type="datetime-local"
              value={when}
              min={earliest}
              onChange={e => setWhen(e.target.value)}
              required
              className={fieldClass}
            />
            {assignment.due_date && (
              <p className="text-xs text-[var(--text-tertiary)] mt-2.5 flex items-center gap-1.5">
                <CalendarClock size={13} />
                Deadline on VOLP: {formatDateTime(assignment.due_date)}
              </p>
            )}
          </div>

          <div className="flex gap-2.5 p-3.5 rounded-xl bg-[var(--bg-sunken)] border border-[var(--border-color)]">
            <ShieldCheck size={15} className="shrink-0 mt-0.5 text-[var(--color-success)]" />
            <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
              CampusSync holds your file and signs into VOLP with your saved login at that
              moment to hand it in. You get a notification either way, and you can cancel
              any time before it runs, from Settings.
            </p>
          </div>

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
    </Modal>
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
