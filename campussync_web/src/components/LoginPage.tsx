import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Orbit, Lock, User, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { api } from '../api';
import ThemeToggle from './ui/ThemeToggle';

interface Props {
    onLoginSuccess: (userId: number, username: string) => void;
    onBack: () => void;
    theme: 'dark' | 'light';
    onThemeToggle: () => void;
}

export default function LoginPage({ onLoginSuccess, onBack, theme, onThemeToggle }: Props) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'idle' | 'connecting' | 'syncing' | 'done'>('idle');

    const steps = [
        { key: 'connecting', label: 'Connecting to VOLP...' },
        { key: 'syncing', label: 'Syncing your assignments...' },
        { key: 'done', label: 'All set! Opening your dashboard...' },
    ];

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);
        setStep('connecting');

        try {
            // The login call is what actually connects and syncs, so move to
            // "syncing" as soon as it is in flight rather than on a timer.
            setStep('syncing');
            const data = await api.login(username, password);

            setStep('done');
            await new Promise(r => setTimeout(r, 600));

            onLoginSuccess(data.user_id, data.username);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not sign in');
            setLoading(false);
            setStep('idle');
        }
    }

    return (
        <div data-theme={theme} className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-6 left-6 z-10">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <ArrowLeft size={16} /> Back
                </button>
            </div>
            <div className="absolute top-6 right-6 z-10">
                <ThemeToggle theme={theme} onToggle={onThemeToggle} />
            </div>
            {/* Ambient glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#6C63FF]/10 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#00D9FF]/5 rounded-full blur-[120px] pointer-events-none" />

            <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full max-w-md"
              >
                {/* Logo */}
                <div className="text-center mb-10">
                    <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                        className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#6C63FF] to-[#00D9FF] items-center justify-center mb-4 shadow-[0_0_40px_rgba(108,99,255,0.4)]"
                    >
                        <Orbit className="text-white w-7 h-7" />
                    </motion.div>
                    <h1 className="text-2xl font-semibold tracking-tight">Welcome to CampusSync</h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-2">Sign in with your VOLP credentials</p>
                </div>

                {/* Card */}
                <div className="bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-3xl p-8 shadow-2xl">

                    <AnimatePresence mode="wait">
                        {loading ? (
                            // Loading state
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center gap-6 py-6"
                            >
                                <div className="relative w-16 h-16">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                        className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#6C63FF] border-r-[#00D9FF]"
                                    />
                                    <div className="absolute inset-2 rounded-full bg-[#6C63FF]/10 flex items-center justify-center">
                                        <Orbit className="w-5 h-5 text-[#6C63FF]" />
                                    </div>
                                </div>
                                <div className="space-y-3 w-full">
                                    {steps.map((s, i) => {
                                        const stepIdx = steps.findIndex(st => st.key === step);
                                        const thisIdx = i;
                                        const isDone = thisIdx < stepIdx || step === 'done';
                                        const isActive = s.key === step && step !== 'done';

                                        return (
                                            <motion.div
                                                key={s.key}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: thisIdx <= stepIdx ? 1 : 0.3, x: 0 }}
                                                transition={{ delay: i * 0.2 }}
                                                className="flex items-center gap-3"
                                            >
                                                {isDone ? (
                                                    <CheckCircle className="w-4 h-4 text-[#32D583] shrink-0" />
                                                ) : isActive ? (
                                                    <Loader2 className="w-4 h-4 text-[#6C63FF] animate-spin shrink-0" />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
                                                )}
                                                <span className={`text-sm ${isDone || isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                                    {s.label}
                                                </span>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        ) : (
                            // Form state
                            <motion.form
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onSubmit={handleLogin}
                                className="space-y-5"
                            >
                                {/* Error */}
                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8, height: 0 }}
                                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                                            exit={{ opacity: 0, y: -8, height: 0 }}
                                            className="flex items-center gap-2.5 p-3.5 bg-[#FF5C7A]/10 border border-[#FF5C7A]/20 rounded-xl text-sm text-[#FF5C7A]"
                                        >
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            {error}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Username */}
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        placeholder="VOLP username or email"
                                        autoComplete="username"
                                        required
                                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[#6C63FF]/60 focus:bg-[#6C63FF]/5 transition-all"
                                    />
                                </div>

                                {/* Password */}
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="VOLP password"
                                        autoComplete="current-password"
                                        required
                                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl pl-11 pr-12 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[#6C63FF]/60 focus:bg-[#6C63FF]/5 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-white/70 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                {/* Privacy notice */}
                                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                    🔒 CampusSync stores your VOLP login <strong className="text-[var(--text-primary)]">encrypted</strong>, so it can
                                    sign in and hand in your assignments at the times you schedule — your
                                    session alone expires too quickly for that. You can delete it any
                                    time from Settings.
                                </p>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    className="w-full py-3.5 bg-gradient-to-r from-[#6C63FF] to-[#00D9FF] rounded-xl font-medium text-white shadow-[0_0_30px_rgba(108,99,255,0.3)] hover:opacity-90 hover:shadow-[0_0_50px_rgba(108,99,255,0.5)] hover:scale-[1.01] active:scale-[0.99] transition-all text-sm"
                                >
                                    Sign in & Sync VOLP →
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>

                <p className="text-center text-xs text-[var(--text-secondary)] mt-6">
                    CampusSync is not affiliated with VIT or VOLP. Use at your own discretion.
                </p>
            </motion.div>
        </div>
    );
}
