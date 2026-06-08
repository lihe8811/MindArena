import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const landingSourcePath = path.join(import.meta.dir, '../../src/client/pages/Landing.tsx');
const navigationSourcePath = path.join(import.meta.dir, '../../src/client/components/Navigation.tsx');
const avatarSourcePath = path.join(import.meta.dir, '../../src/client/components/StudentAvatar.tsx');

describe('student avatars', () => {
  test('landing and navigation use controlled grade 4-8 student avatars', () => {
    const landingSource = fs.readFileSync(landingSourcePath, 'utf8');
    const navigationSource = fs.readFileSync(navigationSourcePath, 'utf8');

    expect(landingSource).not.toContain('pravatar.cc');
    expect(landingSource).toContain('StudentAvatar');
    expect(navigationSource).toContain('StudentAvatar');
  });

  test('avatar variants are labeled as grade 4-8 students', () => {
    const avatarSource = fs.readFileSync(avatarSourcePath, 'utf8');

    for (const grade of [4, 5, 6, 7, 8]) {
      expect(avatarSource).toContain(`Grade ${grade} student`);
    }
  });

  test('avatars do not render visible grade tags', () => {
    const avatarSource = fs.readFileSync(avatarSourcePath, 'utf8');

    expect(avatarSource).not.toContain('showGradeBadge');
    expect(avatarSource).not.toContain('initials');
    expect(avatarSource).not.toContain('G4');
    expect(avatarSource).not.toContain('G5');
    expect(avatarSource).not.toContain('G6');
    expect(avatarSource).not.toContain('G7');
    expect(avatarSource).not.toContain('G8');
  });

  test('avatars use react-nice-avatar with a boy and girl mix', () => {
    const avatarSource = fs.readFileSync(avatarSourcePath, 'utf8');

    expect(avatarSource).toContain('react-nice-avatar');
    expect(avatarSource).toContain('genConfig');
    expect(avatarSource).toContain('boy avatar');
    expect(avatarSource).toContain('girl avatar');
    expect(avatarSource).toContain('sex:');
    expect(avatarSource).not.toContain('api.dicebear.com');
  });
});
