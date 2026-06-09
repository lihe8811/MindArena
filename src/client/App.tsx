import React, { useCallback, useEffect, useState } from 'react';

const LOADING_MESSAGES = [
  'Loading your practice records...',
  'Syncing debate history...',
  'Reading your logic scores...',
  'Getting the arena ready...',
  'Checking your streak...',
];

function LoadingScreen() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setIdx((i) => (i + 1) % LOADING_MESSAGES.length), 1600);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl font-black text-primary tracking-tight">MindArena</p>
        <p key={idx} className="mt-3 text-sm text-secondary animate-in fade-in duration-500">
          {LOADING_MESSAGES[idx]}
        </p>
      </div>
    </div>
  );
}
import { Menu } from 'lucide-react';
import { Sidebar } from './components/Navigation';
import { NotificationModal } from './components/NotificationModal';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { StartDebate } from './pages/StartDebate';
import { Arena } from './pages/Arena';
import { History } from './pages/History';
import { Performance } from './pages/Performance';
import {
  createDebate,
  dismissNotification,
  expireCurrentDebate,
  getBootstrap,
  getNotifications,
  getSettings,
  login,
  register,
  logout,
  sendDebateMessage,
  requestTeammateCoaching,
} from './lib/api';
import type { AppBootstrap, DebateNotification, View } from '@/shared/types';

function App() {
  const [appData, setAppData] = useState<AppBootstrap | null>(null);
  const [currentView, setCurrentView] = useState<View>('landing');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<DebateNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dismissingNotificationId, setDismissingNotificationId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const refreshApp = useCallback(async () => {
    const data = await getBootstrap();
    setAppData(data);
    setCurrentView(data.session.authenticated ? (data.activeDebate ? 'arena' : 'dashboard') : 'landing');
    if (data.session.authenticated) {
      const notificationData = await getNotifications();
      setNotifications(notificationData.notifications);
    } else {
      setNotifications([]);
    }
    return data;
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await refreshApp();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Failed to load the app.');
      } finally {
        setLoading(false);
      }
    };

    console.log('%cMindArena', 'color:oklch(52% 0.19 62);font-size:22px;font-weight:900;font-family:Geist,sans-serif');
    console.log('%cYou found the debug console. The whole debate engine is plain TypeScript — nothing magic.', 'color:#888;font-size:12px');

    void bootstrap();
  }, [refreshApp]);

  const handleLogin = async (email: string, password: string) => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await login(email, password);
      const data = await refreshApp();
      setCurrentView(data.activeDebate ? 'arena' : 'dashboard');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (payload: { name: string; email: string; password: string }) => {
    setBusy(true);
    setError(null);

    try {
      await register(payload);
      await refreshApp();
      setCurrentView('dashboard');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create account.');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    setError(null);
    try {
      await logout();
      const data = await refreshApp();
      setAppData(data);
      setCurrentView('landing');
      setNotificationsOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateDebate = async (payload: Parameters<typeof createDebate>[0]) => {
    setBusy(true);
    setError(null);

    try {
      await createDebate(payload);
      await refreshApp();
      setCurrentView('arena');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create debate.');
    } finally {
      setBusy(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    setBusy(true);
    setError(null);

    try {
      const debate = await sendDebateMessage(content);
      if (appData) {
        setAppData({ ...appData, activeDebate: debate });
      }
      if (debate.status === 'Completed') {
        const data = await refreshApp();
        setAppData(data);
        setNotificationsOpen(true);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send message.');
    } finally {
      setBusy(false);
    }
  };

  const handleRequestCoaching = async () => {
    const { coaching } = await requestTeammateCoaching();
    return coaching;
  };

  const handleTimerExpired = async () => {
    try {
      const debate = await expireCurrentDebate();
      if (appData) {
        setAppData({ ...appData, activeDebate: debate });
      }
      if (debate.status === 'Terminated') {
        const data = await refreshApp();
        setAppData(data);
        setNotificationsOpen(true);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to end the expired debate.');
    }
  };

  const handleOpenSettings = async () => {
    setBusy(true);
    setError(null);

    try {
      await getSettings();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load settings.');
    } finally {
      setBusy(false);
    }
  };

  const handleDismissNotification = async (notificationId: string) => {
    setDismissingNotificationId(notificationId);
    setError(null);

    try {
      const data = await dismissNotification(notificationId);
      setNotifications(data.notifications);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to dismiss notification.');
    } finally {
      setDismissingNotificationId(null);
    }
  };

  if (loading || !appData) {
    return <LoadingScreen />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return <Landing onLogin={handleLogin} onRegister={handleRegister} isLoading={busy} error={error} />;
      case 'dashboard':
        return (
          <Dashboard
            data={appData.dashboard}
            user={appData.session.user}
            onStartDebate={() => setCurrentView('start-debate')}
            onOpenHistory={() => setCurrentView('history')}
          />
        );
      case 'start-debate':
        return (
          <StartDebate
            onCreateDebate={handleCreateDebate}
            isSubmitting={busy}
          />
        );
      case 'arena':
        return (
          <Arena
            debate={appData.activeDebate}
            onSendMessage={handleSendMessage}
            onRequestCoaching={handleRequestCoaching}
            onTimerExpired={handleTimerExpired}
            isSending={busy}
          />
        );
      case 'history':
        return <History items={appData.history} />;
      case 'performance':
        return <Performance data={appData.performance} />;
      default:
        return (
          <Dashboard
            data={appData.dashboard}
            user={appData.session.user}
            onStartDebate={() => setCurrentView('start-debate')}
            onOpenHistory={() => setCurrentView('history')}
          />
        );
    }
  };

  if (!appData.session.authenticated || currentView === 'landing') {
    return <Landing onLogin={handleLogin} onRegister={handleRegister} isLoading={busy} error={error} />;
  }

  return (
    <div className="min-h-screen bg-background flex text-on-background font-sans overflow-x-hidden">
      <Sidebar 
        currentView={currentView} 
        onViewChange={(view) => {
          if (view === 'arena' && !appData.activeDebate) {
            setCurrentView('start-debate');
            return;
          }
          setCurrentView(view);
          setMobileSidebarOpen(false);
        }}
        onLogout={() => {
          void handleLogout();
        }}
        onSettingsClick={() => {
          void handleOpenSettings();
        }}
        onNotificationsClick={() => {
          setNotificationsOpen(true);
          setMobileSidebarOpen(false);
        }}
        notificationCount={notifications.length}
        user={appData.session.user}
        hasActiveDebate={Boolean(appData.activeDebate)}
        isMobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 ml-0 md:ml-64 flex flex-col min-w-0">
        <main className="flex-1 px-6 py-8 overflow-y-auto">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen((open) => !open)}
            className="mb-6 inline-flex md:hidden p-2 text-secondary hover:bg-surface-container-high hover:text-on-surface rounded-full transition-all"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          {error && currentView !== 'landing' ? (
            <div className="mb-6 rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}
          {renderView()}
        </main>

        <footer className="px-6 py-4 border-t border-outline-variant flex justify-between items-center bg-surface-container-low/30">
          <p className="text-xs text-secondary/40">MindArena</p>
          <div className="flex gap-4">
            <span className="flex items-center gap-2 text-xs font-semibold text-tertiary">
              <span className="w-1 h-1 rounded-full bg-tertiary" /> System Optimal
            </span>
          </div>
        </footer>
      </div>
      {notificationsOpen ? (
        <NotificationModal
          notifications={notifications}
          dismissingId={dismissingNotificationId}
          onClose={() => setNotificationsOpen(false)}
          onDismiss={(notificationId) => {
            void handleDismissNotification(notificationId);
          }}
        />
      ) : null}
    </div>
  );
}

export default App;
