import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown, Calendar, CheckCircle, ChevronDown, Clock, ExternalLink, FileText,
  Paperclip, RefreshCw, Upload,
} from 'lucide-react';
import { API_BASE, api } from '../api';
import type { Assignment } from '../api';
import Card from './ui/Card';
import Button from './ui/Button';
import DataState from './ui/DataState';
import AppShell from './ui/AppShell';
import type { Page } from './ui/AppShell';
import { Badge, Empty } from './ui/Bits';
import ScheduleSubmissionModal from './ScheduleSubmissionModal';
import { useApiData } from '../hooks/useApiData';
import { useNotifications } from '../hooks/useNotifications';
import {
  assignmentStatus, courseColor, formatDateTime, STATUS_COLORS, timeAgo, timeRemaining,
  tint, URGENCY_COLORS, urgency,
} from '../lib/format';

interface AssignmentsProps {
  userId: number;
  username: string;
  onNavigate: (page: Page) => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

type Filter = 'all' | 'pending' | 'submitted' | 'overdue';
type SortBy = 'due' | 'course' | 'urgency';

const SORT_LABELS: Record<SortBy, string> = {
  due: 'Deadline',
  course: 'Course',
  urgency: 'Urgency',
};

const FILTER_COLORS: Record<Filter, string> = {
  all: 'var(--color-accent)',
  pending: 'var(--color-warning)',
  submitted: 'var(--color-success)',
  overdue: 'var(--color-danger)',
};

export default function Assignments({ userId, onNavigate, theme, onThemeToggle }: AssignmentsProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('due');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState<Assignment | null>(null);
  const [syncing, setSyncing] = useState(false);

  const notifications = useNotifications(userId);
  const { data, loading, error, reload } = useApiData(() => api.assignments(userId), [userId]);
  const assignments = useMemo(() => data?.assignments ?? [], [data]);

  async function handleSync() {
    setSyncing(true);
    try {
      await api.refresh(userId);
      await reload(false);
    } catch {
      await reload(false);
    } finally {
      setSyncing(false);
    }
  }

  const counts = useMemo(
    () => ({
      all: assignments.length,
      pending: assignments.filter(a => assignmentStatus(a) === 'pending').length,
      submitted: assignments.filter(a => assignmentStatus(a) === 'submitted').length,
      overdue: assignments.filter(a => assignmentStatus(a) === 'overdue').length,
    }),
    [assignments],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = assignments.filter(a => {
      if (filter !== 'all' && assignmentStatus(a) !== filter) return false;
      if (!needle) return true;
      return (
        a.assignment_name.toLowerCase().includes(needle) ||
        a.course_name.toLowerCase().includes(needle) ||
        a.description.toLowerCase().includes(needle)
      );
    });

    const order = { high: 0, medium: 1, low: 2 } as const;
    return [...matched].sort((a, b) => {
      if (sortBy === 'course') return a.course_name.localeCompare(b.course_name);
      if (sortBy === 'urgency') return order[urgency(a)] - order[urgency(b)];
      const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return da - db;
    });
  }, [assignments, filter, query, sortBy]);

  return (
    <AppShell
      page="assignments"
      onNavigate={onNavigate}
      theme={theme}
      onThemeToggle={onThemeToggle}
      title="Assignments"
      icon={<FileText size={18} />}
      notifications={notifications}
      search={{ value: query, onChange: setQuery, placeholder: 'Search assignments…' }}
      onBack={{ label: 'Dashboard', onClick: () => onNavigate('dashboard') }}
      eyebrow="Every piece of work"
      heading="Assignments"
      subheading={`Synced from VOLP${data?.last_sync ? ` · last synced ${timeAgo(data.last_sync)}` : ''}`}
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
      {/* Filter bar. Each filter carries the colour it filters for, so the
          control doubles as a legend for the list below it. */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-full bg-[var(--bg-sunken)] border border-[var(--border-color)]">
          {(['all', 'pending', 'submitted', 'overdue'] as Filter[]).map(f => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={active}
                className="relative px-4 py-2 rounded-full text-[13px] font-medium transition-colors"
                style={{ color: active ? '#fff' : 'var(--text-secondary)' }}
              >
                {active && (
                  <motion.span
                    layoutId="assignment-filter-pill"
                    className="absolute inset-0 rounded-full -z-10"
                    style={{
                      background: `linear-gradient(120deg, ${FILTER_COLORS[f]}, ${tint(FILTER_COLORS[f], 68)})`,
                      boxShadow: `0 4px 16px ${tint(FILTER_COLORS[f], 34)}`,
                    }}
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="ml-2 opacity-70 numeric">{counts[f]}</span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto">
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowUpDown size={15} />}
            iconPosition="left"
            onClick={() =>
              setSortBy(current =>
                current === 'due' ? 'urgency' : current === 'urgency' ? 'course' : 'due',
              )
            }
          >
            Sort: {SORT_LABELS[sortBy]}
          </Button>
        </div>
      </div>

      <DataState
        loading={loading}
        error={error}
        onRetry={reload}
        loadingMessage="Loading your assignments…"
        skeletonRows={5}
      />

      {!loading && !error && (
        visible.length === 0 ? (
          <Empty
            icon={<FileText size={22} />}
            title={assignments.length === 0 ? 'Nothing synced yet' : 'No match'}
            body={
              assignments.length === 0
                ? 'CampusSync has not pulled any assignment from VOLP. Hit “Sync VOLP” above.'
                : query
                  ? `Nothing matches “${query}”.`
                  : `You have no ${filter} assignments.`
            }
          />
        ) : (
          <div className="space-y-2.5">
            {visible.map((a, i) => {
              const status = assignmentStatus(a);
              const level = urgency(a);
              const isOpen = expanded === a.assignment_id;
              const accent = status === 'submitted' ? STATUS_COLORS.submitted : URGENCY_COLORS[level];

              return (
                <motion.div
                  key={a.assignment_id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 10) * 0.03, duration: 0.4 }}
                >
                  <Card variant="glass" padding="md">
                    <div className="flex gap-4">
                      {/* Status spine. Scanning a long list is a colour task
                          before it is a reading task. */}
                      <span
                        className="w-1 rounded-full shrink-0 self-stretch"
                        style={{ backgroundColor: accent }}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2.5">
                              <Badge color={STATUS_COLORS[status]}>{status}</Badge>
                              {status !== 'submitted' && <Badge color={URGENCY_COLORS[level]}>{level}</Badge>}
                              {a.assignment_type && a.assignment_type !== 'general' && (
                                <Badge color="var(--state-accent)">{a.assignment_type.replace(/_/g, ' ')}</Badge>
                              )}
                              {a.max_marks > 0 && (
                                <span className="text-xs text-[var(--text-tertiary)]">{a.max_marks} marks</span>
                              )}
                            </div>

                            <h3 className="text-[17px] font-semibold tracking-[-0.02em] mb-1.5">
                              {a.assignment_name}
                            </h3>
                            <p className="text-[13px] mb-3 flex items-center gap-1.5">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: courseColor(a.course_name) }}
                              />
                              <span className="text-[var(--text-secondary)]">{a.course_name}</span>
                            </p>

                            {a.description ? (
                              <p
                                className={`text-[13.5px] text-[var(--text-secondary)] mb-3 whitespace-pre-line leading-relaxed ${
                                  isOpen ? '' : 'line-clamp-2'
                                }`}
                              >
                                {a.description}
                              </p>
                            ) : (
                              <p className="text-[13px] text-[var(--text-tertiary)] mb-3 italic">
                                No question text synced from VOLP for this assignment.
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
                              {a.due_date ? (
                                <>
                                  {/* A submitted assignment is not "Overdue" just
                                      because its deadline has passed. */}
                                  {status !== 'submitted' && (
                                    <span
                                      className="numeric font-medium flex items-center gap-1.5"
                                      style={{ color: URGENCY_COLORS[level] }}
                                    >
                                      <Clock size={14} />
                                      {timeRemaining(a.due_date)}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                                    <Calendar size={14} />
                                    {formatDateTime(a.due_date)}
                                  </span>
                                </>
                              ) : (
                                <span className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                                  <Calendar size={14} />
                                  No deadline set on VOLP
                                </span>
                              )}
                              {a.submission_date && (
                                <span className="flex items-center gap-1.5 text-[var(--color-success)]">
                                  <CheckCircle size={14} />
                                  Submitted {formatDateTime(a.submission_date)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpanded(isOpen ? null : a.assignment_id)}
                              icon={
                                <ChevronDown
                                  size={14}
                                  className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                                />
                              }
                            >
                              Details
                            </Button>

                            {status !== 'submitted' && (
                              <Button
                                variant="primary"
                                size="sm"
                                icon={<Upload size={14} />}
                                iconPosition="left"
                                onClick={() => setScheduling(a)}
                              >
                                Submit
                              </Button>
                            )}
                          </div>
                        </div>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-[var(--text-secondary)]">
                                {a.start_date && <span>Opens {formatDateTime(a.start_date)}</span>}
                                {a.download_url && (
                                  <a
                                    href={`${API_BASE}${a.download_url}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-[var(--color-accent)] hover:underline"
                                  >
                                    <Paperclip size={14} /> Question paper
                                  </a>
                                )}
                                {a.volp_url && (
                                  <a
                                    href={a.volp_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-[var(--color-accent)] hover:underline"
                                  >
                                    <ExternalLink size={14} /> Open on VOLP
                                  </a>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )
      )}

      <AnimatePresence>
        {scheduling && (
          <ScheduleSubmissionModal
            userId={userId}
            assignment={scheduling}
            onClose={() => setScheduling(null)}
            onScheduled={() => reload(false)}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}
