import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';

export default function App() {
  const [userId, setUserId] = useState<number | null>(() => {
    const stored = localStorage.getItem('cs_user_id');
    return stored ? Number(stored) : null;
  });
  const [username, setUsername] = useState<string>(() => localStorage.getItem('cs_username') || '');

  function handleLoginSuccess(id: number, name: string) {
    setUserId(id);
    setUsername(name);
  }

  function handleLogout() {
    localStorage.removeItem('cs_user_id');
    localStorage.removeItem('cs_username');
    setUserId(null);
    setUsername('');
  }

  return (
    <AnimatePresence mode="wait">
      {userId ? (
        <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Dashboard userId={userId} username={username} onLogout={handleLogout} />
        </motion.div>
      ) : (
        <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
