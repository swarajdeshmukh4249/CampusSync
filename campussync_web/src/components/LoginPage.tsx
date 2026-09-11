import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertCircle, ArrowLeft, CheckCircle, Eye, EyeOff, Loader2, Lock, Orbit, ShieldCheck, User,
} from 'lucide-react';
import { api } from '../api';
import ThemeToggle from './ui/ThemeToggle';
import Button from './ui/Button';

interface Props {
    onLoginSuccess: (userId: number, username: string) => void;
    onBack: () => void;
    theme: 'dark' | 'light';
    onThemeToggle: () => void;
}

const STEPS = [
    { key: 'connecting', label: 'Connecting to VOLP' },
    { key: 'syncing', label: 'Syncing your courses and assignments' },
    { key: 'done', label: 'All set — opening your dashboard' },
];

export default function LoginPage({ onLoginSuccess, onBack, theme, onThemeToggle }: Props) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'idle' | 'connecting' | 'syncing' | 'done'>('idle');

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

    const field =
        'w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-sunken)] ' +
        'py-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] ' +
        'transition-[border-color,background,box-shadow] duration-200 focus:outline-none ' +
        'focus:border-[rgba(124,108,255,0.6)] focus:bg-[var(--bg-surface)] ' +
        'focus:shadow-[0_0_0_4px_rgba(124,108,255,0.12)]';

    return (
        <div className="login-page min-h-screen flex items-center justify-center p-5 relative">
            <div className="fixed top-5 left-5 z-20">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-full text-sm text-[var(--text-secondary)] border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl hover:text-[var(--text-primary)] transition-colors"
                >
                    <ArrowLeft size={15} /> Back
                </button>
            </div>
            <div className="fixed top-5 right-5 z-20">
                <ThemeToggle theme={theme} onToggle={onThemeToggle} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 26, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.32, 1] }}
                className="w-full max-w-[420px]"
            >
                <div className="text-center mb-8">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
                        className="inline-flex w-14 h-14 rounded-2xl bg-[image:var(--gradient-orbit)] items-center justify-center mb-5 shadow-[0_10px_40px_rgba(124,108,255,0.45)]"
                    >
                        <Orbit className="text-white w-7 h-7" />
                    </motion.div>
                    <h1 className="text-[26px] font-semibold tracking-[-0.035em]">Welcome back</h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-2">
                        Sign in with your VOLP credentials to sync your term.
                    </p>
                </div>

                {/* Opaque on purpose: this card holds a password field and has to
                    stay legible whatever the scene behind it is doing. */}
                <div className="panel-opaque rounded-[28px] p-7 shadow-[var(--glass-edge),var(--shadow-xl)]">
                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center gap-7 py-4"
                            >
                                <div className="relative w-16 h-16">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                                        className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#7C6CFF] border-r-[#34E0FF]"
                                    />
                                    <div className="absolute inset-2 rounded-full bg-[rgba(124,108,255,0.12)] flex items-center justify-center">
                                        <Orbit className="w-5 h-5 text-[#7C6CFF]" />
                                    </div>
                                </div>

                                <div className="space-y-3.5 w-full">
                                    {STEPS.map((s, i) => {
                                        const stepIdx = STEPS.findIndex(st => st.key === step);
                                        const isDone = i < stepIdx || step === 'done';
                                        const isActive = s.key === step && step !== 'done';

                                        return (
                                            <motion.div
                                                key={s.key}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: i <= stepIdx ? 1 : 0.32, x: 0 }}
                                                transition={{ delay: i * 0.15 }}
                                                className="flex items-center gap-3"
                                            >
                                                {isDone ? (
                                                    <CheckCircle className="w-4 h-4 text-[var(--color-success)] shrink-0" />
                                                ) : isActive ? (
                                                    <Loader2 className="w-4 h-4 text-[#7C6CFF] animate-spin shrink-0" />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full border border-[var(--border-strong)] shrink-0" />
                                                )}
                                                <span className={`text-sm ${isDone || isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                                                    {s.label}
                                                </span>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.form
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onSubmit={handleLogin}
                                className="space-y-4"
                            >
                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8, height: 0 }}
                                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                                            exit={{ opacity: 0, y: -8, height: 0 }}
                                            className="flex items-start gap-2.5 p-3.5 bg-[rgba(255,92,122,0.1)] border border-[rgba(255,92,122,0.24)] rounded-xl text-sm text-[var(--color-danger)]"
                                        >
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                            {error}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        placeholder="VOLP username or email"
                                        autoComplete="username"
                                        required
                                        className={`${field} pl-11 pr-4`}
                                    />
                                </div>

                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="VOLP password"
                                        autoComplete="current-password"
                                        required
                                        className={`${field} pl-11 pr-12`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                <div className="flex gap-2.5 p-3.5 rounded-xl bg-[var(--bg-sunken)] border border-[var(--border-color)]">
                                    <ShieldCheck size={15} className="shrink-0 mt-0.5 text-[var(--color-success)]" />
                                    <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                                        Your VOLP login is stored <strong className="text-[var(--text-primary)] font-medium">encrypted</strong> so
                                        CampusSync can sign in and hand in your assignments at the times you
                                        schedule — a session alone expires long before then. Delete it any time
                                        from Settings.
                                    </p>
                                </div>

                                <Button type="submit" variant="primary" size="lg" className="w-full">
                                    Sign in &amp; sync VOLP
                                </Button>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>

                <p className="text-center text-[11.5px] text-[var(--text-tertiary)] mt-6">
                    CampusSync is not affiliated with VIT or VOLP. Use at your own discretion.
                </p>
            </motion.div>
        </div>
    );
}
