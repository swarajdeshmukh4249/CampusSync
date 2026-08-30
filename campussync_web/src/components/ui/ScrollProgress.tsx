import { motion } from 'framer-motion';

interface ScrollProgressProps {
  milestones: string[];
  activeIndex: number;
}

export default function ScrollProgress({ milestones, activeIndex }: ScrollProgressProps) {
  return (
    <aside className="story-progress">
      {milestones.map((item, index) => (
        <motion.span
          key={item}
          className={index === activeIndex ? 'active' : ''}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: index === activeIndex ? 1 : 0.5 }}
          transition={{ duration: 0.3 }}
        >
          {item}
        </motion.span>
      ))}
    </aside>
  );
}