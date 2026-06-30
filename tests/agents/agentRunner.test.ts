import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { ActiveDebate } from '../../src/shared/types';

const createdAgents: unknown[] = [];
const runCalls: { agent: unknown; input: string }[] = [];

mock.module('@openai/agents', () => ({
  Agent: class MockAgent {
    constructor(config: unknown) {
      createdAgents.push(config);
    }
  },
  run: async (agent: unknown, input: string) => {
    runCalls.push({ agent, input });
    return { finalOutput: 'Mock agent output' };
  },
}));

beforeEach(() => {
  createdAgents.length = 0;
  runCalls.length = 0;
});

const { DefaultAgentRunner } = await import('../../src/server/agents/agentRunner');

function makeDebate(overrides: Partial<ActiveDebate> = {}): ActiveDebate {
  return {
    id: 'debate-1',
    topic: 'Resolved: agent runner should map phases.',
    stance: 'Proponent',
    speakerRole: 'pro1',
    rigor: 5,
    stage: 'setup',
    timerLabel: '04:00',
    status: 'Ready',
    awaitingUserInput: false,
    messages: [],
    createdAt: '2026-06-10T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
    ...overrides,
  };
}

describe('DefaultAgentRunner', () => {
  test('runs Rival A for first-speaker opponent constructive phase', async () => {
    const runner = new DefaultAgentRunner();
    const result = await runner.runForPhase(makeDebate(), 'constructive_con');

    expect(result).not.toBeNull();
    expect(result?.author).toContain('First Speaker');
    expect(createdAgents).toHaveLength(1);
    const config = createdAgents[0] as Record<string, unknown>;
    expect(config.name).toBe('Rival Agent A');
    expect(config.instructions).toContain('Opponent');
  });

  test('runs Rival B for second-speaker opponent rebuttal phase', async () => {
    const runner = new DefaultAgentRunner();
    const result = await runner.runForPhase(makeDebate(), 'rebuttal_con');

    expect(result).not.toBeNull();
    expect(result?.author).toContain('Second Speaker');
    const config = createdAgents[0] as Record<string, unknown>;
    expect(config.name).toBe('Rival Agent B');
  });

  test('runs Teammate during the prep coaching window', async () => {
    const runner = new DefaultAgentRunner();
    const result = await runner.runForPhase(makeDebate(), 'student_prep_optional');

    expect(result).not.toBeNull();
    expect(result?.author).toBe('Teammate Coach');
    const config = createdAgents[0] as Record<string, unknown>;
    expect(config.name).toBe('Teammate Coach');
  });

  test('does not run any agent during the complete phase', async () => {
    const runner = new DefaultAgentRunner();
    const result = await runner.runForPhase(makeDebate(), 'complete');

    expect(result).toBeNull();
    expect(createdAgents).toHaveLength(0);
  });

  test('does not run judge phases (owned by Hallie)', async () => {
    const runner = new DefaultAgentRunner();
    const opening = await runner.runForPhase(makeDebate(), 'judge_opening');
    const deliberation = await runner.runForPhase(makeDebate(), 'judge_deliberation');
    const feedback = await runner.runForPhase(makeDebate(), 'judge_feedback');

    expect(opening).toBeNull();
    expect(deliberation).toBeNull();
    expect(feedback).toBeNull();
    expect(createdAgents).toHaveLength(0);
  });

  test('returns no handoffs on created rival agents', async () => {
    const runner = new DefaultAgentRunner();
    await runner.runForPhase(makeDebate(), 'constructive_con');

    const config = createdAgents[0] as Record<string, unknown>;
    expect(config.handoffs).toEqual([]);
  });

  test('parses structured speech output when returned as JSON string', async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'test-key';
    mock.module('@openai/agents', () => ({
      Agent: class MockAgent {
        constructor(config: unknown) {
          createdAgents.push(config);
        }
      },
      run: async () => ({
        finalOutput: JSON.stringify({
          content: 'Structured speech content.',
          citations: ['Smith 2024'],
          phase: 'constructive_con',
        }),
      }),
    }));

    const { DefaultAgentRunner: FreshRunner } = await import('../../src/server/agents/agentRunner');
    const runner = new FreshRunner();
    const result = await runner.runForPhase(makeDebate(), 'constructive_con');

    process.env.OPENAI_API_KEY = originalKey;
    expect(result?.content).toBe('Structured speech content.');
  });

  test('parses structured coaching output when returned as JSON string', async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'test-key';
    mock.module('@openai/agents', () => ({
      Agent: class MockAgent {
        constructor(config: unknown) {
          createdAgents.push(config);
        }
      },
      run: async () => ({
        finalOutput: JSON.stringify({
          suggestion: 'Use more evidence.',
          strategy: 'Attack the weakest contention.',
          improvements: ['Add citations', 'Tighten warrants'],
        }),
      }),
    }));

    const { DefaultAgentRunner: FreshRunner } = await import('../../src/server/agents/agentRunner');
    const runner = new FreshRunner();
    const result = await runner.runForPhase(makeDebate(), 'student_prep_optional');

    process.env.OPENAI_API_KEY = originalKey;
    expect(result?.content).toContain('Use more evidence.');
    expect(result?.content).toContain('Attack the weakest contention.');
  });
});
