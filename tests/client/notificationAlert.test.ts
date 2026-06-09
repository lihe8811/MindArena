import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const appSourcePath = path.join(import.meta.dir, '../../src/client/App.tsx');
const navigationSourcePath = path.join(import.meta.dir, '../../src/client/components/Navigation.tsx');
const modalSourcePath = path.join(import.meta.dir, '../../src/client/components/NotificationModal.tsx');

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
});
