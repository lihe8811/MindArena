import type {
  ActiveDebate,
  AppBootstrap,
  AuthResponse,
  DebateSetup,
  KnowledgeDocument,
  KnowledgeDocumentDetail,
  KnowledgeSearchResponse,
  PasswordResetResponse,
  UserSettings,
  VerificationChallenge,
} from '@/shared/types';

const AUTH_TOKEN_KEY = 'mindarena.auth.token';
const AUTH_SESSION_PREFERENCE_KEY = 'mindarena.auth.remember';

function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY) ?? window.sessionStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_SESSION_PREFERENCE_KEY);
}

export function syncStoredTokenPersistence(token: string | null, rememberSession: boolean) {
  if (typeof window === 'undefined') return;
  if (!token) {
    setStoredToken(null);
    return;
  }

  if (rememberSession) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
  } else {
    window.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  window.localStorage.setItem(AUTH_SESSION_PREFERENCE_KEY, String(rememberSession));
}

export function getStoredRememberSessionPreference() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(AUTH_SESSION_PREFERENCE_KEY);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const baseHeaders =
    init?.body instanceof FormData
      ? { ...(init?.headers ?? {}) }
      : {
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        };

  const response = await fetch(path, {
    headers: token
      ? {
          ...baseHeaders,
          Authorization: `Bearer ${token}`,
        }
      : baseHeaders,
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getBootstrap() {
  return request<AppBootstrap>('/api/bootstrap');
}

export async function register(payload: { name: string; email: string; password: string }) {
  const response = await request<AuthResponse>('/api/session/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  setStoredToken(response.session.token);
  return response.session;
}

export async function login(email: string, password: string) {
  const response = await request<AuthResponse>('/api/session/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  setStoredToken(response.session.token);
  return response.session;
}

export function requestPasswordReset(email: string) {
  return request<VerificationChallenge>('/api/session/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(payload: { email: string; code: string; password: string }) {
  return request<PasswordResetResponse>('/api/session/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function logout() {
  const response = await request<{ ok: true }>('/api/session/logout', {
    method: 'POST',
  });
  setStoredToken(null);
  return response;
}

export function createDebate(payload: DebateSetup) {
  return request<ActiveDebate>('/api/debates', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function sendDebateMessage(content: string) {
  return request<ActiveDebate>('/api/debates/current/messages', {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export function listKnowledgeBase() {
  return request<{ documents: KnowledgeDocument[] }>('/api/knowledge-base');
}

export function getKnowledgeDocument(documentId: string) {
  return request<KnowledgeDocumentDetail>(`/api/knowledge-base/${documentId}`);
}

export function createKnowledgeRule(payload: {
  title: string;
  category: string;
  content: string;
}) {
  return request<{ document: KnowledgeDocument; documents: KnowledgeDocument[] }>(
    '/api/knowledge-base/rules',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export function uploadKnowledgeFile(payload: {
  file: File;
  title?: string;
  category?: string;
}) {
  const formData = new FormData();
  formData.append('file', payload.file);
  if (payload.title) formData.append('title', payload.title);
  if (payload.category) formData.append('category', payload.category);

  return request<{ document: KnowledgeDocument; documents: KnowledgeDocument[] }>(
    '/api/knowledge-base/upload',
    {
      method: 'POST',
      body: formData,
    },
  );
}

export function searchKnowledge(query: string, limit = 8) {
  return request<KnowledgeSearchResponse>('/api/knowledge-base/search', {
    method: 'POST',
    body: JSON.stringify({ query, limit }),
  });
}

export function reindexKnowledgeDocument(documentId: string) {
  return request<KnowledgeDocumentDetail>(`/api/knowledge-base/${documentId}/reindex`, {
    method: 'POST',
  });
}

export function deleteKnowledgeDocument(documentId: string) {
  return request<{ documents: KnowledgeDocument[] }>(`/api/knowledge-base/${documentId}`, {
    method: 'DELETE',
  });
}

export function getSettings() {
  return request<{ settings: UserSettings }>('/api/settings');
}

export function updateSettings(payload: UserSettings) {
  return request<{ user: AppBootstrap['session']['user']; settings: UserSettings }>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
