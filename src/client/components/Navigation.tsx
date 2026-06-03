import {
  BarChart2,
  Bell,
  HelpCircle,
  History,
  Home,
  LogOut,
  Menu,
  CirclePlay,
  Search,
  Settings,
  Swords,
  Terminal,
  X,
} from 'lucide-react';
import { cn } from '@/client/lib/utils';
import { ROUTES, type Route } from '@/shared/constants';
import type { UserProfile, View } from '@/shared/types';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onLogout: () => void;
  user: UserProfile | null;
  hasActiveDebate: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

function NavContent({
  currentView,
  onViewChange,
  onLogout,
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
          <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center">
            <Terminal className="w-5 h-5 text-primary" />
          </div>
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
        <div className="px-3 py-3 rounded-xl bg-surface-container border border-outline-variant">
          <p className="text-xs font-medium text-secondary">Signed in as</p>
          <p className="text-sm font-bold text-on-surface mt-2 truncate">{user?.name ?? 'Guest'}</p>
          <p className="text-xs text-secondary truncate">{user?.email ?? 'Not connected'}</p>
        </div>
        <button className="w-full flex items-center gap-3 px-4 py-3 text-secondary hover:bg-surface-container-high/50 hover:text-on-surface transition-all rounded-lg font-sans text-sm tracking-tight">
          <HelpCircle className="w-5 h-5" /> Help
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
  user,
  hasActiveDebate,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      <aside className="fixed left-0 top-0 bottom-0 hidden md:flex flex-col pt-14 bg-surface-container-lowest h-screen w-64 border-r border-outline-variant z-40">
        <NavContent
          currentView={currentView}
          onViewChange={onViewChange}
          onLogout={onLogout}
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
              <p className="text-lg font-black text-on-surface">MindArena</p>
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

interface TopBarProps {
  onSearch?: (query: string) => void;
  title: string;
  subtitle?: string;
  user: UserProfile | null;
  onToggleSidebar?: () => void;
  onNotificationClick?: () => void;
  onSettingsClick?: () => void;
}

export function TopBar({ onSearch, title, subtitle, user, onToggleSidebar, onNotificationClick, onSettingsClick }: TopBarProps) {
  return (
    <header className="bg-background/80 backdrop-blur-md fixed top-0 left-0 right-0 z-50 border-b border-outline-variant flex justify-between items-center w-full px-6 h-14">
      <div className="flex items-center gap-4 md:gap-8">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="md:hidden p-2 text-secondary hover:bg-surface-container-high hover:text-on-surface rounded-full transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden md:block">
          <h1 className="text-lg font-bold tracking-tighter text-on-surface">{title}</h1>
          {subtitle ? <p className="text-xs text-secondary">{subtitle}</p> : null}
        </div>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary w-4 h-4 transition-colors group-focus-within:text-primary" />
          <input
            type="text"
            placeholder="Search the workspace..."
            className="bg-surface-container-low border border-outline-variant rounded-full py-1.5 pl-10 pr-4 text-xs w-40 md:w-64 focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none text-on-surface placeholder:text-secondary/50"
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Notifications"
          onClick={onNotificationClick}
          className="p-2 text-secondary hover:bg-surface-container-high hover:text-on-surface rounded-full transition-all"
        >
          <Bell className="w-5 h-5" />
        </button>
        <button
          type="button"
          aria-label="Settings"
          onClick={onSettingsClick}
          className="hidden md:inline-flex p-2 text-secondary hover:bg-surface-container-high hover:text-on-surface rounded-full transition-all"
        >
          <Settings className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full border border-outline-variant bg-primary/10 text-primary overflow-hidden cursor-pointer hover:ring-2 ring-primary/20 transition-all flex items-center justify-center text-xs font-black">
          {(user?.name ?? 'M').slice(0, 1).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
