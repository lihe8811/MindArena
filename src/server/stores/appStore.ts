import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeEmailAddress } from '../auth/email';
import type {
  ActiveDebate,
  AuthResponse,
  DashboardData,
  HistoryItem,
  PerformanceData,
  RecentDebate,
  UserProfile,
  UserSettings,
} from '@/shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../../../data');
const storePath = path.join(dataDir, 'app-store.json');
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const VERIFICATION_CODE_TTL_MS = 1000 * 60 * 10;
const VERIFICATION_RESEND_COOLDOWN_MS = 1000 * 60;

interface StoredEmailVerification {
  codeHash: string;
  expiresAt: string;
  requestedAt: string;
  lastSentAt: string;
}

interface StoredPasswordReset {
  codeHash: string;
  expiresAt: string;
  requestedAt: string;
  lastSentAt: string;
}

interface StoredLoginVerification {
  codeHash: string;
  expiresAt: string;
  requestedAt: string;
  lastSentAt: string;
}

interface StoredUser extends UserProfile {
  settings: UserSettings;
  passwordHash: string;
  emailVerified: boolean;
  emailVerifiedAt?: string | null;
  verification?: StoredEmailVerification | null;
  passwordReset?: StoredPasswordReset | null;
  loginVerification?: StoredLoginVerification | null;
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
  const store = JSON.parse(fs.readFileSync(storePath, 'utf8')) as AppStoreShape;
  store.users = store.users.map((user) => ({
    ...user,
    settings: user.settings ?? defaultUserSettings(user.name),
    emailVerified: user.emailVerified ?? true,
    emailVerifiedAt: user.emailVerifiedAt ?? (user.emailVerified === false ? null : user.createdAt ?? nowIso()),
    verification: user.verification ?? null,
    passwordReset: user.passwordReset ?? null,
    loginVerification: user.loginVerification ?? null,
  }));
  return store;
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

function hashVerificationCode(code: string) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function verifyVerificationCode(code: string, storedHash: string) {
  const candidate = hashVerificationCode(code);
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(storedHash, 'hex'));
}

function sanitizeUser(user: StoredUser): UserProfile {
  const {
    passwordHash: _passwordHash,
    settings: _settings,
    verification: _verification,
    passwordReset: _passwordReset,
    loginVerification: _loginVerification,
    ...publicUser
  } = user;
  return publicUser;
}

function defaultUserSettings(userName: string): UserSettings {
  return {
    displayName: userName,
    title: 'Logic Apprentice',
    defaultStance: 'Proponent',
    defaultRigor: 3,
    emailNotifications: true,
    rememberSession: true,
    compactSidebar: false,
    autoOpenArena: true,
    theme: 'system',
  };
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

function generateVerificationCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function issueVerificationCode(user: StoredUser) {
  const code = generateVerificationCode();
  const requestedAt = nowIso();
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS).toISOString();

  user.verification = {
    codeHash: hashVerificationCode(code),
    expiresAt,
    requestedAt,
    lastSentAt: requestedAt,
  };

  return {
    email: user.email,
    expiresAt,
    code,
  };
}

function issuePasswordResetCode(user: StoredUser) {
  const code = generateVerificationCode();
  const requestedAt = nowIso();
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS).toISOString();

  user.passwordReset = {
    codeHash: hashVerificationCode(code),
    expiresAt,
    requestedAt,
    lastSentAt: requestedAt,
  };

  return {
    email: user.email,
    expiresAt,
    code,
  };
}

function issueLoginVerificationCode(user: StoredUser) {
  const code = generateVerificationCode();
  const requestedAt = nowIso();
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS).toISOString();

  user.loginVerification = {
    codeHash: hashVerificationCode(code),
    expiresAt,
    requestedAt,
    lastSentAt: requestedAt,
  };

  return {
    email: user.email,
    expiresAt,
    code,
  };
}

function cleanupExpiredSessions(store: AppStoreShape) {
  const now = Date.now();
  store.sessions = store.sessions.filter((session) => new Date(session.expiresAt).getTime() > now);
}

export function registerUser(input: { name: string; email: string; password: string }) {
  const store = loadStore();
  cleanupExpiredSessions(store);

  const email = normalizeEmailAddress(input.email);
  const existingUser = store.users.find((user) => user.email === email);

  if (existingUser) {
    throw new Error('This email is already registered.');
  }

  const user: StoredUser = {
    id: randomId('user'),
    name: input.name.trim() || email.split('@')[0] || 'Debater',
    email,
    title: 'Logic Apprentice',
    streak: 1,
    createdAt: nowIso(),
    settings: defaultUserSettings(input.name.trim() || email.split('@')[0] || 'Debater'),
    passwordHash: hashPassword(input.password),
    emailVerified: true,
    emailVerifiedAt: nowIso(),
    verification: null,
    passwordReset: null,
    loginVerification: null,
  };
  const token = crypto.randomUUID();

  store.users.push(user);
  store.sessions.push({
    token,
    userId: user.id,
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  });
  saveStore(store);

  return createSessionPayload(user, token);
}

export function requestPasswordReset(emailInput: string) {
  const store = loadStore();
  const email = normalizeEmailAddress(emailInput);
  const user = store.users.find((entry) => entry.email === email);

  if (!user) {
    throw new Error('No account was found for that email.');
  }

  const lastSentAt = user.passwordReset?.lastSentAt
    ? new Date(user.passwordReset.lastSentAt).getTime()
    : 0;

  if (Date.now() - lastSentAt < VERIFICATION_RESEND_COOLDOWN_MS) {
    throw new Error('Please wait a minute before requesting another reset code.');
  }

  const reset = issuePasswordResetCode(user);
  saveStore(store);
  return reset;
}

export function requestLoginCode(input: { email: string; password: string }) {
  const store = loadStore();
  cleanupExpiredSessions(store);

  const email = normalizeEmailAddress(input.email);
  const user = store.users.find((entry) => entry.email === email);

  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    throw new Error('Invalid email or password.');
  }

  const lastSentAt = user.loginVerification?.lastSentAt
    ? new Date(user.loginVerification.lastSentAt).getTime()
    : 0;

  if (Date.now() - lastSentAt < VERIFICATION_RESEND_COOLDOWN_MS) {
    throw new Error('Please wait a minute before requesting another sign-in code.');
  }

  const challenge = issueLoginVerificationCode(user);
  saveStore(store);
  return challenge;
}

export function resendLoginCode(emailInput: string) {
  const store = loadStore();
  const email = normalizeEmailAddress(emailInput);
  const user = store.users.find((entry) => entry.email === email);

  if (!user) {
    throw new Error('No account was found for that email.');
  }

  const lastSentAt = user.loginVerification?.lastSentAt
    ? new Date(user.loginVerification.lastSentAt).getTime()
    : 0;

  if (Date.now() - lastSentAt < VERIFICATION_RESEND_COOLDOWN_MS) {
    throw new Error('Please wait a minute before requesting another sign-in code.');
  }

  const challenge = issueLoginVerificationCode(user);
  saveStore(store);
  return challenge;
}

export function confirmLoginCode(input: { email: string; code: string }) {
  const store = loadStore();
  cleanupExpiredSessions(store);

  const email = normalizeEmailAddress(input.email);
  const code = input.code.trim();
  const user = store.users.find((entry) => entry.email === email);

  if (!user) {
    throw new Error('No account was found for that email.');
  }

  if (!user.loginVerification) {
    throw new Error('No sign-in code is active for this email.');
  }

  if (new Date(user.loginVerification.expiresAt).getTime() < Date.now()) {
    throw new Error('This sign-in code has expired. Request a new one.');
  }

  if (!verifyVerificationCode(code, user.loginVerification.codeHash)) {
    throw new Error('Invalid sign-in code.');
  }

  user.loginVerification = null;
  user.verification = null;
  if (!user.emailVerified) {
    user.emailVerified = true;
    user.emailVerifiedAt = nowIso();
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

export function resetPasswordWithCode(input: { email: string; code: string; password: string }) {
  const store = loadStore();
  const email = normalizeEmailAddress(input.email);
  const code = input.code.trim();
  const user = store.users.find((entry) => entry.email === email);

  if (!user) {
    throw new Error('No account was found for that email.');
  }

  if (!user.passwordReset) {
    throw new Error('No password reset is active for this email.');
  }

  if (new Date(user.passwordReset.expiresAt).getTime() < Date.now()) {
    throw new Error('This reset code has expired. Request a new one.');
  }

  if (!verifyVerificationCode(code, user.passwordReset.codeHash)) {
    throw new Error('Invalid reset code.');
  }

  user.passwordHash = hashPassword(input.password);
  user.passwordReset = null;
  user.verification = null;
  if (!user.emailVerified) {
    user.emailVerified = true;
    user.emailVerifiedAt = nowIso();
  }
  store.sessions = store.sessions.filter((session) => session.userId !== user.id);
  saveStore(store);

  return {
    ok: true,
    email: user.email,
    resetAt: nowIso(),
  };
}

export function resendVerificationCode(emailInput: string) {
  const store = loadStore();
  const email = normalizeEmailAddress(emailInput);
  const user = store.users.find((entry) => entry.email === email);

  if (!user) {
    throw new Error('No account was found for that email.');
  }

  if (user.emailVerified) {
    throw new Error('This email is already verified. Please sign in.');
  }

  const lastSentAt = user.verification?.lastSentAt ? new Date(user.verification.lastSentAt).getTime() : 0;
  if (Date.now() - lastSentAt < VERIFICATION_RESEND_COOLDOWN_MS) {
    throw new Error('Please wait a minute before requesting another verification code.');
  }

  const verification = issueVerificationCode(user);
  saveStore(store);
  return verification;
}

export function verifyUserEmail(input: { email: string; code: string }) {
  const store = loadStore();
  const email = normalizeEmailAddress(input.email);
  const code = input.code.trim();
  const user = store.users.find((entry) => entry.email === email);

  if (!user) {
    throw new Error('No account was found for that email.');
  }

  if (user.emailVerified) {
    return {
      email: user.email,
      verifiedAt: user.emailVerifiedAt ?? nowIso(),
    };
  }

  if (!user.verification) {
    throw new Error('No verification code is active for this email.');
  }

  if (new Date(user.verification.expiresAt).getTime() < Date.now()) {
    throw new Error('This verification code has expired. Request a new one.');
  }

  if (!verifyVerificationCode(code, user.verification.codeHash)) {
    throw new Error('Invalid verification code.');
  }

  user.emailVerified = true;
  user.emailVerifiedAt = nowIso();
  user.verification = null;
  saveStore(store);

  return {
    email: user.email,
    verifiedAt: user.emailVerifiedAt,
  };
}

export function loginUser(input: { email: string; password: string }) {
  const store = loadStore();
  cleanupExpiredSessions(store);

  const email = normalizeEmailAddress(input.email);
  const user = store.users.find((entry) => entry.email === email);

  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    throw new Error('Invalid email or password.');
  }

  // Upgrade legacy accounts created before the verification flow was removed.
  user.emailVerified = true;
  user.emailVerifiedAt = user.emailVerifiedAt ?? nowIso();
  user.verification = null;
  user.loginVerification = null;
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

function getStoredUserById(userId: string) {
  return loadStore().users.find((user) => user.id === userId) ?? null;
}

export function getUserSettings(userId: string) {
  const user = getStoredUserById(userId);
  if (!user) {
    throw new Error('User not found.');
  }
  return user.settings;
}

export function updateUserSettings(
  userId: string,
  input: Partial<UserSettings> & Pick<UserSettings, 'displayName' | 'title'>,
) {
  const store = loadStore();
  const user = store.users.find((entry) => entry.id === userId);

  if (!user) {
    throw new Error('User not found.');
  }

  user.settings = {
    ...user.settings,
    ...input,
    defaultRigor: Math.max(1, Math.min(5, Number(input.defaultRigor ?? user.settings.defaultRigor))),
  };
  user.name = user.settings.displayName.trim() || user.name;
  user.title = user.settings.title.trim() || user.title;

  saveStore(store);

  return {
    user: sanitizeUser(user),
    settings: user.settings,
  };
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
  input: { topic: string; stance: 'Proponent' | 'Opponent'; rigor: number; knowledgeDocumentIds?: string[] },
) {
  const store = loadStore();
  const createdAt = nowIso();
  const debate: StoredDebate = {
    id: randomId('debate'),
    userId,
    topic: input.topic,
    stance: input.stance,
    rigor: input.rigor,
    stage: 'Opening Statements',
    timerLabel: '08:00',
    status: 'Ready',
    createdAt,
    updatedAt: createdAt,
    score: undefined,
    knowledgeDocumentIds: input.knowledgeDocumentIds ?? [],
    opponent: 'AI Opponent Pending',
    domain: 'User Defined',
    messages: [
      {
        id: randomId('msg'),
        role: 'system',
        author: 'Moderator',
        time: nowLabel(new Date(createdAt)),
        content: `Debate created. You are arguing as the ${input.stance.toLowerCase()} side on: "${input.topic}".`,
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
      'Track your debate history, launch new rounds, and build a private knowledge base that your future AI agent can use.',
    stats: {
      logicScore: histories.length ? Math.round(histories.reduce((sum, item) => sum + item.score, 0) / histories.length) : 0,
      averageResponseSeconds,
      winRate,
      debatesCompleted: completed.length,
    },
    recentDebates: debates.slice(0, 5).map(debateToRecent),
    recommendations: [
      'Add source documents to the knowledge base before difficult policy debates.',
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
        ? 'Your stored debate history shows the strongest sessions happen after you ground the debate with explicit rules or documents.'
        : 'No completed debates yet. Finish a few rounds to unlock more reliable performance insights.',
    recommendation:
      'Use the knowledge base to preload rules and supporting sources, then start a new debate so future AI turns can cite them.',
    milestoneProgress: Math.min(100, history.length * 15),
  };
}
