import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle, BookOpen, Check, CheckCircle, Clock, Copy, LogIn, Plus, Users, X,
} from 'lucide-react';
import { api } from '../api';
import type { Friend, Group } from '../api';
import Card from './ui/Card';
import Button from './ui/Button';
import DataState from './ui/DataState';
import AppShell from './ui/AppShell';
import type { Page } from './ui/AppShell';
import { useApiData } from '../hooks/useApiData';
import { useNotifications } from '../hooks/useNotifications';
import { courseColor, displayName, initials } from '../lib/format';

interface FriendsProps {
  userId: number;
  username: string;
  onNavigate: (page: Page) => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

export default function Friends({ userId, onNavigate, theme, onThemeToggle }: FriendsProps) {
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<'join' | 'create' | null>(null);

  const notifications = useNotifications(userId);
  const friends = useApiData(() => api.friends(userId), [userId]);
  const groups = useApiData(() => api.groups(userId), [userId]);
  const courses = useApiData(() => api.courses(userId), [userId]);

  const list: Friend[] = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const all = friends.data?.friends ?? [];
    if (!needle) return all;
    return all.filter(
      f =>
        f.username.toLowerCase().includes(needle) ||
        displayName(f.username).toLowerCase().includes(needle) ||
        (f.group_name ?? '').toLowerCase().includes(needle),
    );
  }, [friends.data, query]);

  const groupList: Group[] = groups.data?.groups ?? [];

  function refreshAll() {
    friends.reload(false);
    groups.reload(false);
  }

  return (
    <AppShell
      page="friends"
      onNavigate={onNavigate}
      theme={theme}
      onThemeToggle={onThemeToggle}
      title="Friends"
      icon={<Users size={20} />}
      notifications={notifications}
      search={{ value: query, onChange: setQuery, placeholder: 'Search classmates…' }}
      onBack={{ label: 'Dashboard', onClick: () => onNavigate('dashboard') }}
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setModal('join')} icon={<LogIn size={15} />} iconPosition="left">
            Join
          </Button>
          <Button variant="primary" size="sm" onClick={() => setModal('create')} icon={<Plus size={15} />} iconPosition="left">
            New group
          </Button>
        </div>
      }
    >
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Your Academic Circle</h1>
        <p className="text-[var(--text-secondary)]">
          Classmates CampusSync found in your courses, plus the study groups you've joined
        </p>
      </motion.div>

      {/* Study groups */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Study groups</h2>
        <DataState
          loading={groups.loading}
          error={groups.error}
          onRetry={groups.reload}
          loadingMessage="Loading your groups…"
        />
        {!groups.loading && !groups.error && (
          groupList.length === 0 ? (
            <Card variant="glass" className="py-8 text-center">
              <p className="text-[var(--text-secondary)] mb-4">
                You're not in any study group yet. Create one for a course, then share the invite
                code with your classmates.
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setModal('join')}>
                  Join with a code
                </Button>
                <Button variant="primary" size="sm" onClick={() => setModal('create')}>
                  Create a group
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupList.map(group => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          )
        )}
      </section>

      {/* Classmates */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Classmates</h2>
        <DataState
          loading={friends.loading}
          error={friends.error}
          onRetry={friends.reload}
          loadingMessage="Finding your classmates…"
        />

        {!friends.loading && !friends.error && (
          list.length === 0 ? (
            <Card variant="glass" className="py-12 text-center">
              <Users size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-[var(--text-secondary)]">
                {(friends.data?.friends ?? []).length === 0
                  ? 'Nobody else from your courses has signed up for CampusSync yet. Share it with your classmates.'
                  : `No classmate matches “${query}”.`}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {list.map(friend => (
                <Card key={friend.user_id} variant="glass">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
                      style={{ background: 'linear-gradient(135deg, #7C6CFF, #00D9FF)' }}
                    >
                      {initials(friend.username)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{displayName(friend.username)}</h3>
                      <p className="text-xs text-[var(--text-secondary)] truncate">{friend.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-2">
                    <BookOpen size={14} />
                    {friend.shared_courses} shared course{friend.shared_courses === 1 ? '' : 's'}
                  </div>

                  <span
                    className="inline-block text-xs px-2 py-1 rounded-full"
                    style={
                      friend.source === 'group'
                        ? { backgroundColor: '#32D58320', color: '#32D583' }
                        : { backgroundColor: '#7C6CFF20', color: '#7C6CFF' }
                    }
                  >
                    {friend.source === 'group' ? friend.group_name ?? 'Study group' : 'Same course'}
                  </span>
                </Card>
              ))}
            </div>
          )
        )}
      </section>

      <AnimatePresence>
        {modal === 'create' && (
          <CreateGroupModal
            userId={userId}
            courses={courses.data?.courses ?? []}
            onClose={() => setModal(null)}
            onDone={refreshAll}
          />
        )}
        {modal === 'join' && (
          <JoinGroupModal userId={userId} onClose={() => setModal(null)} onDone={refreshAll} />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function GroupCard({ group }: { group: Group }) {
  const [copied, setCopied] = useState(false);
  const color = courseColor(`${group.crsid}_${group.colid}`);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(group.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card variant="glass">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}20`, color }}
        >
          <Users size={18} />
        </div>
        <button
          onClick={copyCode}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[var(--color-accent)] transition-colors font-mono"
          title="Copy invite code"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {group.invite_code}
        </button>
      </div>

      <h3 className="font-semibold mb-1">{group.course_name}</h3>
      <p className="text-sm text-[var(--text-secondary)] mb-3">
        {group.members.length} member{group.members.length === 1 ? '' : 's'}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {group.members.slice(0, 8).map(m => (
          <span
            key={m.id}
            title={m.username}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
            style={{ background: 'linear-gradient(135deg, #7C6CFF, #00D9FF)' }}
          >
            {initials(m.username)}
          </span>
        ))}
      </div>
    </Card>
  );
}

function Modal({
  title, children, onClose,
}: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="bg-[var(--bg-elevated)] rounded-2xl w-full max-w-md border border-[var(--border-color)] shadow-2xl p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-lg hover:bg-[var(--bg-surface)]">
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-sm bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/25 text-[var(--color-danger)] mb-4">
      <AlertCircle size={16} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function CreateGroupModal({
  userId, courses, onClose, onDone,
}: {
  userId: number;
  courses: { crsid: number; colid: number; title: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const course = courses.find(c => `${c.crsid}_${c.colid}` === selected);
    if (!course) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.createGroup(userId, course.crsid, course.colid);
      setCode(res.group?.invite_code ?? null);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the group');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Create a study group" onClose={onClose}>
      {code ? (
        <div className="text-center py-4">
          <CheckCircle size={40} className="mx-auto mb-3 text-[var(--color-success)]" />
          <p className="mb-2">Group created. Share this invite code:</p>
          <p className="text-2xl font-mono font-bold tracking-widest mb-4">{code}</p>
          <Button variant="primary" size="md" className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <ErrorNote>{error}</ErrorNote>}
          <div>
            <label htmlFor="group-course" className="block text-sm font-medium mb-2">
              Course
            </label>
            <select
              id="group-course"
              value={selected}
              onChange={e => setSelected(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="">Pick one of your courses…</option>
              {courses.map(c => (
                <option key={`${c.crsid}_${c.colid}`} value={`${c.crsid}_${c.colid}`}>
                  {c.title}
                </option>
              ))}
            </select>
            {courses.length === 0 && (
              <p className="text-xs text-[var(--text-secondary)] mt-2">
                No courses synced yet — sync from the Courses page first.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="md" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="md" className="flex-1" type="submit" disabled={!selected || busy}>
              {busy ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function JoinGroupModal({
  userId, onClose, onDone,
}: { userId: number; onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.joinGroup(userId, code.trim().toUpperCase());
      setJoined(res.group?.course_name ?? 'the group');
      onDone();
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join that group');
      setBusy(false);
    }
  }

  return (
    <Modal title="Join a study group" onClose={onClose}>
      {joined ? (
        <div className="text-center py-4">
          <CheckCircle size={40} className="mx-auto mb-3 text-[var(--color-success)]" />
          <p>You're in — {joined}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <ErrorNote>{error}</ErrorNote>}
          <div>
            <label htmlFor="invite-code" className="block text-sm font-medium mb-2">
              Invite code
            </label>
            <input
              id="invite-code"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={12}
              required
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
            <p className="text-xs text-[var(--text-secondary)] mt-2 flex items-center gap-1.5">
              <Clock size={12} />
              You can only join a group for a course you're enrolled in on VOLP.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="md" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="md" className="flex-1" type="submit" disabled={!code.trim() || busy}>
              {busy ? 'Joining…' : 'Join'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
