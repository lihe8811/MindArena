import React, { useMemo, useState } from 'react';
import { CirclePlay, Sparkles, Swords } from 'lucide-react';
import { getDebateRoleName, getUserPhasesForRole } from '@/shared/debatePhases';
import type { DebateParticipantId, DebateSetup } from '@/shared/types';

interface StartDebateProps {
  onCreateDebate: (payload: DebateSetup) => Promise<void>;
  isSubmitting?: boolean;
}

const prompts = [
  'Universities should require every student to take a formal logic course.',
  'Remote work should be the default for knowledge workers.',
  'Governments should regulate addictive recommendation algorithms.',
];

const speakerRoles: Array<{ id: DebateParticipantId; side: DebateSetup['stance']; label: string }> = [
  { id: 'pro1', side: 'Proponent', label: getDebateRoleName('pro1') },
  { id: 'pro2', side: 'Proponent', label: getDebateRoleName('pro2') },
  { id: 'con1', side: 'Opponent', label: getDebateRoleName('con1') },
  { id: 'con2', side: 'Opponent', label: getDebateRoleName('con2') },
];

function formatPhaseName(phase: string) {
  return phase
    .replace(/_(pro|con)$/, '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function StartDebate({ onCreateDebate, isSubmitting }: StartDebateProps) {
  const [topic, setTopic] = useState(prompts[0]);
  const [speakerRole, setSpeakerRole] = useState<DebateParticipantId>('pro1');
  const [rigor, setRigor] = useState(3);
  const [hoveredRole, setHoveredRole] = useState<DebateParticipantId | null>(null);
  const [focusedRole, setFocusedRole] = useState<DebateParticipantId | null>(null);

  const rigorLabel = useMemo(() => ['Warmup', 'Casual', 'Focused', 'Competitive', 'Tournament'][rigor - 1], [rigor]);
  const selectedRole = speakerRoles.find((role) => role.id === speakerRole) ?? speakerRoles[0];
  const [promptSpin, setPromptSpin] = useState(0);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-on-surface">Start A Debate</h2>
        <p className="mt-2 text-secondary">Pick the topic, your 2v2 role, and the rigor. The server will create the round and track the transcript.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_0.9fr] gap-6">
        <form
          className="rounded-3xl border border-outline-variant bg-surface-container p-8 space-y-8"
          onSubmit={async (event) => {
            event.preventDefault();
            await onCreateDebate({
              topic,
              stance: selectedRole.side,
              speakerRole,
              rigor,
            });
          }}
        >
          <div>
            <label className="block text-sm font-semibold text-secondary mb-3">Debate Topic</label>
            <textarea
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="w-full min-h-40 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 text-on-surface outline-none focus:border-primary"
              placeholder="State the proposition clearly."
            />
            <button
              type="button"
              onClick={() => {
                setTopic(prompts[(prompts.indexOf(topic) + 1 + prompts.length) % prompts.length] ?? prompts[0]);
                setPromptSpin((n) => n + 1);
              }}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-bold text-primary"
            >
              <Sparkles key={promptSpin} className={`w-4 h-4${promptSpin > 0 ? ' animate-spin-once' : ''}`} />
              Random Prompt
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-semibold text-secondary mb-3">Your Role</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 gap-3">
                {speakerRoles.map((option) => {
                  const tooltipId = `${option.id}-phases`;
                  const isTooltipVisible = hoveredRole === option.id || focusedRole === option.id;
                  return (
                    <div
                      key={option.id}
                      className="relative"
                      onMouseEnter={() => setHoveredRole(option.id)}
                      onMouseLeave={() => setHoveredRole(null)}
                    >
                      <button
                        type="button"
                        onClick={() => setSpeakerRole(option.id)}
                        onFocus={() => setFocusedRole(option.id)}
                        onBlur={() => setFocusedRole(null)}
                        aria-describedby={tooltipId}
                        className={`h-full w-full rounded-2xl border px-4 py-5 text-sm font-bold transition-all ${
                          speakerRole === option.id
                            ? 'border-primary bg-primary/10 text-on-surface'
                            : 'border-outline-variant bg-surface-container-low text-secondary'
                        }`}
                      >
                        <span className="block">{option.label}</span>
                        <span className="mt-1 block text-xs text-secondary">
                          {option.side === 'Proponent' ? 'Pro' : 'Con'}
                        </span>
                      </button>
                      <div
                        id={tooltipId}
                        role="tooltip"
                        aria-hidden={!isTooltipVisible}
                        className={`pointer-events-none absolute bottom-[calc(100%+0.75rem)] left-1/2 z-30 w-56 -translate-x-1/2 rounded-xl border border-outline-variant bg-on-surface px-4 py-3 text-left text-on-primary shadow-xl transition-opacity ${
                          isTooltipVisible ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        <p className="text-xs font-black uppercase tracking-wide text-on-primary/70">Your phases</p>
                        <ul className="mt-2 space-y-1 text-sm font-semibold">
                          {getUserPhasesForRole(option.id).map((phase) => (
                            <li key={phase}>{formatPhaseName(phase)}</li>
                          ))}
                        </ul>
                        <span className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-outline-variant bg-on-surface" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-secondary mb-3">Rigor</p>
              <input
                type="range"
                min="1"
                max="5"
                value={rigor}
                onChange={(event) => setRigor(Number(event.target.value))}
                className="w-full accent-primary"
              />
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-secondary">Level {rigor}</span>
                <span className="font-bold text-primary">{rigorLabel}</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            aria-label="Start debate"
            title="Start debate"
            className="w-full rounded-2xl bg-primary px-6 py-4 font-black text-on-primary transition-all hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <>
                <CirclePlay className="h-5 w-5" />
                Create Debate Room
              </>
            )}
          </button>
        </form>

        <section className="rounded-3xl border border-outline-variant bg-surface-container p-8">
          <div className="flex items-center gap-3">
            <Swords className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-on-surface">What This MVP Does</h3>
          </div>
          <div className="mt-6 space-y-3 text-sm text-secondary">
            <div className="rounded-xl bg-surface-container-low px-4 py-3">Creates debate sessions on the server.</div>
            <div className="rounded-xl bg-surface-container-low px-4 py-3">Persists transcripts, history, and resume state on disk.</div>
            <div className="rounded-xl bg-surface-container-low px-4 py-3">Sets the 2v2 speaker role before the round begins.</div>
          </div>
        </section>
      </div>
    </div>
  );
}
