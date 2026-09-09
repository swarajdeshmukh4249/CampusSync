import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import Courses from './components/Courses';
import Assignments from './components/Assignments';
import Calendar from './components/Calendar';
import Friends from './components/Friends';
import Settings from './components/Settings';
import type { Page as AppPage } from './components/ui/AppShell';

type Page = 'landing' | 'login' | AppPage;

const SIGNED_IN_PAGES: Page[] = [
  'dashboard', 'courses', 'assignments', 'calendar', 'friends', 'settings',
];

function storedUserId(): number | null {
  const raw = localStorage.getItem('cs_user_id');
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export default function App() {
  const [userId, setUserId] = useState<number | null>(storedUserId);
  const [username, setUsername] = useState<string>(() => localStorage.getItem('cs_username') || '');

  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const stored = (localStorage.getItem('cs_page') as Page) || 'landing';
    // A signed-out visitor with a stale page saved used to land on a route that
    // rendered nothing at all — a blank screen with no way back.
    if (SIGNED_IN_PAGES.includes(stored) && storedUserId() === null) return 'landing';
    return stored;
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('cs_theme') as 'dark' | 'light') || 'dark',
  );

  // Keep the document in step with the theme so the page background matches
  // even outside the React tree.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(current => {
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('cs_theme', next);
      return next;
    });
  }

  function navigateTo(page: Page) {
    setCurrentPage(page);
    localStorage.setItem('cs_page', page);
  }

  function handleLoginSuccess(id: number, name: string) {
    localStorage.setItem('cs_user_id', String(id));
    localStorage.setItem('cs_username', name);
    setUserId(id);
    setUsername(name);
    navigateTo('dashboard');
  }

  function handleLogout() {
    localStorage.removeItem('cs_user_id');
    localStorage.removeItem('cs_username');
    setUserId(null);
    setUsername('');
    navigateTo('landing');
  }

  // Anything behind the login wall falls back to the landing page rather than
  // rendering nothing.
  const page: Page = SIGNED_IN_PAGES.includes(currentPage) && userId === null ? 'landing' : currentPage;

  const shared = {
    theme,
    onThemeToggle: toggleTheme,
    onNavigate: navigateTo as (p: AppPage) => void,
  };

  return (
    <div data-theme={theme}>
      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {page === 'landing' && (
            <LandingPage onEnter={() => navigateTo(userId ? 'dashboard' : 'login')} theme={theme} onThemeToggle={toggleTheme} />
          )}

          {page === 'login' && (
            <LoginPage
              onLoginSuccess={handleLoginSuccess}
              onBack={() => navigateTo('landing')}
              theme={theme}
              onThemeToggle={toggleTheme}
            />
          )}

          {userId !== null && page === 'dashboard' && (
            <Dashboard
              userId={userId}
              username={username}
              onLogout={handleLogout}
              onGoToLanding={() => navigateTo('landing')}
              {...shared}
            />
          )}

          {userId !== null && page === 'courses' && (
            <Courses userId={userId} username={username} {...shared} />
          )}

          {userId !== null && page === 'assignments' && (
            <Assignments userId={userId} username={username} {...shared} />
          )}

          {userId !== null && page === 'calendar' && (
            <Calendar userId={userId} username={username} {...shared} />
          )}

          {userId !== null && page === 'friends' && (
            <Friends userId={userId} username={username} {...shared} />
          )}

          {userId !== null && page === 'settings' && (
            <Settings userId={userId} username={username} onLogout={handleLogout} {...shared} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
