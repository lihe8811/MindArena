import type { PerformanceData } from '@/shared/types';

interface PerformanceProps {
  data: PerformanceData;
}

const SKILL_COLORS: Record<string, { bar: string; text: string }> = {
  'Logical Consistency':    { bar: 'var(--color-primary)',       text: 'text-primary' },
  'Rhetorical Flair':       { bar: 'var(--color-tertiary)',      text: 'text-tertiary' },
  'Evidence Integration':   { bar: 'var(--color-dataviz-amber)', text: 'text-dataviz-amber' },
  'Response Countering':    { bar: 'var(--color-dataviz-sky)',   text: 'text-dataviz-sky' },
  'Emotional Intelligence': { bar: 'var(--color-dataviz-rose)',  text: 'text-dataviz-rose' },
};
const SKILL_COLOR_FALLBACK = { bar: 'var(--color-primary)', text: 'text-primary' };

export function Performance({ data }: PerformanceProps) {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-on-surface">Performance</h2>
        <p className="mt-2 text-secondary">Core metrics and coaching pulled from the backend.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {data.highlights.map((item) => (
          <div key={item.label} className="rounded-2xl border border-outline-variant bg-surface-container p-5">
            <p className="text-sm font-semibold text-secondary">{item.label}</p>
            <p className="mt-3 text-3xl font-black text-on-surface">{item.value}</p>
            <p className={`mt-2 text-sm font-bold ${item.isDown ? 'text-error' : 'text-tertiary'}`}>{item.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <section className="rounded-3xl border border-outline-variant bg-surface-container p-6">
          <h3 className="text-lg font-bold text-on-surface">Coach Notes</h3>
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-surface-container-low p-4">
              <p className="text-sm font-bold text-primary">Insight</p>
              <p className="mt-2 text-sm text-secondary">{data.insight}</p>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-4">
              <p className="text-sm font-bold text-tertiary">Recommendation</p>
              <p className="mt-2 text-sm text-secondary">{data.recommendation}</p>
            </div>
            <div className="rounded-2xl border border-outline-variant p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">Next milestone</span>
                <span className="font-bold text-primary">{data.milestoneProgress}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-surface-container-lowest overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${data.milestoneProgress}%` }} />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-outline-variant bg-surface-container p-6">
          <h3 className="text-lg font-bold text-on-surface">Skill Balance</h3>
          <div className="mt-6 space-y-5">
            {data.skillBalance.map((item) => {
              const color = SKILL_COLORS[item.label] ?? SKILL_COLOR_FALLBACK;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color.bar }} />
                      <span className="text-secondary">{item.label}</span>
                    </div>
                    <span className={`font-bold ${color.text}`}>{item.value}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-surface-container-lowest overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.value}%`, background: color.bar }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
