import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { BellRing, LogOut, Orbit, Upload, Users, CalendarClock } from 'lucide-react';
import { Scene } from './Scene';
import { api } from '../api';

type Tab = 'overview' | 'assignments' | 'courses' | 'friends' | 'notifications';

function formatDue(value?: string) {
  if (!value) return 'No due date';
  const dt = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Dashboard({
  userId,
  username,
  onLogout,
}: {
  userId: number;
  username: string;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<Tab>('overview');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [lastSync, setLastSync] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<any | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [groupCourseKey, setGroupCourseKey] = useState('');
  const [notice, setNotice] = useState('');
  const [notificationSettings, setNotificationSettings] = useState({
    whatsapp_enabled: true,
    push_enabled: true,
    reminder_minutes: 20,
    whatsapp_number: '',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  async function loadAll() {
    setError('');
    const [a, c, f, g, s, settings] = await Promise.all([
      api.assignments(userId),
      api.courses(userId),
      api.friends(userId),
      api.groups(userId),
      api.submissions(userId),
      api.settings(userId),
    ]);
    setAssignments(a.assignments || []);
    setCourses(c.courses || []);
    setFriends(f.friends || []);
    setGroups(g.groups || []);
    setSubmissions(s.submissions || []);
    setLastSync(a.last_sync || c.last_sync || '');
    setNotificationSettings((current) => ({ ...current, ...settings }));
  }

  useEffect(() => {
    setLoading(true);
    loadAll()
      .catch((e) => setError(e.message || 'Could not load dashboard data'))
      .finally(() => setLoading(false));
  }, [userId]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const lastSyncLabel = lastSync
    ? new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';

  const pending = assignments.filter((a) => !a.is_submitted);
  const courseAssignments = useMemo(() => {
    if (!selectedCourse) return [];
    return assignments.filter(
      (a) =>
        String(a.crsid) === String(selectedCourse.crsid) ||
        a.course_name === selectedCourse.title ||
        a.course_name === selectedCourse.display_name,
    );
  }, [assignments, selectedCourse]);

  async function handleSync() {
    setSyncing(true);
    setNotice('');
    try {
      await api.refresh(userId);
      await loadAll();
      setNotice('Synced with VOLP.');
    } catch (e: any) {
      setError(e.message || 'Sync failed. Your VOLP session may have expired — sign in again.');
    } finally {
      setSyncing(false);
    }
  }

  async function handleSchedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!scheduleTarget) return;
    const formEl = e.currentTarget;
    const file = (formEl.elements.namedItem('file') as HTMLInputElement).files?.[0];
    const when = (formEl.elements.namedItem('when') as HTMLInputElement).value;
    if (!file || !when) {
      setError('Choose a file and a submission time.');
      return;
    }
    const form = new FormData();
    form.append('user_id', String(userId));
    form.append('assignment_id', String(scheduleTarget.assignment_id));
    form.append('assignment_name', scheduleTarget.assignment_name || '');
    form.append('course_name', scheduleTarget.course_name || '');
    form.append('crsid', String(scheduleTarget.crsid || ''));
    form.append('colid', String(scheduleTarget.colid || ''));
    form.append('scheduled_for', when);
    form.append('file', file);
    try {
      await api.scheduleSubmission(form);
      setScheduleTarget(null);
      await loadAll();
      setNotice(`Scheduled ${file.name} for ${formatDue(when)}.`);
    } catch (err: any) {
      setError(err.message || 'Could not schedule submission');
    }
  }

  async function handleJoinGroup(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.joinGroup(userId, inviteCode.trim());
      setInviteCode('');
      await loadAll();
      setNotice('Joined group.');
    } catch (err: any) {
      setError(err.message || 'Could not join group');
    }
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    const [crsid, colid] = groupCourseKey.split(':');
    if (!crsid || !colid) {
      setError('Pick a course to create a group.');
      return;
    }
    try {
      const data = await api.createGroup(userId, Number(crsid), Number(colid));
      await loadAll();
      setNotice(`Group created. Invite code: ${data.group?.invite_code}`);
    } catch (err: any) {
      setError(err.message || 'Could not create group');
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setNotice('');
    try {
      await api.updateSettings(userId, notificationSettings);
      setNotice('Notification preferences saved.');
    } catch (err: any) {
      setError(err.message || 'Could not save notification preferences');
    } finally {
      setSavingSettings(false);
    }
  }

  const nav: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'assignments', label: 'Assignments' },
    { id: 'courses', label: 'Courses' },
    { id: 'friends', label: 'Friends' },
    { id: 'notifications', label: 'Notifications' },
  ];

  return (
    <div className="min-h-screen bg-[#05070B] text-white">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
          <Scene />
        </Canvas>
      </div>

      <nav className="relative z-20 flex items-center justify-between px-6 md:px-8 py-4 bg-[#05070B]/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6C63FF] to-[#00D9FF] flex items-center justify-center">
            <Orbit className="text-white w-5 h-5" />
          </div>
          <span className="font-semibold text-lg tracking-tight">CampusSync</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          {nav.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setTab(item.id);
                setSelectedCourse(null);
              }}
              className={tab === item.id ? 'text-white' : 'text-white/50 hover:text-white'}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/50 hidden md:block">{username}</span>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full font-medium text-sm disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 text-white/60 hover:text-white border border-white/10 rounded-full text-sm">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </nav>

      <div className="relative z-10 flex min-h-[calc(100vh-72px)]">
        <aside className="w-64 border-r border-white/10 p-6 hidden lg:flex flex-col bg-[#05070B]/70">
          <div className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-4">Menu</div>
          <div className="space-y-2 text-sm">
            {nav.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setTab(item.id);
                  setSelectedCourse(null);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl ${tab === item.id ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-auto p-4 rounded-2xl bg-[#090D14] border border-white/5 text-center">
            <div className="inline-block px-3 py-1 bg-[#32D583]/10 text-[#32D583] text-xs font-medium rounded-full mb-3">
              Connected to VOLP
            </div>
            <div className="text-sm text-white/50 mb-1">Last sync</div>
            <div className="text-white font-mono text-sm mb-4">{lastSyncLabel}</div>
            <button onClick={handleSync} className="w-full py-2.5 bg-gradient-to-r from-[#6C63FF] to-[#00D9FF] rounded-xl font-medium text-sm">
              Force Sync
            </button>
          </div>
        </aside>

        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-semibold mb-1">{greeting}, {username}.</h1>
            <p className="text-white/50">Deadlines, courses, friends, and scheduled submissions in one place.</p>
          </header>

          {error && (
            <div className="mb-6 p-4 rounded-xl border border-[#FF5C7A]/30 bg-[#FF5C7A]/10 text-[#FF5C7A] text-sm">{error}</div>
          )}
          {notice && (
            <div className="mb-6 p-4 rounded-xl border border-[#32D583]/30 bg-[#32D583]/10 text-[#32D583] text-sm">{notice}</div>
          )}
          {loading && <div className="text-white/40 mb-8">Loading your VOLP data…</div>}

          <div className="flex gap-2 mb-8 md:hidden overflow-x-auto">
            {nav.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${tab === item.id ? 'bg-white/15' : 'bg-white/5 text-white/60'}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <>
              <div className="grid md:grid-cols-4 gap-4 mb-10">
                {[
                  { num: pending.length, label: 'Assignments pending' },
                  { num: courses.length, label: 'Courses' },
                  { num: assignments.filter((a) => a.urgent).length, label: 'Urgent deadlines' },
                  { num: friends.length, label: 'Friends / classmates' },
                ].map((s) => (
                  <div key={s.label} className="p-6 rounded-2xl bg-[#090D14]/90 border border-white/5">
                    <div className="text-3xl font-mono mb-2">{s.num}</div>
                    <div className="text-sm text-white/50">{s.label}</div>
                  </div>
                ))}
              </div>
              <AssignmentList assignments={pending.slice(0, 8)} onSchedule={setScheduleTarget} empty="No upcoming deadlines." />
              <ScheduledList submissions={submissions} />
            </>
          )}

          {tab === 'assignments' && (
            <AssignmentList assignments={assignments} onSchedule={setScheduleTarget} empty="No assignments synced from VOLP yet. Try Sync Now." />
          )}

          {tab === 'courses' && (
            <div>
              {selectedCourse ? (
                <div>
                  <button className="text-sm text-white/50 mb-4" onClick={() => setSelectedCourse(null)}>← All courses</button>
                  <h2 className="text-2xl font-medium mb-1">{selectedCourse.title}</h2>
                  <p className="text-white/40 mb-6">{selectedCourse.instructor} · next deadline {formatDue(selectedCourse.next_deadline)}</p>
                  <AssignmentList
                    assignments={courseAssignments}
                    onSchedule={setScheduleTarget}
                    empty="No assignments found for this course."
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {courses.length === 0 && (
                    <div className="p-10 text-center text-white/40 border border-white/10 rounded-2xl">
                      No courses found. Sync with VOLP or sign in again.
                    </div>
                  )}
                  {courses.map((c) => (
                    <button
                      key={`${c.crsid}-${c.colid}`}
                      onClick={() => setSelectedCourse(c)}
                      className="w-full text-left p-5 rounded-2xl bg-[#090D14]/90 border border-white/5 flex items-center justify-between hover:border-white/20"
                    >
                      <div>
                        <div className="text-xs text-white/40 mb-1 uppercase tracking-wider">{c.course_name || c.course_id}</div>
                        <div className="text-base font-medium">{c.title}</div>
                        <div className="text-sm text-white/40">{c.instructor}</div>
                        <div className="text-xs text-[#FFB547] mt-2">
                          {c.pending_count} pending · next {formatDue(c.next_deadline)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-mono text-[#6C63FF]">{c.progress}%</div>
                        <div className="text-xs text-white/30">Progress</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'friends' && (
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl font-medium mb-5 flex items-center gap-2"><Users className="w-5 h-5" /> Classmates</h2>
                <div className="space-y-4">
                  {friends.length === 0 && (
                    <div className="p-8 text-center text-white/40 border border-white/10 rounded-2xl">
                      No classmates yet. Anyone who logs into CampusSync and shares a VOLP course with you will appear here. You can also create or join a group.
                    </div>
                  )}
                  {friends.map((f) => (
                    <div key={f.user_id} className="p-5 rounded-2xl bg-[#090D14]/90 border border-white/5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#6C63FF]/20 to-[#00D9FF]/20 flex items-center justify-center text-sm font-bold border border-white/10">
                        {String(f.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-base font-medium">{f.username}</div>
                        <div className="text-xs text-white/40">
                          {f.shared_courses || 0} shared course{(f.shared_courses || 0) !== 1 ? 's' : ''}
                          {f.group_name ? ` · ${f.group_name}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-xl font-medium mb-5">Study groups</h2>
                <form onSubmit={handleJoinGroup} className="flex gap-2 mb-4">
                  <input
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Invite code"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 outline-none"
                  />
                  <button className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm">Join</button>
                </form>
                <form onSubmit={handleCreateGroup} className="flex gap-2 mb-6">
                  <select
                    value={groupCourseKey}
                    onChange={(e) => setGroupCourseKey(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#090D14] border border-white/10 outline-none"
                  >
                    <option value="">Create group for course…</option>
                    {courses.map((c) => (
                      <option key={`${c.crsid}-${c.colid}`} value={`${c.crsid}:${c.colid}`}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  <button className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#00D9FF] text-sm">Create</button>
                </form>
                {groups.map((g) => (
                  <div key={g.id} className="p-5 rounded-2xl bg-[#090D14]/90 border border-white/5 mb-3">
                    <div className="font-medium">{g.course_name}</div>
                    <div className="text-xs text-white/40 mt-1">Invite code {g.invite_code}</div>
                    <div className="text-sm text-white/60 mt-2">{(g.members || []).map((m: any) => m.username).join(', ') || 'No members'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <form onSubmit={handleSaveSettings} className="max-w-2xl rounded-2xl bg-[#090D14]/90 border border-white/10 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#6C63FF]/15 text-[#aaa6ff]"><BellRing className="w-5 h-5" /></span>
                <div>
                  <h2 className="text-xl font-medium">Deadline notifications</h2>
                  <p className="text-sm text-white/45 mt-1">Choose how CampusSync should alert you when VOLP changes.</p>
                </div>
              </div>

              <label className="flex items-center justify-between gap-4 py-6 border-b border-white/10 cursor-pointer">
                <div>
                  <div className="font-medium">Push notifications</div>
                  <div className="text-sm text-white/45 mt-1">Receive deadline and VOLP session alerts on your connected device.</div>
                </div>
                <input type="checkbox" checked={notificationSettings.push_enabled} onChange={(e) => setNotificationSettings((s) => ({ ...s, push_enabled: e.target.checked }))} className="w-4 h-4 accent-[#6C63FF]" />
              </label>

              <label className="flex items-center justify-between gap-4 py-6 border-b border-white/10 cursor-pointer">
                <div>
                  <div className="font-medium">WhatsApp reminders</div>
                  <div className="text-sm text-white/45 mt-1">Send deadline alerts to your WhatsApp number.</div>
                </div>
                <input type="checkbox" checked={notificationSettings.whatsapp_enabled} onChange={(e) => setNotificationSettings((s) => ({ ...s, whatsapp_enabled: e.target.checked }))} className="w-4 h-4 accent-[#6C63FF]" />
              </label>

              <div className="py-6 border-b border-white/10">
                <label className="block text-sm font-medium mb-2" htmlFor="whatsapp-number">WhatsApp number</label>
                <input id="whatsapp-number" type="tel" value={notificationSettings.whatsapp_number} onChange={(e) => setNotificationSettings((s) => ({ ...s, whatsapp_number: e.target.value.replace(/[^0-9+]/g, '') }))} placeholder="919876543210" disabled={!notificationSettings.whatsapp_enabled} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-[#6C63FF]/60 disabled:opacity-40" />
                <p className="mt-2 text-xs text-white/35">Include country code, without spaces (for example, 919876543210).</p>
              </div>

              <div className="py-6">
                <label className="block text-sm font-medium mb-2" htmlFor="reminder-time">Reminder time</label>
                <select id="reminder-time" value={notificationSettings.reminder_minutes} onChange={(e) => setNotificationSettings((s) => ({ ...s, reminder_minutes: Number(e.target.value) }))} className="w-full px-4 py-3 rounded-xl bg-[#090D14] border border-white/10 outline-none focus:border-[#6C63FF]/60">
                  <option value={10}>10 minutes before</option>
                  <option value={20}>20 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>1 hour before</option>
                  <option value={1440}>1 day before</option>
                </select>
              </div>

              <button disabled={savingSettings} className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#00D9FF] text-sm font-medium disabled:opacity-50">
                {savingSettings ? 'Saving…' : 'Save notification preferences'}
              </button>
            </form>
          )}
        </main>
      </div>

      {scheduleTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form onSubmit={handleSchedule} className="w-full max-w-md p-6 rounded-2xl bg-[#090D14] border border-white/10">
            <h3 className="text-lg font-medium mb-1">Schedule submission</h3>
            <p className="text-sm text-white/50 mb-6">{scheduleTarget.assignment_name} · {scheduleTarget.course_name}</p>
            <label className="block text-xs text-white/40 mb-2">File</label>
            <input name="file" type="file" required className="w-full mb-4 text-sm" />
            <label className="block text-xs text-white/40 mb-2">Submit at</label>
            <input name="when" type="datetime-local" required className="w-full mb-6 px-3 py-2 rounded-xl bg-white/5 border border-white/10" />
            <div className="flex gap-3">
              <button type="button" onClick={() => setScheduleTarget(null)} className="flex-1 py-2.5 rounded-xl border border-white/10">Cancel</button>
              <button className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#00D9FF]">Schedule</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function AssignmentList({
  assignments,
  onSchedule,
  empty,
}: {
  assignments: any[];
  onSchedule: (a: any) => void;
  empty: string;
}) {
  if (!assignments.length) {
    return <div className="p-10 text-center text-white/40 border border-white/10 rounded-2xl bg-[#090D14]/80">{empty}</div>;
  }
  return (
    <div className="space-y-4 mb-10">
      {assignments.map((a) => (
        <div key={`${a.assignment_id}-${a.course_name}`} className="p-6 rounded-2xl bg-[#090D14]/90 border border-white/10 flex justify-between items-center gap-4">
          <div className={`w-1 self-stretch rounded-full ${a.is_submitted ? 'bg-[#32D583]' : a.urgent ? 'bg-[#FF5C7A]' : 'bg-[#FFB547]'}`} />
          <div className="flex-1">
            <div className="text-xs text-white/50 tracking-wider mb-1 uppercase">{a.course_name}</div>
            <div className="text-lg font-medium mb-1">{a.assignment_name}</div>
            <div className={`text-sm ${a.is_submitted ? 'text-[#32D583]' : a.urgent ? 'text-[#FF5C7A]' : 'text-[#FFB547]'}`}>
              {a.is_submitted ? 'Submitted' : `Due: ${formatDue(a.due_date)}`}
            </div>
          </div>
          {!a.is_submitted && (
            <button
              onClick={() => onSchedule(a)}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Schedule
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function ScheduledList({ submissions }: { submissions: any[] }) {
  if (!submissions.length) return null;
  return (
    <div className="mt-4">
      <h2 className="text-xl font-medium mb-5 flex items-center gap-2"><CalendarClock className="w-5 h-5" /> Scheduled submissions</h2>
      <div className="space-y-3">
        {submissions.map((s) => (
          <div key={s.id} className="p-4 rounded-xl bg-[#090D14]/90 border border-white/5 flex justify-between text-sm">
            <div>
              <div className="font-medium">{s.assignment_name}</div>
              <div className="text-white/40">{s.original_filename} · {formatDue(s.scheduled_for)}</div>
              {s.error && <div className="text-[#FFB547] text-xs mt-1">{s.error}</div>}
            </div>
            <span className="text-white/50 uppercase text-xs tracking-wider">{s.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
