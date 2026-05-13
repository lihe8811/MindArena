import React, { useState } from 'react';
import { Send, Timer, UserCircle2 } from 'lucide-react';
import type { ActiveDebate } from '@/shared/types';

interface ArenaProps {
  debate: ActiveDebate | null;
  onSendMessage: (content: string) => Promise<void>;
  isSending?: boolean;
}

export function Arena({ debate, onSendMessage, isSending }: ArenaProps) {
  const [draft, setDraft] = useState('');

  if (!debate) {
    return (
      <div className="rounded-3xl border border-outline-variant bg-surface-container p-10 text-center">
        <h2 className="text-2xl font-bold text-on-surface">No active debate</h2>
        <p className="mt-3 text-secondary">Create a debate from the setup page to begin tracking arguments here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6 h-[calc(100vh-110px)]">
      <section className="rounded-3xl border border-outline-variant bg-surface-container p-6 space-y-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-black">Live Arena</p>
          <h2 className="mt-3 text-2xl font-bold text-on-surface">{debate.topic}</h2>
          <p className="mt-2 text-sm text-secondary">Arguing as the {debate.stance.toLowerCase()} side</p>
        </div>
        <div className="rounded-2xl bg-surface-container-low p-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-secondary">Stage</span>
            <span className="font-bold text-on-surface">{debate.stage}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-secondary">Rigor</span>
            <span className="font-bold text-on-surface">{debate.rigor}/5</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-secondary">Status</span>
            <span className="font-bold text-primary">{debate.status}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-secondary">Timer</span>
            <span className="font-bold text-on-surface">{debate.timerLabel}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-on-surface">
            <Timer className="w-4 h-4 text-primary" />
            AI Ready Later
          </div>
          <p className="mt-2 text-sm text-secondary">
            The app now persists your arguments, attached knowledge, and moderator notes. AI rebuttal logic can plug into the same thread later.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-outline-variant bg-surface-container overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-on-surface">Transcript</p>
            <p className="text-xs text-secondary">Messages are persisted by the Express server</p>
          </div>
          <span className="rounded-full border border-outline-variant px-3 py-1 text-xs font-bold text-primary">
            {debate.messages.length} entries
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {debate.messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-2xl rounded-2xl border px-4 py-3 ${isUser ? 'bg-primary/10 border-primary/20' : 'bg-surface-container-low border-outline-variant'}`}>
                  <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
                    <UserCircle2 className={`w-3.5 h-3.5 ${isUser ? 'text-primary' : 'text-secondary'}`} />
                    <span className={isUser ? 'text-primary font-black' : 'text-secondary font-black'}>
                      {message.author}
                    </span>
                    <span className="text-secondary">{message.time}</span>
                  </div>
                  <p className="text-sm leading-6 text-on-surface">{message.content}</p>
                </div>
              </div>
            );
          })}
        </div>

        <form
          className="border-t border-outline-variant p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const trimmed = draft.trim();
            if (!trimmed) return;
            await onSendMessage(trimmed);
            setDraft('');
          }}
        >
          <div className="flex gap-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write your next argument..."
              className="min-h-24 flex-1 rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-on-surface outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={isSending || debate.status === 'Completed'}
              className="self-end rounded-2xl bg-primary p-4 text-on-primary disabled:opacity-60"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
