import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Route, Send, Swords, Timer, UserCircle2, MessageSquareQuote } from 'lucide-react';
import type { ActiveDebate, DebateParticipant } from '@/shared/types';

interface ArenaProps {
  debate: ActiveDebate | null;
  onSendMessage: (content: string) => Promise<void>;
  onRequestCoaching?: () => Promise<string>;
  onTimerExpired?: () => Promise<void>;
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

export function Arena({ debate, onSendMessage, onRequestCoaching, onTimerExpired, isSending }: ArenaProps) {
  const [draft, setDraft] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [coaching, setCoaching] = useState<string | null>(null);
  const [isCoaching, setIsCoaching] = useState(false);
  const expiredDebateId = useRef<string | null>(null);

  const isDebateOpen = debate?.status === 'Ready' || debate?.status === 'In Progress';
  const participants = debate?.participants?.length === 4 ? debate.participants : defaultParticipants;
  const timerDisplay = useMemo(() => {
    if (!debate) return '00:00';
    if (!isDebateOpen) return debate.timerLabel;

    const totalSeconds = parseTimerLabel(debate.timerLabel);
    const elapsedSeconds = Math.floor((now - new Date(debate.createdAt).getTime()) / 1000);
    return formatTimer(totalSeconds - elapsedSeconds);
  }, [debate, isDebateOpen, now]);

  const isUrgent = useMemo(() => {
    if (!isDebateOpen) return false;
    const [mm = '0', ss = '0'] = timerDisplay.split(':');
    return Number(mm) * 60 + Number(ss) <= 30;
  }, [timerDisplay, isDebateOpen]);

  useEffect(() => {
    if (!isDebateOpen) return;

    setNow(Date.now());
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, [isDebateOpen, debate?.id]);

  useEffect(() => {
    if (!debate || !isDebateOpen || timerDisplay !== '00:00' || !onTimerExpired) return;
    if (expiredDebateId.current === debate.id) return;

    expiredDebateId.current = debate.id;
    void onTimerExpired();
  }, [debate, isDebateOpen, onTimerExpired, timerDisplay]);

  if (!debate) {
    return (
      <div className="rounded-3xl border border-outline-variant bg-surface-container p-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
          <Swords className="w-6 h-6 text-primary" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-on-surface">Arena is empty</h2>
        <p className="mt-3 text-secondary max-w-xs mx-auto">Head to Start Debate to pick a topic and open a round. Your live transcript will show up here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6 h-[calc(100vh-110px)]">
      <section className="rounded-3xl border border-outline-variant bg-surface-container p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">{debate.topic}</h2>
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
            <span className={isUrgent ? 'font-bold text-error animate-urgent' : 'font-bold text-on-surface'}>
              {timerDisplay}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-on-surface">Teams</p>
            <span className="text-xs font-bold text-primary">2v2</span>
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
                    <span className="text-xs text-secondary">
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

        {onRequestCoaching && (
          <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-on-surface">
              <MessageSquareQuote className="w-4 h-4 text-primary" />
              Teammate Coach
            </div>
            <button
              type="button"
              disabled={isCoaching || !isDebateOpen}
              onClick={async () => {
                setIsCoaching(true);
                setCoaching(null);
                try {
                  const advice = await onRequestCoaching();
                  setCoaching(advice);
                } catch {
                  setCoaching('Unable to reach teammate coach right now.');
                } finally {
                  setIsCoaching(false);
                }
              }}
              className="w-full rounded-xl bg-primary/10 border border-primary/20 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
            >
              {isCoaching ? 'Coaching...' : 'Request Coaching'}
            </button>
            {coaching && (
              <div className="rounded-xl bg-tertiary/10 border border-tertiary/20 px-3 py-2 text-sm text-on-surface whitespace-pre-line">
                {coaching}
              </div>
            )}
          </div>
        )}
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
                  <div className="mb-2 flex items-center gap-2 text-xs">
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
