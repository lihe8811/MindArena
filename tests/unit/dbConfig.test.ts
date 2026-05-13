import { describe, expect, test } from 'bun:test';

import { getDatabaseUrl } from '../../src/server/db/config';

describe('database config', () => {
  test('returns DATABASE_URL when it is configured', () => {
    const env = {
      DATABASE_URL: 'postgresql://mindarena:secret@example.neon.tech/mindarena?sslmode=require',
    };

    expect(getDatabaseUrl(env)).toBe(env.DATABASE_URL);
  });

  test('throws a setup-focused error when DATABASE_URL is missing', () => {
    expect(() => getDatabaseUrl({})).toThrow('DATABASE_URL is required');
  });
});
