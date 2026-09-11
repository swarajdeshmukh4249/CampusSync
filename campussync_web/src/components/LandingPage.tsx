import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight, BellRing, BookOpen, Check, Clock3, FileUp, Layers, Orbit,
  ShieldCheck, Sparkles, Upload, Users,
} from 'lucide-react';
import ThemeToggle from './ui/ThemeToggle';
import Button from './ui/Button';

type Props = { onEnter: () => void; theme: 'dark' | 'light'; onThemeToggle: () => void };

const MILESTONES = ['THE MESS', 'THE SYNC', 'DEADLINES', 'YOUR CIRCLE', 'AUTOPILOT'];

const CAPABILITIES = [
  { icon: Layers, title: 'One synced surface', body: 'Courses, assignments, materials and announcements pulled straight from VOLP.' },
  { icon: Clock3, title: 'Deadlines with weight', body: 'Every due date ranked by how close it is and how much it is worth.' },
  { icon: Upload, title: 'Scheduled hand-in', body: 'Attach the file today; CampusSync signs in and submits at the minute you pick.' },
  { icon: BellRing, title: 'Reminders that land', body: 'A push or a WhatsApp message at the lead time you choose, not a badge you miss.' },
  { icon: Users, title: 'Study groups', body: 'An invite code puts your classmates and their shared courses on one page.' },
  { icon: ShieldCheck, title: 'Credentials encrypted', body: 'Your VOLP login is stored encrypted and deletable from Settings at any time.' },
];

const reveal = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.62, ease: [0.22, 1, 0.32, 1] as const },
};

export default function LandingPage({ onEnter, theme, onThemeToggle }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [chapter, setChapter] = useState(0);
  const chapterRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Light the rail entry for whichever chapter is crossing the middle of the
  // screen. An observer is cheaper here than measuring on every scroll tick.
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const index = chapterRefs.current.indexOf(entry.target as HTMLElement);
          if (index >= 0) setChapter(index);
        });
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    chapterRefs.current.forEach(node => node && observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const goToStory = () => document.getElementById('orbit-story')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <main className="experience-shell">
      <nav className={`orbit-nav${scrolled ? ' scrolled' : ''}`} aria-label="Primary navigation">
        <button
          className="brand"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="CampusSync home"
        >
          <span className="brand-mark"><Orbit size={18} /></span>
          <span>CampusSync</span>
        </button>

        <div className="nav-links">
          <button onClick={goToStory}>How it works</button>
          <button onClick={() => document.getElementById('capabilities')?.scrollIntoView({ behavior: 'smooth' })}>
            Features
          </button>
          <button onClick={onEnter}>Dashboard</button>
        </div>

        <div className="nav-actions">
          <ThemeToggle theme={theme} onToggle={onThemeToggle} />
          <Button variant="primary" size="sm" onClick={onEnter} icon={<ArrowRight size={15} />}>
            Enter
          </Button>
        </div>
      </nav>

      {/* --- Hero: the scene behind this section is live and takes the mouse. */}
      <section className="orbit-hero">
        <div className="hero-copy">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="eyebrow"
          >
            <span /> The academic operating system
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.85, ease: [0.22, 1, 0.32, 1] }}
          >
            Your campus.<br /><em>In sync.</em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="hero-subtitle"
          >
            Deadlines, assignments, submissions, courses and classmates — pulled out of
            VOLP and into one place that actually tells you what to do next.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.72 }}
            className="hero-actions"
          >
            <Button variant="primary" size="lg" onClick={onEnter} icon={<ArrowRight size={17} />}>
              Enter CampusSync
            </Button>
            <Button variant="secondary" size="lg" onClick={goToStory}>
              See how it works
            </Button>
          </motion.div>
        </div>

        {/* Readouts that name what the 3D object stands for. */}
        <motion.div
          className="hero-readouts"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.9 }}
          aria-hidden="true"
        >
          <div className="hero-orbit-label label-file">
            <i><FileUp size={14} /></i>
            <div>Assignment_04.pdf<span>Queued for 11:40 PM</span></div>
          </div>
          <div className="hero-orbit-label label-course">
            <i><BookOpen size={14} /></i>
            <div>DBMS<span>3 pending</span></div>
          </div>
          <div className="hero-orbit-label label-sync">
            <i><Check size={14} /></i>
            <div>VOLP synced<span>2 minutes ago</span></div>
          </div>
        </motion.div>

        <button onClick={goToStory} className="scroll-prompt">
          <span>Scroll to explore</span><i />
        </button>
      </section>

      {/* --- Story: chapters scroll past the same live scene. */}
      <section id="orbit-story" className="orbit-story">
        <aside className="story-progress" aria-hidden="true">
          {MILESTONES.map((item, index) => (
            <span key={item} className={index === chapter ? 'active' : ''}>{item}</span>
          ))}
        </aside>

        <div className="story-chapters">
          <article className="story-chapter" ref={node => { chapterRefs.current[0] = node; }}>
            <motion.div className="story-copy" {...reveal}>
              <p className="eyebrow"><span /> 01 — The problem</p>
              <h2>College is<br /><em>everywhere.</em></h2>
              <p>Deadlines hide in a portal you forget to open. Question papers land in a group
                chat. The one submission that mattered slips past midnight.</p>
            </motion.div>
            <motion.div className="story-visual" {...reveal}>
              <div className="story-visual-label"><span>Where it currently lives</span><span>5 places</span></div>
              <div className="chaos-tags">
                <span>VOLP portal</span><span>WhatsApp</span><span>Email</span>
                <span>PDF on desktop</span><span>Phone calendar</span><span>A friend's memory</span>
              </div>
            </motion.div>
          </article>

          <article className="story-chapter" ref={node => { chapterRefs.current[1] = node; }}>
            <motion.div className="story-copy" {...reveal}>
              <p className="eyebrow"><span /> 02 — The sync</p>
              <h2>So we<br /><em>connected it.</em></h2>
              <p>CampusSync signs into VOLP for you and pulls the whole term down — courses,
                assignments, materials, announcements — then keeps it current.</p>
            </motion.div>
            <motion.div className="story-visual" {...reveal}>
              <div className="story-visual-label"><span>Live sync</span><span>Just now</span></div>
              <div className="source-rows">
                <div><BookOpen size={14} /> Courses <b>6 found</b></div>
                <div><FileUp size={14} /> Assignments <b>23 found</b></div>
                <div><BellRing size={14} /> Announcements <b>11 found</b></div>
              </div>
              <div className="connection-line"><i /><b>1 unified workspace</b></div>
            </motion.div>
          </article>

          <article className="story-chapter" ref={node => { chapterRefs.current[2] = node; }}>
            <motion.div className="story-copy" {...reveal}>
              <p className="eyebrow"><span /> 03 — Smart deadlines</p>
              <h2>Know before<br /><em>it's urgent.</em></h2>
              <p>Every deadline carries a priority and a countdown, and reaches you at the lead
                time you set — push, or WhatsApp, or both.</p>
            </motion.div>
            <motion.div className="story-visual" {...reveal}>
              <div className="story-visual-label"><span>Next up</span><span>High priority</span></div>
              <div className="deadline-card">
                <small>DATA STRUCTURES</small>
                <strong>Implement Merge Sort</strong>
                <div>
                  <b>24H</b>
                  <span>Tomorrow · 11:59 PM<br />Worth 20 marks</span>
                </div>
              </div>
            </motion.div>
          </article>

          <article className="story-chapter" ref={node => { chapterRefs.current[3] = node; }}>
            <motion.div className="story-copy" {...reveal}>
              <p className="eyebrow"><span /> 04 — Your circle</p>
              <h2>Do it<br /><em>together.</em></h2>
              <p>CampusSync finds the classmates you share courses with. Start a study group,
                share the code, and see who is already through it.</p>
            </motion.div>
            <motion.div className="story-visual" {...reveal}>
              <div className="story-visual-label"><span>DBMS study group</span><span>12 members</span></div>
              <div className="friend-stack">
                <span>SA</span><span>AR</span><span>RK</span><span>AN</span>
                <b>3 of 4 have submitted</b>
              </div>
            </motion.div>
          </article>

          <article className="story-chapter" ref={node => { chapterRefs.current[4] = node; }}>
            <motion.div className="story-copy" {...reveal}>
              <p className="eyebrow"><span /> 05 — Automation</p>
              <h2>Upload once.<br /><em>We handle the rest.</em></h2>
              <p>Finish early, attach the file, pick a time. CampusSync signs into VOLP at that
                moment and hands it in — whether you are asleep or in a lecture.</p>
            </motion.div>
            <motion.div className="story-visual" {...reveal}>
              <div className="story-visual-label"><span>Scheduled submission</span><span>11:40 PM</span></div>
              <div className="submission-path">
                <span>Assignment_04.pdf</span>
                <i />
                <b><Orbit size={16} /></b>
                <i />
                <strong>VOLP <Check size={14} /></strong>
              </div>
            </motion.div>
          </article>
        </div>
      </section>

      {/* --- Capabilities: the scene is still there, the tiles float over it. */}
      <section id="capabilities">
        <motion.div className="final-orbit-cta" style={{ paddingBottom: 48 }} {...reveal}>
          <p className="eyebrow"><span /> Everything in the box</p>
          <h2 style={{ fontSize: 'clamp(34px, 4vw, 62px)' }}>Built for the<br /><em>whole term.</em></h2>
        </motion.div>

        <motion.div className="capability-grid" {...reveal}>
          {CAPABILITIES.map(item => (
            <div key={item.title} className="capability-tile">
              <i><item.icon size={19} /></i>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          ))}
        </motion.div>
      </section>

      <motion.section className="final-orbit-cta" {...reveal}>
        <div className="final-core"><Sparkles size={34} /></div>
        <p className="eyebrow"><span /> Ready when you are</p>
        <h2>Never miss<br /><em>what matters.</em></h2>
        <p>Your campus, your deadlines, your people — all in sync.</p>
        <Button variant="primary" size="lg" onClick={onEnter} icon={<ArrowRight size={17} />}>
          Enter CampusSync
        </Button>
        <div className="trust-row">
          <span><Check size={14} /> VOLP sync</span>
          <span><Check size={14} /> Smart reminders</span>
          <span><Check size={14} /> Automated submission</span>
          <span><Check size={14} /> Encrypted credentials</span>
        </div>
      </motion.section>

      <footer className="landing-footer">
        CampusSync is a student project and is not affiliated with VIT or VOLP.
      </footer>
    </main>
  );
}
