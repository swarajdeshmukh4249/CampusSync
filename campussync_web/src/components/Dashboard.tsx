import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight, BookOpen, CalendarClock, CheckCircle, Clock, FileText, Home, LogOut,
  Megaphone, RefreshCw, Upload, Users,
} from 'lucide-react';
import { api } from '../api';
import type { Assignment } from '../api';
import Card from './ui/Card';
import Button from './ui/Button';
import DataState from './ui/DataState';
import AppShell from './ui/AppShell';
import type { Page } from './ui/AppShell';
import { Badge, Empty, Metric, SectionTitle } from './ui/Bits';
import ScheduleSubmissionModal from './ScheduleSubmissionModal';
import { useApiData } from '../hooks/useApiData';
import { useNotifications } from '../hooks/useNotifications';
import {
  assignmentStatus, courseColor, displayName, formatDateTime, initials, parseDate,
  timeAgo, timeRemaining, tint, URGENCY_COLORS, urgency,
} from '../lib/format';

interface DashboardProps {
  userId: number;
  username: string;
  onLogout: () => void;
  onNavigate: (page: Page) => void;
  onGoToLanding: () => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

const isToday = (value?: string | null) => {
  const date = parseDate(value);
  return date ? date.toDateString() === new Date().toDateString() : false;
};

export default function Dashboard({
  userId, username, onLogout, onNavigate, onGoToLanding, theme, onThemeToggle,
}: DashboardProps) {
  const [now, setNow] = useState(new Date());
  const [query, setQuery] = useState('');
  const [scheduling, setScheduling] = useState<Assignment | null>(null);
  const [syncing, setSyncing] = useState(false);

  const notifications = useNotifications(userId);
  const assignmentsQuery = useApiData(() => api.assignments(userId), [userId]);
  const coursesQuery = useApiData(() => api.courses(userId), [userId]);
  const friendsQuery = useApiData(() => api.friends(userId), [userId]);
  const announcementsQuery = useApiData(() => api.announcements(userId), [userId]);
  const submissionsQuery = useApiData(() => api.submissions(userId), [userId]);

  // Only the clock needs to tick; re-fetching every second would hammer VOLP.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const assignments = useMemo(
    () => assignmentsQuery.data?.assignments ?? [],
    [assignmentsQuery.data],
  );
  const courses = coursesQuery.data?.courses ?? [];
  const friends = friendsQuery.data?.friends ?? [];
  const announcements = announcementsQuery.data?.announcements ?? [];
  const scheduled = (submissionsQuery.data?.submissions ?? []).filter(s => s.status === 'scheduled');

  async function handleSync() {
    setSyncing(true);
    try {
      await api.refresh(userId);
    } finally {
      await Promise.all([
        assignmentsQuery.reload(false),
        coursesQuery.reload(false),
        announcementsQuery.reload(false),
      ]);
      setSyncing(false);
    }
  }

  const pending = assignments.filter(a => assignmentStatus(a) === 'pending');
  const submitted = assignments.filter(a => assignmentStatus(a) === 'submitted');
  const overdue = assignments.filter(a => assignmentStatus(a) === 'overdue');
  const dueToday = pending.filter(a => isToday(a.due_date));

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  const metrics = [
    { label: 'Due today', value: dueToday.length, sublabel: 'Assignments', icon: FileText, color: 'var(--state-accent)', page: 'assignments' as const },
    { label: 'Pending', value: pending.length, sublabel: 'Still to hand in', icon: Clock, color: 'var(--state-warning)', page: 'assignments' as const },
    { label: 'Overdue', value: overdue.length, sublabel: 'Past deadline', icon: CalendarClock, color: 'var(--state-danger)', page: 'assignments' as const },
    { label: 'Submitted', value: submitted.length, sublabel: 'Done', icon: CheckCircle, color: 'var(--state-success)', page: 'assignments' as const },
    { label: 'Courses', value: courses.length, sublabel: 'Active', icon: BookOpen, color: 'var(--state-cyan)', page: 'courses' as const },
  ];

  // The next few real deadlines, soonest first.
  const upcoming = [...pending, ...overdue]
    .filter(a => {
      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      return (
        a.assignment_name.toLowerCase().includes(needle) ||
        a.course_name.toLowerCase().includes(needle)
      );
    })
    .sort((a, b) => {
      const da = parseDate(a.due_date)?.getTime() ?? Infinity;
      const db = parseDate(b.due_date)?.getTime() ?? Infinity;
      return da - db;
    });

  // The single thing that matters most right now gets its own panel; the rest
  // queue up beneath it.
  const [next, ...rest] = upcoming;
  const queue = rest.slice(0, 4);

  const loading = assignmentsQuery.loading || coursesQuery.loading;
  const error = assignmentsQuery.error ?? coursesQuery.error;

  return (
    <AppShell
      page="dashboard"
      onNavigate={onNavigate}
      theme={theme}
      onThemeToggle={onThemeToggle}
      title="CampusSync"
      icon={<Home size={18} />}
      notifications={notifications}
      search={{ value: query, onChange: setQuery, placeholder: 'Search deadlines…' }}
      onBack={{ label: 'Home', onClick: onGoToLanding }}
      eyebrow={now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
      heading={`${greeting}, ${displayName(username)}.`}
      subheading={
        assignmentsQuery.data?.last_sync
          ? `Last synced with VOLP ${timeAgo(assignmentsQuery.data.last_sync)}.`
          : 'Everything that needs your attention, in one place.'
      }
      headActions={
        <>
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
          <Button variant="ghost" size="sm" onClick={onLogout} icon={<LogOut size={15} />} iconPosition="left">
            Log out
          </Button>
        </>
      }
    >
      <DataState loading={loading} error={error} onRetry={assignmentsQuery.reload} loadingMessage="Loading your term…" skeletonRows={4} />

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-7">
            {metrics.map((metric, i) => (
              <Metric
                key={metric.label}
                index={i}
                label={metric.label}
                value={metric.value}
                sublabel={metric.sublabel}
                color={metric.color}
                icon={<metric.icon size={17} />}
                onClick={() => onNavigate(metric.page)}
              />
            ))}
          </div>

          {scheduled.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-7"
            >
              <Card variant="accent" padding="md" edge="var(--color-accent)">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <span className="w-10 h-10 rounded-xl grid place-items-center bg-[rgba(124,108,255,0.16)] text-[var(--color-accent)] shrink-0">
                      <CalendarClock size={19} />
                    </span>
                    <div>
                      <h3 className="font-semibold mb-0.5">
                        {scheduled.length} submission{scheduled.length === 1 ? '' : 's'} on autopilot
                      </h3>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Next: {scheduled[0].assignment_name} · {formatDateTime(scheduled[0].scheduled_for)}
                      </p>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => onNavigate('settings')} icon={<ArrowRight size={14} />}>
                    Manage
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <SectionTitle
                action={
                  <Button variant="ghost" size="sm" onClick={() => onNavigate('assignments')} icon={<ArrowRight size={14} />}>
                    View all
                  </Button>
                }
              >
                Up next
              </SectionTitle>

              {!next ? (
                <Empty
                  icon={<CheckCircle size={22} />}
                  title={assignments.length === 0 ? 'Nothing synced yet' : query ? 'No match' : "You're all caught up"}
                  body={
                    assignments.length === 0
                      ? 'CampusSync has not pulled anything from VOLP yet. Hit “Sync VOLP” above.'
                      : query
                        ? `Nothing matches “${query}”.`
                        : 'Every deadline on VOLP is handed in. Enjoy it while it lasts.'
                  }
                />
              ) : (
                <div className="space-y-3">
                  {/* The most urgent item, given real estate proportional to
                      how much it matters. */}
                  <FocusDeadline assignment={next} onSchedule={() => setScheduling(next)} />

                  {queue.map(a => (
                    <QueueRow key={a.assignment_id} assignment={a} onSchedule={() => setScheduling(a)} />
                  ))}
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="space-y-6"
            >
              <div>
                <SectionTitle
                  action={
                    <Button variant="ghost" size="sm" onClick={() => onNavigate('friends')} icon={<Users size={14} />} iconPosition="left">
                      All
                    </Button>
                  }
                >
                  Your circle
                </SectionTitle>

                <Card variant="glass" padding="sm">
                  {friends.length === 0 ? (
                    <p className="text-sm text-[var(--text-secondary)] text-center py-7">
                      No classmates on CampusSync yet.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {friends.slice(0, 5).map(friend => (
                        <div
                          key={friend.user_id}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg-surface)] transition-colors"
                        >
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold text-white shrink-0"
                            style={{ background: 'var(--gradient-action)' }}
                          >
                            {initials(friend.username)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">
                              {displayName(friend.username)}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)]">
                              {friend.shared_courses} shared course
                              {friend.shared_courses === 1 ? '' : 's'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {announcements.length > 0 && (
                <div>
                  <SectionTitle>From your courses</SectionTitle>
                  <Card variant="glass" padding="sm" className="space-y-1">
                    {announcements.slice(0, 4).map((ann, i) => (
                      <div key={ann.announcement_id ?? i} className="flex gap-3 p-2 rounded-xl">
                        <span
                          className="w-1 rounded-full shrink-0"
                          style={{ backgroundColor: courseColor(ann.course_name) }}
                        />
                        <Megaphone
                          size={14}
                          className="mt-0.5 shrink-0"
                          style={{ color: courseColor(ann.course_name) }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{ann.title || 'Announcement'}</p>
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                            {ann.course_name}
                            {ann.content ? ` · ${ann.content}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </Card>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}

      {scheduling && (
        <ScheduleSubmissionModal
          userId={userId}
          assignment={scheduling}
          onClose={() => setScheduling(null)}
          onScheduled={() => submissionsQuery.reload(false)}
        />
      )}
    </AppShell>
  );
}

/** The one deadline the student should look at first. */
function FocusDeadline({ assignment, onSchedule }: { assignment: Assignment; onSchedule: () => void }) {
  const level = urgency(assignment);
  const color = URGENCY_COLORS[level];
  const isOverdue = assignmentStatus(assignment) === 'overdue';

  return (
    <Card variant="elevated" padding="lg" edge={color} className="relative">
      <span
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{ background: `radial-gradient(circle at 88% 0%, ${color}, transparent 58%)` }}
      />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
        {/* Countdown dial — the number you actually act on. */}
        <div
          className="w-[92px] h-[92px] rounded-2xl grid place-items-center shrink-0 text-center"
          style={{ backgroundColor: tint(color, 10), border: `1px solid ${tint(color, 26)}` }}
        >
          <div>
            <div className="numeric text-[19px] font-semibold leading-none" style={{ color }}>
              {assignment.due_date ? timeRemaining(assignment.due_date) : '—'}
            </div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-[var(--text-tertiary)] mt-1.5">
              {!assignment.due_date ? 'no date' : isOverdue ? 'past deadline' : 'remaining'}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <Badge color={color}>{level} priority</Badge>
            <span className="text-xs text-[var(--text-secondary)] truncate">{assignment.course_name}</span>
          </div>
          <h3 className="text-[19px] font-semibold tracking-[-0.025em] mb-2">{assignment.assignment_name}</h3>
          <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
            <Clock size={14} />
            {assignment.due_date ? formatDateTime(assignment.due_date) : 'No deadline set on VOLP'}
            {assignment.max_marks > 0 && <span>· {assignment.max_marks} marks</span>}
          </p>
        </div>

        <Button variant="primary" size="md" icon={<Upload size={15} />} iconPosition="left" onClick={onSchedule}>
          Schedule
        </Button>
      </div>
    </Card>
  );
}

/** Everything behind the focus item, compressed to a single scannable line. */
function QueueRow({ assignment, onSchedule }: { assignment: Assignment; onSchedule: () => void }) {
  const level = urgency(assignment);
  const color = URGENCY_COLORS[level];

  return (
    <Card variant="glass" padding="md" hover>
      <div className="flex items-center gap-4">
        <span className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{assignment.assignment_name}</h4>
          <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
            {assignment.course_name}
            {assignment.due_date ? ` · ${formatDateTime(assignment.due_date)}` : ' · no deadline on VOLP'}
          </p>
        </div>
        <span className="numeric text-sm font-medium shrink-0 hidden sm:block" style={{ color }}>
          {assignment.due_date ? timeRemaining(assignment.due_date) : '—'}
        </span>
        <Button variant="ghost" size="sm" onClick={onSchedule} icon={<Upload size={14} />} ariaLabel="Schedule submission">
          <span className="hidden md:inline">Schedule</span>
        </Button>
      </div>
    </Card>
  );
}
