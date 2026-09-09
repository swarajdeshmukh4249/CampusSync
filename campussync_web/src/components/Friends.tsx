import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Search, 
  MessageCircle, 
  CheckCircle, 
  Clock,
  ArrowLeft,
  Home,
  FileText,
  BookOpen,
  Calendar,
  Bell,
  UserPlus
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import ThemeToggle from './ui/ThemeToggle';
import { Canvas } from '@react-three/fiber';
import AcademicOrbit from './3d/AcademicOrbit';

type Page = 'dashboard' | 'courses' | 'assignments' | 'calendar' | 'friends';

interface FriendsProps {
  userId: number;
  username: string;
  onNavigate: (page: Page) => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

export default function Friends({ onNavigate, theme, onThemeToggle }: FriendsProps) {
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [showNudgeModal, setShowNudgeModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);

  const friends = [
    {
      id: 1,
      name: 'Swaraj',
      avatar: 'SA',
      courses: ['DBMS', 'Data Structures'],
      status: 'online',
      recentActivity: 'Submitted DBMS Assignment',
      submissionStatus: { 'DBMS': 'submitted', 'Data Structures': 'submitted' },
      mutualCourses: 2
    },
    {
      id: 2,
      name: 'Aarav',
      avatar: 'AR',
      courses: ['DBMS', 'Operating Systems'],
      status: 'online',
      recentActivity: 'Working on OS Lab',
      submissionStatus: { 'DBMS': 'submitted', 'Operating Systems': 'pending' },
      mutualCourses: 2
    },
    {
      id: 3,
      name: 'Rohan',
      avatar: 'RK',
      courses: ['DBMS', 'Logic Design'],
      status: 'offline',
      recentActivity: 'Last seen 2 hours ago',
      submissionStatus: { 'DBMS': 'pending', 'Logic Design': 'submitted' },
      mutualCourses: 2
    },
    {
      id: 4,
      name: 'Ananya',
      avatar: 'AN',
      courses: ['Data Structures', 'Computer Networks'],
      status: 'online',
      recentActivity: 'Studying for Networks Quiz',
      submissionStatus: { 'Data Structures': 'submitted', 'Computer Networks': 'pending' },
      mutualCourses: 2
    }
  ];

  const courses = ['all', 'DBMS', 'Data Structures', 'Operating Systems', 'Logic Design', 'Computer Networks', 'Software Engineering'];

  const filteredFriends = selectedCourse === 'all' 
    ? friends 
    : friends.filter(friend => friend.courses.includes(selectedCourse));

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'online': return '#32D583';
      case 'away': return '#FFB84D';
      case 'offline': return '#646A78';
      default: return '#646A78';
    }
  };

  const getSubmissionStatus = (status: string) => {
    switch(status) {
      case 'submitted': return { color: '#32D583', icon: <CheckCircle size={12} /> };
      case 'pending': return { color: '#FFB84D', icon: <Clock size={12} /> };
      default: return { color: '#646A78', icon: <Clock size={12} /> };
    }
  };

  const handleNudge = (friend: any) => {
    setSelectedFriend(friend);
    setShowNudgeModal(true);
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
            <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard')} icon={<ArrowLeft size={16} />}>
              Back to Dashboard
            </Button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C6CFF] to-[#00D9FF] flex items-center justify-center">
              <Users size={20} className="text-white" />
            </div>
            <span className="font-semibold text-lg">Friends</span>
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
            <Button variant="primary" size="sm" onClick={() => onNavigate('friends')} icon={<Users size={16} />}>
              Friends
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input 
                type="text" 
                placeholder="Search friends..." 
                className="pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] w-64"
              />
            </div>
            
            <ThemeToggle theme={theme} onToggle={onThemeToggle} />
            
            <button className="relative p-2 rounded-xl hover:bg-[var(--bg-surface)] transition-colors">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-danger)] rounded-full" />
            </button>
            
            <Button variant="primary" size="sm" icon={<UserPlus size={16} />}>
              Add Friend
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
              Your Academic Circle
            </h1>
            <p className="text-[var(--text-secondary)]">
              Connect with classmates and stay accountable together
            </p>
          </motion.div>

          {/* Course Filter */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex gap-2 mb-6 overflow-x-auto pb-2"
          >
            {courses.map((course) => (
              <button
                key={course}
                onClick={() => setSelectedCourse(course)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  selectedCourse === course 
                    ? 'bg-[var(--color-accent)] text-white' 
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                {course === 'all' ? 'All Courses' : course}
              </button>
            ))}
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
          >
            <Card variant="glass" className="text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: '#7C6CFF' }}>{friends.length}</div>
              <div className="text-sm text-[var(--text-secondary)]">Total Friends</div>
            </Card>
            <Card variant="glass" className="text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: '#32D583' }}>{friends.filter(f => f.status === 'online').length}</div>
              <div className="text-sm text-[var(--text-secondary)]">Online Now</div>
            </Card>
            <Card variant="glass" className="text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: '#FFB84D' }}>{friends.filter(f => Object.values(f.submissionStatus).some(s => s === 'pending')).length}</div>
              <div className="text-sm text-[var(--text-secondary)]">Pending Assignments</div>
            </Card>
            <Card variant="glass" className="text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: '#00D9FF' }}>{selectedCourse === 'all' ? courses.length - 1 : filteredFriends.length}</div>
              <div className="text-sm text-[var(--text-secondary)]">In {selectedCourse === 'all' ? 'Shared Courses' : selectedCourse}</div>
            </Card>
          </motion.div>

          {/* Friends Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {filteredFriends.map((friend) => (
              <Card key={friend.id} variant="glass" hover className="group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{ background: 'linear-gradient(135deg, #7C6CFF, #00D9FF)' }}
                      >
                        {friend.avatar}
                      </div>
                      <div 
                        className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[var(--bg-surface)]"
                        style={{ backgroundColor: getStatusColor(friend.status) }}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold">{friend.name}</h3>
                      <p className="text-xs text-[var(--text-secondary)] capitalize">{friend.status}</p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-[var(--text-secondary)] mb-3">{friend.recentActivity}</p>

                <div className="space-y-2 mb-4">
                  {friend.courses.slice(0, 2).map((course) => {
                    const status = getSubmissionStatus(friend.submissionStatus[course as keyof typeof friend.submissionStatus] || 'pending');
                    return (
                      <div key={course} className="flex items-center justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">{course}</span>
                        <div className="flex items-center gap-1" style={{ color: status.color }}>
                          {status.icon}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" icon={<MessageCircle size={14} />}>
                    Message
                  </Button>
                  {Object.values(friend.submissionStatus).some(s => s === 'pending') && (
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={() => handleNudge(friend)}
                    >
                      Nudge
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </motion.div>
        </div>
      </main>

      {/* Nudge Modal */}
      {showNudgeModal && selectedFriend && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowNudgeModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[var(--bg-surface)] rounded-2xl p-6 max-w-md w-full border border-[var(--border-color)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-2">Send Nudge</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Send a friendly reminder to {selectedFriend.name} about their pending assignments.
            </p>
            
            <div className="mb-4 p-3 rounded-xl bg-[var(--bg-elevated)]">
              <div className="text-sm font-medium mb-2">Pending Assignments:</div>
              {Object.entries(selectedFriend.submissionStatus)
                .filter(([_, status]) => status === 'pending')
                .map(([course, _]) => (
                  <div key={course} className="text-sm text-[var(--text-secondary)]">
                    • {course}
                  </div>
                ))}
            </div>

            <div className="flex gap-3">
              <Button 
                variant="ghost" 
                size="md" 
                className="flex-1"
                onClick={() => setShowNudgeModal(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                size="md" 
                className="flex-1"
                onClick={() => {
                  setShowNudgeModal(false);
                }}
              >
                Send Nudge
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}