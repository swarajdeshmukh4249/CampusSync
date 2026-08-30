import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Clock,
  CheckCircle,
  Search,
  Calendar,
  ArrowLeft,
  Home,
  BookOpen,
  Users,
  Bell,
  Upload,
  Filter,
  SortAsc
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import ThemeToggle from './ui/ThemeToggle';
import { Canvas } from '@react-three/fiber';
import AcademicOrbit from './3d/AcademicOrbit';

type Page = 'dashboard' | 'courses' | 'assignments' | 'calendar' | 'friends';

interface AssignmentsProps {
  userId: number;
  username: string;
  onNavigate: (page: Page) => void;
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

export default function Assignments({ userId, onNavigate, theme, onThemeToggle }: AssignmentsProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'overdue'>('all');
  const [sortBy] = useState<'due' | 'course' | 'priority'>('due');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://127.0.0.1:8081/assignments/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setAssignments(data.assignments || []);
        } else {
          setError('Failed to load assignments');
        }
      } catch (err) {
        setError('Failed to connect to server');
        console.error('Error fetching assignments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [userId]);

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return '#FF5C7A';
      case 'medium': return '#FFB84D';
      case 'low': return '#32D583';
      default: return '#7C6CFF';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return '#FFB84D';
      case 'submitted': return '#32D583';
      case 'overdue': return '#FF5C7A';
      default: return '#7C6CFF';
    }
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

  const filteredAssignments = assignments.filter(assignment => {
    const status = getAssignmentStatus(assignment);
    if (filter === 'all') return true;
    return status === filter;
  });

  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    if (sortBy === 'due') {
      const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return dateA - dateB;
    }
    if (sortBy === 'course') {
      return a.course_name.localeCompare(b.course_name);
    }
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[getAssignmentPriority(a) as keyof typeof priorityOrder] - priorityOrder[getAssignmentPriority(b) as keyof typeof priorityOrder];
  });

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
            <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard')} icon={<ArrowLeft size={16} />}>
              Back to Dashboard
            </Button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C6CFF] to-[#00D9FF] flex items-center justify-center">
              <FileText size={20} className="text-white" />
            </div>
            <span className="font-semibold text-lg">Assignments</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard')} icon={<Home size={16} />}>
              Dashboard
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('courses')} icon={<BookOpen size={16} />}>
              Courses
            </Button>
            <Button variant="primary" size="sm" onClick={() => onNavigate('assignments')} icon={<FileText size={16} />}>
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
                placeholder="Search assignments..." 
                className="pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] w-64"
              />
            </div>
            
            <ThemeToggle theme={theme} onToggle={onThemeToggle} />
            
            <button className="relative p-2 rounded-xl hover:bg-[var(--bg-surface)] transition-colors">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-danger)] rounded-full" />
            </button>
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold mb-2">
                  Assignments
                </h1>
                <p className="text-[var(--text-secondary)]">
                  Manage and track all your academic submissions
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" icon={<Filter size={16} />}>
                  Filter
                </Button>
                <Button variant="outline" size="sm" icon={<SortAsc size={16} />}>
                  Sort
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Filter Tabs */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex gap-2 mb-6"
          >
            {['all', 'pending', 'submitted', 'overdue'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === f 
                    ? 'bg-[var(--color-accent)] text-white' 
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </motion.div>

          {/* Assignment Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
          >
            <Card variant="glass" className="text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: '#7C6CFF' }}>{assignments.length}</div>
              <div className="text-sm text-[var(--text-secondary)]">Total</div>
            </Card>
            <Card variant="glass" className="text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: '#FFB84D' }}>{assignments.filter(a => getAssignmentStatus(a) === 'pending').length}</div>
              <div className="text-sm text-[var(--text-secondary)]">Pending</div>
            </Card>
            <Card variant="glass" className="text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: '#32D583' }}>{assignments.filter(a => getAssignmentStatus(a) === 'submitted').length}</div>
              <div className="text-sm text-[var(--text-secondary)]">Submitted</div>
            </Card>
            <Card variant="glass" className="text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: '#FF5C7A' }}>{assignments.filter(a => getAssignmentStatus(a) === 'overdue').length}</div>
              <div className="text-sm text-[var(--text-secondary)]">Overdue</div>
            </Card>
          </motion.div>

          {/* Loading State */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="text-[var(--text-secondary)]">Loading assignments...</div>
            </motion.div>
          )}

          {/* Error State */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="text-[var(--color-danger)]">{error}</div>
            </motion.div>
          )}

          {/* Assignment List */}
          {!loading && !error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              {sortedAssignments.length === 0 ? (
                <Card variant="glass" className="p-8 text-center">
                  <div className="text-[var(--text-secondary)]">No assignments found</div>
                </Card>
              ) : (
                sortedAssignments.map((assignment) => {
                  const status = getAssignmentStatus(assignment);
                  const priority = getAssignmentPriority(assignment);
                  return (
                    <Card key={assignment.assignment_id} variant="glass" hover className="group">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span
                              className="text-xs px-2 py-1 rounded-full uppercase tracking-wider font-medium"
                              style={{
                                backgroundColor: `${getPriorityColor(priority)}20`,
                                color: getPriorityColor(priority)
                              }}
                            >
                              {priority}
                            </span>
                            <span
                              className="text-xs px-2 py-1 rounded-full uppercase tracking-wider font-medium"
                              style={{
                                backgroundColor: `${getStatusColor(status)}20`,
                                color: getStatusColor(status)
                              }}
                            >
                              {status}
                            </span>
                            {assignment.assignment_type && (
                              <span className="text-xs px-2 py-1 rounded-full uppercase tracking-wider font-medium bg-[var(--color-accent)]20 text-[var(--color-accent)]">
                                {assignment.assignment_type}
                              </span>
                            )}
                            {assignment.is_placeholder && (
                              <span className="text-xs px-2 py-1 rounded-full uppercase tracking-wider font-medium bg-[var(--text-secondary)]20 text-[var(--text-secondary)]">
                                View on VOLP
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg font-semibold mb-1">{assignment.assignment_name}</h3>
                          <p className="text-sm text-[var(--text-secondary)] mb-3">{assignment.course_name}</p>

                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                              <Clock size={14} />
                              <span>{getTimeRemaining(assignment.due_date)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                              <Calendar size={14} />
                              <span>{assignment.due_date || 'No due date'}</span>
                            </div>
                            {assignment.submission_date && (
                              <div className="flex items-center gap-2 text-[var(--color-success)]">
                                <CheckCircle size={14} />
                                <span>Submitted {assignment.submission_date}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          {status === 'pending' ? (
                            <>
                              <Button variant="outline" size="sm">View Details</Button>
                              {assignment.is_placeholder ? (
                                <Button variant="primary" size="sm">
                                  Open VOLP
                                </Button>
                              ) : (
                                <Button variant="primary" size="sm" icon={<Upload size={14} />}>
                                  Submit
                                </Button>
                              )}
                            </>
                          ) : (
                            <Button variant="outline" size="sm">View Submission</Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}