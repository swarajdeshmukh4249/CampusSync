import { Canvas } from '@react-three/fiber';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, BellRing, Check, FileUp, Orbit, Users } from 'lucide-react';
import { useRef } from 'react';
import { Scene } from './Scene';
import ThemeToggle from './ui/ThemeToggle';
import Button from './ui/Button';

type Props = { onEnter: () => void; theme: 'dark' | 'light'; onThemeToggle: () => void };

const milestones = ['INTRO', 'SYNC', 'DEADLINES', 'FRIENDS', 'AUTOMATION'];

export default function LandingPage({ onEnter, theme, onThemeToggle }: Props) {
  const story = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: story, offset: ['start start', 'end end'] });
  const orbitScale = useTransform(scrollYProgress, [0, .18, .44, .72, 1], [1, 1.18, .88, 1.12, .72]);
  const orbitRotate = useTransform(scrollYProgress, [0, 1], [0, 18]);

  const goToStory = () => document.getElementById('orbit-story')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <main className="experience-shell">
      <nav className="orbit-nav" aria-label="Primary navigation">
        <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="CampusSync home">
          <span className="brand-mark"><Orbit size={19} /></span><span>CampusSync</span>
        </button>
        <div className="nav-links"><button onClick={goToStory}>Product</button><button onClick={goToStory}>How it works</button><button onClick={onEnter}>Dashboard</button></div>
        <div className="nav-actions">
          <ThemeToggle theme={theme} onToggle={onThemeToggle} />
          <Button variant="primary" size="sm" onClick={onEnter} icon={<ArrowRight size={15} />}>Enter CampusSync</Button>
        </div>
      </nav>

      <section className="orbit-hero">
        <div className="hero-copy">
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .75 }} className="eyebrow"><span /> THE ACADEMIC OPERATING SYSTEM</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .9, duration: .8 }}>Your campus.<br /><em>In sync.</em></motion.h1>
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="hero-subtitle">Deadlines, assignments, submissions, courses and friends — intelligently connected in one place.</motion.p>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.25 }} className="hero-actions">
            <Button variant="primary" size="lg" onClick={onEnter} icon={<ArrowRight size={17} />}>Enter CampusSync</Button>
            <Button variant="ghost" size="lg" onClick={goToStory}>See how it works</Button>
          </motion.div>
        </div>
        <div className="hero-canvas" aria-hidden="true"><Canvas camera={{ position: [0, 0, 9], fov: 44 }} dpr={[1, 1.5]}><Scene theme={theme} /></Canvas></div>
        <div className="hero-orbit-label label-file">Assignment_04.pdf <span>Due tomorrow</span></div>
        <div className="hero-orbit-label label-course">DBMS <span>In progress</span></div>
        <div className="hero-orbit-label label-sync"><Check size={13} /> Synced</div>
        <button onClick={goToStory} className="scroll-prompt"><span>SCROLL TO EXPLORE</span><i /></button>
      </section>

      <section id="orbit-story" ref={story} className="orbit-story">
        <aside className="story-progress">{milestones.map((item, index) => <span key={item} className={index === 0 ? 'active' : ''}>{item}</span>)}</aside>
        <div className="sticky-orbit">
          <motion.div className="css-orbit" style={{ scale: orbitScale, rotate: orbitRotate }}>
            <div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" />
            <div className="sync-core"><Orbit size={34} /><small>CAMPUSSYNC<br />CORE</small></div>
            <div className="orbit-object object-assignment"><FileUp size={19} /><b>Assignment 04</b><small>Data Structures</small></div>
            <div className="orbit-object object-calendar"><b>24</b><small>HOURS LEFT</small></div>
            <div className="orbit-object object-people"><Users size={18} /><span>12 classmates</span></div>
            <div className="orbit-object object-bell"><BellRing size={18} /><span>Deadline alert</span></div>
          </motion.div>
        </div>
        <div className="story-chapters">
          <article className="story-chapter chaos"><p className="eyebrow"><span /> 01 — THE PROBLEM</p><h2>College is<br /><em>everywhere.</em></h2><p>Deadlines hide in portals. Assignments live in chats. Important submissions get forgotten.</p><div className="chaos-tags"><span>VOLP</span><span>WhatsApp</span><span>PDF</span><span>Calendar</span><span>Course Portal</span></div></article>
          <article className="story-chapter connection"><p className="eyebrow"><span /> 02 — THE SYNC</p><h2>So we<br /><em>connected it.</em></h2><p>CampusSync pulls your academic world into one intelligent system, then makes the noise feel quiet.</p><div className="connection-line"><i /><i /><i /><b>1 unified workspace</b></div></article>
          <article className="story-chapter deadline"><p className="eyebrow"><span /> 03 — SMART DEADLINES</p><h2>Know before<br /><em>it’s urgent.</em></h2><p>Every deadline has a place, a priority, and the right moment to get your attention.</p><div className="deadline-card"><small>DATA STRUCTURES</small><strong>Implement Merge Sort</strong><div><b>24H</b><span>Tomorrow · 11:59 PM</span></div></div></article>
          <article className="story-chapter friends"><p className="eyebrow"><span /> 04 — YOUR CIRCLE</p><h2>Do it<br /><em>together.</em></h2><p>See who is on the same path. Keep each other moving with a thoughtful nudge at the right moment.</p><div className="friend-stack"><span>SA ✓</span><span>AR ✓</span><span>RK ·</span><span>AN ✓</span><b>DBMS · 12 classmates</b></div></article>
          <article className="story-chapter automation"><p className="eyebrow"><span /> 05 — AUTOMATION</p><h2>Upload once.<br /><em>We handle the rest.</em></h2><p>Prepare early. CampusSync keeps the file ready and delivers it to VOLP at the moment you choose.</p><div className="submission-path"><span>Assignment_04.pdf</span><i /><b><Orbit size={17} /></b><i /><strong>VOLP <Check size={15} /></strong></div></article>
        </div>
      </section>

      <section className="final-orbit-cta">
        <div className="final-core"><Orbit size={40} /></div><p className="eyebrow"><span /> READY WHEN YOU ARE</p><h2>Never miss<br /><em>what matters.</em></h2><p>Your campus, your deadlines, your people — all in sync.</p><Button variant="primary" size="lg" onClick={onEnter} icon={<ArrowRight size={17} />}>Enter CampusSync</Button>
        <div className="trust-row"><span><Check size={14} /> VOLP Sync</span><span><Check size={14} /> Smart reminders</span><span><Check size={14} /> Automated submission</span></div>
      </section>
    </main>
  );
}
