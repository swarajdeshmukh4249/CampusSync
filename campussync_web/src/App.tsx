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
import SplineStage from './components/stage/SplineStage';
import type { StageName } from './components/stage/presets';
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

  // How far down the document we are, 0 → 1. The 3D stage forwards this into
  // the scene so a scroll-driven Spline animation stays in step with the page.
  const [scrollProgress, setScrollProgress] = useState(0);

  // Keep the document in step with the theme so the page background matches
  // even outside the React tree.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const travel = document.body.scrollHeight - window.innerHeight;
      setScrollProgress(travel > 0 ? Math.min(1, window.scrollY / travel) : 0);
    };
    const onScroll = () => {
      // One read per frame — the scroll event fires far faster than we can
      // usefully push a variable into a WebGL scene.
      if (!frame) frame = requestAnimationFrame(measure);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    measure();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [currentPage]);

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
    // Every screen but the landing page starts at the top; carrying a scroll
    // position across a navigation strands you mid-list.
    if (page !== 'landing') window.scrollTo({ top: 0 });
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
    <div data-theme={theme} className="app-root">
      {/* One scene for the whole session. Pages re-frame it; none of them
          mount their own, so navigating never reloads the 3D. */}
      <SplineStage stage={page as StageName} theme={theme} scrollProgress={scrollProgress} />

      <div className="app-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.32, 1] }}
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
    </div>
  );
}
