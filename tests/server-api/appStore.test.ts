import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

import {
  advanceDebateStage,
  appendDebateMessage,
  createDebateForUser,
  getSessionFromToken,
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
