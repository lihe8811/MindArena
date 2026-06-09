# Persistent Debate Notifications Design

## Goal

Replace the sidebar Help action and transient top alert with a notification center that records final debate status changes. Notifications remain until the user permanently dismisses them.

## Scope

Notifications are created only when a debate reaches one of these final states:

- `Completed`
- `Terminated`

Account creation, sign-in, settings access, and debate creation do not create notifications.

## Data Model

Add a persisted notification collection to the application store. Each notification contains:

- Unique notification ID
- Owning user ID
- Debate ID
- Final debate status
- Title and message
- Creation timestamp

Dismissal permanently removes the notification from the persisted collection. A uniqueness check on user ID, debate ID, and final status prevents duplicate notifications when a finalization path is retried.

## Server Behavior

The store creates a notification at the same time it changes a debate to `Completed` or `Terminated`.

The notification API provides:

- `GET /api/notifications`: returns the authenticated user's active notifications, newest first
- `DELETE /api/notifications/:notificationId`: permanently dismisses one notification owned by the authenticated user

The existing bulk mark-read endpoint is removed because the product uses persistent dismissal rather than a separate read state.

## Client Behavior

The Help button in the bottom sidebar is replaced by a Notifications button with a bell icon.

The button displays a badge containing the current notification count. No badge is shown when the count is zero.

Clicking the button opens a modal that:

- Lists all current notifications
- Identifies whether each debate completed or terminated
- Provides a Dismiss button for each item
- Provides a close control that closes the modal without dismissing notifications
- Shows an empty state when there are no notifications

Dismiss updates the server first, then removes the item from client state and updates the badge. A failed dismissal leaves the item visible and displays the existing application error treatment.

The transient top notification banner and its `notice` state are removed. Debate finalization refreshes application data and notification data, then opens the notification modal so the user sees the new status once. Closing the modal does not dismiss the notification.

## Accessibility

The modal uses dialog semantics, an accessible title, keyboard-focusable controls, and an explicit close button. Notification badge text has an accessible label through the Notifications button.

## Testing

Server tests verify:

- Completing a debate creates exactly one `Completed` notification
- Overtime creates exactly one `Terminated` notification
- Repeated finalization does not duplicate notifications
- Users cannot list or dismiss another user's notifications
- Dismissed notifications stay absent after reloading the store

Client tests verify:

- Help is replaced by Notifications
- The badge reflects notification count
- The modal opens from the sidebar button
- Dismiss calls the API and removes the notification
- The old top alert is no longer rendered

Browser verification covers opening the modal, viewing a final-status notification, dismissing it, and confirming the badge remains cleared after reload.
