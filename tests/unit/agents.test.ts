import { describe, expect, test } from 'bun:test';
import { AgentFactory } from '../../src/server/agents/agentFactory.ts';
import { Agent } from '@openai/agents';

describe('Agent Factory', () => {
  const mockConfig = {
    side: 'Proponent' as const,
    topic: 'AI in Education',
    phase: 'Constructive',
    rigor: 5,
    context: 'Test context for debate',
    performanceContext: 'Student is doing well on logic but needs evidence work',
  };

  test('should create Rival Agent A', async () => {
    const agent = await AgentFactory.createAgent('RivalA', mockConfig);
    expect(agent).toBeInstanceOf(Agent);
    expect(agent.name).toBe('Rival Agent A');
    expect(agent.handoffs).toEqual([]);
  });

  test('should create Rival Agent B', async () => {
    const agent = await AgentFactory.createAgent('RivalB', mockConfig);
    expect(agent).toBeInstanceOf(Agent);
    expect(agent.name).toBe('Rival Agent B');
    expect(agent.handoffs).toEqual([]);
  });

  test('should create Teammate Coach', async () => {
    const agent = await AgentFactory.createAgent('Teammate', mockConfig);
    expect(agent).toBeInstanceOf(Agent);
    expect(agent.name).toBe('Teammate Coach');
    expect(agent.handoffs).toEqual([]);
  });

  test('should throw error for unknown agent type', async () => {
    try {
      await AgentFactory.createAgent('Judge' as any, mockConfig);
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.message).toContain('Unknown agent type');
    }
  });

  test('Rival A instructions should contain side and topic', async () => {
    const agent = await AgentFactory.createAgent('RivalA', mockConfig);
    expect(agent.instructions).toContain('Proponent');
    expect(agent.instructions).toContain('AI in Education');
  });

  test('Rival B instructions should contain side and topic', async () => {
    const agent = await AgentFactory.createAgent('RivalB', mockConfig);
    expect(agent.instructions).toContain('Proponent');
    expect(agent.instructions).toContain('AI in Education');
  });

  test('Teammate instructions should contain performance context', async () => {
    const agent = await AgentFactory.createAgent('Teammate', mockConfig);
    expect(agent.instructions).toContain('logic');
    expect(agent.instructions).toContain('evidence');
  });

  test('all agents should have no handoffs configured', async () => {
    const agents = await Promise.all([
      AgentFactory.createAgent('RivalA', mockConfig),
      AgentFactory.createAgent('RivalB', mockConfig),
      AgentFactory.createAgent('Teammate', mockConfig),
    ]);

    for (const agent of agents) {
      expect(agent.handoffs).toEqual([]);
    }
  });

  test('all agents should have outputGuardrails configured', async () => {
    const agents = await Promise.all([
      AgentFactory.createAgent('RivalA', mockConfig),
      AgentFactory.createAgent('RivalB', mockConfig),
      AgentFactory.createAgent('Teammate', mockConfig),
    ]);

    for (const agent of agents) {
      expect(agent.outputGuardrails).toBeDefined();
      expect(agent.outputGuardrails.length).toBeGreaterThan(0);
    }
  });
});
