import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const landingSourcePath = path.join(import.meta.dir, '../../src/client/pages/Landing.tsx');

describe('landing auth UI', () => {
  test('does not expose Google or GitHub SSO options', () => {
    const source = fs.readFileSync(landingSourcePath, 'utf8');

    expect(source).not.toContain('External Identity');
    expect(source).not.toContain('Google');
    expect(source).not.toContain('GitHub');
  });
});
