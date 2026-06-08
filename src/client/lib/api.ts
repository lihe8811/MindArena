import type {
  ActiveDebate,
  AppBootstrap,
  AuthResponse,
  DebateSetup,
  UserSettings,
  VerificationChallenge,
} from '@/shared/types';

const AUTH_TOKEN_KEY = 'mindarena.auth.token';

function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    return;
  }
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
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
  const response = await request<VerificationChallenge>('/api/session/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response;
}

export async function login(email: string, password: string) {
  const response = await request<VerificationChallenge>('/api/session/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  return response;
}

export async function verifyEmail(email: string, code: string) {
  const response = await request<{ ok: true; email: string; verifiedAt: string }>('/api/session/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });

  return response;
}

export async function resendVerification(email: string) {
  const response = await request<VerificationChallenge>('/api/session/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

  return response;
}

export async function confirmLogin(email: string, code: string) {
  const response = await request<AuthResponse>('/api/session/confirm-login', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });

  setStoredToken(response.session.token);
  return response.session;
}

export async function resendLoginCode(email: string) {
  const response = await request<VerificationChallenge>('/api/session/resend-login-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

  return response;
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

export function getSettings() {
  return request<{ settings: UserSettings }>('/api/settings');
}

export function getNotifications() {
  return request<{
    notifications: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      read: boolean;
      createdAt: string;
    }>;
  }>('/api/notifications');
}

export function markNotificationsRead() {
  return request<{ ok: true }>('/api/notifications/read', {
    method: 'PUT',
  });
}
