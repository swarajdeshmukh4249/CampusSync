import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Bell, BookOpen, Calendar as CalendarIcon, FileText, Home, Search,
  Settings as SettingsIcon, Users,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import type { NotificationItem } from '../../hooks/useNotifications';
import './shell.css';

export type Page =
  | 'dashboard' | 'courses' | 'assignments' | 'calendar' | 'friends' | 'settings';

const NAV: { page: Page; label: string; icon: ReactNode }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: <Home size={16} /> },
  { page: 'courses', label: 'Courses', icon: <BookOpen size={16} /> },
  { page: 'assignments', label: 'Assignments', icon: <FileText size={16} /> },
  { page: 'calendar', label: 'Calendar', icon: <CalendarIcon size={16} /> },
  { page: 'friends', label: 'Friends', icon: <Users size={16} /> },
];

const TONE_COLORS: Record<NotificationItem['tone'], string> = {
  danger: 'var(--state-danger)',
  warning: 'var(--state-warning)',
  info: 'var(--state-cyan)',
};

interface AppShellProps {
  page: Page;
  onNavigate: (page: Page) => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  /** Short name for the nav capsule. */
  title: string;
  icon: ReactNode;
  /** The page's own headline and standfirst, rendered above the content. */
  heading?: string;
  subheading?: ReactNode;
  /** Small caps line above the headline. */
  eyebrow?: string;
  /** Wire this up to filter the page's own list. Omit for pages without a list. */
  search?: { value: string; onChange: (value: string) => void; placeholder: string };
  notifications?: NotificationItem[];
  /** Extra buttons for the right of the nav bar (e.g. "Refresh"). */
  actions?: ReactNode;
  /** Buttons that belong with the page headline rather than the nav. */
  headActions?: ReactNode;
  onBack?: { label: string; onClick: () => void };
  children: ReactNode;
}

export default function AppShell({
  page, onNavigate, theme, onThemeToggle, title, icon,
  heading, subheading, eyebrow, search, notifications = [], actions, headActions,
  onBack, children,
}: AppShellProps) {
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Close the notification panel on an outside click or Escape.
  useEffect(() => {
    if (!bellOpen) return;
    const onClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setBellOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [bellOpen]);

  return (
    <div className="shell" data-theme={theme}>
      <nav className="shell__nav" aria-label="Primary navigation">
        <div className="shell__brand">
          {onBack && (
            <button
              className="shell__icon-btn"
              onClick={onBack.onClick}
              aria-label={onBack.label}
              title={onBack.label}
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <span className="shell__mark">{icon}</span>
          <span className="shell__title">{title}</span>
        </div>

        <div className="shell__segments" role="tablist">
          {NAV.map(item => {
            const active = page === item.page;
            return (
              <button
                key={item.page}
                role="tab"
                aria-selected={active}
                data-active={active}
                className="shell__segment"
                onClick={() => onNavigate(item.page)}
              >
                {active && (
                  // One shared layoutId makes the pill travel between tabs
                  // instead of blinking out and back in.
                  <motion.span
                    layoutId="shell-active-pill"
                    className="shell__segment-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                {item.icon}
                <span className="shell__segment-label">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="shell__tools">
          {search && (
            <div className="shell__search">
              <Search size={15} />
              <input
                type="search"
                value={search.value}
                onChange={e => search.onChange(e.target.value)}
                placeholder={search.placeholder}
                aria-label={search.placeholder}
              />
            </div>
          )}

          {actions}

          <ThemeToggle theme={theme} onToggle={onThemeToggle} />

          <div className="relative" ref={bellRef}>
            <button
              className="shell__icon-btn"
              onClick={() => setBellOpen(v => !v)}
              aria-label={`Notifications (${notifications.length})`}
              aria-expanded={bellOpen}
              data-active={bellOpen}
            >
              <Bell size={17} />
              {notifications.length > 0 && (
                <span className="shell__badge">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {bellOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                  className="shell__panel custom-scrollbar"
                >
                  <p className="shell__panel-head">Needs attention</p>
                  {notifications.length === 0 ? (
                    <p className="p-4 pt-1 text-sm text-[var(--text-secondary)] text-center">
                      Nothing needs your attention right now.
                    </p>
                  ) : (
                    notifications.map(n => (
                      <button
                        key={n.id}
                        onClick={() => {
                          setBellOpen(false);
                          onNavigate(n.page);
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                          style={{
                            backgroundColor: TONE_COLORS[n.tone],
                            boxShadow: `0 0 10px ${TONE_COLORS[n.tone]}`,
                          }}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium truncate">{n.title}</span>
                          <span className="block text-xs text-[var(--text-secondary)] line-clamp-2">
                            {n.detail}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            className="shell__icon-btn"
            data-active={page === 'settings'}
            onClick={() => onNavigate('settings')}
            aria-label="Settings"
            title="Settings"
          >
            <SettingsIcon size={17} />
          </button>
        </div>
      </nav>

      {/* No z-index here on purpose. `relative z-10` would open a stacking
          context that traps modals rendered inside it below the nav, leaving
          the nav clickable on top of an open dialog. */}
      <main className="shell__main">
        <div className="shell__container">
          {heading && (
            <motion.header
              className="shell__head"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.32, 1] }}
            >
              <div>
                {eyebrow && <p className="eyebrow" style={{ margin: 0 }}><span />{eyebrow}</p>}
                <h1>{heading}</h1>
                {subheading && <p>{subheading}</p>}
              </div>
              {headActions && <div className="flex flex-wrap items-center gap-2">{headActions}</div>}
            </motion.header>
          )}
          {children}
        </div>
      </main>

      {/* Below 900px the segmented control is replaced by a thumb-reachable
          bar rather than a horizontally scrolling row of buttons. */}
      <nav className="shell__tabbar" aria-label="Sections">
        {NAV.map(item => (
          <button
            key={item.page}
            className="shell__tab"
            data-active={page === item.page}
            onClick={() => onNavigate(item.page)}
            aria-label={item.label}
            aria-current={page === item.page ? 'page' : undefined}
          >
            {item.icon}
          </button>
        ))}
        <button
          className="shell__tab"
          data-active={page === 'settings'}
          onClick={() => onNavigate('settings')}
          aria-label="Settings"
        >
          <SettingsIcon size={16} />
        </button>
      </nav>
    </div>
  );
}
