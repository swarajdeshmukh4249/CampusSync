import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  FileText,
  User as Users,
  CheckCircle,
  Bell,
  Search,
  BookOpen,
  Upload,
  LogOut,
  Home,
  ArrowLeft
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import ThemeToggle from './ui/ThemeToggle';
import { Canvas } from '@react-three/fiber';
import AcademicOrbit from './3d/AcademicOrbit';

type Page = 'dashboard' | 'courses' | 'assignments' | 'calendar' | 'friends';

interface DashboardProps {
  userId: number;
  username: string;
  onLogout: () => void;
  onNavigate: (page: Page) => void;
  onGoToLanding: () => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

interface Assignment {
  assignment_id: string;
  assignment_name: string;
  description: string;
  due_date: string;
  start_date: string;
  is_submitted: boolean;
  submission_date: string | null;
  max_marks: number;
  course_name: string;
  assignment_type?: string;
  is_placeholder?: boolean;
}

export default function Dashboard({ userId, username, onLogout, onNavigate, onGoToLanding, theme, onThemeToggle }: DashboardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://127.0.0.1:8081/assignments/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setAssignments(data.assignments || []);
        }
      } catch (err) {
        console.error('Error fetching assignments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [userId]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getTimeRemaining = (dueDate: string) => {
    if (!dueDate) return 'No due date';
    const due = new Date(dueDate);
    const now = new Date();
    const diff = due.getTime() - now.getTime();

    if (diff < 0) return 'Overdue';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const getAssignmentStatus = (assignment: Assignment): 'pending' | 'submitted' | 'overdue' => {
    if (assignment.is_submitted) return 'submitted';
    if (assignment.due_date && new Date(assignment.due_date) < new Date()) return 'overdue';
    return 'pending';
  };

  const getAssignmentPriority = (assignment: Assignment): string => {
    if (assignment.is_placeholder) return 'medium';
    if (assignment.assignment_type === 'hands_on') return 'high';
    if (assignment.assignment_type === 'test') return 'high';
    return 'medium';
  };

  const pendingAssignments = assignments.filter(a => getAssignmentStatus(a) === 'pending');
  const submittedAssignments = assignments.filter(a => getAssignmentStatus(a) === 'submitted');

  const metrics = [
    { label: 'Today', value: pendingAssignments.length.toString().padStart(2, '0'), sublabel: 'Assignments', icon: FileText, color: '#7C6CFF' },
    { label: 'Upcoming', value: pendingAssignments.length.toString().padStart(2, '0'), sublabel: 'Deadlines', icon: Clock, color: '#FFB84D' },
    { label: 'Submitted', value: submittedAssignments.length.toString().padStart(2, '0'), sublabel: 'Completed', icon: CheckCircle, color: '#32D583' },
    { label: 'Courses', value: '06', sublabel: 'Active', icon: BookOpen, color: '#00D9FF' },
  ];

  const deadlines = pendingAssignments.slice(0, 3).map((assignment, index) => ({
    id: index + 1,
    course: assignment.course_name.toUpperCase(),
    title: assignment.assignment_name,
    due: getTimeRemaining(assignment.due_date),
    dueDate: assignment.due_date ? new Date(assignment.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · 11:59 PM' : 'No due date',
    priority: getAssignmentPriority(assignment),
    status: getAssignmentStatus(assignment)
  }));

  const timeline = [
    { time: '09:00', event: 'LDM Lecture', type: 'class' },
    { time: '11:30', event: 'DS Assignment', type: 'assignment' },
    { time: '14:00', event: 'DBMS Practical', type: 'practical' },
    { time: '18:00', event: 'Assignment reminder', type: 'reminder' },
    { time: '23:59', event: 'Submission deadline', type: 'deadline' },
  ];

  const friends = [
    { name: 'Swaraj', status: 'submitted', course: 'DBMS' },
    { name: 'Aarav', status: 'submitted', course: 'DBMS' },
    { name: 'Rohan', status: 'pending', course: 'DBMS' },
    { name: 'Ananya', status: 'submitted', course: 'DBMS' },
  ];

  const priorityColors: Record<string, string> = {
    high: '#FF5C7A',
    medium: '#FFB84D',
    low: '#32D583'
  };

  return (
    <div data-theme={theme} className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] relative overflow-hidden">
      {/* 3D Background */}
      <div className="fixed inset-0 z-0 opacity-30">
        <Canvas camera={{ position: [0, 0, 12], fov: 44 }} dpr={[1, 1.5]}>
          <AcademicOrbit theme={theme} />
        </Canvas>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onGoToLanding} icon={<ArrowLeft size={16} />}>
              Back to Home
            </Button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C6CFF] to-[#00D9FF] flex items-center justify-center">
              <Calendar size={20} className="text-white" />
            </div>
            <span className="font-semibold text-lg">CampusSync</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard')} icon={<Home size={16} />}>
              Dashboard
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('courses')} icon={<BookOpen size={16} />}>
              Courses
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('assignments')} icon={<FileText size={16} />}>
              Assignments
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('calendar')} icon={<Calendar size={16} />}>
              Calendar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('friends')} icon={<Users size={16} />}>
              Friends
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input 
                type="text" 
                placeholder="Search assignments, courses..." 
                className="pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] w-64"
              />
            </div>
            
            <ThemeToggle theme={theme} onToggle={onThemeToggle} />
            
            <button className="relative p-2 rounded-xl hover:bg-[var(--bg-surface)] transition-colors">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-danger)] rounded-full" />
            </button>
            
            <Button variant="ghost" size="sm" onClick={onLogout} icon={<LogOut size={16} />}>
              Logout
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 pt-24 px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-semibold mb-2">
              {getGreeting()}, {username}.
            </h1>
            <p className="text-[var(--text-secondary)]">
              Here's everything that needs your attention.
            </p>
          </motion.div>

          {/* Metrics */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            {metrics.map((metric, index) => (
              <Card key={index} variant="glass" hover className="group">
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${metric.color}20` }}
                  >
                    <metric.icon size={20} style={{ color: metric.color }} />
                  </div>
                  <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                    {metric.label}
                  </span>
                </div>
                <div className="text-3xl font-bold mb-1">{metric.value}</div>
                <div className="text-sm text-[var(--text-secondary)]">{metric.sublabel}</div>
              </Card>
            ))}
          </motion.div>

          {/* Today's Timeline */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Card variant="glass" className="p-6">
              <h2 className="text-lg font-semibold mb-4">Today's Timeline</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {timeline.map((item, index) => (
                  <div key={index} className="flex-shrink-0 w-40">
                    <div className="text-sm font-medium mb-1">{item.time}</div>
                    <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                      <div className="text-xs text-[var(--text-secondary)] capitalize">{item.type}</div>
                      <div className="text-sm font-medium mt-1">{item.event}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Deadlines */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Upcoming Deadlines</h2>
                <Button variant="ghost" size="sm">View all</Button>
              </div>
              
              <div className="space-y-3">
                {deadlines.map((deadline) => (
                  <Card key={deadline.id} variant="glass" hover className="group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span 
                            className="text-xs px-2 py-1 rounded-full uppercase tracking-wider"
                            style={{ 
                              backgroundColor: `${priorityColors[deadline.priority]}20`,
                              color: priorityColors[deadline.priority]
                            }}
                          >
                            {deadline.priority}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">{deadline.course}</span>
                        </div>
                        <h3 className="font-medium mb-1">{deadline.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                          <Clock size={14} />
                          <span>{deadline.due}</span>
                          <span>·</span>
                          <span>{deadline.dueDate}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Upload</Button>
                        <Button variant="primary" size="sm">Schedule</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>

            {/* Friends */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Your Academic Circle</h2>
                <Button variant="ghost" size="sm" icon={<Users size={14} />}>
                  DBMS
                </Button>
              </div>
              
              <Card variant="glass" className="p-4">
                <div className="space-y-3">
                  {friends.map((friend, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg-surface)] transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                          style={{
                            background: friend.status === 'submitted' 
                              ? 'linear-gradient(135deg, #32D583, #2DB873)' 
                              : 'linear-gradient(135deg, #FFB84D, #FFA335)',
                            color: 'white'
                          }}
                        >
                          {friend.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{friend.name}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{friend.course}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {friend.status === 'submitted' ? (
                          <div className="flex items-center gap-1 text-[var(--color-success)]">
                            <CheckCircle size={14} />
                            <span className="text-xs">Submitted</span>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm">Nudge</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <Card variant="gradient" className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Quick Upload</h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Drag and drop your assignment files here
                  </p>
                </div>
                <Button variant="primary" size="lg" icon={<Upload size={18} />}>
                  Upload Files
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}