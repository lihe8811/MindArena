import {
  BarChart2,
  HelpCircle,
  History,
  Home,
  LogOut,
  CirclePlay,
  Settings,
  Swords,
  X,
} from 'lucide-react';
import { MindArenaLogo } from '@/client/components/MindArenaLogo';
import { StudentAvatar } from '@/client/components/StudentAvatar';
import { cn } from '@/client/lib/utils';
import { ROUTES, type Route } from '@/shared/constants';
import type { UserProfile, View } from '@/shared/types';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onLogout: () => void;
  onSettingsClick?: () => void;
  user: UserProfile | null;
  hasActiveDebate: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

function NavContent({
  currentView,
  onViewChange,
  onLogout,
  onSettingsClick,
  user,
  hasActiveDebate,
}: Omit<SidebarProps, 'isMobileOpen' | 'onCloseMobile'>) {
  const navItems: Route[] = hasActiveDebate
    ? [...ROUTES.slice(0, 2), { id: 'arena', label: 'Live Arena', icon: 'Swords' }, ...ROUTES.slice(2)]
    : ROUTES;

  return (
    <>
      <div className="p-6 mb-4">
        <div className="flex items-center gap-3">
          <MindArenaLogo />
          <div>
            <p className="text-xl font-black text-on-surface leading-none tracking-tighter">MindArena</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((route) => {
          const Icon = {
            Home,
            CirclePlay,
            Swords,
            History,
            BarChart2,
          }[route.icon] || Home;

          const isActive = currentView === route.id;
          const isStartDebate = route.id === 'start-debate';

          return (
            <button
              key={route.id}
              onClick={() => onViewChange(route.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 transition-all active:scale-[0.98] font-sans text-sm tracking-tight rounded-lg',
                isStartDebate
                  ? isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-secondary hover:bg-surface-container-high/50 hover:text-on-surface'
                  : isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-secondary hover:bg-surface-container-high/50 hover:text-on-surface',
              )}
            >
              {isStartDebate ? (
                <CirclePlay className="h-5 w-5" />
              ) : (
                <Icon className={cn('w-5 h-5', isActive ? 'fill-primary/10' : '')} />
              )}
              {route.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-outline-variant space-y-3">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-surface-container border border-outline-variant">
          <StudentAvatar variant={4} className="h-9 w-9" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-secondary">Signed in as</p>
            <p className="text-sm font-bold text-on-surface mt-1 truncate">{user?.name ?? 'Guest'}</p>
            <p className="text-xs text-secondary truncate">{user?.email ?? 'Not connected'}</p>
          </div>
        </div>
        <button className="w-full flex items-center gap-3 px-4 py-3 text-secondary hover:bg-surface-container-high/50 hover:text-on-surface transition-all rounded-lg font-sans text-sm tracking-tight">
          <HelpCircle className="w-5 h-5" /> Help
        </button>
        <button
          type="button"
          onClick={onSettingsClick}
          className="w-full flex items-center gap-3 px-4 py-3 text-secondary hover:bg-surface-container-high/50 hover:text-on-surface transition-all rounded-lg font-sans text-sm tracking-tight"
        >
          <Settings className="w-5 h-5" /> Settings
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-secondary hover:bg-surface-container-high/50 hover:text-on-surface transition-all rounded-lg font-sans text-sm tracking-tight"
        >
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </div>
    </>
  );
}

export function Sidebar({
  currentView,
  onViewChange,
  onLogout,
  onSettingsClick,
  user,
  hasActiveDebate,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      <aside className="fixed left-0 top-0 bottom-0 hidden md:flex flex-col bg-surface-container-lowest h-screen w-64 border-r border-outline-variant z-40">
        <NavContent
          currentView={currentView}
          onViewChange={onViewChange}
          onLogout={onLogout}
          onSettingsClick={onSettingsClick}
          user={user}
          hasActiveDebate={hasActiveDebate}
        />
      </aside>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onCloseMobile}
            className="absolute inset-0 bg-black/50"
          />
          <aside className="absolute left-0 top-0 bottom-0 flex w-72 flex-col bg-surface-container-lowest border-r border-outline-variant">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
              <div className="flex items-center gap-3">
                <MindArenaLogo className="h-9 w-9" markClassName="h-5 w-5" />
                <p className="text-lg font-black text-on-surface">MindArena</p>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-2 rounded-full text-secondary hover:bg-surface-container-high"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavContent
                currentView={currentView}
                onViewChange={onViewChange}
                onLogout={onLogout}
                onSettingsClick={onSettingsClick}
                user={user}
                hasActiveDebate={hasActiveDebate}
              />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
