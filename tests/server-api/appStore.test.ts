import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

import {
  confirmLoginCode,
  getSessionFromToken,
  loginUser,
  registerUser,
  verifyUserEmail,
} from '../../src/server/stores/appStore';

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
  test('does not rewrite the store file for a valid session lookup', () => {
    const email = `session-reader-${crypto.randomUUID()}@example.com`;
    const registered = registerUser({
      name: 'Session Reader',
      email,
      password: 'correct horse battery staple',
    });
    verifyUserEmail({ email, code: registered.code });
    const loginChallenge = loginUser({ email, password: 'correct horse battery staple' });
    const auth = confirmLoginCode({ email, code: loginChallenge.code });
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
