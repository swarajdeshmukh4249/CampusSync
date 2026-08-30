// In dev, use Vite proxy (/api → localhost:8081) to avoid CORS / "Failed to fetch".
// Override with VITE_API_URL if the API is hosted elsewhere.
export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? '/api' : 'http://localhost:8081');

async function getJson(path: string) {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`);
  } catch {
    throw new Error(
      'Cannot reach CampusSync API. Start the backend on port 8081 (uvicorn main:app --reload --port 8081).',
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Request failed (${res.status})`);
  }
  return data;
}

async function postJson(path: string, body: unknown, method = 'POST') {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      'Cannot reach CampusSync API. Start the backend on port 8081 (uvicorn main:app --reload --port 8081).',
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.detail === 'string' ? data.detail : `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  login: (username: string, password: string) =>
    postJson('/auth/login', {
      username,
      password,
      fcm_token: 'web_placeholder',
      whatsapp_number: '',
    }),
  refresh: (userId: number) => postJson('/auth/refresh', { user_id: userId }),
  assignments: (userId: number) => getJson(`/assignments/${userId}`),
  courses: (userId: number) => getJson(`/courses/${userId}`),
  materials: (userId: number) => getJson(`/materials/${userId}`),
  friends: (userId: number) => getJson(`/friends/${userId}`),
  groups: (userId: number) => getJson(`/groups/user/${userId}`),
  submissions: (userId: number) => getJson(`/submissions/${userId}`),
  settings: (userId: number) => getJson(`/settings/${userId}`),
  updateSettings: (userId: number, settings: {
    whatsapp_enabled: boolean;
    push_enabled: boolean;
    reminder_minutes: number;
    whatsapp_number: string;
  }) => postJson(`/settings/${userId}`, { user_id: userId, ...settings }, 'PUT'),
  createGroup: (userId: number, crsid: number, colid: number) =>
    postJson('/groups/create', { user_id: userId, crsid, colid }),
  joinGroup: (userId: number, inviteCode: string) =>
    postJson('/groups/join', { user_id: userId, invite_code: inviteCode }),
  scheduleSubmission: async (form: FormData) => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/submissions/schedule`, { method: 'POST', body: form });
    } catch {
      throw new Error(
        'Cannot reach CampusSync API. Start the backend on port 8081 (uvicorn main:app --reload --port 8081).',
      );
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data.detail === 'string' ? data.detail : 'Could not schedule submission');
    }
    return data;
  },
};
