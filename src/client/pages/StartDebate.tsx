import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Swords } from 'lucide-react';
import type { DebateSetup, KnowledgeDocument } from '@/shared/types';

interface StartDebateProps {
  onCreateDebate: (payload: DebateSetup) => Promise<void>;
  isSubmitting?: boolean;
  knowledgeDocuments: KnowledgeDocument[];
  defaultStance?: DebateSetup['stance'];
  defaultRigor?: number;
  autoOpenArena?: boolean;
  onOpenKnowledgeBase?: () => void;
}

const prompts = [
  'Universities should require every student to take a formal logic course.',
  'Remote work should be the default for knowledge workers.',
  'Governments should regulate addictive recommendation algorithms.',
];

export function StartDebate({
  onCreateDebate,
  isSubmitting,
  knowledgeDocuments,
  defaultStance = 'Proponent',
  defaultRigor = 3,
  autoOpenArena = true,
  onOpenKnowledgeBase,
}: StartDebateProps) {
  const [topic, setTopic] = useState(prompts[0]);
  const [stance, setStance] = useState<DebateSetup['stance']>(defaultStance);
  const [rigor, setRigor] = useState(defaultRigor);
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<string[]>([]);

  const rigorLabel = useMemo(() => ['Warmup', 'Casual', 'Focused', 'Competitive', 'Tournament'][rigor - 1], [rigor]);
  const selectedKnowledge = useMemo(
    () => knowledgeDocuments.filter((document) => selectedKnowledgeIds.includes(document.id)),
    [knowledgeDocuments, selectedKnowledgeIds],
  );

  useEffect(() => {
    setStance(defaultStance);
  }, [defaultStance]);

  useEffect(() => {
    setRigor(defaultRigor);
  }, [defaultRigor]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-on-surface">Start A Debate</h2>
        <p className="mt-2 text-secondary">Pick the topic, your side, and the rigor. The server will create the round and track the transcript.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_0.9fr] gap-6">
        <form
          className="rounded-3xl border border-outline-variant bg-surface-container p-8 space-y-8"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!topic.trim()) return;
            await onCreateDebate({ topic, stance, rigor, knowledgeDocumentIds: selectedKnowledgeIds });
          }}
        >
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-secondary mb-3">Debate Topic</label>
            <textarea
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="w-full min-h-40 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 text-on-surface outline-none focus:border-primary"
              placeholder="State the proposition clearly."
            />
            <button
              type="button"
              onClick={() => setTopic(prompts[(prompts.indexOf(topic) + 1 + prompts.length) % prompts.length] ?? prompts[0])}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-bold text-primary"
            >
              <Sparkles className="w-4 h-4" />
              Random Prompt
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary mb-3">Your Role</p>
              <div className="grid grid-cols-2 gap-3">
                {(['Proponent', 'Opponent'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setStance(option)}
                    className={`rounded-2xl border px-4 py-5 text-sm font-bold transition-all ${
                      stance === option
                        ? 'border-primary bg-primary/10 text-on-surface'
                        : 'border-outline-variant bg-surface-container-low text-secondary'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary mb-3">Rigor</p>
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

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary mb-3">Knowledge Context</p>
            {knowledgeDocuments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-5 text-sm text-secondary">
                <p>No indexed documents yet. Add rules or files in the Knowledge Base to give future AI rounds structured context.</p>
                {onOpenKnowledgeBase ? (
                  <button
                    type="button"
                    onClick={onOpenKnowledgeBase}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-bold text-primary"
                  >
                    Open Knowledge Base
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl bg-surface-container-low px-4 py-3 text-sm text-secondary">
                  {selectedKnowledge.length > 0
                    ? `Using ${selectedKnowledge.length} document${selectedKnowledge.length === 1 ? '' : 's'} as debate context.`
                    : 'No knowledge selected yet. Pick one or more indexed documents to attach them to this debate.'}
                </div>
                <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                  {knowledgeDocuments.map((document) => {
                  const selected = selectedKnowledgeIds.includes(document.id);
                  return (
                    <button
                      key={document.id}
                      type="button"
                      onClick={() =>
                        setSelectedKnowledgeIds((current) =>
                          current.includes(document.id)
                            ? current.filter((id) => id !== document.id)
                            : [...current, document.id],
                        )
                      }
                      className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                        selected
                          ? 'border-primary bg-primary/10'
                          : 'border-outline-variant bg-surface-container-low'
                      }`}
                    >
                      <p className="text-sm font-bold text-on-surface">{document.title}</p>
                      <p className="mt-1 text-xs text-secondary">
                        {document.category} • {document.chunkCount} chunks
                      </p>
                      {selected ? (
                        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">Attached</p>
                      ) : null}
                    </button>
                  );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-primary px-6 py-4 font-black text-on-primary transition-all hover:brightness-110 disabled:opacity-60"
          >
            {isSubmitting ? 'Creating Debate...' : 'Create Debate Room'}
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
            <div className="rounded-xl bg-surface-container-low px-4 py-3">Lets you attach indexed knowledge before the AI layer is wired in.</div>
            <div className="rounded-xl bg-surface-container-low px-4 py-3">
              {autoOpenArena
                ? 'Opens the live arena immediately after creation based on your saved settings.'
                : 'Returns to the dashboard after creation so you can keep preparing before entering the arena.'}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
