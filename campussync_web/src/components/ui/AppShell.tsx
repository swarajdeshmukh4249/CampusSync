import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Bell, BookOpen, Calendar as CalendarIcon, FileText, Home, Search,
  Settings as SettingsIcon, Users,
} from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import AcademicOrbit from '../3d/AcademicOrbit';
import ThemeToggle from './ThemeToggle';
import Button from './Button';
import type { NotificationItem } from '../../hooks/useNotifications';

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
  danger: '#FF5C7A',
  warning: '#FFB84D',
  info: '#00D9FF',
};

interface AppShellProps {
  page: Page;
  onNavigate: (page: Page) => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  title: string;
  icon: ReactNode;
  /** Wire this up to filter the page's own list. Omit for pages without a list. */
  search?: { value: string; onChange: (value: string) => void; placeholder: string };
  notifications?: NotificationItem[];
  /** Extra buttons for the right of the nav bar (e.g. "Refresh"). */
  actions?: ReactNode;
  onBack?: { label: string; onClick: () => void };
  children: ReactNode;
}

export default function AppShell({
  page, onNavigate, theme, onThemeToggle, title, icon,
  search, notifications = [], actions, onBack, children,
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
    <div
      data-theme={theme}
      className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] relative overflow-hidden"
    >
      <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 12], fov: 44 }} dpr={[1, 1.5]}>
          <AcademicOrbit theme={theme} />
        </Canvas>
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-3 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-3 shrink-0">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack.onClick} icon={<ArrowLeft size={16} />} iconPosition="left">
                {onBack.label}
              </Button>
            )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C6CFF] to-[#00D9FF] flex items-center justify-center text-white">
              {icon}
            </div>
            <span className="font-semibold text-lg hidden sm:inline">{title}</span>
          </div>

          <div className="order-last w-full flex items-center gap-1 overflow-x-auto xl:order-none xl:w-auto">
            {NAV.map(item => (
              <Button
                key={item.page}
                variant={page === item.page ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onNavigate(item.page)}
                icon={item.icon}
                iconPosition="left"
                className="whitespace-nowrap"
              >
                {item.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {search && (
              <div className="relative hidden lg:block">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  type="search"
                  value={search.value}
                  onChange={e => search.onChange(e.target.value)}
                  placeholder={search.placeholder}
                  aria-label={search.placeholder}
                  className="pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] w-56"
                />
              </div>
            )}

            {actions}

            <ThemeToggle theme={theme} onToggle={onThemeToggle} />

            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellOpen(v => !v)}
                aria-label={`Notifications (${notifications.length})`}
                aria-expanded={bellOpen}
                className="relative p-2 rounded-xl hover:bg-[var(--bg-surface)] transition-colors"
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center text-[10px] font-semibold text-white bg-[var(--color-danger)] rounded-full">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {bellOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-color)] shadow-2xl p-2 z-50"
                  >
                    {notifications.length === 0 ? (
                      <p className="p-4 text-sm text-[var(--text-secondary)] text-center">
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
                          className="w-full text-left p-3 rounded-xl hover:bg-[var(--bg-surface)] transition-colors flex gap-3"
                        >
                          <span
                            className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                            style={{ backgroundColor: TONE_COLORS[n.tone] }}
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

            <Button
              variant={page === 'settings' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onNavigate('settings')}
              icon={<SettingsIcon size={16} />}
              iconPosition="left"
              className="!px-2"
              ariaLabel="Settings"
              title="Settings"
            >
              <span className="sr-only">Settings</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* No z-index here on purpose. `relative z-10` would open a stacking
          context that traps modals rendered inside it below the z-50 nav,
          leaving the nav clickable on top of an open dialog. Positioned and
          auto-indexed, main still paints above the z-0 background canvas. */}
      <main className="relative pt-36 xl:pt-28 px-6 pb-12">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
