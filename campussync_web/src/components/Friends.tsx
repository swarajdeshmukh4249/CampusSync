import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Check, CheckCircle, Clock, Copy, LogIn, Plus, Sparkles, UserPlus, Users,
} from 'lucide-react';
import { api } from '../api';
import type { Friend, Group } from '../api';
import Card from './ui/Card';
import Button from './ui/Button';
import DataState from './ui/DataState';
import AppShell from './ui/AppShell';
import type { Page } from './ui/AppShell';
import Modal, { ErrorNote, Label, fieldClass } from './ui/Modal';
import { Badge, Empty, SectionTitle } from './ui/Bits';
import { useApiData } from '../hooks/useApiData';
import { useNotifications } from '../hooks/useNotifications';
import { courseColor, displayName, initials, tint } from '../lib/format';

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
      icon={<Users size={18} />}
      notifications={notifications}
      search={{ value: query, onChange: setQuery, placeholder: 'Search classmates…' }}
      onBack={{ label: 'Dashboard', onClick: () => onNavigate('dashboard') }}
      eyebrow="People"
      heading="Your academic circle"
      subheading="Classmates CampusSync found in your courses, plus the study groups you've joined."
      headActions={
        <>
          <Button variant="secondary" size="sm" onClick={() => setModal('join')} icon={<LogIn size={15} />} iconPosition="left">
            Join with code
          </Button>
          <Button variant="primary" size="sm" onClick={() => setModal('create')} icon={<Plus size={15} />} iconPosition="left">
            New group
          </Button>
        </>
      }
    >
      {/* Study groups ------------------------------------------------- */}
      <section className="mb-10">
        <SectionTitle>Study groups</SectionTitle>
        <DataState
          loading={groups.loading}
          error={groups.error}
          onRetry={groups.reload}
          loadingMessage="Loading your groups…"
          skeletonRows={2}
        />
        {!groups.loading && !groups.error && (
          groupList.length === 0 ? (
            <Empty
              icon={<Sparkles size={22} />}
              title="No study group yet"
              body="Create one for a course, then share the invite code with your classmates."
              action={
                <>
                  <Button variant="secondary" size="sm" onClick={() => setModal('join')}>
                    Join with a code
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setModal('create')}>
                    Create a group
                  </Button>
                </>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {groupList.map(group => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          )
        )}
      </section>

      {/* Classmates ---------------------------------------------------- */}
      <section>
        <SectionTitle>
          Classmates
          {list.length > 0 && (
            <span className="ml-2.5 text-[var(--text-tertiary)] font-normal numeric text-sm">
              {list.length}
            </span>
          )}
        </SectionTitle>

        <DataState
          loading={friends.loading}
          error={friends.error}
          onRetry={friends.reload}
          loadingMessage="Finding your classmates…"
          skeletonRows={2}
        />

        {!friends.loading && !friends.error && (
          list.length === 0 ? (
            <Empty
              icon={<UserPlus size={22} />}
              title={(friends.data?.friends ?? []).length === 0 ? 'Nobody here yet' : 'No match'}
              body={
                (friends.data?.friends ?? []).length === 0
                  ? 'None of your coursemates have signed up for CampusSync. Share it with them.'
                  : `No classmate matches “${query}”.`
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {list.map((friend, i) => (
                <motion.div
                  key={friend.user_id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 10) * 0.04, duration: 0.4 }}
                >
                  <Card variant="glass" padding="md" className="h-full">
                    <div className="flex items-center gap-3.5 mb-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold shrink-0 text-[13px]"
                        style={{ background: 'var(--gradient-action)' }}
                      >
                        {initials(friend.username)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate text-[15px]">{displayName(friend.username)}</h3>
                        <p className="text-[11.5px] text-[var(--text-tertiary)] truncate">{friend.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)] mb-3.5">
                      <BookOpen size={14} />
                      {friend.shared_courses} shared course{friend.shared_courses === 1 ? '' : 's'}
                    </div>

                    <Badge color={friend.source === 'group' ? 'var(--state-success)' : 'var(--state-accent)'}>
                      {friend.source === 'group' ? friend.group_name ?? 'Study group' : 'Same course'}
                    </Badge>
                  </Card>
                </motion.div>
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
    <Card variant="glass" padding="md" edge={color} className="h-full">
      <span
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{ background: `radial-gradient(circle at 15% 0%, ${color}, transparent 60%)` }}
      />

      <div className="relative flex items-start justify-between gap-3 mb-4">
        <span
          className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
          style={{ backgroundColor: tint(color, 12), color }}
        >
          <Users size={18} />
        </span>
        <button
          onClick={copyCode}
          className="flex items-center gap-1.5 text-[11.5px] px-2.5 py-1.5 rounded-lg bg-[var(--bg-sunken)] border border-[var(--border-color)] hover:border-[rgba(124,108,255,0.5)] transition-colors font-mono tracking-wider"
          title="Copy invite code"
        >
          {copied ? <Check size={12} className="text-[var(--color-success)]" /> : <Copy size={12} />}
          {group.invite_code}
        </button>
      </div>

      <h3 className="relative font-semibold mb-1 text-[15px]">{group.course_name}</h3>
      <p className="relative text-[13px] text-[var(--text-secondary)] mb-4">
        {group.members.length} member{group.members.length === 1 ? '' : 's'}
      </p>

      <div className="relative flex items-center">
        {group.members.slice(0, 8).map(m => (
          <span
            key={m.id}
            title={m.username}
            className="w-8 h-8 -mr-2 rounded-full flex items-center justify-center text-[10px] font-semibold text-white border-2 border-[var(--bg-primary)]"
            style={{ background: 'var(--gradient-action)' }}
          >
            {initials(m.username)}
          </span>
        ))}
        {group.members.length > 8 && (
          <span className="ml-4 text-[11.5px] text-[var(--text-tertiary)]">
            +{group.members.length - 8}
          </span>
        )}
      </div>
    </Card>
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
    <Modal
      title="Create a study group"
      subtitle="Pick one of your VOLP courses — everyone who joins has to be enrolled in it."
      icon={<Plus size={19} />}
      onClose={onClose}
    >
      {code ? (
        <div className="text-center py-3">
          <CheckCircle size={38} className="mx-auto mb-4 text-[var(--color-success)]" />
          <p className="mb-4 text-[var(--text-secondary)] text-sm">Group created. Share this invite code:</p>
          <p className="text-[28px] font-mono font-bold tracking-[0.28em] mb-6 gradient-text">{code}</p>
          <Button variant="primary" size="md" className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && <ErrorNote>{error}</ErrorNote>}
          <div>
            <Label htmlFor="group-course">Course</Label>
            <select
              id="group-course"
              value={selected}
              onChange={e => setSelected(e.target.value)}
              required
              className={fieldClass}
            >
              <option value="">Pick one of your courses…</option>
              {courses.map(c => (
                <option key={`${c.crsid}_${c.colid}`} value={`${c.crsid}_${c.colid}`}>
                  {c.title}
                </option>
              ))}
            </select>
            {courses.length === 0 && (
              <p className="text-xs text-[var(--text-tertiary)] mt-2.5">
                No courses synced yet — sync from the Courses page first.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="md" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="md" className="flex-1" type="submit" disabled={!selected || busy}>
              {busy ? 'Creating…' : 'Create group'}
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
    <Modal
      title="Join a study group"
      subtitle="Paste the invite code a classmate shared with you."
      icon={<LogIn size={19} />}
      onClose={onClose}
    >
      {joined ? (
        <div className="text-center py-4">
          <CheckCircle size={38} className="mx-auto mb-4 text-[var(--color-success)]" />
          <p>You're in — {joined}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && <ErrorNote>{error}</ErrorNote>}
          <div>
            <Label htmlFor="invite-code">Invite code</Label>
            <input
              id="invite-code"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={12}
              required
              className={`${fieldClass} font-mono tracking-[0.28em] uppercase text-center text-base`}
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-2.5 flex items-center gap-1.5">
              <Clock size={12} />
              You can only join a group for a course you're enrolled in on VOLP.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="md" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="md" className="flex-1" type="submit" disabled={!code.trim() || busy}>
              {busy ? 'Joining…' : 'Join group'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
