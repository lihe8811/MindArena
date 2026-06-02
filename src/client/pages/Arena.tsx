import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Route, Send, Timer, UserCircle2 } from 'lucide-react';
import type { ActiveDebate, DebateParticipant } from '@/shared/types';

interface ArenaProps {
  debate: ActiveDebate | null;
  onSendMessage: (content: string) => Promise<void>;
  isSending?: boolean;
}

function parseTimerLabel(label: string) {
  const [minutes = '0', seconds = '0'] = label.split(':');
  const parsedSeconds = Number(minutes) * 60 + Number(seconds);
  return Number.isFinite(parsedSeconds) ? parsedSeconds : 0;
}

function formatTimer(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const defaultParticipants: DebateParticipant[] = [
  { id: 'pro1', label: 'pro1', side: 'Proponent', speakerOrder: 1 },
  { id: 'pro2', label: 'pro2', side: 'Proponent', speakerOrder: 2 },
  { id: 'con1', label: 'con1', side: 'Opponent', speakerOrder: 1 },
  { id: 'con2', label: 'con2', side: 'Opponent', speakerOrder: 2 },
];

export function Arena({ debate, onSendMessage, isSending }: ArenaProps) {
  const [draft, setDraft] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const isDebateOpen = debate?.status === 'Ready' || debate?.status === 'In Progress';
  const participants = debate?.participants?.length === 4 ? debate.participants : defaultParticipants;
  const timerDisplay = useMemo(() => {
    if (!debate) return '00:00';
    if (!isDebateOpen) return debate.timerLabel;

    const totalSeconds = parseTimerLabel(debate.timerLabel);
    const elapsedSeconds = Math.floor((now - new Date(debate.createdAt).getTime()) / 1000);
    return formatTimer(totalSeconds - elapsedSeconds);
  }, [debate, isDebateOpen, now]);

  useEffect(() => {
    if (!isDebateOpen) return;

    setNow(Date.now());
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, [isDebateOpen, debate?.id]);

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
          <p className="mt-2 text-sm text-secondary">
            2v2 round: you are {debate.speakerRole ?? (debate.stance === 'Opponent' ? 'con1' : 'pro1')}
          </p>
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
            <span className="font-bold text-on-surface">{timerDisplay}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-on-surface">Teams</p>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">2v2</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {participants.map((participant) => {
              const isUserSide = participant.side === debate.stance;
              const isUserRole = participant.id === debate.speakerRole;
              return (
                <div
                  key={participant.id}
                  className={`rounded-xl border px-3 py-3 ${
                    isUserRole
                      ? 'border-primary bg-primary/15'
                      : isUserSide
                        ? 'border-primary/30 bg-primary/10'
                      : 'border-outline-variant bg-surface-container'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-black ${isUserSide ? 'text-primary' : 'text-on-surface'}`}>
                      {participant.label}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                      Speaker {participant.speakerOrder}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-secondary">
                    {participant.side === 'Proponent' ? 'Pro side' : 'Con side'}
                    {isUserRole ? ' - you' : isUserSide ? ' - your team' : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-on-surface">
            <Route className="w-4 h-4 text-primary" />
            Mock Workflow
          </div>
          <p className="mt-2 text-sm leading-6 text-secondary">
            Send an argument to record your turn, show the orchestration handoff, and receive a Rival Agent A mock rebuttal in the same transcript.
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
            const isAssistant = message.role === 'assistant';
            const iconClass = isUser ? 'text-primary' : isAssistant ? 'text-on-primary' : 'text-secondary';
            return (
              <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-2xl rounded-2xl border px-4 py-3 ${
                    isUser
                      ? 'bg-primary/10 border-primary/20'
                      : isAssistant
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface-container-low border-outline-variant'
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
                    {isAssistant ? (
                      <Bot className={`w-3.5 h-3.5 ${iconClass}`} />
                    ) : (
                      <UserCircle2 className={`w-3.5 h-3.5 ${iconClass}`} />
                    )}
                    <span
                      className={
                        isUser
                          ? 'text-primary font-black'
                          : isAssistant
                            ? 'text-on-primary font-black'
                            : 'text-secondary font-black'
                      }
                    >
                      {message.author}
                    </span>
                    <span className={isAssistant ? 'text-on-primary/75' : 'text-secondary'}>{message.time}</span>
                  </div>
                  <p className={`whitespace-pre-line text-sm leading-6 ${isAssistant ? 'text-on-primary' : 'text-on-surface'}`}>
                    {message.content}
                  </p>
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
              disabled={isSending || !isDebateOpen || timerDisplay === '00:00'}
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
