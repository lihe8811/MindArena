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

const { createRivalAgentB } = await import('../../src/server/agents/rivalAgentB');

describe('createRivalAgentB', () => {
  test('creates an agent with the correct name and no handoffs', async () => {
    await createRivalAgentB({
      debateId: 'debate-2',
      speakerId: 'speaker-2',
      speakerRole: 'con1',
      side: 'Opponent',
      topic: 'Resolved: tests matter.',
      phase: 'rebuttal',
      rigor: 8,
      context: 'Prior round context.',
    });

    expect(createdAgents).toHaveLength(1);
    const config = createdAgents[0] as Record<string, unknown>;
    expect(config.name).toBe('Rival Agent B');
    expect(config.handoffs).toEqual([]);
  });

  test('attaches the SpeechSchema as outputType', async () => {
    await createRivalAgentB({
      debateId: 'debate-2',
      speakerId: 'speaker-2',
      speakerRole: 'con1',
      side: 'Opponent',
      topic: 'Resolved: schemas matter.',
      phase: 'rebuttal',
      rigor: 8,
      context: '',
    });

    const config = createdAgents[0] as Record<string, unknown>;
    expect(config.outputType).toBe(SpeechSchema);
  });

  test('attaches rival tools and uses run_llm_again behavior', async () => {
    await createRivalAgentB({
      debateId: 'debate-2',
      speakerId: 'speaker-2',
      speakerRole: 'con1',
      side: 'Opponent',
      topic: 'Resolved: tools matter.',
      phase: 'rebuttal',
      rigor: 8,
      context: '',
    });

    const config = createdAgents[0] as Record<string, unknown>;
    expect(Array.isArray(config.tools)).toBe(true);
    expect((config.tools as { name: string }[]).length).toBeGreaterThan(0);
    expect((config.tools as { name: string }[]).map((tool) => tool.name)).toContain('calculator_compare');
    expect((config.tools as { name: string }[]).map((tool) => tool.name)).toContain('evidence_get_debate');
    expect((config.tools as { name: string }[]).map((tool) => tool.name)).toContain('search_rebuttal');
    expect(config.toolUseBehavior).toBe('run_llm_again');
  });

  test('attaches input and output guardrails', async () => {
    await createRivalAgentB({
      debateId: 'debate-2',
      speakerId: 'speaker-2',
      speakerRole: 'con1',
      side: 'Opponent',
      topic: 'Resolved: guardrails matter.',
      phase: 'rebuttal',
      rigor: 8,
      context: '',
    });

    const config = createdAgents[0] as Record<string, unknown>;
    expect(Array.isArray(config.inputGuardrails)).toBe(true);
    expect(Array.isArray(config.outputGuardrails)).toBe(true);
    expect((config.inputGuardrails as { name: string }[])[0].name).toBe('debate_input_safety');
    expect((config.outputGuardrails as { name: string }[])[0].name).toBe('debate_output_quality');
  });

  test('interpolates prompt placeholders', async () => {
    await createRivalAgentB({
      debateId: 'debate-2',
      speakerId: 'speaker-2',
      speakerRole: 'con1',
      side: 'Opponent',
      topic: 'Resolved: placeholders matter.',
      phase: 'rebuttal',
      rigor: 9,
      context: 'Round context here.',
      allowedActions: ['rebut', 'demand evidence'],
    });

    const config = createdAgents[0] as Record<string, unknown>;
    const instructions = config.instructions as string;
    expect(instructions).toContain('debate-2');
    expect(instructions).toContain('speaker-2');
    expect(instructions).toContain('con1');
    expect(instructions).toContain('Opponent');
    expect(instructions).toContain('Resolved: placeholders matter.');
    expect(instructions).toContain('rebuttal');
    expect(instructions).toContain('9');
    expect(instructions).toContain('Round context here.');
    expect(instructions).toContain('rebut, demand evidence');
  });

  test('throws when required config fields are missing', async () => {
    await expect(
      createRivalAgentB({
        debateId: 'debate-2',
        speakerId: '',
        speakerRole: 'con1',
        side: 'Opponent',
        topic: 'topic',
        phase: 'rebuttal',
        rigor: 8,
        context: '',
      }),
    ).rejects.toThrow('RivalAgentBConfig.speakerId is required');
  });
});
