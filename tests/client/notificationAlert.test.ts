import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const appSourcePath = path.join(import.meta.dir, '../../src/client/App.tsx');
const navigationSourcePath = path.join(import.meta.dir, '../../src/client/components/Navigation.tsx');
const modalSourcePath = path.join(import.meta.dir, '../../src/client/components/NotificationModal.tsx');
const startDebateSourcePath = path.join(import.meta.dir, '../../src/client/pages/StartDebate.tsx');
const arenaSourcePath = path.join(import.meta.dir, '../../src/client/pages/Arena.tsx');

describe('debate notifications', () => {
  test('replaces Help with a notification button and unread badge', () => {
    const source = fs.readFileSync(navigationSourcePath, 'utf8');

    expect(source).toContain('Bell');
    expect(source).toContain('Notifications');
    expect(source).toContain('notificationCount');
    expect(source).toContain('onNotificationsClick');
    expect(source).not.toContain('HelpCircle');
    expect(source).not.toContain('> Help');
  });

  test('renders a dismissible notification modal instead of the top alert', () => {
    const appSource = fs.readFileSync(appSourcePath, 'utf8');
    const modalSource = fs.readFileSync(modalSourcePath, 'utf8');

    expect(appSource).toContain('NotificationModal');
    expect(appSource).toContain('dismissNotification');
    expect(appSource).not.toContain('role="alert"');
    expect(appSource).not.toContain('const [notice');
    expect(modalSource).toContain('role="dialog"');
    expect(modalSource).toContain('Dismiss');
    expect(modalSource).toContain('No debate notifications');
  });

  test('shows phase-only orchestration and gates input to user turns', () => {
    const appSource = fs.readFileSync(appSourcePath, 'utf8');
    const arenaSource = fs.readFileSync(arenaSourcePath, 'utf8');

    expect(arenaSource).toContain('awaitingUserInput');
    expect(arenaSource).toContain('Your turn as');
    expect(arenaSource).not.toContain('Mock Workflow');
    expect(arenaSource).not.toContain('Teammate Coach');
    expect(appSource).not.toContain('requestTeammateCoaching');
  });

  test('uses formal debate role names in setup and arena', () => {
    const startDebateSource = fs.readFileSync(startDebateSourcePath, 'utf8');
    const arenaSource = fs.readFileSync(arenaSourcePath, 'utf8');

    expect(startDebateSource).toContain('getDebateRoleName');
    expect(arenaSource).toContain('getDebateRoleName');
    expect(arenaSource).toContain('Your turn as');
    expect(arenaSource).not.toContain("label: 'pro1'");
    expect(arenaSource).not.toContain("label: 'con1'");
  });

  test('shows role phase assignments in styled tooltips', () => {
    const startDebateSource = fs.readFileSync(startDebateSourcePath, 'utf8');

    expect(startDebateSource).toContain('getUserPhasesForRole');
    expect(startDebateSource).toContain('hoveredRole');
    expect(startDebateSource).toContain('focusedRole');
    expect(startDebateSource).toContain('onMouseEnter');
    expect(startDebateSource).toContain('onFocus');
    expect(startDebateSource).toContain('Your phases');
  });

  test('embeds a platform-aware keyboard shortcut in the send control', () => {
    const arenaSource = fs.readFileSync(arenaSourcePath, 'utf8');

    expect(arenaSource).toContain('isMacPlatform');
    expect(arenaSource).toContain('event.metaKey');
    expect(arenaSource).toContain('event.ctrlKey');
    expect(arenaSource).toContain('⌘ + Enter');
    expect(arenaSource).toContain('Ctrl + Enter');
    expect(arenaSource).toContain('absolute bottom-3 right-3');
  });

  test('keeps team cards contained and visually separates rivals', () => {
    const arenaSource = fs.readFileSync(arenaSourcePath, 'utf8');

    expect(arenaSource).toContain('Your team');
    expect(arenaSource).toContain('Rival');
    expect(arenaSource).toContain('min-w-0 overflow-hidden');
    expect(arenaSource).toContain('whitespace-normal');
    expect(arenaSource).toContain('mt-3 flex items-center justify-between');
    expect(arenaSource).toContain('border-sky-300 bg-sky-50');
    expect(arenaSource).toContain('text-sky-900');
  });
});
