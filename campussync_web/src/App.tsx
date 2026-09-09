import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import Courses from './components/Courses';
import Assignments from './components/Assignments';
import Calendar from './components/Calendar';
import Friends from './components/Friends';

type Page = 'landing' | 'login' | 'dashboard' | 'courses' | 'assignments' | 'calendar' | 'friends';

export default function App() {
  const [userId, setUserId] = useState<number | null>(() => {
    const stored = localStorage.getItem('cs_user_id');
    return stored ? Number(stored) : null;
  });
  const [username, setUsername] = useState<string>(() => localStorage.getItem('cs_username') || '');
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const stored = localStorage.getItem('cs_page');
    return (stored as Page) || 'landing';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('cs_theme') as 'dark' | 'light') || 'dark');

  function toggleTheme() {
    setTheme(current => {
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('cs_theme', next);
      return next;
    });
  }

  function handleLoginSuccess(id: number, name: string) {
    setUserId(id);
    setUsername(name);
    setCurrentPage('dashboard');
    localStorage.setItem('cs_page', 'dashboard');
  }

  function handleLogout() {
    localStorage.removeItem('cs_user_id');
    localStorage.removeItem('cs_username');
    setUserId(null);
    setUsername('');
    setCurrentPage('landing');
    localStorage.setItem('cs_page', 'landing');
  }

  function navigateTo(page: Page) {
    setCurrentPage(page);
    localStorage.setItem('cs_page', page);
  }

  function goToLanding() {
    setCurrentPage('landing');
    localStorage.setItem('cs_page', 'landing');
  }

  return (
    <div data-theme={theme}>
      <AnimatePresence mode="wait">
        {currentPage === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LandingPage onEnter={() => navigateTo('login')} theme={theme} onThemeToggle={toggleTheme} />
          </motion.div>
        )}
        
        {currentPage === 'login' && (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoginPage onLoginSuccess={handleLoginSuccess} />
          </motion.div>
        )}
        
        {userId && currentPage === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Dashboard 
              userId={userId} 
              username={username} 
              onLogout={handleLogout}
              onNavigate={navigateTo}
              onGoToLanding={goToLanding}
              theme={theme}
              onThemeToggle={toggleTheme}
            />
          </motion.div>
        )}
        
        {userId && currentPage === 'courses' && (
          <motion.div key="courses" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Courses 
              userId={userId} 
              username={username}
              onNavigate={navigateTo}
              theme={theme}
              onThemeToggle={toggleTheme}
            />
          </motion.div>
        )}
        
        {userId && currentPage === 'assignments' && (
          <motion.div key="assignments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Assignments 
              userId={userId} 
              username={username}
              onNavigate={navigateTo}
              theme={theme}
              onThemeToggle={toggleTheme}
            />
          </motion.div>
        )}
        
        {userId && currentPage === 'calendar' && (
          <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Calendar 
              userId={userId} 
              username={username}
              onNavigate={navigateTo}
              theme={theme}
              onThemeToggle={toggleTheme}
            />
          </motion.div>
        )}
        
        {userId && currentPage === 'friends' && (
          <motion.div key="friends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Friends 
              userId={userId} 
              username={username}
              onNavigate={navigateTo}
              theme={theme}
              onThemeToggle={toggleTheme}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
