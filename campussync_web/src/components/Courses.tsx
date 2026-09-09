import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, ChevronRight, Clock, FileText, Megaphone, Paperclip, RefreshCw, User,
} from 'lucide-react';
import { API_BASE, api } from '../api';
import Card from './ui/Card';
import Button from './ui/Button';
import DataState from './ui/DataState';
import AppShell from './ui/AppShell';
import type { Page } from './ui/AppShell';
import { useApiData } from '../hooks/useApiData';
import { useNotifications } from '../hooks/useNotifications';
import { courseColor, formatDateTime, timeAgo, timeRemaining } from '../lib/format';

interface CoursesProps {
  userId: number;
  username: string;
  onNavigate: (page: Page) => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

export default function Courses({ userId, onNavigate, theme, onThemeToggle }: CoursesProps) {
  const [query, setQuery] = useState('');
  const [openCourse, setOpenCourse] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const notifications = useNotifications(userId);
  const { data, loading, error, reload } = useApiData(() => api.courses(userId), [userId]);
  const materials = useApiData(() => api.materials(userId), [userId]);
  const announcements = useApiData(() => api.announcements(userId), [userId]);

  const courses = useMemo(() => data?.courses ?? [], [data]);

  async function handleSync() {
    setSyncing(true);
    try {
      await api.refresh(userId);
    } finally {
      await Promise.all([reload(false), materials.reload(false), announcements.reload(false)]);
      setSyncing(false);
    }
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return courses;
    return courses.filter(
      c =>
        c.title.toLowerCase().includes(needle) ||
        c.instructor.toLowerCase().includes(needle) ||
        c.course_name.toLowerCase().includes(needle),
    );
  }, [courses, query]);

  const totals = useMemo(
    () => ({
      courses: courses.length,
      assignments: courses.reduce((n, c) => n + c.assignment_count, 0),
      pending: courses.reduce((n, c) => n + c.pending_count, 0),
      progress: courses.length
        ? Math.round(courses.reduce((n, c) => n + c.progress, 0) / courses.length)
        : 0,
    }),
    [courses],
  );

  return (
    <AppShell
      page="courses"
      onNavigate={onNavigate}
      theme={theme}
      onThemeToggle={onThemeToggle}
      title="Courses"
      icon={<BookOpen size={20} />}
      notifications={notifications}
      search={{ value: query, onChange: setQuery, placeholder: 'Search courses…' }}
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
        <h1 className="text-3xl font-semibold mb-2">Your Courses</h1>
        <p className="text-[var(--text-secondary)]">
          Active courses on VOLP{data?.last_sync ? ` · last synced ${timeAgo(data.last_sync)}` : ''}
        </p>
      </motion.div>

      <DataState loading={loading} error={error} onRetry={reload} loadingMessage="Loading your courses…" />

      {!loading && !error && (
        <>
          {courses.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Stat label="Active Courses" value={totals.courses} color="#7C6CFF" />
              <Stat label="Assignments" value={totals.assignments} color="#00D9FF" />
              <Stat label="Still Pending" value={totals.pending} color="#FFB84D" />
              <Stat label="Avg Progress" value={`${totals.progress}%`} color="#32D583" />
            </div>
          )}

          {visible.length === 0 ? (
            <Card variant="glass" className="py-12 text-center">
              <p className="text-[var(--text-secondary)]">
                {courses.length === 0
                  ? 'No active courses synced from VOLP yet. Try Sync above.'
                  : `No course matches “${query}”.`}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visible.map(course => {
                const key = `${course.crsid}_${course.colid}`;
                const color = courseColor(key);
                const isOpen = openCourse === key;
                const courseMaterials = (materials.data?.materials ?? []).filter(
                  m => m.course_name === course.title,
                );
                const courseAnnouncements = (announcements.data?.announcements ?? []).filter(
                  a => a.course_name === course.title,
                );

                return (
                  <Card key={key} variant="glass" className="flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${color}20`, color }}
                      >
                        <BookOpen size={24} />
                      </div>
                      {course.pending_count > 0 && (
                        <span
                          className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{ backgroundColor: '#FFB84D20', color: '#FFB84D' }}
                        >
                          {course.pending_count} pending
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold mb-1">{course.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-4 flex items-center gap-1.5">
                      <User size={13} /> {course.instructor}
                    </p>

                    <div className="space-y-3 flex-1">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[var(--text-secondary)]">Progress</span>
                          <span className="font-medium">{course.progress}%</span>
                        </div>
                        <div className="h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${course.progress}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <FileText size={14} />
                        {course.assignment_count} assignment{course.assignment_count === 1 ? '' : 's'}
                      </div>

                      {course.next_deadline && (
                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <Clock size={14} />
                          Next due in {timeRemaining(course.next_deadline)}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setOpenCourse(isOpen ? null : key)}
                      className="mt-4 pt-4 border-t border-[var(--border-color)] flex items-center justify-between w-full text-sm hover:text-[var(--color-accent)] transition-colors"
                    >
                      <span className="text-[var(--text-secondary)]">
                        {courseMaterials.length} material{courseMaterials.length === 1 ? '' : 's'} ·{' '}
                        {courseAnnouncements.length} announcement
                        {courseAnnouncements.length === 1 ? '' : 's'}
                      </span>
                      <ChevronRight
                        size={16}
                        className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}
                      />
                    </button>

                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 space-y-3 text-sm overflow-hidden"
                      >
                        {courseAnnouncements.length > 0 && (
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                              <Megaphone size={12} /> Announcements
                            </p>
                            <ul className="space-y-1.5">
                              {courseAnnouncements.slice(0, 4).map((a, i) => (
                                <li key={a.announcement_id ?? i} className="text-[var(--text-secondary)]">
                                  <span className="text-[var(--text-primary)]">{a.title || 'Announcement'}</span>
                                  {a.content && <span className="block text-xs line-clamp-2">{a.content}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {courseMaterials.length > 0 && (
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                              <Paperclip size={12} /> Materials
                            </p>
                            <ul className="space-y-1.5">
                              {courseMaterials.slice(0, 6).map(m => (
                                <li key={m.material_id}>
                                  <a
                                    href={`${API_BASE}${m.download_url}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[var(--color-accent)] hover:underline inline-flex items-center gap-1.5"
                                  >
                                    <Paperclip size={12} /> {m.title}
                                  </a>
                                  {m.uploaded_date && (
                                    <span className="text-xs text-[var(--text-secondary)] ml-2">
                                      {formatDateTime(m.uploaded_date)}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {courseMaterials.length === 0 && courseAnnouncements.length === 0 && (
                          <p className="text-[var(--text-secondary)] text-xs">
                            Nothing synced from VOLP for this course yet.
                          </p>
                        )}
                      </motion.div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <Card variant="glass" className="text-center">
      <div className="text-3xl font-bold mb-1" style={{ color }}>
        {value}
      </div>
      <div className="text-sm text-[var(--text-secondary)]">{label}</div>
    </Card>
  );
}
