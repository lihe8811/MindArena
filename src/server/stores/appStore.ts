import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  ActiveDebate,
  AuthResponse,
  DashboardData,
  DebateParticipant,
  DebateParticipantId,
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

const debateParticipants: DebateParticipant[] = [
  { id: 'pro1', label: 'pro1', side: 'Proponent', speakerOrder: 1 },
  { id: 'pro2', label: 'pro2', side: 'Proponent', speakerOrder: 2 },
  { id: 'con1', label: 'con1', side: 'Opponent', speakerOrder: 1 },
  { id: 'con2', label: 'con2', side: 'Opponent', speakerOrder: 2 },
];

function getParticipant(role: DebateParticipantId) {
  return debateParticipants.find((participant) => participant.id === role) ?? debateParticipants[0];
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
  const activeSessions = store.sessions.filter((session) => new Date(session.expiresAt).getTime() > now);
  const removedExpiredSessions = activeSessions.length !== store.sessions.length;
  store.sessions = activeSessions;
  return removedExpiredSessions;
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
  const removedExpiredSessions = cleanupExpiredSessions(store);
  const session = store.sessions.find((entry) => entry.token === token);
  const user = session ? store.users.find((entry) => entry.id === session.userId) : null;
  if (removedExpiredSessions) {
    saveStore(store);
  }

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
    date: new Date(debate.createdAt).toISOString().slice(0, 10),
    level: debate.rigor,
    status: computedStatus,
    score: debate.score ?? inferScore(debate.messages.length),
    opponent: debate.opponent,
    createdAt: debate.createdAt,
  };
}

export function listUserDebates(userId: string) {
  return loadStore()
    .debates.filter((debate) => debate.userId === userId)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function listUserHistory(userId: string) {
  return listUserDebates(userId).map(debateToHistory);
}

export function getActiveDebate(userId: string): ActiveDebate | null {
  const debate = listUserDebates(userId).find((entry) => entry.status !== 'Completed');
  return debate ?? null;
}

export function createDebateForUser(
  userId: string,
  input: {
    topic: string;
    stance: 'Proponent' | 'Opponent';
    speakerRole?: DebateParticipantId;
    rigor: number;
  },
) {
  const store = loadStore();
  const createdAt = nowIso();
  const speakerRole =
    input.speakerRole ?? (input.stance === 'Opponent' ? 'con1' : 'pro1');
  const participant = getParticipant(speakerRole);
  const debate: StoredDebate = {
    id: randomId('debate'),
    userId,
    topic: input.topic,
    stance: participant.side,
    speakerRole: participant.id,
    rigor: input.rigor,
    stage: 'Opening Statements',
    timerLabel: '08:00',
    status: 'Ready',
    createdAt,
    updatedAt: createdAt,
    score: undefined,
    participants: debateParticipants,
    opponent: 'AI Opponent Pending',
    domain: 'User Defined',
    messages: [
      {
        id: randomId('msg'),
        role: 'system',
        author: 'Moderator',
        time: nowLabel(new Date(createdAt)),
        content: `Debate created. You are ${participant.label} on the ${participant.side.toLowerCase()} side for: "${input.topic}".`,
      },
    ],
  };

  store.debates = store.debates.filter((entry) => !(entry.userId === userId && entry.status !== 'Completed'));
  store.debates.push(debate);
  saveStore(store);
  return debate;
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

export function buildDashboardForUser(user: UserProfile): DashboardData {
  const debates = listUserDebates(user.id);
  const completed = debates.filter((debate) => debate.status === 'Completed');
  const histories = completed.map(debateToHistory);
  const victories = histories.filter((entry) => entry.status === 'Victory').length;
  const averageResponseSeconds = debates.length
    ? Number((12 + debates.reduce((sum, debate) => sum + debate.rigor, 0) / debates.length).toFixed(1))
    : 0;
  const winRate = completed.length ? Math.round((victories / completed.length) * 100) : 0;

  return {
    heroTitle: 'Train arguments that hold up under pressure',
    heroSubtitle:
      'Track your debate history, launch new rounds, and practice structured 2v2 argumentation.',
    stats: {
      logicScore: histories.length ? Math.round(histories.reduce((sum, item) => sum + item.score, 0) / histories.length) : 0,
      averageResponseSeconds,
      winRate,
      debatesCompleted: completed.length,
    },
    recentDebates: debates.slice(0, 5).map(debateToRecent),
    recommendations: [
      'Choose the exact 2v2 speaker role before starting a round.',
      'Keep opening statements concise so rebuttals have more room later.',
      'Resume unfinished debates from the Arena instead of restarting from scratch.',
    ],
  };
}

export function buildPerformanceForUser(userId: string): PerformanceData {
  const history = listUserHistory(userId);
  const averageScore = history.length
    ? Math.round(history.reduce((sum, item) => sum + item.score, 0) / history.length)
    : 0;

  return {
    highlights: [
      { label: 'Win Rate', value: `${history.length ? Math.round((history.filter((item) => item.status === 'Victory').length / history.length) * 100) : 0}%`, trend: '+0%' },
      { label: 'Elo Rating', value: String(1200 + averageScore * 4), trend: '+12' },
      { label: 'Global Rank', value: history.length ? '#842' : '#--', trend: '-0', isDown: true },
      { label: 'Avg Response', value: history.length ? '13.2s' : '--', trend: '-0.0s' },
    ],
    skillBalance: [
      { label: 'Logical Consistency', value: Math.max(40, averageScore) },
      { label: 'Rhetorical Flair', value: Math.max(35, averageScore - 8) },
      { label: 'Evidence Integration', value: Math.max(30, averageScore - 4) },
      { label: 'Response Countering', value: Math.max(28, averageScore - 12) },
      { label: 'Emotional Intelligence', value: Math.max(25, averageScore - 10) },
    ],
    insight:
      history.length > 0
        ? 'Your stored debate history shows the strongest sessions happen when claims are explicit and easy to answer.'
        : 'No completed debates yet. Finish a few rounds to unlock more reliable performance insights.',
    recommendation:
      'Start a new 2v2 debate and keep each turn focused on one claim at a time.',
    milestoneProgress: Math.min(100, history.length * 15),
  };
}
