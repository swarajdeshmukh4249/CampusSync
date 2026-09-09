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
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  const startOffset = new Date(year, month, 1).getDay();

  const undated = useMemo(
    () => (data?.assignments ?? []).filter(a => !parseDate(a.due_date)),
    [data],
  );

  return (
    <AppShell
      page="calendar"
      onNavigate={onNavigate}
      theme={theme}
      onThemeToggle={onThemeToggle}
      title="Calendar"
      icon={<CalendarIcon size={20} />}
      notifications={notifications}
      search={{ value: query, onChange: setQuery, placeholder: 'Search deadlines…' }}
      onBack={{ label: 'Dashboard', onClick: () => onNavigate('dashboard') }}
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
          icon={<RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />}
          iconPosition="left"
        >
          {syncing ? 'Syncing' : 'Sync'}
        </Button>
      }
    >
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Academic Calendar</h1>
        <p className="text-[var(--text-secondary)]">
          Every deadline synced from VOLP, on the day it actually falls
        </p>
      </motion.div>

      <DataState loading={loading} error={error} onRetry={reload} loadingMessage="Loading your deadlines…" />

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card variant="glass" className="p-6">
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setCursor(new Date(year, month - 1, 1))}
                  aria-label="Previous month"
                  className="p-2 rounded-xl hover:bg-[var(--bg-surface)] transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="text-center">
                  <h2 className="text-xl font-semibold">
                    {MONTHS[month]} {year}
                  </h2>
                  <button
                    onClick={() => {
                      const today = new Date();
                      setCursor(today);
                      setSelected(today);
                    }}
                    className="text-xs text-[var(--color-accent)] hover:underline"
                  >
                    Jump to today
                  </button>
                </div>
                <button
                  onClick={() => setCursor(new Date(year, month + 1, 1))}
                  aria-label="Next month"
                  className="p-2 rounded-xl hover:bg-[var(--bg-surface)] transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-2">
                {DAYS.map(day => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-[var(--text-secondary)] py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: startOffset }).map((_, i) => (
                  <div key={`pad-${i}`} className="aspect-square" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(year, month, day);
                  const dayEvents = eventsOn(date);
                  const isToday = sameDay(date, new Date());
                  const isSelected = sameDay(date, selected);

                  return (
                    <button
                      key={day}
                      onClick={() => setSelected(date)}
                      aria-label={`${day} ${MONTHS[month]} — ${dayEvents.length} deadline(s)`}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                        isSelected
                          ? 'bg-[var(--color-accent)] text-white'
                          : isToday
                            ? 'border-2 border-[var(--color-accent)]'
                            : 'hover:bg-[var(--bg-surface)]'
                      }`}
                    >
                      <span className="text-sm font-medium">{day}</span>
                      {dayEvents.length > 0 && (
                        <span className="flex gap-0.5">
                          {dayEvents.slice(0, 3).map(e => (
                            <span
                              key={e.id}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{
                                backgroundColor: e.submitted ? STATUS_COLORS.submitted : e.color,
                              }}
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card variant="glass" className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {selected.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>

              {selectedEvents.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-secondary)]">
                  <CalendarIcon size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Nothing due this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedEvents.map(e => (
                    <div
                      key={e.id}
                      className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: e.submitted ? STATUS_COLORS.submitted : e.color }}
                        />
                        <div className="min-w-0">
                          <h4 className="font-medium mb-1">{e.title}</h4>
                          <p className="text-sm text-[var(--text-secondary)]">{e.course}</p>
                          <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5 mt-1">
                            <Clock size={13} />
                            {formatDateTime(e.dueDate)}
                          </p>
                          {e.submitted ? (
                            <p className="text-xs text-[var(--color-success)] flex items-center gap-1.5 mt-1">
                              <CheckCircle size={12} /> Submitted
                            </p>
                          ) : (
                            <p className="text-xs mt-1" style={{ color: STATUS_COLORS.pending }}>
                              {timeRemaining(e.dueDate)} left
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {undated.length > 0 && (
              <Card variant="glass" className="p-6">
                <h3 className="text-sm font-medium mb-3">No deadline on VOLP</h3>
                <ul className="space-y-2">
                  {undated.slice(0, 6).map(a => (
                    <li key={a.assignment_id} className="text-sm">
                      <span className="block">{a.assignment_name}</span>
                      <span className="block text-xs text-[var(--text-secondary)]">
                        {a.course_name} · {assignmentStatus(a)}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 w-full"
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
