import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Users, 
  Clock, 
  CheckCircle, 
  Search,
  Calendar,
  ArrowLeft,
  Home,
  FileText,
  Bell
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import ThemeToggle from './ui/ThemeToggle';
import { Canvas } from '@react-three/fiber';
import AcademicOrbit from './3d/AcademicOrbit';

type Page = 'dashboard' | 'courses' | 'assignments' | 'calendar' | 'friends';

interface CoursesProps {
  userId: number;
  username: string;
  onNavigate: (page: Page) => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

export default function Courses({ onNavigate, theme, onThemeToggle }: CoursesProps) {

  const courses = [
    {
      id: 1,
      code: 'CS201',
      name: 'Data Structures',
      instructor: 'Dr. Smith',
      progress: 75,
      color: '#7C6CFF',
      icon: 'graph',
      schedule: 'Mon, Wed 10:00 AM',
      room: 'Room 301',
      credits: 4,
      students: 45,
      nextClass: 'Tomorrow, 10:00 AM'
    },
    {
      id: 2,
      code: 'CS202',
      name: 'Database Management',
      instructor: 'Prof. Johnson',
      progress: 60,
      color: '#00D9FF',
      icon: 'database',
      schedule: 'Tue, Thu 2:00 PM',
      room: 'Lab 202',
      credits: 3,
      students: 38,
      nextClass: 'Today, 2:00 PM'
    },
    {
      id: 3,
      code: 'CS203',
      name: 'Logic Design',
      instructor: 'Dr. Williams',
      progress: 45,
      color: '#32D583',
      icon: 'logic',
      schedule: 'Mon, Wed 3:00 PM',
      room: 'Room 205',
      credits: 3,
      students: 42,
      nextClass: 'Wednesday, 3:00 PM'
    },
    {
      id: 4,
      code: 'CS204',
      name: 'Operating Systems',
      instructor: 'Prof. Davis',
      progress: 30,
      color: '#FFB84D',
      icon: 'os',
      schedule: 'Fri 9:00 AM',
      room: 'Lab 301',
      credits: 4,
      students: 40,
      nextClass: 'Friday, 9:00 AM'
    },
    {
      id: 5,
      code: 'CS205',
      name: 'Computer Networks',
      instructor: 'Dr. Brown',
      progress: 20,
      color: '#FF5C7A',
      icon: 'network',
      schedule: 'Tue, Thu 11:00 AM',
      room: 'Room 401',
      credits: 3,
      students: 35,
      nextClass: 'Thursday, 11:00 AM'
    },
    {
      id: 6,
      code: 'CS206',
      name: 'Software Engineering',
      instructor: 'Prof. Miller',
      progress: 85,
      color: '#9C91FF',
      icon: 'software',
      schedule: 'Wed, Fri 1:00 PM',
      room: 'Room 302',
      credits: 3,
      students: 32,
      nextClass: 'Wednesday, 1:00 PM'
    }
  ];

  const getCourseIcon = (iconType: string) => {
    switch(iconType) {
      case 'graph': return <FileText size={24} />;
      case 'database': return <BookOpen size={24} />;
      case 'logic': return <CheckCircle size={24} />;
      case 'os': return <Calendar size={24} />;
      case 'network': return <Users size={24} />;
      case 'software': return <Bell size={24} />;
      default: return <BookOpen size={24} />;
    }
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
              <BookOpen size={20} className="text-white" />
            </div>
            <span className="font-semibold text-lg">Courses</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard')} icon={<Home size={16} />}>
              Dashboard
            </Button>
            <Button variant="primary" size="sm" onClick={() => onNavigate('courses')} icon={<BookOpen size={16} />}>
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
                placeholder="Search courses..." 
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
            <h1 className="text-3xl font-semibold mb-2">
              Your Courses
            </h1>
            <p className="text-[var(--text-secondary)]">
              Manage your academic journey across {courses.length} courses
            </p>
          </motion.div>

          {/* Course Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {courses.map((course) => (
              <Card 
                key={course.id} 
                variant="glass" 
                hover 
                className="group cursor-pointer"
                onClick={() => setSelectedCourse(course.id.toString())}
              >
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${course.color}20` }}
                  >
                    <div style={{ color: course.color }}>
                      {getCourseIcon(course.icon)}
                    </div>
                  </div>
                  <span className="text-xs font-mono px-2 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
                    {course.code}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold mb-1">{course.name}</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">{course.instructor}</p>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[var(--text-secondary)]">Progress</span>
                      <span className="font-medium">{course.progress}%</span>
                    </div>
                    <div className="h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${course.progress}%`,
                          backgroundColor: course.color 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Clock size={14} />
                    <span>{course.schedule}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Users size={14} />
                    <span>{course.students} students</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-secondary)]">Next class</span>
                    <span className="text-xs font-medium" style={{ color: course.color }}>
                      {course.nextClass}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </motion.div>

          {/* Course Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <Card variant="glass" className="text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: '#7C6CFF' }}>{courses.length}</div>
              <div className="text-sm text-[var(--text-secondary)]">Active Courses</div>
            </Card>
            <Card variant="glass" className="text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: '#32D583' }}>{courses.reduce((acc, c) => acc + c.credits, 0)}</div>
              <div className="text-sm text-[var(--text-secondary)]">Total Credits</div>
            </Card>
            <Card variant="glass" className="text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: '#00D9FF' }}>{Math.round(courses.reduce((acc, c) => acc + c.progress, 0) / courses.length)}%</div>
              <div className="text-sm text-[var(--text-secondary)]">Avg Progress</div>
            </Card>
            <Card variant="glass" className="text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: '#FFB84D' }}>{courses.reduce((acc, c) => acc + c.students, 0)}</div>
              <div className="text-sm text-[var(--text-secondary)]">Total Classmates</div>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}