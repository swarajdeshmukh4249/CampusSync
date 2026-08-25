import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Orbit, Lock, User, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../api';

interface Props {
    onLoginSuccess: (userId: number, username: string) => void;
}

export default function LoginPage({ onLoginSuccess }: Props) {
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
            // Simulate pipeline steps for UX
            await delay(900);
            setStep('syncing');

            const data = await api.login(username, password);

            setStep('done');
            await delay(900);

            localStorage.setItem('cs_user_id', String(data.user_id));
            localStorage.setItem('cs_username', data.username);

            onLoginSuccess(data.user_id, data.username);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
            setStep('idle');
        }
    }

    function delay(ms: number) {
        return new Promise(r => setTimeout(r, ms));
    }

    return (
        <div className="min-h-screen bg-[#05070B] flex items-center justify-center p-4 relative overflow-hidden">
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
                    <h1 className="text-2xl font-semibold text-white tracking-tight">Welcome to CampusSync</h1>
                    <p className="text-sm text-white/40 mt-2">Sign in with your VOLP credentials</p>
                </div>

                {/* Card */}
                <div className="bg-[#090D14] border border-white/10 rounded-3xl p-8 shadow-2xl">

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
                                                <span className={`text-sm ${isDone ? 'text-white/80' : isActive ? 'text-white' : 'text-white/30'}`}>
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
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        placeholder="VOLP Username (e.g. swaraj.1251070064@vit.edu)"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#6C63FF]/60 focus:bg-[#6C63FF]/5 transition-all"
                                    />
                                </div>

                                {/* Password */}
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="VOLP Password"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-12 py-3.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#6C63FF]/60 focus:bg-[#6C63FF]/5 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                {/* Privacy notice */}
                                <p className="text-[11px] text-white/30 leading-relaxed">
                                    🔒 Your password is <strong className="text-white/50">never stored</strong>. CampusSync uses it once to log into VOLP, then discards it. Only a secure session token is saved.
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

                <p className="text-center text-xs text-white/25 mt-6">
                    CampusSync is not affiliated with VIT or VOLP. Use at your own discretion.
                </p>
            </motion.div>
        </div>
    );
}
