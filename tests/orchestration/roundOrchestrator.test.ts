import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { phaseWaitsForUser, type DebatePhase } from '../../src/shared/debatePhases';
import type { ActiveDebate, DebateMessage } from '../../src/shared/types';

const mockState = {
  debate: null as ActiveDebate | null,
};

function appendMessage(
  debate: ActiveDebate,
  role: DebateMessage['role'],
  author: string,
  content: string,
) {
  debate.messages.push({
    id: `msg-${debate.messages.length + 1}`,
    role,
    author,
    time: '09:00 AM',
    content,
  });
}

mock.module('../../src/server/stores/appStore.ts', () => ({
  getActiveDebate: () => mockState.debate,
  enterDebatePhase: (_userId: string, phase: DebatePhase) => {
    const debate = mockState.debate!;
    debate.stage = phase;
    debate.awaitingUserInput = phaseWaitsForUser(phase, debate.speakerRole!);
    debate.status = phase === 'complete' ? 'Completed' : 'In Progress';
    appendMessage(debate, 'system', 'Moderator', `Phase: ${phase}`);
    return debate;
  },
  recordDebateUserInput: (_userId: string, content: string) => {
    const debate = mockState.debate!;
    if (!debate.awaitingUserInput) {
      throw new Error('The debate is not waiting for user input.');
    }
    appendMessage(debate, 'user', 'First Pro Speaker', content);
    debate.awaitingUserInput = false;
    return debate;
  },
}));

const { RoundOrchestrator } = await import('../../src/server/orchestration/roundOrchestrator');

beforeEach(() => {
  mockState.debate = {
    id: 'debate-1',
    topic: 'Resolved: orchestration should expose every phase.',
    stance: 'Proponent',
    speakerRole: 'pro1',
    rigor: 3,
    stage: 'setup',
    timerLabel: '04:00',
    status: 'Ready',
    awaitingUserInput: false,
    messages: [],
    createdAt: '2026-06-10T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
  };
});

describe('RoundOrchestrator', () => {
  test('prints automatic phases and pauses at the first user phase', () => {
    const debate = RoundOrchestrator.initializeRound('user-1');

    expect(debate.stage).toBe('constructive_pro');
    expect(debate.awaitingUserInput).toBe(true);
    expect(debate.messages.map((message) => message.content)).toEqual([
      'Phase: setup',
      'Phase: judge_opening',
      'Phase: student_prep_optional',
      'Phase: constructive_pro',
    ]);
    expect(debate.messages.some((message) => message.role === 'assistant')).toBe(false);
  });

  test('records user input then advances through automatic phases to crossfire', () => {
    RoundOrchestrator.initializeRound('user-1');

    const debate = RoundOrchestrator.processTurn('user-1', 'My constructive speech.');

    expect(debate.stage).toBe('crossfire_1');
    expect(debate.awaitingUserInput).toBe(true);
    expect(debate.messages.slice(-3).map((message) => message.content)).toEqual([
      'My constructive speech.',
      'Phase: constructive_con',
      'Phase: crossfire_1',
    ]);
    expect(debate.messages.some((message) => message.role === 'assistant')).toBe(false);
  });

  test('opponent users pause at con-side speeches', () => {
    mockState.debate!.stance = 'Opponent';
    mockState.debate!.speakerRole = 'con1';

    const debate = RoundOrchestrator.initializeRound('user-1');

    expect(debate.stage).toBe('constructive_con');
    expect(debate.messages.map((message) => message.content)).toContain('Phase: constructive_pro');
    expect(debate.awaitingUserInput).toBe(true);
  });

  test('second pro speaker skips first-speaker rows and pauses at rebuttal', () => {
    mockState.debate!.speakerRole = 'pro2';

    const debate = RoundOrchestrator.initializeRound('user-1');

    expect(debate.stage).toBe('rebuttal_pro');
    expect(debate.messages.map((message) => message.content)).toContain('Phase: crossfire_1');
    expect(debate.awaitingUserInput).toBe(true);
  });

  test('rejects input when the current phase is automatic', () => {
    mockState.debate!.stage = 'judge_opening';
    mockState.debate!.awaitingUserInput = false;
    mockState.debate!.status = 'In Progress';

    expect(() => RoundOrchestrator.processTurn('user-1', 'Too early')).toThrow(
      'The debate is not waiting for user input.',
    );
  });
});
