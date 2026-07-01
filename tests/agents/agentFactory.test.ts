import { beforeEach, describe, expect, mock, test } from 'bun:test';

const createdAgents: unknown[] = [];

mock.module('@openai/agents', () => ({
  Agent: class MockAgent {
    constructor(config: unknown) {
      createdAgents.push(config);
    }
  },
  run: async (_agent: unknown, _input: string) => ({ finalOutput: 'mock output' }),
}));

beforeEach(() => {
  createdAgents.length = 0;
});

const { AgentFactory } = await import('../../src/server/agents/agentFactory');

const baseRivalConfig = {
  debateId: 'debate-1',
  speakerId: 'speaker-1',
  speakerRole: 'pro1',
  side: 'Proponent' as const,
  topic: 'Resolved: factories matter.',
  phase: 'constructive',
  rigor: 5,
  context: '',
};

const baseTeammateConfig = {
  debateId: 'debate-1',
  studentId: 'student-1',
  side: 'Proponent' as const,
  topic: 'Resolved: factories matter.',
  phase: 'prep',
  context: '',
  performanceContext: '',
};

describe('AgentFactory', () => {
  test('creates Rival A with correct name', async () => {
    await AgentFactory.createAgent('RivalA', baseRivalConfig);
    expect(createdAgents).toHaveLength(1);
    expect((createdAgents[0] as Record<string, unknown>).name).toBe('Rival Agent A');
  });

  test('creates Rival B with correct name', async () => {
    await AgentFactory.createAgent('RivalB', baseRivalConfig);
    expect(createdAgents).toHaveLength(1);
    expect((createdAgents[0] as Record<string, unknown>).name).toBe('Rival Agent B');
  });

  test('creates Teammate with correct name', async () => {
    await AgentFactory.createAgent('Teammate', baseTeammateConfig);
    expect(createdAgents).toHaveLength(1);
    expect((createdAgents[0] as Record<string, unknown>).name).toBe('Teammate Coach');
  });

  test('all created agents have empty handoffs', async () => {
    await AgentFactory.createAgent('RivalA', baseRivalConfig);
    await AgentFactory.createAgent('RivalB', baseRivalConfig);
    await AgentFactory.createAgent('Teammate', baseTeammateConfig);

    for (const agentConfig of createdAgents) {
      expect((agentConfig as Record<string, unknown>).handoffs).toEqual([]);
    }
  });

  test('throws for unknown agent type', async () => {
    // @ts-expect-error testing invalid agent type
    await expect(AgentFactory.createAgent('Unknown', baseRivalConfig)).rejects.toThrow(
      'Unknown agent type: Unknown',
    );
  });
});
