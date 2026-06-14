import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

import {
  appendDebateMessage,
  createDebateForUser,
  dismissUserNotification,
  enterDebatePhase,
  expireDebateIfTimeElapsed,
  getActiveDebate,
  getSessionFromToken,
  listUserHistory,
  listUserNotifications,
  loginUser,
  recordDebateUserInput,
  registerUser,
} from '../../src/server/stores/appStore';
import { RoundOrchestrator } from '../../src/server/orchestration/roundOrchestrator';

const storePath = path.join(import.meta.dir, '../../data/app-store.json');
const originalStore = fs.existsSync(storePath) ? fs.readFileSync(storePath, 'utf8') : null;
const originalWriteFileSync = fs.writeFileSync;

afterEach(() => {
  fs.writeFileSync = originalWriteFileSync;

  if (originalStore === null) {
    if (fs.existsSync(storePath)) {
      fs.unlinkSync(storePath);
    }
    return;
  }

  originalWriteFileSync(storePath, originalStore, 'utf8');
});

describe('app store sessions', () => {
  test('registers a user with an active session without email verification', () => {
    const email = `direct-register-${crypto.randomUUID()}@example.com`;

    const auth = registerUser({
      name: 'Direct Register',
      email,
      password: 'correct horse battery staple',
    });

    expect(auth.session.authenticated).toBe(true);
    expect(auth.session.token).toBeString();
    expect(auth.session.user).toMatchObject({
      email,
      emailVerified: true,
    });
  });

  test('logs in with an active session without an email code challenge', () => {
    const email = `direct-login-${crypto.randomUUID()}@example.com`;

    registerUser({
      name: 'Direct Login',
      email,
      password: 'correct horse battery staple',
    });

    const auth = loginUser({ email, password: 'correct horse battery staple' });

    expect(auth.session.authenticated).toBe(true);
    expect(auth.session.token).toBeString();
    expect(auth.session.user).toMatchObject({
      email,
      emailVerified: true,
    });
  });

  test('normalizes legacy unverified users as verified after removing email verification', () => {
    const email = `legacy-unverified-${crypto.randomUUID()}@example.com`;
    const auth = registerUser({
      name: 'Legacy Unverified',
      email,
      password: 'correct horse battery staple',
    });
    const store = JSON.parse(fs.readFileSync(storePath, 'utf8')) as {
      users: Array<{ id: string; emailVerified: boolean; emailVerifiedAt: string | null }>;
      sessions: unknown[];
      debates: unknown[];
    };
    const user = store.users.find((entry) => entry.id === auth.session.user?.id);

    expect(user).toBeDefined();
    user!.emailVerified = false;
    user!.emailVerifiedAt = null;
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');

    const login = loginUser({ email, password: 'correct horse battery staple' });

    expect(login.session.user).toMatchObject({
      email,
      emailVerified: true,
    });
  });

  test('does not rewrite the store file for a valid session lookup', () => {
    const email = `session-reader-${crypto.randomUUID()}@example.com`;
    registerUser({
      name: 'Session Reader',
      email,
      password: 'correct horse battery staple',
    });
    const auth = loginUser({ email, password: 'correct horse battery staple' });
    const token = auth.session.token;
    const writes: string[] = [];

    fs.writeFileSync = ((file: fs.PathOrFileDescriptor, ...args: unknown[]) => {
      writes.push(String(file));
      return originalWriteFileSync(file, ...(args as Parameters<typeof fs.writeFileSync> extends [unknown, ...infer Rest] ? Rest : never));
    }) as typeof fs.writeFileSync;

    const session = getSessionFromToken(token);

    expect(session.authenticated).toBe(true);
    expect(writes.filter((file) => file === storePath)).toEqual([]);
  });
});

describe('app store debate transcript', () => {
  test('records phase markers and only accepts input while waiting for the user', () => {
    const auth = registerUser({
      name: 'Phase Store',
      email: `phase-store-${crypto.randomUUID()}@example.com`,
      password: 'correct horse battery staple',
    });
    const userId = auth.session.user!.id;

    createDebateForUser(userId, {
      topic: 'Resolved: orchestration phases should be visible.',
      stance: 'Proponent',
      rigor: 3,
      knowledgeDocumentIds: [],
    });

    const setup = enterDebatePhase(userId, 'setup');
    expect(setup).toMatchObject({
      stage: 'setup',
      awaitingUserInput: false,
      status: 'In Progress',
    });
    expect(setup.messages.at(-1)).toMatchObject({
      role: 'system',
      author: 'Moderator',
      content: 'Phase: setup',
    });
    expect(() => recordDebateUserInput(userId, 'Too early')).toThrow(
      'The debate is not waiting for user input.',
    );

    enterDebatePhase(userId, 'constructive_pro');
    const afterInput = recordDebateUserInput(userId, 'My constructive speech.');

    expect(afterInput.awaitingUserInput).toBe(false);
    expect(afterInput.messages.at(-1)).toMatchObject({
      role: 'user',
      author: 'First Pro Speaker',
      content: 'My constructive speech.',
    });
  });

  test('terminates an active debate when its timer has elapsed', () => {
    const email = `debate-expiry-${crypto.randomUUID()}@example.com`;
    registerUser({
      name: 'Debate Expiry',
      email,
      password: 'correct horse battery staple',
    });
    const auth = loginUser({ email, password: 'correct horse battery staple' });
    const userId = auth.session.user?.id;

    expect(userId).toBeString();

    const created = createDebateForUser(userId!, {
      topic: 'Resolved: elapsed debates should stop.',
      stance: 'Proponent',
      rigor: 3,
      knowledgeDocumentIds: [],
    });
    const expiresAt = new Date(created.createdAt).getTime() + 4 * 60 * 1000;

    const beforeExpiry = expireDebateIfTimeElapsed(userId!, new Date(expiresAt - 1));
    expect(beforeExpiry).toMatchObject({
      status: 'Prep',
      stage: 'setup',
    });

    const expired = expireDebateIfTimeElapsed(userId!, new Date(expiresAt));
    expect(expired).toMatchObject({
      status: 'Terminated',
      stage: 'Verdict',
      timerLabel: '00:00',
    });
    expect(expired.messages.at(-1)).toMatchObject({
      role: 'system',
      author: 'Moderator',
      content: 'Time expired. The debate has ended.',
    });
    expect(getActiveDebate(userId!)).toBeNull();
    expect(listUserHistory(userId!)[0]).toMatchObject({
      id: created.id,
      status: 'Terminated',
    });
    expect(listUserNotifications(userId!)).toEqual([
      expect.objectContaining({
        debateId: created.id,
        status: 'Terminated',
        title: 'Debate terminated',
      }),
    ]);
  });

  test('records rival agent output as an assistant message for arena rendering', () => {
    const email = `debate-agent-${crypto.randomUUID()}@example.com`;
    registerUser({
      name: 'Debate Agent',
      email,
      password: 'correct horse battery staple',
    });
    const auth = loginUser({ email, password: 'correct horse battery staple' });
    const userId = auth.session.user?.id;

    expect(userId).toBeString();

    createDebateForUser(userId!, {
      topic: 'Resolved: mock debates should show orchestration.',
      stance: 'Proponent',
      rigor: 3,
      knowledgeDocumentIds: [],
    });

    const debate = appendDebateMessage(userId!, 'Rival Agent A', 'Here is the dummy agent rebuttal.');

    expect(debate.messages.at(-1)).toMatchObject({
      role: 'assistant',
      author: 'Rival Agent A',
      content: 'Here is the dummy agent rebuttal.',
    });
  });

  test('permanently dismisses only notifications owned by the user', () => {
    const ownerAuth = registerUser({
      name: 'Notification Owner',
      email: `notification-owner-${crypto.randomUUID()}@example.com`,
      password: 'correct horse battery staple',
    });
    const otherAuth = registerUser({
      name: 'Notification Other',
      email: `notification-other-${crypto.randomUUID()}@example.com`,
      password: 'correct horse battery staple',
    });
    const ownerId = ownerAuth.session.user!.id;
    const otherId = otherAuth.session.user!.id;
    const debate = createDebateForUser(ownerId, {
      topic: 'Resolved: dismissed notifications should stay dismissed.',
      stance: 'Proponent',
      rigor: 3,
      knowledgeDocumentIds: [],
    });

    expireDebateIfTimeElapsed(ownerId, new Date(Date.parse(debate.createdAt) + 4 * 60 * 1000));
    const [notification] = listUserNotifications(ownerId);

    expect(notification).toBeDefined();
    expect(() => dismissUserNotification(otherId, notification.id)).toThrow('Notification not found.');
    expect(listUserNotifications(ownerId)).toHaveLength(1);

    dismissUserNotification(ownerId, notification.id);

    expect(listUserNotifications(ownerId)).toEqual([]);

    const store = JSON.parse(fs.readFileSync(storePath, 'utf8')) as {
      debates: Array<{ id: string; status: string; stage: string; timerLabel: string }>;
    };
    const storedDebate = store.debates.find((entry) => entry.id === debate.id);
    expect(storedDebate).toBeDefined();
    storedDebate!.status = 'Ready';
    storedDebate!.stage = 'Constructive';
    storedDebate!.timerLabel = '00:00';
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');

    expireDebateIfTimeElapsed(ownerId, new Date(Date.parse(debate.createdAt) + 5 * 60 * 1000));

    expect(listUserNotifications(ownerId)).toEqual([]);
  });

  test('runs the complete documented phase sequence without agent speeches', () => {
    const auth = registerUser({
      name: 'Phase Orchestrator',
      email: `phase-orchestrator-${crypto.randomUUID()}@example.com`,
      password: 'correct horse battery staple',
    });
    const userId = auth.session.user!.id;

    createDebateForUser(userId, {
      topic: 'Resolved: the orchestrator should expose the full phase sequence.',
      stance: 'Proponent',
      rigor: 3,
      knowledgeDocumentIds: [],
    });

    let debate = RoundOrchestrator.initializeRound(userId);
    const userPhases = [
      'constructive_pro',
      'crossfire_1',
      'summary_pro',
      'grand_crossfire',
    ];

    userPhases.forEach((expectedPhase, index) => {
      expect(debate.stage).toBe(expectedPhase);
      expect(debate.awaitingUserInput).toBe(true);
      debate = RoundOrchestrator.processTurn(userId, `Student response ${index + 1}`);
    });

    expect(debate).toMatchObject({
      stage: 'complete',
      status: 'Completed',
      awaitingUserInput: false,
    });
    expect(
      debate.messages
        .filter((message) => message.author === 'Moderator' && message.content.startsWith('Phase: '))
        .map((message) => message.content),
    ).toEqual([
      'Phase: setup',
      'Phase: judge_opening',
      'Phase: student_prep_optional',
      'Phase: constructive_pro',
      'Phase: constructive_con',
      'Phase: crossfire_1',
      'Phase: rebuttal_pro',
      'Phase: rebuttal_con',
      'Phase: crossfire_2',
      'Phase: summary_pro',
      'Phase: summary_con',
      'Phase: grand_crossfire',
      'Phase: final_focus_pro',
      'Phase: final_focus_con',
      'Phase: judge_deliberation',
      'Phase: judge_feedback',
      'Phase: complete',
    ]);
    expect(debate.messages.some((message) => message.role === 'assistant')).toBe(false);
    expect(listUserNotifications(userId)).toEqual([
      expect.objectContaining({
        status: 'Completed',
        title: 'Debate completed',
      }),
    ]);
  });

  test('second pro speaker only waits on second-speaker rows', () => {
    const auth = registerUser({
      name: 'Second Pro',
      email: `second-pro-${crypto.randomUUID()}@example.com`,
      password: 'correct horse battery staple',
    });
    const userId = auth.session.user!.id;

    createDebateForUser(userId, {
      topic: 'Resolved: speaker ownership should be role-specific.',
      stance: 'Proponent',
      speakerRole: 'pro2',
      rigor: 3,
      knowledgeDocumentIds: [],
    });

    let debate = RoundOrchestrator.initializeRound(userId);
    const userPhases = ['rebuttal_pro', 'crossfire_2', 'grand_crossfire', 'final_focus_pro'];

    userPhases.forEach((expectedPhase, index) => {
      expect(debate.stage).toBe(expectedPhase);
      debate = RoundOrchestrator.processTurn(userId, `Second pro response ${index + 1}`);
    });

    expect(debate.status).toBe('Completed');
    expect(
      debate.messages.filter((message) => message.role === 'user').map((message) => message.author),
    ).toEqual([
      'Second Pro Speaker',
      'Second Pro Speaker',
      'Second Pro Speaker',
      'Second Pro Speaker',
    ]);
  });
});
