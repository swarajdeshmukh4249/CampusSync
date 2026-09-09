import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'elevated' | 'gradient';
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({
  children,
  className = '',
  variant = 'default',
  hover = false,
  onClick
}: CardProps) {
  const baseStyles = 'rounded-2xl p-6 transition-all duration-300';
  
  const variants = {
    default: 'bg-[var(--bg-surface)] border border-[var(--border-color)]',
    glass: 'bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)]',
    elevated: 'bg-[var(--bg-elevated)] border border-[var(--border-color)] shadow-lg',
    gradient: 'bg-gradient-to-br from-[var(--color-accent)]/10 to-[var(--color-cyan)]/10 border border-[var(--color-accent)]/20'
  };
  
  const hoverStyles = hover ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer' : '';
  
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : {}}
      className={`${baseStyles} ${variants[variant]} ${hoverStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}