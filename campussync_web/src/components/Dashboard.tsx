import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, CalendarClock, CheckCircle, Clock, FileText, Home, LogOut, Megaphone,
  RefreshCw, Upload, Users,
} from 'lucide-react';
import { api } from '../api';
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
  assignmentStatus, courseColor, displayName, formatDateTime, initials, parseDate,
  timeAgo, timeRemaining, URGENCY_COLORS, urgency,
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
    { label: 'Due today', value: dueToday.length, sublabel: 'Assignments', icon: FileText, color: '#7C6CFF' },
    { label: 'Pending', value: pending.length, sublabel: 'Still to hand in', icon: Clock, color: '#FFB84D' },
    { label: 'Overdue', value: overdue.length, sublabel: 'Past deadline', icon: CalendarClock, color: '#FF5C7A' },
    { label: 'Submitted', value: submitted.length, sublabel: 'Done', icon: CheckCircle, color: '#32D583' },
    { label: 'Courses', value: courses.length, sublabel: 'Active', icon: BookOpen, color: '#00D9FF' },
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
    })
    .slice(0, 5);

  const loading = assignmentsQuery.loading || coursesQuery.loading;
  const error = assignmentsQuery.error ?? coursesQuery.error;

  return (
    <AppShell
      page="dashboard"
      onNavigate={onNavigate}
      theme={theme}
      onThemeToggle={onThemeToggle}
      title="CampusSync"
      icon={<Home size={20} />}
      notifications={notifications}
      search={{ value: query, onChange: setQuery, placeholder: 'Search deadlines…' }}
      onBack={{ label: 'Home', onClick: onGoToLanding }}
      actions={
        <div className="flex items-center gap-2">
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
          <Button variant="ghost" size="sm" onClick={onLogout} icon={<LogOut size={15} />} iconPosition="left">
            Logout
          </Button>
        </div>
      }
    >
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">
          {greeting}, {displayName(username)}.
        </h1>
        <p className="text-[var(--text-secondary)]">
          {assignmentsQuery.data?.last_sync
            ? `Last synced with VOLP ${timeAgo(assignmentsQuery.data.last_sync)}.`
            : 'Here’s everything that needs your attention.'}
        </p>
      </motion.div>

      <DataState loading={loading} error={error} onRetry={assignmentsQuery.reload} loadingMessage="Loading your term…" />

      {!loading && !error && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8"
          >
            {metrics.map(metric => (
              <Card key={metric.label} variant="glass" hover>
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${metric.color}20` }}
                  >
                    <metric.icon size={20} style={{ color: metric.color }} />
                  </div>
                  <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                    {metric.label}
                  </span>
                </div>
                <div className="text-3xl font-bold mb-1">
                  {String(metric.value).padStart(2, '0')}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">{metric.sublabel}</div>
              </Card>
            ))}
          </motion.div>

          {scheduled.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-8"
            >
              <Card variant="gradient">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      <CalendarClock size={18} />
                      {scheduled.length} submission{scheduled.length === 1 ? '' : 's'} queued
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Next: {scheduled[0].assignment_name} on {formatDateTime(scheduled[0].scheduled_for)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onNavigate('settings')}>
                    Manage
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Upcoming Deadlines</h2>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('assignments')}>
                  View all
                </Button>
              </div>

              {upcoming.length === 0 ? (
                <Card variant="glass" className="py-10 text-center">
                  <CheckCircle size={36} className="mx-auto mb-3 text-[var(--color-success)]" />
                  <p className="text-[var(--text-secondary)]">
                    {assignments.length === 0
                      ? 'Nothing synced from VOLP yet. Try Sync above.'
                      : query
                        ? `Nothing matches “${query}”.`
                        : 'Nothing pending. You’re all caught up.'}
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {upcoming.map(a => {
                    const level = urgency(a);
                    return (
                      <Card key={a.assignment_id} variant="glass" hover>
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className="text-xs px-2 py-1 rounded-full uppercase tracking-wider"
                                style={{
                                  backgroundColor: `${URGENCY_COLORS[level]}20`,
                                  color: URGENCY_COLORS[level],
                                }}
                              >
                                {level}
                              </span>
                              <span className="text-xs text-[var(--text-secondary)] truncate">
                                {a.course_name}
                              </span>
                            </div>
                            <h3 className="font-medium mb-1">{a.assignment_name}</h3>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
                              <Clock size={14} />
                              {a.due_date ? (
                                <>
                                  <span>{timeRemaining(a.due_date)}</span>
                                  <span>·</span>
                                  <span>{formatDateTime(a.due_date)}</span>
                                </>
                              ) : (
                                <span>No deadline set on VOLP</span>
                              )}
                            </div>
                          </div>

                          <Button
                            variant="primary"
                            size="sm"
                            icon={<Upload size={14} />}
                            iconPosition="left"
                            onClick={() => setScheduling(a)}
                          >
                            Schedule
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Your Academic Circle</h2>
                  <Button variant="ghost" size="sm" onClick={() => onNavigate('friends')} icon={<Users size={14} />} iconPosition="left">
                    All
                  </Button>
                </div>

                <Card variant="glass" className="p-4">
                  {friends.length === 0 ? (
                    <p className="text-sm text-[var(--text-secondary)] text-center py-6">
                      No classmates on CampusSync yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {friends.slice(0, 5).map(friend => (
                        <div
                          key={friend.user_id}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg-surface)] transition-colors"
                        >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white shrink-0"
                            style={{ background: 'linear-gradient(135deg, #7C6CFF, #00D9FF)' }}
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
                  <h2 className="text-lg font-semibold mb-4">Latest from your courses</h2>
                  <Card variant="glass" className="p-4 space-y-3">
                    {announcements.slice(0, 4).map((ann, i) => (
                      <div key={ann.announcement_id ?? i} className="flex gap-3">
                        <Megaphone
                          size={15}
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
