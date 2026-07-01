import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { SpeechSchema } from '../../src/shared/schemas/agentOutputs';

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

const { createRivalAgentA } = await import('../../src/server/agents/rivalAgentA');

describe('createRivalAgentA', () => {
  test('creates an agent with the correct name and no handoffs', async () => {
    await createRivalAgentA({
      debateId: 'debate-1',
      speakerId: 'speaker-1',
      speakerRole: 'pro1',
      side: 'Proponent',
      topic: 'Resolved: tests matter.',
      phase: 'constructive',
      rigor: 5,
      context: 'Prior round context.',
    });

    expect(createdAgents).toHaveLength(1);
    const config = createdAgents[0] as Record<string, unknown>;
    expect(config.name).toBe('Rival Agent A');
    expect(config.handoffs).toEqual([]);
  });

  test('attaches the SpeechSchema as outputType', async () => {
    await createRivalAgentA({
      debateId: 'debate-1',
      speakerId: 'speaker-1',
      speakerRole: 'pro1',
      side: 'Proponent',
      topic: 'Resolved: schemas matter.',
      phase: 'constructive',
      rigor: 5,
      context: '',
    });

    const config = createdAgents[0] as Record<string, unknown>;
    expect(config.outputType).toBe(SpeechSchema);
  });

  test('attaches rival tools and uses run_llm_again behavior', async () => {
    await createRivalAgentA({
      debateId: 'debate-1',
      speakerId: 'speaker-1',
      speakerRole: 'pro1',
      side: 'Proponent',
      topic: 'Resolved: tools matter.',
      phase: 'constructive',
      rigor: 5,
      context: '',
    });

    const config = createdAgents[0] as Record<string, unknown>;
    expect(Array.isArray(config.tools)).toBe(true);
    expect((config.tools as { name: string }[]).length).toBeGreaterThan(0);
    expect((config.tools as { name: string }[]).map((tool) => tool.name)).toContain('calculator_evaluate');
    expect((config.tools as { name: string }[]).map((tool) => tool.name)).toContain('evidence_record');
    expect((config.tools as { name: string }[]).map((tool) => tool.name)).toContain('search_evidence');
    expect(config.toolUseBehavior).toBe('run_llm_again');
  });

  test('attaches input and output guardrails', async () => {
    await createRivalAgentA({
      debateId: 'debate-1',
      speakerId: 'speaker-1',
      speakerRole: 'pro1',
      side: 'Proponent',
      topic: 'Resolved: guardrails matter.',
      phase: 'constructive',
      rigor: 5,
      context: '',
    });

    const config = createdAgents[0] as Record<string, unknown>;
    expect(Array.isArray(config.inputGuardrails)).toBe(true);
    expect(Array.isArray(config.outputGuardrails)).toBe(true);
    expect((config.inputGuardrails as { name: string }[])[0].name).toBe('debate_input_safety');
    expect((config.outputGuardrails as { name: string }[])[0].name).toBe('debate_output_quality');
  });

  test('interpolates prompt placeholders', async () => {
    await createRivalAgentA({
      debateId: 'debate-1',
      speakerId: 'speaker-1',
      speakerRole: 'pro1',
      side: 'Proponent',
      topic: 'Resolved: placeholders matter.',
      phase: 'constructive',
      rigor: 7,
      context: 'Round context here.',
      allowedActions: ['speak', 'cite evidence'],
    });

    const config = createdAgents[0] as Record<string, unknown>;
    const instructions = config.instructions as string;
    expect(instructions).toContain('debate-1');
    expect(instructions).toContain('speaker-1');
    expect(instructions).toContain('pro1');
    expect(instructions).toContain('Proponent');
    expect(instructions).toContain('Resolved: placeholders matter.');
    expect(instructions).toContain('constructive');
    expect(instructions).toContain('7');
    expect(instructions).toContain('Round context here.');
    expect(instructions).toContain('speak, cite evidence');
  });

  test('throws when required config fields are missing', async () => {
    await expect(
      createRivalAgentA({
        debateId: '',
        speakerId: 'speaker-1',
        speakerRole: 'pro1',
        side: 'Proponent',
        topic: 'topic',
        phase: 'constructive',
        rigor: 5,
        context: '',
      }),
    ).rejects.toThrow('RivalAgentAConfig.debateId is required');
  });
});
