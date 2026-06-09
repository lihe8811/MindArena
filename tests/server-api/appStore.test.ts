import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

import {
  advanceDebateStage,
  appendDebateMessage,
  createDebateForUser,
  dismissUserNotification,
  expireDebateIfTimeElapsed,
  getActiveDebate,
  getSessionFromToken,
  listUserHistory,
  listUserNotifications,
  loginUser,
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
      status: 'Ready',
      stage: 'Constructive',
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

  test('advances through every mock debate stage before completing', () => {
    const email = `debate-stages-${crypto.randomUUID()}@example.com`;
    registerUser({
      name: 'Debate Stages',
      email,
      password: 'correct horse battery staple',
    });
    const auth = loginUser({ email, password: 'correct horse battery staple' });
    const userId = auth.session.user?.id;

    expect(userId).toBeString();

    createDebateForUser(userId!, {
      topic: 'Resolved: mock debates should complete every stage.',
      stance: 'Proponent',
      rigor: 3,
      knowledgeDocumentIds: [],
    });

    const expectedStages = ['Rebuttal', 'Summary', 'Final Focus', 'Verdict'];

    expectedStages.forEach((expectedStage, index) => {
      appendDebateMessage(userId!, 'Student', `Student speech ${index + 1}`, {
        role: 'user',
        moderatorNote: 'Student turn recorded.',
      });
      appendDebateMessage(userId!, 'Rival Agent A', `Rival speech ${index + 1}`, {
        role: 'assistant',
        moderatorNote: false,
      });

      const debate = advanceDebateStage(userId!);

      expect(debate.stage).toBe(expectedStage);
      expect(debate.status).toBe(index === expectedStages.length - 1 ? 'Completed' : 'In Progress');
    });

    expect(listUserNotifications(userId!)).toEqual([
      expect.objectContaining({
        status: 'Completed',
        title: 'Debate completed',
      }),
    ]);
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
    expect(listUserNotifications(ownerId)).toEqual([]);
  });

  test('runs a complete mock debate through the orchestrator', async () => {
    const originalApiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const email = `debate-orchestrator-${crypto.randomUUID()}@example.com`;
      registerUser({
        name: 'Debate Orchestrator',
        email,
        password: 'correct horse battery staple',
      });
      const auth = loginUser({ email, password: 'correct horse battery staple' });
      const userId = auth.session.user?.id;

      expect(userId).toBeString();

      createDebateForUser(userId!, {
        topic: 'Resolved: the orchestrator should finish the full mock round.',
        stance: 'Proponent',
        rigor: 3,
        knowledgeDocumentIds: [],
      });

      const expectedStages = ['Rebuttal', 'Summary', 'Final Focus', 'Verdict'];

      for (const [index, expectedStage] of expectedStages.entries()) {
        const debate = await RoundOrchestrator.processTurn(userId!, `Student speech ${index + 1}`);

        expect(debate.stage).toBe(expectedStage);
        expect(debate.messages).toContainEqual(expect.objectContaining({
          role: 'assistant',
          author: 'Rival Agent A',
        }));
        expect(debate.messages.at(-1)).toMatchObject({
          role: 'assistant',
          author: 'pro2',
        });
      }
    } finally {
      if (originalApiKey === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = originalApiKey;
      }
    }
  });
});
