import type { HistoryItem } from '@/shared/types';

function getStatusStyle(status: string): string {
  const s = status.toLowerCase();
  if (s === 'victory' || s === 'win' || s === 'won') return 'border-tertiary/40 bg-tertiary/10 text-tertiary';
  if (s === 'defeat' || s === 'loss' || s === 'lost') return 'border-error/30 bg-error/10 text-error';
  return 'border-outline-variant text-on-surface';
}

interface HistoryProps {
  items: HistoryItem[];
}

export function History({ items }: HistoryProps) {
  const victories = items.filter((item) => item.status === 'Victory').length;
  const defeats = items.filter((item) => item.status === 'Defeat').length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-on-surface">Debate History</h2>
          <p className="mt-2 text-secondary">A clean record of finished sessions and their outcomes.</p>
        </div>
        <div className="flex gap-4">
          <SummaryCard label="Victories" value={victories} tone="success" />
          <SummaryCard label="Defeats" value={defeats} tone="danger" />
        </div>
      </div>

      <div className="rounded-3xl border border-outline-variant bg-surface-container overflow-hidden">
        <div className="grid grid-cols-[2fr_120px_140px_120px_140px] gap-4 px-6 py-4 border-b border-outline-variant text-xs font-semibold text-secondary">
          <span>Topic</span>
          <span>Level</span>
          <span>Status</span>
          <span>Score</span>
          <span>Date</span>
        </div>
        <div className="divide-y divide-outline-variant">
          {items.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-semibold text-on-surface">The record book is empty</p>
              <p className="mt-2 text-sm text-secondary">Finish a debate and your result lands here with your score and outcome.</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="grid grid-cols-[2fr_120px_140px_120px_140px] gap-4 px-6 py-5 items-center">
                <div>
                  <p className="font-bold text-on-surface">{item.topic}</p>
                  <p className="text-sm text-secondary">{item.subject}</p>
                </div>
                <p className="text-sm text-secondary">LVL {item.level}</p>
                <span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${getStatusStyle(item.status)}`}>
                  {item.status}
                </span>
                <p className="font-bold text-on-surface">{item.score}/100</p>
                <p className="text-sm text-secondary">{item.date}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'success' | 'danger';
}) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container px-6 py-4 min-w-32">
      <p className={`text-3xl font-black ${tone === 'success' ? 'text-tertiary' : 'text-error'}`}>{value}</p>
      <p className="mt-1 text-xs font-medium text-secondary">{label}</p>
    </div>
  );
}
