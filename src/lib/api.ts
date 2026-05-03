import type {
  ActiveDebate,
  AppBootstrap,
  DebateSetup,
  KnowledgeDocument,
  KnowledgeSearchResponse,
} from '@/types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: init?.body instanceof FormData
      ? init?.headers
      : {
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
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

export function login(email: string) {
  return request<AppBootstrap['session']>('/api/session/login', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function logout() {
  return request<{ ok: true }>('/api/session/logout', {
    method: 'POST',
  });
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
