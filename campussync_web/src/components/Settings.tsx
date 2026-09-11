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
import { Label, fieldClass } from './ui/Modal';
import { Badge, Empty, SectionTitle } from './ui/Bits';
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
  scheduled: { color: 'var(--state-accent)', label: 'Scheduled' },
  submitted: { color: 'var(--state-success)', label: 'Submitted' },
  failed: { color: 'var(--state-danger)', label: 'Failed' },
  queued_local: { color: 'var(--state-warning)', label: 'Held — submit manually' },
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
      icon={<SettingsIcon size={18} />}
      notifications={notifications}
      onBack={{ label: 'Dashboard', onClick: () => onNavigate('dashboard') }}
      eyebrow="Account"
      heading="Settings"
      subheading={
        settings.data?.username
          ? `Signed in as ${settings.data.username}`
          : 'Reminders, scheduled submissions and your saved VOLP login.'
      }
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2.5 p-4 rounded-xl text-sm bg-[rgba(255,92,122,0.1)] border border-[rgba(255,92,122,0.25)] text-[var(--color-danger)] mb-5"
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </motion.div>
      )}
      {notice && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2.5 p-4 rounded-xl text-sm bg-[rgba(61,220,151,0.1)] border border-[rgba(61,220,151,0.25)] text-[var(--color-success)] mb-5"
        >
          <CheckCircle size={16} className="shrink-0 mt-0.5" />
          <span>{notice}</span>
        </motion.div>
      )}

      {/* Settings is the one screen where the 3D scene is turned almost all the
          way down — it is a form, and forms want a quiet ground. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Notifications */}
        <Card variant="glass" padding="lg">
          <SectionTitle>
            <span className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg grid place-items-center bg-[rgba(124,108,255,0.14)] text-[var(--color-accent)]">
                <Bell size={16} />
              </span>
              Reminders
            </span>
          </SectionTitle>

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
                <Label htmlFor="whatsapp-number">WhatsApp number</Label>
                <input
                  id="whatsapp-number"
                  type="tel"
                  inputMode="tel"
                  value={current.whatsapp_number}
                  onChange={e => update({ whatsapp_number: e.target.value })}
                  placeholder="919876543210"
                  className={fieldClass}
                />
                <p className="text-xs text-[var(--text-tertiary)] mt-2.5 flex items-center gap-1.5">
                  <MessageCircle size={12} /> Country code first, no + or spaces.
                </p>
              </div>

              <div>
                <Label>Remind me before a deadline</Label>
                <div className="flex flex-wrap gap-2">
                  {REMINDER_CHOICES.map(choice => {
                    const active = current.reminder_minutes === choice.minutes;
                    return (
                      <button
                        key={choice.minutes}
                        onClick={() => update({ reminder_minutes: choice.minutes })}
                        aria-pressed={active}
                        className={`px-4 py-2 rounded-full text-[13px] font-medium border transition-[background,border-color,color] duration-200 ${
                          active
                            ? 'bg-[image:var(--gradient-action)] text-white border-transparent shadow-[0_4px_16px_rgba(124,108,255,0.35)]'
                            : 'bg-[var(--bg-sunken)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {choice.label}
                      </button>
                    );
                  })}
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
        <Card variant="glass" padding="lg">
          <SectionTitle>
            <span className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg grid place-items-center bg-[rgba(52,224,255,0.14)] text-[var(--color-cyan)]">
                <CalendarClock size={16} />
              </span>
              Scheduled submissions
            </span>
          </SectionTitle>

          <DataState
            loading={submissions.loading}
            error={submissions.error}
            onRetry={submissions.reload}
            loadingMessage="Loading your queue…"
          />

          {!submissions.loading && !submissions.error && (
            rows.length === 0 ? (
              <Empty
                icon={<CalendarClock size={20} />}
                title="Nothing queued"
                body="Pick an assignment and hit Submit to have CampusSync hand it in for you at a time you choose."
              />
            ) : (
              <ul className="space-y-2.5">
                {rows.map(row => {
                  const style = STATUS_STYLE[row.status] ?? STATUS_STYLE.scheduled;
                  return (
                    <li
                      key={row.id}
                      className="relative p-4 pl-5 rounded-xl bg-[var(--bg-sunken)] border border-[var(--border-color)] overflow-hidden"
                    >
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 w-1"
                        style={{ backgroundColor: style.color }}
                      />
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="min-w-0">
                          <p className="font-medium truncate text-[14px]">{row.assignment_name}</p>
                          <p className="text-xs text-[var(--text-tertiary)] truncate">
                            {row.course_name}
                          </p>
                        </div>
                        <Badge color={style.color}>{style.label}</Badge>
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
                          className="mt-2.5 !px-2.5"
                          icon={<X size={13} />}
                          iconPosition="left"
                          onClick={() => cancelSubmission(row.id)}
                        >
                          Cancel this
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
        <Card variant="glass" padding="lg">
          <SectionTitle
            action={
              <Badge color={settings.data?.credentials_saved ? 'var(--state-success)' : 'var(--state-warning)'}>
                {settings.data?.credentials_saved ? 'Stored' : 'Not stored'}
              </Badge>
            }
          >
            <span className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg grid place-items-center bg-[rgba(61,220,151,0.14)] text-[var(--color-success)]">
                <KeyRound size={16} />
              </span>
              Saved VOLP login
            </span>
          </SectionTitle>

          {settings.data?.credentials_saved ? (
            <>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
                CampusSync holds your VOLP password, encrypted, so it can sign in and submit on
                your behalf at a scheduled time — even after your session expires. Delete it and
                scheduled submissions stop working until you sign in again.
              </p>
              <Button variant="danger" size="sm" onClick={forgetLogin} icon={<Trash2 size={14} />} iconPosition="left">
                Delete saved login
              </Button>
            </>
          ) : (
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              No saved VOLP login. Scheduled submissions need one — sign in to CampusSync again to
              re-enable them.
            </p>
          )}
        </Card>

        {/* Danger zone */}
        <Card
          variant="glass"
          padding="lg"
          edge="var(--color-danger)"
          className="!border-[rgba(255,92,122,0.28)]"
        >
          <SectionTitle>
            <span className="flex items-center gap-2.5 text-[var(--color-danger)]">
              <span className="w-8 h-8 rounded-lg grid place-items-center bg-[rgba(255,92,122,0.12)]">
                <ShieldAlert size={16} />
              </span>
              Delete account
            </span>
          </SectionTitle>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
            Removes your VOLP session, saved login, synced coursework and group memberships from
            CampusSync. Your VOLP account itself is untouched. This cannot be undone.
          </p>

          {confirmDelete ? (
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
                Keep my account
              </Button>
              <Button variant="danger" size="sm" onClick={deleteAccount} icon={<Trash2 size={14} />} iconPosition="left">
                Yes, delete everything
              </Button>
            </div>
          ) : (
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
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
        <span className="block text-xs text-[var(--text-tertiary)] mt-0.5">{description}</span>
      </span>
      <span className="relative shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <span className="block w-11 h-6 rounded-full bg-[var(--bg-sunken)] border border-[var(--border-color)] transition-[background,border-color] duration-300 peer-checked:border-transparent peer-checked:bg-[linear-gradient(120deg,#7C6CFF,#34E0FF)] peer-checked:shadow-[0_0_16px_rgba(124,108,255,0.45)]" />
        <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
