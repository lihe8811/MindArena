import {
  BarChart2,
  Bell,
  HelpCircle,
  History,
  Home,
  Library,
  LogOut,
  Menu,
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
  compact?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

function NavContent({
  currentView,
  onViewChange,
  onLogout,
  user,
  hasActiveDebate,
  compact = false,
}: Omit<SidebarProps, 'isMobileOpen' | 'onCloseMobile'>) {
  const navItems: Route[] = hasActiveDebate
    ? [...ROUTES.slice(0, 2), { id: 'arena', label: 'Live Arena', icon: 'Swords' }, ...ROUTES.slice(2)]
    : ROUTES;

  return (
    <>
      <div className="p-6 mb-4">
        <div className={`flex items-center ${compact ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center">
            <Terminal className="w-5 h-5 text-primary" />
          </div>
          {!compact ? (
            <div>
              <p className="text-xl font-black text-on-surface leading-none tracking-tighter">MindArena</p>
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold mt-1">Persistent MVP</p>
            </div>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((route) => {
          const Icon = {
            Home,
            Swords,
            History,
            BarChart2,
            Library,
            Settings,
          }[route.icon] || Home;

          const isActive = currentView === route.id;

          return (
            <button
              key={route.id}
              onClick={() => onViewChange(route.id)}
              title={compact ? route.label : undefined}
              className={cn(
                'w-full flex items-center px-4 py-3 transition-all active:scale-[0.98] font-sans text-sm tracking-tight rounded-lg',
                compact ? 'justify-center' : 'gap-3',
                isActive
                  ? 'bg-surface-container-highest text-primary border-r-2 border-primary'
                  : 'text-secondary hover:bg-surface-container-high/50 hover:text-on-surface',
              )}
            >
              <Icon className={cn('w-5 h-5', isActive ? 'fill-primary/10' : '')} />
              {!compact ? route.label : null}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-outline-variant space-y-3">
        <div
          className={cn(
            'rounded-xl bg-surface-container border border-outline-variant',
            compact ? 'px-2 py-3 text-center' : 'px-3 py-3',
          )}
        >
          {!compact ? (
            <>
              <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">Signed in as</p>
              <p className="text-sm font-bold text-on-surface mt-2 truncate">{user?.name ?? 'Guest'}</p>
              <p className="text-xs text-secondary truncate">{user?.email ?? 'Not connected'}</p>
            </>
          ) : (
            <div
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-primary/10 text-sm font-black text-primary"
              title={user?.name ?? 'Guest'}
            >
              {(user?.name ?? 'G').slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <button
          title={compact ? 'Help' : undefined}
          className={cn(
            'w-full flex items-center px-4 py-3 text-secondary hover:bg-surface-container-high/50 hover:text-on-surface transition-all rounded-lg font-sans text-sm tracking-tight',
            compact ? 'justify-center' : 'gap-3',
          )}
        >
          <HelpCircle className="w-5 h-5" />
          {!compact ? 'Help' : null}
        </button>
        <button
          onClick={onLogout}
          title={compact ? 'Logout' : undefined}
          className={cn(
            'w-full flex items-center px-4 py-3 text-secondary hover:bg-surface-container-high/50 hover:text-on-surface transition-all rounded-lg font-sans text-sm tracking-tight',
            compact ? 'justify-center' : 'gap-3',
          )}
        >
          <LogOut className="w-5 h-5" />
          {!compact ? 'Logout' : null}
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
  compact = false,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 hidden md:flex flex-col pt-14 bg-surface-container-lowest h-screen border-r border-outline-variant z-40 transition-[width]',
          compact ? 'w-20' : 'w-64',
        )}
      >
        <NavContent
          currentView={currentView}
          onViewChange={onViewChange}
          onLogout={onLogout}
          user={user}
          hasActiveDebate={hasActiveDebate}
          compact={compact}
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
                compact={false}
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
  onOpenSettings?: () => void;
}

export function TopBar({ onSearch, title, subtitle, user, onToggleSidebar, onOpenSettings }: TopBarProps) {
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
          {subtitle ? <p className="text-[10px] uppercase tracking-widest text-secondary">{subtitle}</p> : null}
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
        <button className="p-2 text-secondary hover:bg-surface-container-high hover:text-on-surface rounded-full transition-all">
          <Bell className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
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
