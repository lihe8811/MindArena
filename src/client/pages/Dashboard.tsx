import { Bolt, ChevronRight, Clock3, History, Trophy } from 'lucide-react';
import type { DashboardData, UserProfile } from '@/shared/types';

interface DashboardProps {
  data: DashboardData;
  user: UserProfile | null;
  onStartDebate: () => void;
  onOpenHistory: () => void;
}

export function Dashboard({ data, user, onStartDebate, onOpenHistory }: DashboardProps) {
  const stats = [
    { label: 'Logic Score', value: `${data.stats.logicScore}%` },
    { label: 'Avg Response', value: `${data.stats.averageResponseSeconds}s` },
    { label: 'Win Rate', value: `${data.stats.winRate}%` },
    { label: 'Completed', value: `${data.stats.debatesCompleted}` },
  ];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="rounded-3xl border border-outline-variant bg-gradient-to-br from-primary/20 via-surface-container to-surface-container-low p-8 md:p-10">
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-black">MindArena Workspace</p>
        <h2 className="mt-4 text-4xl font-black tracking-tight text-on-surface max-w-3xl">{data.heroTitle}</h2>
        <p className="mt-4 max-w-2xl text-secondary text-sm md:text-base">{data.heroSubtitle}</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button
            onClick={onStartDebate}
            className="bg-primary text-on-primary font-bold px-6 py-3 rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            <Bolt className="w-4 h-4 fill-current" />
            Start New Debate
          </button>
          <button
            onClick={onOpenHistory}
            className="border border-outline-variant px-6 py-3 rounded-xl text-on-surface hover:bg-surface-container-high transition-all flex items-center justify-center gap-2"
          >
            <History className="w-4 h-4" />
            Review History
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((item) => (
          <div key={item.label} className="rounded-2xl border border-outline-variant bg-surface-container p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-secondary font-bold">{item.label}</p>
            <p className="mt-3 text-3xl font-black tracking-tight text-on-surface">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 rounded-2xl border border-outline-variant bg-surface-container overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant">
            <div>
              <h3 className="text-xl font-bold text-on-surface">Recent Debates</h3>
              <p className="text-sm text-secondary">Server-backed sessions and results</p>
            </div>
            <button onClick={onOpenHistory} className="text-primary text-sm font-bold flex items-center gap-2">
              View history
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-outline-variant">
            {data.recentDebates.length === 0 ? (
              <div className="px-6 py-10 text-sm text-secondary">
                No debates yet. Start your first round after adding a few rules or source files.
              </div>
            ) : (
              data.recentDebates.map((debate) => (
                <div key={debate.id} className="px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-on-surface">{debate.topic}</p>
                    <p className="mt-1 text-xs text-secondary">
                      {debate.domain} • Opponent: {debate.opponent}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-secondary">{debate.duration}</span>
                    <span className="text-secondary">{debate.tokens}</span>
                    <span className="rounded-full border border-outline-variant px-3 py-1 font-bold text-on-surface">
                      {debate.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-6">
            <div className="flex items-center gap-3">
              <Clock3 className="w-5 h-5 text-primary" />
              <p className="text-sm font-bold text-on-surface">{user?.title ?? 'Debater'}</p>
            </div>
            <p className="mt-3 text-3xl font-black tracking-tight text-on-surface">{user?.streak ?? 0} day streak</p>
            <p className="mt-2 text-sm text-secondary">Show up consistently and keep your argument rhythm warm.</p>
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface-container p-6">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-on-surface">Practice Focus</h3>
            </div>
            <div className="mt-4 space-y-3">
              {data.recommendations.map((item) => (
                <div key={item} className="rounded-xl bg-surface-container-low px-4 py-3 text-sm text-secondary">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
