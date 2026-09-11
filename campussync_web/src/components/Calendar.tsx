import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar as CalendarIcon, CheckCircle, ChevronLeft, ChevronRight, Clock, RefreshCw,
} from 'lucide-react';
import { api } from '../api';
import Card from './ui/Card';
import Button from './ui/Button';
import DataState from './ui/DataState';
import AppShell from './ui/AppShell';
import type { Page } from './ui/AppShell';
import { useApiData } from '../hooks/useApiData';
import { useNotifications } from '../hooks/useNotifications';
import {
  assignmentStatus, courseColor, formatDateTime, parseDate, STATUS_COLORS, timeRemaining,
} from '../lib/format';

interface CalendarProps {
  userId: number;
  username: string;
  onNavigate: (page: Page) => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  course: string;
  date: Date;
  color: string;
  submitted: boolean;
  dueDate: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export default function Calendar({ userId, onNavigate, theme, onThemeToggle }: CalendarProps) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date>(() => new Date());
  const [query, setQuery] = useState('');
  const [syncing, setSyncing] = useState(false);

  const notifications = useNotifications(userId);
  const { data, loading, error, reload } = useApiData(() => api.assignments(userId), [userId]);

  async function handleSync() {
    setSyncing(true);
    try {
      await api.refresh(userId);
    } finally {
      await reload(false);
      setSyncing(false);
    }
  }

  /** Every deadline on the calendar comes from a real synced assignment. */
  const events: CalendarEvent[] = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.assignments ?? [])
      .map(a => {
        const date = parseDate(a.due_date);
        if (!date) return null;
        return {
          id: a.assignment_id,
          title: a.assignment_name,
          course: a.course_name,
          date,
          color: courseColor(a.course_name),
          submitted: a.is_submitted,
          dueDate: a.due_date,
        } satisfies CalendarEvent;
      })
      .filter((e): e is CalendarEvent => e !== null)
      .filter(e =>
        !needle || e.title.toLowerCase().includes(needle) || e.course.toLowerCase().includes(needle),
      );
  }, [data, query]);

  const eventsOn = (date: Date) => events.filter(e => sameDay(e.date, date));
  const selectedEvents = eventsOn(selected).sort((a, b) => a.date.getTime() - b.date.getTime());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // The grid is Monday-first, so Sunday (getDay() === 0) sits in column 7.
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;

  const undated = useMemo(
    () => (data?.assignments ?? []).filter(a => !parseDate(a.due_date)),
    [data],
  );

  const monthEventCount = events.filter(
    e => e.date.getFullYear() === year && e.date.getMonth() === month,
  ).length;

  return (
    <AppShell
      page="calendar"
      onNavigate={onNavigate}
      theme={theme}
      onThemeToggle={onThemeToggle}
      title="Calendar"
      icon={<CalendarIcon size={18} />}
      notifications={notifications}
      search={{ value: query, onChange: setQuery, placeholder: 'Search deadlines…' }}
      onBack={{ label: 'Dashboard', onClick: () => onNavigate('dashboard') }}
      eyebrow="Term view"
      heading="Academic calendar"
      subheading="Every deadline synced from VOLP, on the day it actually falls."
      headActions={
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
          icon={<RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />}
          iconPosition="left"
        >
          {syncing ? 'Syncing' : 'Sync VOLP'}
        </Button>
      }
    >
      <DataState loading={loading} error={error} onRetry={reload} loadingMessage="Loading your deadlines…" skeletonRows={2} />

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
          {/* The month grid is the densest thing in the product, so it gets the
              one opaque surface on the page. */}
          <Card variant="solid" padding="lg">
            <div className="flex items-center justify-between mb-7">
              <button
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                aria-label="Previous month"
                className="shell__icon-btn"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="text-center">
                <h2 className="text-[19px] font-semibold tracking-[-0.025em]">
                  {MONTHS[month]} <span className="text-[var(--text-tertiary)] font-normal numeric">{year}</span>
                </h2>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  {monthEventCount === 0 ? 'No deadlines this month' : `${monthEventCount} deadline${monthEventCount === 1 ? '' : 's'}`}
                  {' · '}
                  <button
                    onClick={() => {
                      const today = new Date();
                      setCursor(today);
                      setSelected(today);
                    }}
                    className="text-[var(--color-accent)] hover:underline"
                  >
                    today
                  </button>
                </p>
              </div>

              <button
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                aria-label="Next month"
                className="shell__icon-btn"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5 mb-2">
              {DAYS.map(day => (
                <div
                  key={day}
                  className="text-center text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)] pb-2"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const date = new Date(year, month, day);
                const dayEvents = eventsOn(date);
                const isToday = sameDay(date, new Date());
                const isSelected = sameDay(date, selected);
                // A day with unsubmitted work past its time is the one thing
                // that should catch the eye in a month of grey squares.
                const hasOverdue = dayEvents.some(e => !e.submitted && e.date.getTime() < Date.now());

                return (
                  <button
                    key={day}
                    onClick={() => setSelected(date)}
                    aria-label={`${day} ${MONTHS[month]} — ${dayEvents.length} deadline(s)`}
                    aria-pressed={isSelected}
                    className={[
                      'relative aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5',
                      'text-[13px] transition-[background,border-color,color] duration-200',
                      'border',
                      isSelected
                        ? 'text-white border-transparent bg-[image:var(--gradient-action)] shadow-[0_6px_20px_rgba(124,108,255,0.4)]'
                        : isToday
                          ? 'border-[rgba(124,108,255,0.55)] text-[var(--text-primary)]'
                          : dayEvents.length > 0
                            ? 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                            : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]',
                    ].join(' ')}
                  >
                    <span className={`numeric ${isSelected || isToday ? 'font-semibold' : ''}`}>{day}</span>

                    {dayEvents.length > 0 && (
                      <span className="flex gap-[3px]">
                        {dayEvents.slice(0, 3).map(e => (
                          <span
                            key={e.id}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              backgroundColor: isSelected
                                ? 'rgba(255,255,255,0.9)'
                                : e.submitted ? STATUS_COLORS.submitted : e.color,
                            }}
                          />
                        ))}
                      </span>
                    )}

                    {hasOverdue && !isSelected && (
                      <span
                        className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS.overdue, boxShadow: `0 0 8px ${STATUS_COLORS.overdue}` }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="space-y-4">
            <Card variant="glass" padding="md">
              <h3 className="text-[15px] font-semibold mb-1">
                {selected.toLocaleDateString(undefined, { weekday: 'long' })}
              </h3>
              <p className="text-[13px] text-[var(--text-secondary)] mb-5">
                {selected.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>

              {selectedEvents.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-tertiary)]">
                  <CalendarIcon size={30} className="mx-auto mb-3 opacity-50" />
                  <p className="text-[13px]">Nothing due this day</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedEvents.map((e, i) => (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex gap-3 p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]"
                    >
                      <span
                        className="w-1 rounded-full shrink-0"
                        style={{ backgroundColor: e.submitted ? STATUS_COLORS.submitted : e.color }}
                      />
                      <div className="min-w-0">
                        <h4 className="font-medium text-[14px] mb-1">{e.title}</h4>
                        <p className="text-[12.5px] text-[var(--text-secondary)]">{e.course}</p>
                        <p className="text-[12.5px] text-[var(--text-tertiary)] flex items-center gap-1.5 mt-1.5">
                          <Clock size={12} />
                          {formatDateTime(e.dueDate)}
                        </p>
                        {e.submitted ? (
                          <p className="text-[11.5px] text-[var(--color-success)] flex items-center gap-1.5 mt-1.5">
                            <CheckCircle size={12} /> Submitted
                          </p>
                        ) : (
                          <p className="text-[11.5px] numeric mt-1.5" style={{ color: STATUS_COLORS.pending }}>
                            {timeRemaining(e.dueDate)} left
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>

            {undated.length > 0 && (
              <Card variant="glass" padding="md">
                <h3 className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)] mb-3.5">
                  No deadline on VOLP
                </h3>
                <ul className="space-y-2.5">
                  {undated.slice(0, 6).map(a => (
                    <li key={a.assignment_id} className="text-[13px]">
                      <span className="block">{a.assignment_name}</span>
                      <span className="block text-[11.5px] text-[var(--text-tertiary)]">
                        {a.course_name} · {assignmentStatus(a)}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => onNavigate('assignments')}
                >
                  See all assignments
                </Button>
              </Card>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
