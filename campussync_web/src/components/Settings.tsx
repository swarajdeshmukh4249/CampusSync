import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle, Bell, CalendarClock, CheckCircle, KeyRound, Loader2, MessageCircle,
  Settings as SettingsIcon, ShieldAlert, Trash2, X,
} from 'lucide-react';
import { api } from '../api';
import Card from './ui/Card';
import Button from './ui/Button';
import DataState from './ui/DataState';
import AppShell from './ui/AppShell';
import type { Page } from './ui/AppShell';
import { useApiData } from '../hooks/useApiData';
import { useNotifications } from '../hooks/useNotifications';
import { formatBytes, formatDateTime, timeRemaining } from '../lib/format';

interface SettingsProps {
  userId: number;
  username: string;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

const REMINDER_CHOICES = [
  { minutes: 20, label: '20 minutes' },
  { minutes: 60, label: '1 hour' },
  { minutes: 360, label: '6 hours' },
  { minutes: 1440, label: '1 day' },
];

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  scheduled: { color: '#7C6CFF', label: 'Scheduled' },
  submitted: { color: '#32D583', label: 'Submitted' },
  failed: { color: '#FF5C7A', label: 'Failed' },
  queued_local: { color: '#FFB84D', label: 'Held — submit manually' },
};

export default function Settings({
  userId, onNavigate, onLogout, theme, onThemeToggle,
}: SettingsProps) {
  const notifications = useNotifications(userId);
  const settings = useApiData(() => api.settings(userId), [userId]);
  const submissions = useApiData(() => api.submissions(userId), [userId]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Local edits, seeded from the server once it responds.
  const [form, setForm] = useState<{
    whatsapp_enabled: boolean;
    push_enabled: boolean;
    reminder_minutes: number;
    whatsapp_number: string;
  } | null>(null);

  const current = form ?? (settings.data
    ? {
        whatsapp_enabled: settings.data.whatsapp_enabled,
        push_enabled: settings.data.push_enabled,
        reminder_minutes: settings.data.reminder_minutes,
        whatsapp_number: settings.data.whatsapp_number,
      }
    : null);

  function update(patch: Partial<NonNullable<typeof current>>) {
    if (!current) return;
    setForm({ ...current, ...patch });
    setSaved(false);
  }

  async function save() {
    if (!current) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateSettings(userId, current);
      setSaved(true);
      await settings.reload(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your settings');
    } finally {
      setSaving(false);
    }
  }

  async function cancelSubmission(id: number) {
    setError(null);
    try {
      await api.cancelSubmission(userId, id);
      await submissions.reload(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel that submission');
    }
  }

  async function forgetLogin() {
    setError(null);
    try {
      const res = await api.forgetCredentials(userId);
      setNotice(res.message ?? 'Saved VOLP login deleted.');
      await settings.reload(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete your saved login');
    }
  }

  async function deleteAccount() {
    setError(null);
    try {
      await api.deleteAccount(userId);
      onLogout();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete your account');
      setConfirmDelete(false);
    }
  }

  const rows = submissions.data?.submissions ?? [];

  return (
    <AppShell
      page="settings"
      onNavigate={onNavigate}
      theme={theme}
      onThemeToggle={onThemeToggle}
      title="Settings"
      icon={<SettingsIcon size={20} />}
      notifications={notifications}
      onBack={{ label: 'Dashboard', onClick: () => onNavigate('dashboard') }}
    >
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Settings</h1>
        <p className="text-[var(--text-secondary)]">
          {settings.data?.username ? `Signed in as ${settings.data.username}` : 'Your CampusSync account'}
        </p>
      </motion.div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl text-sm bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/25 text-[var(--color-danger)] mb-6">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl text-sm bg-[var(--color-success)]/10 border border-[var(--color-success)]/25 text-[var(--color-success)] mb-6">
          <CheckCircle size={16} className="shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifications */}
        <Card variant="glass">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bell size={18} /> Reminders
          </h2>

          <DataState
            loading={settings.loading}
            error={settings.error}
            onRetry={settings.reload}
            loadingMessage="Loading your preferences…"
          />

          {current && !settings.loading && !settings.error && (
            <div className="space-y-5">
              <Toggle
                label="Push notifications"
                description="Deadline reminders on your phone"
                checked={current.push_enabled}
                onChange={v => update({ push_enabled: v })}
              />
              <Toggle
                label="WhatsApp messages"
                description="The same reminders, on WhatsApp"
                checked={current.whatsapp_enabled}
                onChange={v => update({ whatsapp_enabled: v })}
              />

              <div>
                <label htmlFor="whatsapp-number" className="block text-sm font-medium mb-2">
                  WhatsApp number
                </label>
                <input
                  id="whatsapp-number"
                  type="tel"
                  inputMode="tel"
                  value={current.whatsapp_number}
                  onChange={e => update({ whatsapp_number: e.target.value })}
                  placeholder="919876543210"
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
                <p className="text-xs text-[var(--text-secondary)] mt-2 flex items-center gap-1.5">
                  <MessageCircle size={12} /> Country code first, no + or spaces.
                </p>
              </div>

              <div>
                <span className="block text-sm font-medium mb-2">Remind me before a deadline</span>
                <div className="flex flex-wrap gap-2">
                  {REMINDER_CHOICES.map(choice => (
                    <button
                      key={choice.minutes}
                      onClick={() => update({ reminder_minutes: choice.minutes })}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        current.reminder_minutes === choice.minutes
                          ? 'bg-[var(--color-accent)] text-white'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={save}
                disabled={saving}
                icon={
                  saving ? <Loader2 size={16} className="animate-spin" />
                    : saved ? <CheckCircle size={16} /> : undefined
                }
                iconPosition="left"
              >
                {saving ? 'Saving…' : saved ? 'Saved' : 'Save preferences'}
              </Button>
            </div>
          )}
        </Card>

        {/* Scheduled submissions */}
        <Card variant="glass">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CalendarClock size={18} /> Scheduled submissions
          </h2>

          <DataState
            loading={submissions.loading}
            error={submissions.error}
            onRetry={submissions.reload}
            loadingMessage="Loading your queue…"
          />

          {!submissions.loading && !submissions.error && (
            rows.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] py-6 text-center">
                Nothing queued. Pick an assignment and hit Submit to have CampusSync hand it in
                for you at a time you choose.
              </p>
            ) : (
              <ul className="space-y-3">
                {rows.map(row => {
                  const style = STATUS_STYLE[row.status] ?? STATUS_STYLE.scheduled;
                  return (
                    <li
                      key={row.id}
                      className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{row.assignment_name}</p>
                          <p className="text-xs text-[var(--text-secondary)] truncate">
                            {row.course_name}
                          </p>
                        </div>
                        <span
                          className="text-xs px-2 py-1 rounded-full whitespace-nowrap"
                          style={{ backgroundColor: `${style.color}20`, color: style.color }}
                        >
                          {style.label}
                        </span>
                      </div>

                      <p className="text-xs text-[var(--text-secondary)]">
                        {row.original_filename}
                        {row.file_size ? ` · ${formatBytes(row.file_size)}` : ''}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {row.status === 'submitted' && row.submitted_at
                          ? `Submitted ${formatDateTime(row.submitted_at)}`
                          : `Submits ${formatDateTime(row.scheduled_for)}${
                              row.status === 'scheduled'
                                ? ` · in ${timeRemaining(row.scheduled_for)}`
                                : ''
                            }`}
                      </p>

                      {row.error && (
                        <p className="text-xs mt-2 text-[var(--color-danger)]">{row.error}</p>
                      )}

                      {row.status === 'scheduled' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 !px-2"
                          icon={<X size={13} />}
                          iconPosition="left"
                          onClick={() => cancelSubmission(row.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )
          )}
        </Card>

        {/* VOLP login */}
        <Card variant="glass">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <KeyRound size={18} /> Saved VOLP login
          </h2>

          {settings.data?.credentials_saved ? (
            <>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                CampusSync holds your VOLP password, encrypted, so it can sign in and submit on
                your behalf at a scheduled time — even after your session expires. Delete it and
                scheduled submissions stop working until you sign in again.
              </p>
              <Button variant="outline" size="sm" onClick={forgetLogin} icon={<Trash2 size={14} />} iconPosition="left">
                Delete saved login
              </Button>
            </>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              No saved VOLP login. Scheduled submissions need one — sign in to CampusSync again to
              re-enable them.
            </p>
          )}
        </Card>

        {/* Danger zone */}
        <Card variant="glass" className="border-[var(--color-danger)]/30">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[var(--color-danger)]">
            <ShieldAlert size={18} /> Delete account
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Removes your VOLP session, saved login, synced coursework and group memberships from
            CampusSync. Your VOLP account itself is untouched. This cannot be undone.
          </p>

          {confirmDelete ? (
            <div className="flex gap-3">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Keep my account
              </Button>
              <Button variant="outline" size="sm" onClick={deleteAccount} icon={<Trash2 size={14} />} iconPosition="left">
                Yes, delete everything
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>
              Delete my account
            </Button>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function Toggle({
  label, description, checked, onChange,
}: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-[var(--text-secondary)]">{description}</span>
      </span>
      <span className="relative shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <span className="block w-11 h-6 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] peer-checked:bg-[var(--color-accent)] transition-colors" />
        <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
