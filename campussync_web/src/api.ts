// In dev, use Vite proxy (/api → localhost:8081) to avoid CORS / "Failed to fetch".
// Override with VITE_API_URL if the API is hosted elsewhere.
export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? '/api' : 'http://localhost:8081');

const OFFLINE =
  'Cannot reach CampusSync API. Start the backend on port 8081 (uvicorn main:app --reload --port 8081).';

async function request(path: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new Error(OFFLINE);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.detail === 'string' ? data.detail : `Request failed (${res.status})`);
  }
  return data;
}

const getJson = (path: string) => request(path);

const sendJson = (path: string, body: unknown, method = 'POST') =>
  request(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

// ── Shapes returned by the backend ─────────────────────────────────────────
export interface Assignment {
  assignment_id: string;
  assignment_name: string;
  description: string;
  download_url?: string | null;
  due_date: string;
  start_date: string;
  is_submitted: boolean;
  submission_date: string | null;
  max_marks: number;
  course_name: string;
  crsid: string | number | null;
  colid: string | number | null;
  urgent: boolean;
  status: string;
  assignment_type?: string;
  is_placeholder?: boolean;
  volp_url?: string;
}

export interface Course {
  course_id: string;
  crsid: number;
  colid: number;
  title: string;
  course_name: string;
  display_name: string;
  instructor: string;
  progress: number;
  is_active: boolean;
  is_archived: boolean;
  assignment_count: number;
  pending_count: number;
  next_deadline: string | null;
}

export interface Friend {
  user_id: number;
  username: string;
  shared_courses: number;
  source: 'shared_course' | 'group';
  group_id?: number;
  group_name?: string;
}

export interface Announcement {
  announcement_id?: string;
  title?: string;
  content?: string;
  course_name: string;
  created_at?: string;
  date?: string;
}

export interface Material {
  material_id: string;
  title: string;
  file_url: string;
  file_type?: string;
  uploaded_date?: string;
  chapter?: string;
  course_name: string;
  download_url: string;
}

export interface ScheduledSubmission {
  id: number;
  assignment_id: string;
  assignment_name: string;
  course_name: string;
  scheduled_for: string;
  original_filename: string;
  file_size?: number;
  status: 'scheduled' | 'submitted' | 'failed' | 'queued_local';
  error: string | null;
  submitted_at?: string;
  created_at: string;
}

export interface Settings {
  whatsapp_enabled: boolean;
  push_enabled: boolean;
  reminder_minutes: number;
  whatsapp_number: string;
  credentials_saved: boolean;
  username: string;
}

export interface Group {
  id: number;
  crsid: number;
  colid: number;
  course_name: string;
  invite_code: string;
  members: { id: number; username: string }[];
}

export const api = {
  login: (username: string, password: string) =>
    sendJson('/auth/login', { username, password, fcm_token: '', whatsapp_number: '' }),
  refresh: (userId: number) => sendJson('/auth/refresh', { user_id: userId }),
  deleteAccount: (userId: number) => sendJson(`/auth/delete-account/${userId}`, {}),
  forgetCredentials: (userId: number) => sendJson(`/auth/forget-credentials/${userId}`, {}),

  assignments: (userId: number): Promise<{ assignments: Assignment[]; last_sync: string }> =>
    getJson(`/assignments/${userId}`),
  courses: (userId: number): Promise<{ courses: Course[]; last_sync: string }> =>
    getJson(`/courses/${userId}`),
  announcements: (userId: number): Promise<{ announcements: Announcement[] }> =>
    getJson(`/announcements/${userId}`),
  materials: (userId: number): Promise<{ materials: Material[] }> => getJson(`/materials/${userId}`),
  friends: (userId: number): Promise<{ friends: Friend[] }> => getJson(`/friends/${userId}`),
  groups: (userId: number): Promise<{ groups: Group[] }> => getJson(`/groups/user/${userId}`),
  groupStatus: (groupId: number, assignmentId: string) =>
    getJson(`/groups/${groupId}/status/${encodeURIComponent(assignmentId)}`),
  submissions: (userId: number): Promise<{ submissions: ScheduledSubmission[] }> =>
    getJson(`/submissions/${userId}`),
  settings: (userId: number): Promise<Settings> => getJson(`/settings/${userId}`),

  updateSettings: (
    userId: number,
    settings: {
      whatsapp_enabled: boolean;
      push_enabled: boolean;
      reminder_minutes: number;
      whatsapp_number: string;
    },
  ) => sendJson(`/settings/${userId}`, { user_id: userId, ...settings }, 'PUT'),

  createGroup: (userId: number, crsid: number, colid: number) =>
    sendJson('/groups/create', { user_id: userId, crsid, colid }),
  joinGroup: (userId: number, inviteCode: string) =>
    sendJson('/groups/join', { user_id: userId, invite_code: inviteCode }),

  cancelSubmission: (userId: number, submissionId: number) =>
    request(`/submissions/${userId}/${submissionId}`, { method: 'DELETE' }),

  /** Hand a file to CampusSync to submit on VOLP at a chosen time. */
  scheduleSubmission: async (form: FormData): Promise<{ submission: ScheduledSubmission }> => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/submissions/schedule`, { method: 'POST', body: form });
    } catch {
      throw new Error(OFFLINE);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data.detail === 'string' ? data.detail : 'Could not schedule submission');
    }
    return data;
  },
};
