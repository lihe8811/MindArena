import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeEmailAddress } from '../auth/email';
import { getDebateRoleName, phaseWaitsForUser, type DebatePhase } from '@/shared/debatePhases';
import type {
  ActiveDebate,
  AuthResponse,
  DashboardData,
  DebateNotification,
  DebateParticipant,
  DebateParticipantId,
  DebateSetup,
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

interface StoredPasswordReset {
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
  passwordReset?: StoredPasswordReset | null;
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

interface StoredNotification extends DebateNotification {
  userId: string;
}

interface DismissedNotification {
  userId: string;
  debateId: string;
  status: DebateNotification['status'];
  dismissedAt: string;
}

const debateParticipants: DebateParticipant[] = [
  { id: 'pro1', label: getDebateRoleName('pro1'), side: 'Proponent', speakerOrder: 1 },
  { id: 'pro2', label: getDebateRoleName('pro2'), side: 'Proponent', speakerOrder: 2 },
  { id: 'con1', label: getDebateRoleName('con1'), side: 'Opponent', speakerOrder: 1 },
  { id: 'con2', label: getDebateRoleName('con2'), side: 'Opponent', speakerOrder: 2 },
];

function getParticipant(role: DebateParticipantId) {
  return debateParticipants.find((participant) => participant.id === role) ?? debateParticipants[0];
}

interface AppStoreShape {
  users: StoredUser[];
  sessions: StoredSession[];
  debates: StoredDebate[];
  notifications: StoredNotification[];
  dismissedNotifications: DismissedNotification[];
}

const defaultStore: AppStoreShape = {
  users: [],
  sessions: [],
  debates: [],
  notifications: [],
  dismissedNotifications: [],
};

function ensureStoreFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, JSON.stringify(defaultStore, null, 2), 'utf8');
  }
}

export function loadStore() {
  ensureStoreFile();
  const store = JSON.parse(fs.readFileSync(storePath, 'utf8')) as AppStoreShape;
  store.notifications = store.notifications ?? [];
  store.dismissedNotifications = store.dismissedNotifications ?? [];
  store.users = store.users.map((user) => {
    const {
      verification: _verification,
      loginVerification: _loginVerification,
      ...storedUser
    } = user as StoredUser & { verification?: unknown; loginVerification?: unknown };

    return {
      ...storedUser,
      settings: normalizeUserSettings(storedUser.settings, storedUser.name),
      emailVerified: true,
      emailVerifiedAt: storedUser.emailVerifiedAt ?? storedUser.createdAt ?? nowIso(),
      passwordReset: storedUser.passwordReset ?? null,
    };
  });
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

function timerLabelToMs(label: string) {
  const [minutes = '0', seconds = '0'] = label.split(':');
  const totalSeconds = Number(minutes) * 60 + Number(seconds);
  return Number.isFinite(totalSeconds) ? Math.max(0, totalSeconds) * 1000 : 0;
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
    passwordReset: _passwordReset,
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
  };
}

function normalizeUserSettings(settings: Partial<UserSettings> | null | undefined, userName: string): UserSettings {
  const defaults = defaultUserSettings(userName);
  return {
    displayName: String(settings?.displayName ?? defaults.displayName),
    title: String(settings?.title ?? defaults.title),
    defaultStance: settings?.defaultStance === 'Opponent' ? 'Opponent' : defaults.defaultStance,
    defaultRigor: Math.max(1, Math.min(5, Number(settings?.defaultRigor ?? defaults.defaultRigor))),
    emailNotifications: settings?.emailNotifications ?? defaults.emailNotifications,
    rememberSession: settings?.rememberSession ?? defaults.rememberSession,
    compactSidebar: settings?.compactSidebar ?? defaults.compactSidebar,
    autoOpenArena: settings?.autoOpenArena ?? defaults.autoOpenArena,
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

function createSession(store: AppStoreShape, user: StoredUser) {
  const token = crypto.randomUUID();
  store.sessions.push({
    token,
    userId: user.id,
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  });
  return createSessionPayload(user, token);
}

function generateVerificationCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
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

function cleanupExpiredSessions(store: AppStoreShape) {
  const now = Date.now();
  const originalLength = store.sessions.length;
  store.sessions = store.sessions.filter((session) => new Date(session.expiresAt).getTime() > now);
  return store.sessions.length !== originalLength;
}

export function registerUser(input: { name: string; email: string; password: string }) {
  const store = loadStore();
  cleanupExpiredSessions(store);

  const email = normalizeEmailAddress(input.email);
  const existingUser = store.users.find((user) => user.email === email);

  if (existingUser) {
    throw new Error('This email is already registered.');
  }

  const createdAt = nowIso();
  const user: StoredUser = {
    id: randomId('user'),
    name: input.name.trim() || email.split('@')[0] || 'Debater',
    email,
    title: 'Logic Apprentice',
    streak: 1,
    createdAt,
    settings: defaultUserSettings(input.name.trim() || email.split('@')[0] || 'Debater'),
    passwordHash: hashPassword(input.password),
    emailVerified: true,
    emailVerifiedAt: createdAt,
    passwordReset: null,
  };

  store.users.push(user);
  const auth = createSession(store, user);
  saveStore(store);

  return auth;
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

export function loginUser(input: { email: string; password: string }) {
  const store = loadStore();
  cleanupExpiredSessions(store);

  const email = normalizeEmailAddress(input.email);
  const user = store.users.find((entry) => entry.email === email);

  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    throw new Error('Invalid email or password.');
  }

  const auth = createSession(store, user);
  saveStore(store);
  return auth;
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

function getStoredUserById(userId: string) {
  return loadStore().users.find((user) => user.id === userId) ?? null;
}

export function getUserSettings(userId: string) {
  const user = getStoredUserById(userId);
  if (!user) {
    throw new Error('User not found.');
  }
  return normalizeUserSettings(user.settings, user.name);
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

  user.settings = normalizeUserSettings({
    ...user.settings,
    ...input,
    defaultRigor: Math.max(1, Math.min(5, Number(input.defaultRigor ?? user.settings.defaultRigor))),
  }, user.name);
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

function isDebateTerminal(status: ActiveDebate['status']) {
  return status === 'Completed' || status === 'Terminated';
}

function getDebateOutcome(debate: StoredDebate): HistoryItem['status'] {
  if (debate.status === 'Terminated') return 'Terminated';
  if (debate.status === 'Completed') return inferDebateStatus(debate.messages.length);
  return 'In Progress';
}

function createDebateNotification(
  store: AppStoreShape,
  debate: StoredDebate,
  status: DebateNotification['status'],
  createdAt: string,
) {
  const exists = store.notifications.some(
    (notification) =>
      notification.userId === debate.userId &&
      notification.debateId === debate.id &&
      notification.status === status,
  );
  const wasDismissed = store.dismissedNotifications.some(
    (notification) =>
      notification.userId === debate.userId &&
      notification.debateId === debate.id &&
      notification.status === status,
  );
  if (exists || wasDismissed) return;

  const completed = status === 'Completed';
  store.notifications.push({
    id: randomId('notification'),
    userId: debate.userId,
    debateId: debate.id,
    status,
    title: completed ? 'Debate completed' : 'Debate terminated',
    message: completed
      ? `Your debate "${debate.topic}" has completed and is available in history.`
      : `Your debate "${debate.topic}" was terminated because time expired.`,
    createdAt,
  });
}

function debateToRecent(debate: StoredDebate): RecentDebate {
  const durationMinutes = Math.max(8, debate.messages.length * 4);
  const approximateTokens = debate.messages.reduce((sum, message) => sum + Math.ceil(message.content.length / 4), 0);
  return {
    id: debate.id,
    topic: debate.topic,
    opponent: debate.opponent,
    status: getDebateOutcome(debate),
    duration: `${durationMinutes}m`,
    tokens: `${(approximateTokens / 1000).toFixed(1)}k`,
    domain: debate.domain,
  };
}

function debateToHistory(debate: StoredDebate): HistoryItem {
  return {
    id: debate.id,
    topic: debate.topic,
    subject: debate.domain,
    date: new Date(debate.createdAt).toLocaleDateString(),
    level: debate.rigor,
    status: getDebateOutcome(debate),
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
      'Add curated rule notes for better context.',
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

export function listUserNotifications(userId: string): DebateNotification[] {
  const store = loadStore();
  return store.notifications
    .filter((notification) => notification.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map(({ userId: _userId, ...notification }) => notification);
}

export function dismissUserNotification(userId: string, notificationId: string) {
  const store = loadStore();
  const notificationIndex = store.notifications.findIndex(
    (notification) => notification.id === notificationId && notification.userId === userId,
  );

  if (notificationIndex === -1) {
    throw new Error('Notification not found.');
  }

  const [notification] = store.notifications.splice(notificationIndex, 1);
  const alreadyDismissed = store.dismissedNotifications.some(
    (entry) =>
      entry.userId === notification.userId &&
      entry.debateId === notification.debateId &&
      entry.status === notification.status,
  );
  if (!alreadyDismissed) {
    store.dismissedNotifications.push({
      userId: notification.userId,
      debateId: notification.debateId,
      status: notification.status,
      dismissedAt: nowIso(),
    });
  }
  saveStore(store);
  return listUserNotifications(userId);
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
  const speakerRole = setup.speakerRole ?? (setup.stance === 'Opponent' ? 'con1' : 'pro1');
  const participant = getParticipant(speakerRole);

  const debate: StoredDebate = {
    id,
    userId,
    topic: setup.topic,
    stance: participant.side,
    speakerRole: participant.id,
    rigor: setup.rigor,
    knowledgeDocumentIds: setup.knowledgeDocumentIds,
    stage: 'setup',
    awaitingUserInput: false,
    timerLabel: '04:00',
    status: 'Ready',
    messages: [
      {
        id: randomId('msg'),
        role: 'system',
        author: 'Moderator',
        time: nowLabel(new Date(createdAt)),
        content: `Debate created. You are ${participant.label} on the ${participant.side.toLowerCase()} side for: "${setup.topic}".`,
      },
    ],
    createdAt,
    updatedAt: createdAt,
    participants: debateParticipants,
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
    .filter((entry) => entry.userId === userId && !isDebateTerminal(entry.status))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];

  return debate || null;
}

export function enterDebatePhase(userId: string, phase: DebatePhase) {
  const store = loadStore();
  const debate = [...store.debates]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .find((entry) => entry.userId === userId && !isDebateTerminal(entry.status));

  if (!debate) {
    throw new Error('No active debate.');
  }

  const enteredAt = nowIso();
  debate.stage = phase;
  const speakerRole = debate.speakerRole ?? (debate.stance === 'Opponent' ? 'con1' : 'pro1');
  debate.awaitingUserInput = phaseWaitsForUser(phase, speakerRole);
  debate.status = phase === 'complete' ? 'Completed' : 'In Progress';
  debate.updatedAt = enteredAt;
  debate.messages.push({
    id: randomId('msg'),
    role: 'system',
    author: 'Moderator',
    time: nowLabel(new Date(enteredAt)),
    content: `Phase: ${phase}`,
  });

  if (phase === 'complete') {
    debate.awaitingUserInput = false;
    debate.score = inferScore(debate.messages.length);
    createDebateNotification(store, debate, 'Completed', enteredAt);
  }

  saveStore(store);
  return debate;
}

export function recordDebateUserInput(userId: string, content: string) {
  const store = loadStore();
  const debate = [...store.debates]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .find((entry) => entry.userId === userId && !isDebateTerminal(entry.status));

  if (!debate) {
    throw new Error('No active debate.');
  }
  if (!debate.awaitingUserInput) {
    throw new Error('The debate is not waiting for user input.');
  }

  debate.messages.push({
    id: randomId('msg'),
    role: 'user',
    author: getDebateRoleName(debate.speakerRole ?? (debate.stance === 'Opponent' ? 'con1' : 'pro1')),
    time: nowLabel(),
    content,
  });
  debate.awaitingUserInput = false;
  debate.status = 'In Progress';
  debate.updatedAt = nowIso();

  saveStore(store);
  return debate;
}

export function expireDebateIfTimeElapsed(userId: string, currentTime = new Date()) {
  const store = loadStore();
  const debate = [...store.debates]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .find((entry) => entry.userId === userId && !isDebateTerminal(entry.status));

  if (!debate) {
    throw new Error('No active debate.');
  }

  const expiresAt = new Date(debate.createdAt).getTime() + timerLabelToMs(debate.timerLabel);
  if (currentTime.getTime() < expiresAt) {
    return debate;
  }

  debate.messages.push({
    id: randomId('msg'),
    role: 'system',
    author: 'Moderator',
    time: nowLabel(currentTime),
    content: 'Time expired. The debate has ended.',
  });
  debate.timerLabel = '00:00';
  debate.stage = 'Verdict';
  debate.status = 'Terminated';
  debate.score = inferScore(debate.messages.length);
  debate.updatedAt = currentTime.toISOString();
  createDebateNotification(store, debate, 'Terminated', debate.updatedAt);

  saveStore(store);
  return debate;
}

interface AppendDebateMessageOptions {
  role?: 'system' | 'user' | 'assistant';
  moderatorNote?: string | false;
}

export function appendDebateMessage(
  userId: string,
  author: string,
  content: string,
  options: AppendDebateMessageOptions = {},
) {
  const store = loadStore();
  const debate = [...store.debates]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .find((entry) => entry.userId === userId && !isDebateTerminal(entry.status));

  if (!debate) {
    throw new Error('No active debate.');
  }

  const inferredRole = options.role ?? (author.includes('Agent') ? 'assistant' : 'user');

  debate.messages.push({
    id: randomId('msg'),
    role: inferredRole,
    author,
    time: nowLabel(),
    content,
  });

  const moderatorNote =
    options.moderatorNote === undefined
      ? inferredRole === 'assistant'
        ? false
        : 'Argument recorded. Orchestration is retrieving context and preparing the next agent response.'
      : options.moderatorNote;

  if (moderatorNote) {
    debate.messages.push({
      id: randomId('msg'),
      role: 'system',
      author: 'Moderator',
      time: nowLabel(),
      content: moderatorNote,
    });
  }

  debate.status = 'In Progress';
  debate.updatedAt = nowIso();

  saveStore(store);
  return debate;
}
