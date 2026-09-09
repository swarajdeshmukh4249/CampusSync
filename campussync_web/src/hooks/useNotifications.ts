import { useEffect, useState } from 'react';
import { api } from '../api';
import { assignmentStatus, timeRemaining, urgency } from '../lib/format';

export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  tone: 'danger' | 'warning' | 'info';
  page: 'assignments' | 'courses';
}

/**
 * Real notifications, derived from the student's own synced VOLP data:
 * overdue work, deadlines inside 48 hours, and recent announcements.
 * Nothing here is invented — an empty bell means there is genuinely nothing.
 */
export function useNotifications(userId: number) {
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const next: NotificationItem[] = [];
      try {
        const { assignments } = await api.assignments(userId);
        for (const a of assignments) {
          const status = assignmentStatus(a);
          if (status === 'submitted') continue;
          if (status === 'overdue') {
            next.push({
              id: `overdue-${a.assignment_id}`,
              title: a.assignment_name,
              detail: `Overdue • ${a.course_name}`,
              tone: 'danger',
              page: 'assignments',
            });
          } else if (urgency(a) !== 'low') {
            next.push({
              id: `due-${a.assignment_id}`,
              title: a.assignment_name,
              detail: `Due in ${timeRemaining(a.due_date)} • ${a.course_name}`,
              tone: urgency(a) === 'high' ? 'danger' : 'warning',
              page: 'assignments',
            });
          }
        }
      } catch {
        // The bell is secondary; a failure here must not break the page.
      }

      try {
        const { announcements } = await api.announcements(userId);
        for (const [i, ann] of announcements.slice(0, 5).entries()) {
          next.push({
            id: `ann-${ann.announcement_id ?? i}`,
            title: ann.title || 'Announcement',
            detail: `${ann.course_name}${ann.content ? ` • ${ann.content.slice(0, 80)}` : ''}`,
            tone: 'info',
            page: 'courses',
          });
        }
      } catch {
        /* same */
      }

      if (!cancelled) setItems(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return items;
}
