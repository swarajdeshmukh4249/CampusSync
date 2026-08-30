import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'dark' | 'light';
  onToggle: () => void;
  isPulsing?: boolean;
}

export default function ThemeToggle({ theme, onToggle, isPulsing = false }: ThemeToggleProps) {
  return (
    <>
      {isPulsing && (
        <motion.div
          className="fixed top-6 right-24 w-16 h-16 rounded-full pointer-events-none z-50"
          initial={{ scale: 1, opacity: 0.9 }}
          animate={{ scale: 65, opacity: 0 }}
          transition={{ duration: 0.82, ease: [0.2, 0.8, 0.2, 1] }}
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.88), rgba(124,108,255,0.5) 30%, transparent 70%)',
            mixBlendMode: 'screen'
          }}
        />
      )}
      
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggle}
        className="relative w-9 h-9 rounded-xl border border-[var(--border-color)] bg-[var(--glass-bg)] backdrop-blur-md flex items-center justify-center transition-all duration-300 hover:shadow-lg"
        aria-label="Switch theme"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={theme}
            initial={{ y: -20, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 20, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.2 }}
            className="text-[var(--text-primary)]"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </motion.div>
        </AnimatePresence>
      </motion.button>
    </>
  );
}