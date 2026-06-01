import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Sidebar, TopBar } from './components/Navigation';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { StartDebate } from './pages/StartDebate';
import { Arena } from './pages/Arena';
import { History } from './pages/History';
import { Performance } from './pages/Performance';
import {
  createDebate,
  getBootstrap,
  getNotifications,
  getSettings,
  login,
  register,
  logout,
  markNotificationsRead,
  sendDebateMessage,
} from './lib/api';
import type { AppBootstrap, View } from '@/shared/types';

const VIEW_META: Record<Exclude<View, 'landing'>, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Your debate workspace' },
  'start-debate': { title: 'Start Debate', subtitle: 'Create a new session' },
  arena: { title: 'Arena', subtitle: 'Live transcript and round controls' },
  history: { title: 'History', subtitle: 'Past sessions and results' },
  performance: { title: 'Performance', subtitle: 'Metrics and coaching notes' },
};

function App() {
  const [appData, setAppData] = useState<AppBootstrap | null>(null);
  const [currentView, setCurrentView] = useState<View>('landing');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const refreshApp = useCallback(async () => {
    const data = await getBootstrap();
    setAppData(data);
    setCurrentView(data.session.authenticated ? (data.activeDebate ? 'arena' : 'dashboard') : 'landing');
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

    void bootstrap();
  }, [refreshApp]);

  const handleLogin = async (email: string, password: string) => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await login(email, password);
      const data = await refreshApp();
      setCurrentView(data.activeDebate ? 'arena' : 'dashboard');
      setNotice('Signed in successfully.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (payload: { name: string; email: string; password: string }) => {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await register(payload);
      await refreshApp();
      setCurrentView('dashboard');
      setNotice('Account created. Your workspace is now persistent.');
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
      setNotice('Signed out.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateDebate = async (payload: Parameters<typeof createDebate>[0]) => {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await createDebate(payload);
      await refreshApp();
      setCurrentView('arena');
      setNotice('Debate room created and saved.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create debate.');
    } finally {
      setBusy(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const debate = await sendDebateMessage(content);
      if (appData) {
        setAppData({ ...appData, activeDebate: debate });
      }
      if (debate.status === 'Completed') {
        const data = await refreshApp();
        setAppData(data);
        setNotice('Debate round finished and moved into history.');
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send message.');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenSettings = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const { settings } = await getSettings();
      setNotice(`Settings loaded for ${settings.displayName}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load settings.');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenNotifications = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const data = await getNotifications();
      const unread = data.notifications.filter((notification) => !notification.read).length;
      setNotice(`You have ${unread} unread notification(s).`);
      await markNotificationsRead();
      await refreshApp();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load notifications.');
    } finally {
      setBusy(false);
    }
  };

  const filteredHistory = useMemo(() => {
    if (!appData) return [];
    if (!searchQuery.trim()) return appData.history;
    const query = searchQuery.toLowerCase();
    return appData.history.filter(
      (item) =>
        item.topic.toLowerCase().includes(query) ||
        item.subject.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query),
    );
  }, [appData, searchQuery]);

  if (loading || !appData) {
    return (
      <div className="min-h-screen bg-background text-on-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-primary font-black">MindArena</p>
          <p className="mt-3 text-secondary">Loading workspace...</p>
        </div>
      </div>
    );
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
        return <Arena debate={appData.activeDebate} onSendMessage={handleSendMessage} isSending={busy} />;
      case 'history':
        return <History items={filteredHistory} />;
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

  const meta = VIEW_META[currentView as Exclude<View, 'landing'>];

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
        user={appData.session.user}
        hasActiveDebate={Boolean(appData.activeDebate)}
        isMobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 ml-0 md:ml-64 flex flex-col min-w-0">
        <TopBar
          title={meta.title}
          subtitle={meta.subtitle}
          user={appData.session.user}
          onSearch={setSearchQuery}
          onToggleSidebar={() => setMobileSidebarOpen((open) => !open)}
          onNotificationClick={() => {
            void handleOpenNotifications();
          }}
          onSettingsClick={() => {
            void handleOpenSettings();
          }}
        />
        
        <main className="flex-1 mt-14 px-6 py-8 overflow-y-auto">
          {notice ? (
            <div className="mb-6 rounded-2xl border border-tertiary/30 bg-tertiary/10 px-4 py-3 text-sm text-emerald-100">
              {notice}
            </div>
          ) : null}
          {error && currentView !== 'landing' ? (
            <div className="mb-6 rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}
          {renderView()}
        </main>

        <footer className="px-6 py-4 border-t border-outline-variant flex justify-between items-center bg-surface-container-low/30">
          <p className="text-[10px] uppercase font-bold tracking-widest text-secondary/40">MindArena MVP Workspace</p>
          <div className="flex gap-4">
            <span className="flex items-center gap-2 text-[10px] font-bold text-tertiary uppercase tracking-widest">
              <span className="w-1 h-1 rounded-full bg-tertiary" /> System Optimal
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
