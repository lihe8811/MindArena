import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { CoachingSchema } from '../../src/shared/schemas/agentOutputs';

const createdAgents: unknown[] = [];

mock.module('@openai/agents', () => ({
  Agent: class MockAgent {
    constructor(config: unknown) {
      createdAgents.push(config);
    }
  },
}));

beforeEach(() => {
  createdAgents.length = 0;
});

const { createTeammateAgent, buildMockTeammateResponse } = await import('../../src/server/agents/teammateAgent');

describe('createTeammateAgent', () => {
  test('creates an agent with the correct name and no handoffs', async () => {
    await createTeammateAgent({
      debateId: 'debate-3',
      studentId: 'student-1',
      side: 'Proponent',
      topic: 'Resolved: coaching matters.',
      phase: 'prep',
      context: 'Debate context.',
      performanceContext: 'Student is strong on logic.',
    });

    expect(createdAgents).toHaveLength(1);
    const config = createdAgents[0] as Record<string, unknown>;
    expect(config.name).toBe('Teammate Coach');
    expect(config.handoffs).toEqual([]);
  });

  test('attaches the CoachingSchema as outputType', async () => {
    await createTeammateAgent({
      debateId: 'debate-3',
      studentId: 'student-1',
      side: 'Proponent',
      topic: 'Resolved: schemas matter.',
      phase: 'prep',
      context: '',
      performanceContext: '',
    });

    const config = createdAgents[0] as Record<string, unknown>;
    expect(config.outputType).toBe(CoachingSchema);
  });

  test('attaches teammate tools and uses run_llm_again behavior', async () => {
    await createTeammateAgent({
      debateId: 'debate-3',
      studentId: 'student-1',
      side: 'Proponent',
      topic: 'Resolved: tools matter.',
      phase: 'prep',
      context: '',
      performanceContext: '',
    });

    const config = createdAgents[0] as Record<string, unknown>;
    expect(Array.isArray(config.tools)).toBe(true);
    const toolNames = (config.tools as { name: string }[]).map((tool) => tool.name);
    expect(toolNames).toContain('calculator_evaluate');
    expect(toolNames).toContain('evidence_check_citation');
    expect(toolNames).toContain('search_evidence');
    expect(toolNames).not.toContain('evidence_record');
    expect(config.toolUseBehavior).toBe('run_llm_again');
  });

  test('attaches input and output guardrails', async () => {
    await createTeammateAgent({
      debateId: 'debate-3',
      studentId: 'student-1',
      side: 'Proponent',
      topic: 'Resolved: guardrails matter.',
      phase: 'prep',
      context: '',
      performanceContext: '',
    });

    const config = createdAgents[0] as Record<string, unknown>;
    expect(Array.isArray(config.inputGuardrails)).toBe(true);
    expect(Array.isArray(config.outputGuardrails)).toBe(true);
    expect((config.inputGuardrails as { name: string }[])[0].name).toBe('debate_input_safety');
    expect((config.outputGuardrails as { name: string }[])[0].name).toBe('debate_output_quality');
  });

  test('interpolates prompt placeholders', async () => {
    await createTeammateAgent({
      debateId: 'debate-3',
      studentId: 'student-1',
      side: 'Proponent',
      topic: 'Resolved: placeholders matter.',
      phase: 'prep',
      context: 'Debate context.',
      performanceContext: 'Student needs evidence work.',
      allowedActions: ['suggest frameworks', 'review citations'],
    });

    const config = createdAgents[0] as Record<string, unknown>;
    const instructions = config.instructions as string;
    expect(instructions).toContain('debate-3');
    expect(instructions).toContain('student-1');
    expect(instructions).toContain('Proponent');
    expect(instructions).toContain('Resolved: placeholders matter.');
    expect(instructions).toContain('prep');
    expect(instructions).toContain('Debate context.');
    expect(instructions).toContain('Student needs evidence work.');
    expect(instructions).toContain('suggest frameworks, review citations');
  });

  test('throws when required config fields are missing', async () => {
    await expect(
      createTeammateAgent({
        debateId: 'debate-3',
        studentId: '',
        side: 'Proponent',
        topic: 'topic',
        phase: 'prep',
        context: '',
        performanceContext: '',
      }),
    ).rejects.toThrow('TeammateAgentConfig.studentId is required');
  });
});

describe('buildMockTeammateResponse', () => {
  test('returns a formatted mock coaching response', () => {
    const response = buildMockTeammateResponse({
      side: 'Opponent',
      topic: 'Resolved: mocks matter.',
      phase: 'crossfire_break',
      context: 'Context.',
      performanceContext: 'Performance context.',
    });

    expect(response).toContain('Mock Teammate Coach (Opponent)');
    expect(response).toContain('Phase: crossfire_break');
    expect(response).toContain('Resolved: mocks matter.');
    expect(response).toContain('Performance Note: Performance context.');
  });
});
