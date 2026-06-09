import { CheckCircle2, Clock3, X } from 'lucide-react';
import type { DebateNotification } from '@/shared/types';

interface NotificationModalProps {
  notifications: DebateNotification[];
  dismissingId: string | null;
  onClose: () => void;
  onDismiss: (notificationId: string) => void;
}

export function NotificationModal({
  notifications,
  dismissingId,
  onClose,
  onDismiss,
}: NotificationModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close notifications"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-dialog-title"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-outline-variant bg-surface-container shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-outline-variant px-6 py-5">
          <div>
            <h2 id="notification-dialog-title" className="text-xl font-black text-on-surface">
              Notifications
            </h2>
            <p className="mt-1 text-sm text-secondary">Final updates from your debate sessions.</p>
          </div>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={onClose}
            className="rounded-full p-2 text-secondary transition-colors hover:bg-surface-container-high hover:text-on-surface"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5">
          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-outline-variant px-6 py-10 text-center">
              <p className="font-bold text-on-surface">No debate notifications</p>
              <p className="mt-2 text-sm text-secondary">Completed and terminated debates will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const terminated = notification.status === 'Terminated';
                const Icon = terminated ? Clock3 : CheckCircle2;

                return (
                  <article
                    key={notification.id}
                    className="rounded-2xl border border-outline-variant bg-surface-container-low p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={
                          terminated
                            ? 'rounded-xl bg-primary/15 p-2 text-primary'
                            : 'rounded-xl bg-tertiary/15 p-2 text-tertiary'
                        }
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-bold text-on-surface">{notification.title}</h3>
                          <span className="text-xs text-secondary">
                            {new Date(notification.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-secondary">{notification.message}</p>
                        <button
                          type="button"
                          onClick={() => onDismiss(notification.id)}
                          disabled={dismissingId === notification.id}
                          className="mt-4 rounded-lg border border-outline-variant px-3 py-2 text-xs font-bold text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {dismissingId === notification.id ? 'Dismissing...' : 'Dismiss'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
