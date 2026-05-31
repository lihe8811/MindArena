import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  ActiveDebate,
  AuthResponse,
  DashboardData,
  DebateSetup,
  HistoryItem,
  PerformanceData,
  RecentDebate,
  UserProfile,
} from '@/shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../../../data');
const storePath = path.join(dataDir, 'app-store.json');
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

interface StoredUser extends UserProfile {
  passwordHash: string;
}

interface StoredSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

interface StoredDebate extends ActiveDebate {
  userId: string;
  opponent: string;
  domain: string;
}

interface AppStoreShape {
  users: StoredUser[];
  sessions: StoredSession[];
  debates: StoredDebate[];
}

const defaultStore: AppStoreShape = {
  users: [],
  sessions: [],
  debates: [],
};

function ensureStoreFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, JSON.stringify(defaultStore, null, 2), 'utf8');
  }
}

function loadStore() {
  ensureStoreFile();
  return JSON.parse(fs.readFileSync(storePath, 'utf8')) as AppStoreShape;
}

function saveStore(store: AppStoreShape) {
  ensureStoreFile();
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
}

function nowIso() {
  return new Date().toISOString();
}

function nowLabel(date = new Date()) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function randomId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, originalHash] = storedHash.split(':');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(originalHash, 'hex'));
}

function sanitizeUser(user: StoredUser): UserProfile {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

function createSessionPayload(user: StoredUser, token: string): AuthResponse {
  return {
    session: {
      authenticated: true,
      user: sanitizeUser(user),
      token,
    },
  };
}

function cleanupExpiredSessions(store: AppStoreShape) {
  const now = Date.now();
  store.sessions = store.sessions.filter((session) => new Date(session.expiresAt).getTime() > now);
}

export function registerUser(input: { name: string; email: string; password: string }) {
  const store = loadStore();
  cleanupExpiredSessions(store);

  const email = input.email.trim().toLowerCase();
  if (store.users.some((user) => user.email === email)) {
    throw new Error('This email is already registered.');
  }

  const user: StoredUser = {
    id: randomId('user'),
    name: input.name.trim() || email.split('@')[0] || 'Debater',
    email,
    title: 'Logic Apprentice',
    streak: 1,
    createdAt: nowIso(),
    passwordHash: hashPassword(input.password),
  };

  const token = crypto.randomUUID();
  const createdAt = nowIso();
  const session: StoredSession = {
    token,
    userId: user.id,
    createdAt,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };

  store.users.push(user);
  store.sessions.push(session);
  saveStore(store);

  return createSessionPayload(user, token);
}

export function loginUser(input: { email: string; password: string }) {
  const store = loadStore();
  cleanupExpiredSessions(store);

  const email = input.email.trim().toLowerCase();
  const user = store.users.find((entry) => entry.email === email);

  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    throw new Error('Invalid email or password.');
  }

  const token = crypto.randomUUID();
  store.sessions.push({
    token,
    userId: user.id,
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  });
  saveStore(store);

  return createSessionPayload(user, token);
}

export function logoutSession(token: string | null) {
  if (!token) return;
  const store = loadStore();
  store.sessions = store.sessions.filter((session) => session.token !== token);
  saveStore(store);
}

export function getSessionFromToken(token: string | null) {
  if (!token) {
    return {
      authenticated: false,
      user: null,
      token: null,
    };
  }

  const store = loadStore();
  cleanupExpiredSessions(store);
  const session = store.sessions.find((entry) => entry.token === token);
  const user = session ? store.users.find((entry) => entry.id === session.userId) : null;
  saveStore(store);

  if (!session || !user) {
    return {
      authenticated: false,
      user: null,
      token: null,
    };
  }

  return {
    authenticated: true,
    user: sanitizeUser(user),
    token: session.token,
  };
}

export function requireUserFromToken(token: string | null) {
  const session = getSessionFromToken(token);
  if (!session.authenticated || !session.user) {
    throw new Error('Authentication required.');
  }
  return session.user;
}

function inferDebateStatus(messageCount: number): HistoryItem['status'] {
  if (messageCount >= 8) return 'Victory';
  if (messageCount >= 5) return 'Draw';
  if (messageCount >= 3) return 'Defeat';
  return 'In Progress';
}

function inferScore(messageCount: number) {
  return Math.min(96, 60 + messageCount * 6);
}

function debateToRecent(debate: StoredDebate): RecentDebate {
  const durationMinutes = Math.max(8, debate.messages.length * 4);
  const approximateTokens = debate.messages.reduce((sum, message) => sum + Math.ceil(message.content.length / 4), 0);
  return {
    id: debate.id,
    topic: debate.topic,
    opponent: debate.opponent,
    status: debate.status === 'Completed' ? inferDebateStatus(debate.messages.length) : 'In Progress',
    duration: `${durationMinutes}m`,
    tokens: `${(approximateTokens / 1000).toFixed(1)}k`,
    domain: debate.domain,
  };
}

function debateToHistory(debate: StoredDebate): HistoryItem {
  const computedStatus = debate.status === 'Completed' ? inferDebateStatus(debate.messages.length) : 'In Progress';
  return {
    id: debate.id,
    topic: debate.topic,
    subject: debate.domain,
    date: new Date(debate.createdAt).toLocaleDateString(),
    level: debate.rigor,
    status: computedStatus,
    score: debate.score ?? 0,
    opponent: debate.opponent,
    createdAt: debate.createdAt,
  };
}

export function buildDashboardForUser(user: UserProfile): DashboardData {
  const store = loadStore();
  const userDebates = store.debates.filter((debate) => debate.userId === user.id);
  const completed = userDebates.filter((debate) => debate.status === 'Completed');

  const averageResponseSeconds = 24;
  const winCount = completed.filter((debate) => inferDebateStatus(debate.messages.length) === 'Victory').length;
  const winRate = completed.length > 0 ? Math.round((winCount / completed.length) * 100) : 0;

  const recentDebates = userDebates
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 5)
    .map(debateToRecent);

  return {
    heroTitle: `Welcome back, ${user.name}`,
    heroSubtitle: 'Continue your training where you left off. Every session sharpens your edge.',
    stats: {
      logicScore: 84,
      averageResponseSeconds,
      winRate,
      debatesCompleted: completed.length,
    },
    recentDebates,
    recommendations: [
      'Practice Crossfire timing in your next round.',
      'Review your last loss for logical fallacies.',
      'Upload new case study files for better context.',
    ],
  };
}

export function listUserHistory(userId: string): HistoryItem[] {
  const store = loadStore();
  return store.debates
    .filter((debate) => debate.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map(debateToHistory);
}

export function buildPerformanceForUser(userId: string): PerformanceData {
  const store = loadStore();
  const completed = store.debates.filter((debate) => debate.userId === userId && debate.status === 'Completed');

  const winCount = completed.filter((debate) => inferDebateStatus(debate.messages.length) === 'Victory').length;
  const winRate = completed.length > 0 ? Math.round((winCount / completed.length) * 100) : 0;

  return {
    highlights: [
      { label: 'Win Rate', value: `${winRate}%`, trend: '+4%' },
      { label: 'Elo Rating', value: '1420', trend: '+15' },
      { label: 'Global Rank', value: '#1,204', trend: '-12', isDown: true },
      { label: 'Avg Response', value: '24.2s', trend: '-1.4s' },
    ],
    skillBalance: [
      { label: 'Logic', value: 85 },
      { label: 'Rhetoric', value: 72 },
      { label: 'Evidence', value: 90 },
      { label: 'Rebuttal', value: 64 },
      { label: 'Clarity', value: 78 },
    ],
    insight:
      'Your use of evidence remains top-tier, but your rebuttal efficiency is slipping. Focus on faster structure during prep time.',
    recommendation: 'Join a high-rigor (4+) round to test your rebuttal speed under pressure.',
    milestoneProgress: 65,
  };
}

export function createDebateForUser(userId: string, setup: DebateSetup) {
  const store = loadStore();
  const id = randomId('debate');
  const createdAt = nowIso();

  const debate: StoredDebate = {
    id,
    userId,
    topic: setup.topic,
    stance: setup.stance,
    rigor: setup.rigor,
    knowledgeDocumentIds: setup.knowledgeDocumentIds,
    stage: 'Constructive',
    timerLabel: '04:00',
    status: 'Ready',
    messages: [],
    createdAt,
    updatedAt: createdAt,
    opponent: 'Rival AI (Level ' + setup.rigor + ')',
    domain: 'General Policy',
  };

  store.debates.push(debate);
  saveStore(store);
  return debate;
}

export function getActiveDebate(userId: string) {
  const store = loadStore();
  const debate = store.debates
    .filter((entry) => entry.userId === userId && entry.status !== 'Completed')
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];

  return debate || null;
}

export function appendDebateMessage(userId: string, author: string, content: string) {
  const store = loadStore();
  const debate = [...store.debates]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .find((entry) => entry.userId === userId && entry.status !== 'Completed');

  if (!debate) {
    throw new Error('No active debate.');
  }

  debate.messages.push({
    id: randomId('msg'),
    role: 'user',
    author,
    time: nowLabel(),
    content,
  });

  debate.messages.push({
    id: randomId('msg'),
    role: 'system',
    author: 'Moderator',
    time: nowLabel(),
    content:
      'Argument recorded. AI rebuttal is still pending, but this transcript is now persisted and can be resumed later.',
  });

  debate.status = 'In Progress';
  debate.updatedAt = nowIso();

  if (debate.messages.length >= 8) {
    debate.status = 'Completed';
    debate.stage = 'Verdict';
    debate.score = inferScore(debate.messages.length);
  }

  saveStore(store);
  return debate;
}
