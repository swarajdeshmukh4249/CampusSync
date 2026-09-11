import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, ChevronDown, Clock, FileText, Megaphone, Paperclip, RefreshCw, User,
} from 'lucide-react';
import { API_BASE, api } from '../api';
import Card from './ui/Card';
import Button from './ui/Button';
import DataState from './ui/DataState';
import AppShell from './ui/AppShell';
import type { Page } from './ui/AppShell';
import { Badge, Empty, Meter, Metric } from './ui/Bits';
import { useApiData } from '../hooks/useApiData';
import { useNotifications } from '../hooks/useNotifications';
import { courseColor, formatDateTime, timeAgo, timeRemaining, tint } from '../lib/format';

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
      icon={<BookOpen size={18} />}
      notifications={notifications}
      search={{ value: query, onChange: setQuery, placeholder: 'Search courses…' }}
      onBack={{ label: 'Dashboard', onClick: () => onNavigate('dashboard') }}
      eyebrow="This term"
      heading="Your courses"
      subheading={`Active on VOLP${data?.last_sync ? ` · last synced ${timeAgo(data.last_sync)}` : ''}`}
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
      <DataState loading={loading} error={error} onRetry={reload} loadingMessage="Loading your courses…" skeletonRows={3} />

      {!loading && !error && (
        <>
          {courses.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7">
              <Metric index={0} label="Active" value={totals.courses} sublabel="Courses" color="var(--state-accent)" icon={<BookOpen size={17} />} />
              <Metric index={1} label="Total" value={totals.assignments} sublabel="Assignments" color="var(--state-cyan)" icon={<FileText size={17} />} />
              <Metric index={2} label="Open" value={totals.pending} sublabel="Still pending" color="var(--state-warning)" icon={<Clock size={17} />} />
              <Metric index={3} label="Average" value={`${totals.progress}%`} sublabel="Term progress" color="var(--state-success)" />
            </div>
          )}

          {visible.length === 0 ? (
            <Empty
              icon={<BookOpen size={22} />}
              title={courses.length === 0 ? 'No courses synced yet' : 'No match'}
              body={
                courses.length === 0
                  ? 'CampusSync has not found any active course on VOLP. Hit “Sync VOLP” above.'
                  : `No course matches “${query}”.`
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visible.map((course, i) => {
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
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.45, ease: [0.22, 1, 0.32, 1] }}
                  >
                    <Card variant="glass" padding="md" edge={color} className="h-full flex flex-col">
                      {/* Each course carries its own colour everywhere in the
                          app; here it also tints the card's own light. */}
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 opacity-[0.07] pointer-events-none"
                        style={{ background: `radial-gradient(circle at 12% 0%, ${color}, transparent 60%)` }}
                      />

                      <div className="relative flex items-start justify-between gap-3 mb-4">
                        <span
                          className="w-11 h-11 rounded-xl grid place-items-center shrink-0"
                          style={{ backgroundColor: tint(color, 12), color }}
                        >
                          <BookOpen size={21} />
                        </span>
                        {course.pending_count > 0 && (
                          <Badge color="var(--state-warning)">{course.pending_count} pending</Badge>
                        )}
                      </div>

                      <h3 className="relative text-[17px] font-semibold tracking-[-0.02em] mb-1.5">
                        {course.title}
                      </h3>
                      <p className="relative text-[13px] text-[var(--text-secondary)] mb-5 flex items-center gap-1.5">
                        <User size={13} /> {course.instructor}
                      </p>

                      <div className="relative space-y-3.5 flex-1">
                        <div>
                          <div className="flex justify-between text-xs mb-2">
                            <span className="text-[var(--text-tertiary)] uppercase tracking-[0.14em] text-[9.5px]">
                              Progress
                            </span>
                            <span className="numeric font-medium" style={{ color }}>{course.progress}%</span>
                          </div>
                          <Meter value={course.progress} color={color} />
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--text-secondary)]">
                          <span className="flex items-center gap-1.5">
                            <FileText size={13} />
                            {course.assignment_count} assignment{course.assignment_count === 1 ? '' : 's'}
                          </span>
                          {course.next_deadline && (
                            <span className="flex items-center gap-1.5">
                              <Clock size={13} />
                              Next in {timeRemaining(course.next_deadline)}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => setOpenCourse(isOpen ? null : key)}
                        aria-expanded={isOpen}
                        className="relative mt-5 pt-4 border-t border-[var(--border-color)] flex items-center justify-between w-full text-[12.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        <span>
                          {courseMaterials.length} material{courseMaterials.length === 1 ? '' : 's'} ·{' '}
                          {courseAnnouncements.length} announcement
                          {courseAnnouncements.length === 1 ? '' : 's'}
                        </span>
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="relative mt-4 space-y-4 text-sm overflow-hidden"
                        >
                          {courseAnnouncements.length > 0 && (
                            <div>
                              <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)] mb-2.5 flex items-center gap-1.5">
                                <Megaphone size={12} /> Announcements
                              </p>
                              <ul className="space-y-2">
                                {courseAnnouncements.slice(0, 4).map((a, index) => (
                                  <li key={a.announcement_id ?? index} className="text-[var(--text-secondary)]">
                                    <span className="text-[var(--text-primary)] text-[13px]">
                                      {a.title || 'Announcement'}
                                    </span>
                                    {a.content && <span className="block text-xs line-clamp-2">{a.content}</span>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {courseMaterials.length > 0 && (
                            <div>
                              <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)] mb-2.5 flex items-center gap-1.5">
                                <Paperclip size={12} /> Materials
                              </p>
                              <ul className="space-y-1.5">
                                {courseMaterials.slice(0, 6).map(m => (
                                  <li key={m.material_id} className="text-[13px]">
                                    <a
                                      href={`${API_BASE}${m.download_url}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[var(--color-accent)] hover:underline inline-flex items-center gap-1.5"
                                    >
                                      <Paperclip size={12} /> {m.title}
                                    </a>
                                    {m.uploaded_date && (
                                      <span className="text-xs text-[var(--text-tertiary)] ml-2">
                                        {formatDateTime(m.uploaded_date)}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {courseMaterials.length === 0 && courseAnnouncements.length === 0 && (
                            <p className="text-[var(--text-tertiary)] text-xs">
                              Nothing synced from VOLP for this course yet.
                            </p>
                          )}
                        </motion.div>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
