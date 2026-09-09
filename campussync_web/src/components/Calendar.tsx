import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Search,
  ArrowLeft,
  Home,
  FileText,
  BookOpen,
  Users,
  Bell,
  Plus
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import ThemeToggle from './ui/ThemeToggle';
import { Canvas } from '@react-three/fiber';
import AcademicOrbit from './3d/AcademicOrbit';

type Page = 'dashboard' | 'courses' | 'assignments' | 'calendar' | 'friends';

interface CalendarProps {
  userId: number;
  username: string;
  onNavigate: (page: Page) => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

export default function Calendar({ onNavigate, theme, onThemeToggle }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const events = [
    {
      id: 1,
      title: 'Data Structures Lecture',
      type: 'class',
      date: new Date(2024, 2, 25),
      time: '10:00 AM - 11:30 AM',
      location: 'Room 301',
      color: '#7C6CFF'
    },
    {
      id: 2,
      title: 'DBMS Assignment Due',
      type: 'deadline',
      date: new Date(2024, 2, 26),
      time: '11:59 PM',
      location: 'Online',
      color: '#FF5C7A'
    },
    {
      id: 3,
      title: 'Logic Design Practical',
      type: 'practical',
      date: new Date(2024, 2, 27),
      time: '2:00 PM - 4:00 PM',
      location: 'Lab 202',
      color: '#00D9FF'
    },
    {
      id: 4,
      title: 'OS Lab Session',
      type: 'lab',
      date: new Date(2024, 2, 28),
      time: '9:00 AM - 12:00 PM',
      location: 'Lab 301',
      color: '#32D583'
    },
    {
      id: 5,
      title: 'Networks Quiz',
      type: 'exam',
      date: new Date(2024, 2, 29),
      time: '11:00 AM - 12:00 PM',
      location: 'Room 401',
      color: '#FFB84D'
    },
    {
      id: 6,
      title: 'Software Engineering Project Meeting',
      type: 'meeting',
      date: new Date(2024, 2, 30),
      time: '3:00 PM - 4:30 PM',
      location: 'Conference Room',
      color: '#9C91FF'
    }
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      event.date.toDateString() === date.toDateString()
    );
  };

  const todayEvents = selectedDate ? getEventsForDate(selectedDate) : getEventsForDate(new Date());

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
              <CalendarIcon size={20} className="text-white" />
            </div>
            <span className="font-semibold text-lg">Calendar</span>
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
            <Button variant="primary" size="sm" onClick={() => onNavigate('calendar')} icon={<CalendarIcon size={16} />}>
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
                placeholder="Search events..." 
                className="pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] w-64"
              />
            </div>
            
            <ThemeToggle theme={theme} onToggle={onThemeToggle} />
            
            <button className="relative p-2 rounded-xl hover:bg-[var(--bg-surface)] transition-colors">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-danger)] rounded-full" />
            </button>
            
            <Button variant="primary" size="sm" icon={<Plus size={16} />}>
              Add Event
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
              Academic Calendar
            </h1>
            <p className="text-[var(--text-secondary)]">
              Manage your schedule, deadlines, and academic events
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Grid */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2"
            >
              <Card variant="glass" className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <button onClick={() => navigateMonth('prev')} className="p-2 rounded-xl hover:bg-[var(--bg-surface)] transition-colors">
                    <ChevronLeft size={20} />
                  </button>
                  <h2 className="text-xl font-semibold">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                  <button onClick={() => navigateMonth('next')} className="p-2 rounded-xl hover:bg-[var(--bg-surface)] transition-colors">
                    <ChevronRight size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-4">
                  {dayNames.map(day => (
                    <div key={day} className="text-center text-sm font-medium text-[var(--text-secondary)] py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                    <div key={`empty-${index}`} className="aspect-square" />
                  ))}
                  
                  {Array.from({ length: daysInMonth }).map((_, index) => {
                    const day = index + 1;
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const dayEvents = getEventsForDate(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isSelected = selectedDate?.toDateString() === date.toDateString();

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDate(date)}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${
                          isToday 
                            ? 'bg-[var(--color-accent)] text-white' 
                            : isSelected
                            ? 'bg-[var(--bg-elevated)] border-2 border-[var(--color-accent)]'
                            : 'hover:bg-[var(--bg-surface)]'
                        }`}
                      >
                        <span className="text-sm font-medium">{day}</span>
                        {dayEvents.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {dayEvents.slice(0, 3).map((event, i) => (
                              <div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: event.color }}
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Card>
            </motion.div>

            {/* Events Panel */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card variant="glass" className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Today\'s Events'}
                </h3>

                {todayEvents.length > 0 ? (
                  <div className="space-y-3">
                    {todayEvents.map((event) => (
                      <div
                        key={event.id}
                        className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[var(--color-accent)] transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-3 h-3 rounded-full mt-1.5"
                            style={{ backgroundColor: event.color }}
                          />
                          <div className="flex-1">
                            <h4 className="font-medium mb-1">{event.title}</h4>
                            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                              <Clock size={14} />
                              <span>{event.time}</span>
                            </div>
                            <div className="text-sm text-[var(--text-secondary)] mt-1">
                              {event.location}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[var(--text-secondary)]">
                    <CalendarIcon size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No events scheduled</p>
                  </div>
                )}

                {/* Event Types Legend */}
                <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
                  <h4 className="text-sm font-medium mb-3">Event Types</h4>
                  <div className="space-y-2">
                    {['class', 'deadline', 'practical', 'lab', 'exam', 'meeting'].map((type) => (
                      <div key={type} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: events.find(e => e.type === type)?.color || '#7C6CFF' }} />
                        <span className="capitalize text-[var(--text-secondary)]">{type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}