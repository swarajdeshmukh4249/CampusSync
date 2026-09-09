/** Date and status helpers shared by every screen, so a deadline reads the
 *  same way on the dashboard, the assignment list and the calendar. */

export type AssignmentStatus = 'pending' | 'submitted' | 'overdue';

export function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  // The API sends ISO strings, but VOLP passthrough values can be anything.
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** "2d 4h", "5h", "12m", "Overdue" — or a plain note when there is no date. */
export function timeRemaining(dueDate?: string | null): string {
  const due = parseDate(dueDate);
  if (!due) return 'No due date';

  const diff = due.getTime() - Date.now();
  if (diff < 0) return 'Overdue';

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

/** "Tue, 10 Sep · 11:59 PM" — the real time, never a hardcoded one. */
export function formatDateTime(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return 'No due date';
  return date.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** How long ago the last VOLP sync ran. */
export function timeAgo(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return 'never';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function assignmentStatus(a: {
  is_submitted: boolean;
  due_date?: string | null;
}): AssignmentStatus {
  if (a.is_submitted) return 'submitted';
  const due = parseDate(a.due_date);
  if (due && due.getTime() < Date.now()) return 'overdue';
  return 'pending';
}

export const STATUS_COLORS: Record<AssignmentStatus, string> = {
  pending: '#FFB84D',
  submitted: '#32D583',
  overdue: '#FF5C7A',
};

/** Urgency derived from how close the deadline actually is, rather than from
 *  the assignment type — a test next month is not high priority. */
export function urgency(a: { is_submitted: boolean; due_date?: string | null }): 'high' | 'medium' | 'low' {
  if (a.is_submitted) return 'low';
  const due = parseDate(a.due_date);
  if (!due) return 'low';
  const hours = (due.getTime() - Date.now()) / 3600000;
  if (hours < 0) return 'high';
  if (hours <= 24) return 'high';
  if (hours <= 72) return 'medium';
  return 'low';
}

export const URGENCY_COLORS: Record<'high' | 'medium' | 'low', string> = {
  high: '#FF5C7A',
  medium: '#FFB84D',
  low: '#32D583',
};

/** A stable colour per course, so the same course keeps its colour across
 *  screens without anyone hardcoding a palette per course name. */
const COURSE_PALETTE = ['#7C6CFF', '#00D9FF', '#32D583', '#FFB84D', '#FF5C7A', '#9C91FF', '#4ECDC4', '#FF9F68'];

export function courseColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return COURSE_PALETTE[hash % COURSE_PALETTE.length];
}

/** "AS" from "anita.sharma@college.edu" or "Anita Sharma". */
export function initials(name: string): string {
  const clean = (name || '').split('@')[0].replace(/[._\-0-9]+/g, ' ').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Human-readable display name from a VOLP username/email. */
export function displayName(username: string): string {
  const local = (username || '').split('@')[0];
  const words = local.replace(/[._\-]+/g, ' ').replace(/\d+/g, '').trim();
  if (!words) return username || 'Student';
  return words
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Value for a datetime-local input, in the browser's own timezone. */
export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}
