import { beforeEach, describe, expect, mock, test } from 'bun:test';

// Import original modules before mocking so leaked mocks still preserve all exports
import * as originalAppStore from '../../src/server/stores/appStore.ts';
import * as originalKnowledgeBaseStore from '../../src/server/stores/knowledgeBaseStore.ts';
import * as originalAgentFactory from '../../src/server/agents/agentFactory.ts';

const mockState = {
  appendedMessages: [] as Array<{ userId: string; author: string; content: string }>,
  activeDebate: {
    id: 'debate-1',
    topic: 'Resolved: recommendation algorithms should be regulated.',
    stance: 'Proponent' as const,
    speakerRole: 'pro1' as const,
    rigor: 4,
    stage: 'Constructive',
    messages: [
      {
        id: 'msg-system',
        role: 'system' as const,
        author: 'Moderator',
        time: '09:00 AM',
        content: 'Debate created.',
      },
    ] as Array<{ id: string; role: 'system' | 'user' | 'assistant'; author: string; time: string; content: string }>,
  },
  knowledgeResults: [
    {
      id: 'chunk-1',
      documentId: 'doc-1',
      documentTitle: 'Algorithm Harms',
      category: 'Evidence',
      sourceType: 'rule' as const,
      excerpt: 'Recommendation systems can amplify addictive usage loops.',
      score: 1,
    },
    {
      id: 'chunk-2',
      documentId: 'doc-2',
      documentTitle: 'Regulation Framework',
      category: 'Policy',
      sourceType: 'rule' as const,
      excerpt: 'Disclosure and audit requirements reduce asymmetric information.',
      score: 0.8,
    },
  ],
  searchCalls: [] as Array<{ userId: string; query: string; limit: number }>,
  agentConfigs: [] as unknown[],
  runPrompts: [] as string[],
  finalOutput: 'AI rebuttal grounded in the retrieved evidence.' as unknown,
};

mock.module('../../src/server/stores/appStore.ts', () => ({
  ...originalAppStore,
  appendDebateMessage: (userId: string, author: string, content: string, options?: { role?: string; moderatorNote?: string | false }) => {
    mockState.appendedMessages.push({ userId, author, content });
    const role = (options?.role ?? (author === 'Student' ? 'user' : author.includes('Agent') ? 'assistant' : 'system')) as 'system' | 'user' | 'assistant';
    mockState.activeDebate.messages.push({
      id: `msg-${mockState.appendedMessages.length}`,
      role,
      author,
      time: '09:01 AM',
      content,
    });
    if (options?.moderatorNote) {
      mockState.activeDebate.messages.push({
        id: `msg-mod-${mockState.appendedMessages.length}`,
        role: 'system',
        author: 'Moderator',
        time: '09:01 AM',
        content: options.moderatorNote,
      });
    }
    return {
      ...mockState.activeDebate,
      messages: [...mockState.activeDebate.messages],
    };
  },
  getActiveDebate: () => mockState.activeDebate,
}));

mock.module('../../src/server/stores/knowledgeBaseStore.ts', () => ({
  ...originalKnowledgeBaseStore,
  searchKnowledgeBase: (userId: string, query: string, limit: number) => {
    mockState.searchCalls.push({ userId, query, limit });
    return {
      query,
      total: mockState.knowledgeResults.length,
      results: mockState.knowledgeResults,
    };
  },
}));

mock.module('../../src/server/agents/agentFactory.ts', () => ({
  ...originalAgentFactory,
  AgentFactory: {
    createAgent: async (_agentName: string, config: unknown) => {
      mockState.agentConfigs.push(config);
      return { name: 'mock-rival-agent' };
    },
  },
}));

mock.module('@openai/agents', () => ({
  Agent: class MockAgent {
    name: string;
    constructor(options: { name?: string }) {
      this.name = options.name ?? 'mock-agent';
    }
  },
  run: async (_agent: unknown, prompt: string) => {
    mockState.runPrompts.push(prompt);
    return { finalOutput: mockState.finalOutput };
  },
}));

const { RoundOrchestrator } = await import('../../src/server/orchestration/roundOrchestrator');

beforeEach(() => {
  mockState.appendedMessages = [];
  mockState.searchCalls = [];
  mockState.agentConfigs = [];
  mockState.runPrompts = [];
  mockState.finalOutput = 'AI rebuttal grounded in the retrieved evidence.';
  process.env.OPENAI_API_KEY = 'test-key';
});

describe('RoundOrchestrator', () => {
  test('records the student turn before retrieving knowledge and running the rival agent', async () => {
    await RoundOrchestrator.processTurn('user-1', 'Algorithms optimize addiction.');

    expect(mockState.appendedMessages[0]).toEqual({
      userId: 'user-1',
      author: 'Student',
      content: 'Algorithms optimize addiction.',
    });
    expect(mockState.searchCalls.length).toBeGreaterThanOrEqual(1);
    expect(mockState.searchCalls[0]).toEqual({
      userId: 'user-1',
      query: 'Algorithms optimize addiction.',
      limit: 3,
    });
    expect(mockState.runPrompts).toContain(
      'Please provide your rebuttal based on the current debate state.',
    );
  });

  test('builds the rival agent config from debate state, transcript, and knowledge context', async () => {
    await RoundOrchestrator.processTurn('user-1', 'Algorithms optimize addiction.');

    expect(mockState.agentConfigs.length).toBeGreaterThanOrEqual(1);
    const config = mockState.agentConfigs[0] as {
      side: string;
      topic: string;
      phase: string;
      rigor: number;
      context: string;
    };
    expect(config.side).toBe('Opponent');
    expect(config.topic).toBe('Resolved: recommendation algorithms should be regulated.');
    expect(config.phase).toBe('Constructive');
    expect(config.rigor).toBe(4);
    expect(config.context).toContain('Student: Algorithms optimize addiction.');
    expect(config.context).toContain(
      'Recommendation systems can amplify addictive usage loops.\n---\nDisclosure and audit requirements reduce asymmetric information.',
    );
  });

  test('records the rival agent response and returns the updated debate', async () => {
    const updatedDebate = await RoundOrchestrator.processTurn('user-1', 'Algorithms optimize addiction.');

    const rivalMessage = mockState.appendedMessages.find((m) => m.author === 'Rival Agent A');
    expect(rivalMessage).toEqual({
      userId: 'user-1',
      author: 'Rival Agent A',
      content: 'AI rebuttal grounded in the retrieved evidence.',
    });
    expect(updatedDebate.messages.some((m) => m.author === 'Rival Agent A')).toBe(true);
  });

  test('serializes structured agent output before appending it to the debate', async () => {
    mockState.finalOutput = {
      speech: 'Structured rebuttal',
      citations: ['doc-1'],
    };

    await RoundOrchestrator.processTurn('user-1', 'Algorithms optimize addiction.');

    const rivalMessage = mockState.appendedMessages.find((m) => m.author === 'Rival Agent A');
    expect(rivalMessage?.content).toBe('{"speech":"Structured rebuttal","citations":["doc-1"]}');
  });

  test('uses a deterministic mock rival response when no OpenAI API key is configured', async () => {
    delete process.env.OPENAI_API_KEY;

    await RoundOrchestrator.processTurn('user-1', 'Algorithms optimize addiction.');

    expect(mockState.runPrompts).toEqual([]);
    const rivalMessage = mockState.appendedMessages.find((m) => m.author === 'Rival Agent A');
    expect(rivalMessage).toMatchObject({
      author: 'Rival Agent A',
      content: expect.stringContaining('Mock Rival Agent A'),
    });
  });

  test('generateJudgeVerdict calls judge agent and records the verdict', async () => {
    mockState.activeDebate.messages = [
      ...mockState.activeDebate.messages,
      { id: 'msg-1', role: 'user' as const, author: 'Student', time: '09:01 AM', content: 'My opening argument.' },
      { id: 'msg-2', role: 'assistant' as const, author: 'Rival Agent A', time: '09:02 AM', content: 'Counter argument.' },
    ];

    const updatedDebate = await RoundOrchestrator.generateJudgeVerdict('user-1');

    expect(mockState.appendedMessages.at(-1)).toMatchObject({
      userId: 'user-1',
      author: 'Judge',
    });
    const judgeMessage = updatedDebate.messages.find((m) => m.author === 'Judge');
    expect(judgeMessage).toMatchObject({
      role: 'assistant',
      author: 'Judge',
    });
    expect(judgeMessage?.content).toContain('[JUDGE FEEDBACK]');
  });

  test('generateJudgeVerdict throws when no active debate exists', async () => {
    mockState.activeDebate = null as unknown as typeof mockState.activeDebate;

    expect(RoundOrchestrator.generateJudgeVerdict('user-1')).rejects.toThrow('No active debate found.');
  });

  test('generateOpeningStatements appends one sentence for each of the other three debaters', async () => {
    mockState.activeDebate = {
      id: 'debate-1',
      topic: 'Resolved: recommendation algorithms should be regulated.',
      stance: 'Proponent' as const,
      rigor: 4,
      stage: 'Constructive',
      speakerRole: 'pro1',
      messages: [
        { id: 'msg-system', role: 'system' as const, author: 'Moderator', time: '09:00 AM', content: 'Debate created.' },
      ],
    };

    await RoundOrchestrator.generateOpeningStatements('user-1');

    expect(mockState.appendedMessages).toHaveLength(3);
    expect(mockState.appendedMessages[0]).toMatchObject({ author: 'pro2' });
    expect(mockState.appendedMessages[1]).toMatchObject({ author: 'con1' });
    expect(mockState.appendedMessages[2]).toMatchObject({ author: 'con2' });

    expect(mockState.appendedMessages[0].content.length).toBeGreaterThan(0);
    expect(mockState.appendedMessages[1].content.length).toBeGreaterThan(0);
    expect(mockState.appendedMessages[2].content.length).toBeGreaterThan(0);
  });

  test('generateOpeningStatements skips when non-system messages already exist', async () => {
    mockState.activeDebate = {
      id: 'debate-1',
      topic: 'Resolved: recommendation algorithms should be regulated.',
      stance: 'Proponent' as const,
      rigor: 4,
      stage: 'Constructive',
      speakerRole: 'pro1',
      messages: [
        { id: 'msg-system', role: 'system' as const, author: 'Moderator', time: '09:00 AM', content: 'Debate created.' },
        { id: 'msg-1', role: 'user' as const, author: 'Student', time: '09:01 AM', content: 'My argument.' },
      ],
    };

    await RoundOrchestrator.generateOpeningStatements('user-1');

    expect(mockState.appendedMessages.filter((m) => m.author !== 'Student')).toHaveLength(0);
  });

  test('generateTeammateSpeech appends a teammate message using the agent', async () => {
    mockState.activeDebate.messages = [
      ...mockState.activeDebate.messages,
      { id: 'msg-1', role: 'user' as const, author: 'Student', time: '09:01 AM', content: 'My opening argument.' },
      { id: 'msg-2', role: 'assistant' as const, author: 'Rival Agent A', time: '09:02 AM', content: 'Counter argument.' },
    ];

    const updatedDebate = await RoundOrchestrator.generateTeammateSpeech('user-1');

    expect(mockState.agentConfigs.length).toBeGreaterThanOrEqual(1);
    expect(mockState.runPrompts).toContain(
      "Please provide your next speech reinforcing your side's position and responding to the opponent's latest arguments.",
    );
    expect(updatedDebate.messages.some((m) => m.author === 'pro2')).toBe(true);
  });

  test('getTeammateCoaching returns coaching advice from the teammate agent', async () => {
    mockState.activeDebate.messages = [
      ...mockState.activeDebate.messages,
      { id: 'msg-1', role: 'user' as const, author: 'Student', time: '09:01 AM', content: 'My opening argument.' },
    ];

    const coaching = await RoundOrchestrator.getTeammateCoaching('user-1');

    expect(mockState.agentConfigs.length).toBeGreaterThanOrEqual(1);
    expect(mockState.runPrompts).toContain(
      'Please review the current debate state and provide specific, actionable coaching advice for the student.',
    );
    expect(coaching).toBeTruthy();
  });

  test('getTeammateCoaching falls back to mock when no OpenAI API key is configured', async () => {
    delete process.env.OPENAI_API_KEY;
    mockState.activeDebate.messages = [
      ...mockState.activeDebate.messages,
      { id: 'msg-1', role: 'user' as const, author: 'Student', time: '09:01 AM', content: 'My opening argument.' },
    ];

    const coaching = await RoundOrchestrator.getTeammateCoaching('user-1');

    expect(mockState.runPrompts).toEqual([]);
    expect(coaching).toContain('Mock Teammate Coach');
  });
});
