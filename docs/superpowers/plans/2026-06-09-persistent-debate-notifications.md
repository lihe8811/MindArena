# Persistent Debate Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace transient alerts and sidebar Help with permanently dismissible notifications for completed and terminated debates.

**Architecture:** Persist notifications beside users, sessions, and debates in the JSON app store. Debate finalization creates a deduplicated notification atomically; authenticated API routes list and delete notifications. The client owns modal visibility, loads notifications with bootstrap refreshes, and updates the sidebar badge after dismissal.

**Tech Stack:** TypeScript, Bun test runner, Express, React 19, Tailwind CSS, Lucide icons.

---

### Task 1: Persist Final Debate Notifications

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/server/stores/appStore.ts`
- Test: `tests/server-api/appStore.test.ts`

- [ ] **Step 1: Write failing store tests**

Add tests that complete and terminate debates, then assert `listUserNotifications(userId)` returns one notification with the matching `debateId` and `status`. Retry the terminal transition and assert no duplicate is created. Dismiss the notification and reload it to assert it remains absent.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `bun test tests/server-api/appStore.test.ts --test-name-pattern "notification"`

Expected: FAIL because notification store functions do not exist.

- [ ] **Step 3: Implement notification types and store functions**

Add:

```ts
export interface DebateNotification {
  id: string;
  debateId: string;
  status: 'Completed' | 'Terminated';
  title: string;
  message: string;
  createdAt: string;
}
```

Persist an internal user ID with each notification. Normalize legacy files with no `notifications` property. Create notifications from the completed and terminated transition paths using user ID, debate ID, and status as the deduplication key. Export list and dismiss functions that enforce ownership.

- [ ] **Step 4: Run focused tests and verify pass**

Run: `bun test tests/server-api/appStore.test.ts --test-name-pattern "notification"`

Expected: PASS.

### Task 2: Expose Notification API

**Files:**
- Modify: `src/server/index.ts`
- Modify: `src/client/lib/api.ts`
- Test: `tests/server-api/appStore.test.ts`

- [ ] **Step 1: Add ownership assertions**

Extend store tests so one user cannot dismiss another user's notification.

- [ ] **Step 2: Replace derived notification routes**

Use `listUserNotifications(user.id)` for `GET /api/notifications`. Replace `PUT /api/notifications/read` with:

```ts
app.delete('/api/notifications/:notificationId', ...)
```

Return the remaining notification list after dismissal. Update the client API with typed `getNotifications()` and `dismissNotification(id)`.

- [ ] **Step 3: Run server tests**

Run: `bun test tests/server-api/appStore.test.ts`

Expected: PASS.

### Task 3: Build Notification Button and Modal

**Files:**
- Create: `src/client/components/NotificationModal.tsx`
- Modify: `src/client/components/Navigation.tsx`
- Modify: `src/client/App.tsx`
- Replace: `tests/client/notificationAlert.test.ts`

- [ ] **Step 1: Write failing client source tests**

Assert Navigation imports `Bell`, renders `Notifications`, accepts a notification count and click callback, and no longer renders Help. Assert App renders `NotificationModal`, has no top `role="alert"` banner, and calls `dismissNotification`.

- [ ] **Step 2: Run client test and verify failure**

Run: `bun test tests/client/notificationAlert.test.ts`

Expected: FAIL because the notification UI is not implemented.

- [ ] **Step 3: Implement the sidebar button**

Add `notificationCount` and `onNotificationsClick` props to Sidebar/NavContent. Render a Bell button in Help's position and show a compact count badge only when count is greater than zero.

- [ ] **Step 4: Implement the modal**

Create an accessible dialog with a title, close button, empty state, status-specific styling, and a Dismiss button per notification.

- [ ] **Step 5: Integrate client state**

Remove `notice` state and transient notice setters. Load notifications after authenticated bootstrap refreshes and after debate finalization. Open the modal when a debate completes or terminates. Dismiss through the API, then replace local notifications with the returned list.

- [ ] **Step 6: Run client tests**

Run: `bun test tests/client/notificationAlert.test.ts`

Expected: PASS.

### Task 4: Verify Complete Behavior

**Files:**
- Verify all modified files

- [ ] **Step 1: Run automated verification**

Run:

```bash
bun test
bun run lint
bun run build
git diff --check
```

Expected: all commands pass.

- [ ] **Step 2: Restart one production server**

Stop the current MindArena process and start the rebuilt app with `PORT=3000 bun run start`. Confirm exactly one listener and `GET /api/health` returns `{"ok":true}`.

- [ ] **Step 3: Browser verification**

Create a local QA account and final debate. Verify the Notifications badge appears, the modal lists the final status, Dismiss removes the item and badge, and reload does not restore the dismissed notification. Confirm no browser console errors.

- [ ] **Step 4: Restore QA store data**

Restore `data/app-store.json` so browser fixtures are not included in the worktree.
