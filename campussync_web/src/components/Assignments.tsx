import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown, Calendar, CheckCircle, Clock, ExternalLink, FileText,
  Paperclip, RefreshCw, Upload,
} from 'lucide-react';
import { API_BASE, api } from '../api';
import type { Assignment } from '../api';
import Card from './ui/Card';
import Button from './ui/Button';
import DataState from './ui/DataState';
import AppShell from './ui/AppShell';
import type { Page } from './ui/AppShell';
import ScheduleSubmissionModal from './ScheduleSubmissionModal';
import { useApiData } from '../hooks/useApiData';
import { useNotifications } from '../hooks/useNotifications';
import {
  assignmentStatus, formatDateTime, STATUS_COLORS, timeAgo, timeRemaining,
  URGENCY_COLORS, urgency,
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
      icon={<FileText size={20} />}
      notifications={notifications}
      search={{ value: query, onChange: setQuery, placeholder: 'Search assignments…' }}
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
        <h1 className="text-3xl font-semibold mb-2">Assignments</h1>
        <p className="text-[var(--text-secondary)]">
          Everything synced from VOLP{data?.last_sync ? ` · last synced ${timeAgo(data.last_sync)}` : ''}
        </p>
      </motion.div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {(['all', 'pending', 'submitted', 'overdue'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-2 opacity-70">{counts[f]}</span>
          </button>
        ))}

        <div className="ml-auto">
          <Button
            variant="outline"
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
      />

      {!loading && !error && (
        <>
          {visible.length === 0 ? (
            <Card variant="glass" className="py-12 text-center">
              <p className="text-[var(--text-secondary)]">
                {assignments.length === 0
                  ? 'No assignments synced from VOLP yet. Try Sync above.'
                  : query
                    ? `Nothing matches “${query}”.`
                    : `No ${filter} assignments.`}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {visible.map(a => {
                const status = assignmentStatus(a);
                const level = urgency(a);
                const isOpen = expanded === a.assignment_id;
                return (
                  <Card key={a.assignment_id} variant="glass" className="group">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge color={URGENCY_COLORS[level]}>{level}</Badge>
                          <Badge color={STATUS_COLORS[status]}>{status}</Badge>
                          {a.assignment_type && a.assignment_type !== 'general' && (
                            <Badge color="#7C6CFF">{a.assignment_type.replace(/_/g, ' ')}</Badge>
                          )}
                          {a.max_marks > 0 && (
                            <span className="text-xs text-[var(--text-secondary)]">
                              {a.max_marks} marks
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-semibold mb-1">{a.assignment_name}</h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-3">{a.course_name}</p>

                        {a.description ? (
                          <p
                            className={`text-sm text-[var(--text-secondary)] mb-3 whitespace-pre-line ${
                              isOpen ? '' : 'line-clamp-2'
                            }`}
                          >
                            {a.description}
                          </p>
                        ) : (
                          <p className="text-sm text-[var(--text-secondary)] mb-3 italic">
                            No question text synced from VOLP for this assignment.
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          {a.due_date ? (
                            <>
                              {/* A submitted assignment is not "Overdue" just
                                  because its deadline has passed. */}
                              {status !== 'submitted' && (
                                <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                                  <Clock size={14} />
                                  {timeRemaining(a.due_date)}
                                </span>
                              )}
                              <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                                <Calendar size={14} />
                                {formatDateTime(a.due_date)}
                              </span>
                            </>
                          ) : (
                            <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                              <Calendar size={14} />
                              No deadline set on VOLP
                            </span>
                          )}
                          {a.submission_date && (
                            <span className="flex items-center gap-2 text-[var(--color-success)]">
                              <CheckCircle size={14} />
                              Submitted {formatDateTime(a.submission_date)}
                            </span>
                          )}
                        </div>

                        {isOpen && (
                          <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
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
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 lg:ml-4 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpanded(isOpen ? null : a.assignment_id)}
                        >
                          {isOpen ? 'Hide details' : 'View details'}
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
                  </Card>
                );
              })}
            </div>
          )}
        </>
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

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="text-xs px-2 py-1 rounded-full uppercase tracking-wider font-medium"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {children}
    </span>
  );
}
