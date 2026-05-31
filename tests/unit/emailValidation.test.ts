import { describe, expect, test } from 'bun:test';

import { isValidEmailAddress, normalizeEmailAddress } from '../../src/server/auth/email';

describe('email validation', () => {
  test('normalizes email casing and whitespace', () => {
    expect(normalizeEmailAddress('  USER@Example.EDU ')).toBe('user@example.edu');
  });

  test('rejects numeric-only hostnames like 1@1.com', () => {
    expect(isValidEmailAddress('1@1.com')).toBe(false);
  });

  test('accepts realistic mailbox domains', () => {
    expect(isValidEmailAddress('debater@berkeley.edu')).toBe(true);
    expect(isValidEmailAddress('coach.team@mindarena.ai')).toBe(true);
  });
});
