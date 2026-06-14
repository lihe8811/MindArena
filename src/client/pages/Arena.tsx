import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Play, Route, Send, Swords, UserCircle2 } from 'lucide-react';
import { getDebateRoleName } from '@/shared/debatePhases';
import type { ActiveDebate, DebateParticipant } from '@/shared/types';

interface ArenaProps {
  debate: ActiveDebate | null;
  onSendMessage: (content: string) => Promise<void>;
  onStartDebate: () => Promise<void>;
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

function isMacPlatform() {
  if (typeof navigator === 'undefined') return false;
  const navigatorWithClientHints = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const platform =
    navigatorWithClientHints.userAgentData?.platform ||
    navigator.platform ||
    navigator.userAgent;
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

const defaultParticipants: DebateParticipant[] = [
  { id: 'pro1', label: getDebateRoleName('pro1'), side: 'Proponent', speakerOrder: 1 },
  { id: 'pro2', label: getDebateRoleName('pro2'), side: 'Proponent', speakerOrder: 2 },
  { id: 'con1', label: getDebateRoleName('con1'), side: 'Opponent', speakerOrder: 1 },
  { id: 'con2', label: getDebateRoleName('con2'), side: 'Opponent', speakerOrder: 2 },
];

export function Arena({ debate, onSendMessage, onStartDebate, onTimerExpired, isSending }: ArenaProps) {
  const [draft, setDraft] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const expiredDebateId = useRef<string | null>(null);

  const isPrep = debate?.status === 'Prep';
  const isDebateOpen = debate?.status === 'Ready' || debate?.status === 'In Progress';
  const participants = debate?.participants?.length === 4 ? debate.participants : defaultParticipants;
  const speakerRole = debate?.speakerRole ?? (debate?.stance === 'Opponent' ? 'con1' : 'pro1');
  const speakerRoleName = getDebateRoleName(speakerRole);
  const usesCommandShortcut = isMacPlatform();
  const shortcutHint = usesCommandShortcut ? '⌘ + Enter' : 'Ctrl + Enter';
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
            2v2 round: you are {speakerRoleName}
          </p>
        </div>
        <div className="rounded-2xl bg-surface-container-low p-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-secondary">Phase</span>
            <span className="font-bold text-on-surface">{debate.stage}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-secondary">Rigor</span>
            <span className="font-bold text-on-surface">{debate.rigor}/5</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-secondary">Status</span>
            <span className={`font-bold ${isPrep ? 'text-tertiary' : 'text-primary'}`}>{debate.status}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-secondary">Timer</span>
            <span className={isUrgent ? 'font-bold text-error animate-urgent' : 'font-bold text-on-surface'}>
              {timerDisplay}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-on-surface">Teams</p>
            <span className="text-xs font-bold text-primary">2v2</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1.5 text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Your team
            </span>
            <span className="inline-flex items-center gap-1.5 text-sky-900">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              Rival
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {participants.map((participant) => {
              const isUserSide = participant.side === debate.stance;
              const isUserRole = participant.id === debate.speakerRole;
              return (
                <div
                  key={participant.id}
                  className={`min-w-0 overflow-hidden rounded-xl border px-3 py-3 ${
                    isUserRole
                      ? 'border-primary bg-primary/15'
                      : isUserSide
                        ? 'border-primary/30 bg-primary/10'
                        : 'border-sky-300 bg-sky-50'
                  }`}
                >
                  <span
                    className={`block whitespace-normal text-sm font-black leading-5 ${
                      isUserSide ? 'text-primary' : 'text-sky-900'
                    }`}
                  >
                    {participant.label}
                  </span>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className={`text-xs ${isUserSide ? 'text-secondary' : 'text-sky-800'}`}>
                      {isUserRole ? 'You' : isUserSide ? 'Teammate' : 'Opponent'}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${
                        isUserSide
                          ? 'bg-primary/15 text-primary'
                          : 'bg-sky-100 text-sky-900'
                      }`}
                    >
                      S{participant.speakerOrder}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-on-surface">
            <Route className="w-4 h-4 text-primary" />
            Phase Orchestration
          </div>
          <p className="mt-2 text-sm leading-6 text-secondary">
            {debate.awaitingUserInput
              ? `Your turn as ${speakerRoleName}. Submit a message to advance to the next phase.`
              : 'Automatic phase markers are being recorded in the transcript.'}
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

        {isPrep ? (
          <div className="border-t border-outline-variant p-6 flex flex-col items-center justify-center gap-4 bg-surface-container-low/50">
            <div className="text-center">
              <p className="text-sm font-bold text-on-surface">Prep Time</p>
              <p className="text-xs text-secondary mt-1">Review the topic and click Start when you are ready.</p>
            </div>
            <button
              type="button"
              onClick={() => void onStartDebate()}
              disabled={isSending}
              className="flex items-center gap-2 rounded-2xl bg-tertiary px-6 py-3 text-on-tertiary font-bold disabled:opacity-60"
            >
              <Play className="w-5 h-5" />
              Start Debate
            </button>
          </div>
        ) : (
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
          <div className="relative">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                const usesPlatformModifier = usesCommandShortcut ? event.metaKey : event.ctrlKey;
                if (event.key !== 'Enter' || !usesPlatformModifier) return;

                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }}
              disabled={!debate.awaitingUserInput || !isDebateOpen || timerDisplay === '00:00'}
              placeholder={
                debate.awaitingUserInput
                  ? `Write your response as ${speakerRoleName}...`
                  : 'Waiting for your next assigned phase...'
              }
              className="min-h-28 w-full resize-none rounded-2xl border border-outline-variant bg-surface-container-low px-4 pb-16 pt-3 text-on-surface outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={isSending || !isDebateOpen || !debate.awaitingUserInput || timerDisplay === '00:00'}
              aria-label={`Send message (${shortcutHint})`}
              title={`Send message (${shortcutHint})`}
              className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-on-primary shadow-sm disabled:opacity-60"
            >
              <Send className="w-5 h-5" />
              <span className="text-xs font-bold">{shortcutHint}</span>
            </button>
          </div>
          </form>
        )}
      </section>
    </div>
  );
}
