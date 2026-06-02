import { beforeEach, describe, expect, mock, test } from 'bun:test';

const mockState = {
  appendedMessages: [] as Array<{ userId: string; author: string; content: string }>,
  activeDebate: {
    id: 'debate-1',
    topic: 'Resolved: recommendation algorithms should be regulated.',
    stance: 'Proponent' as const,
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
    ],
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
  appendDebateMessage: (userId: string, author: string, content: string) => {
    mockState.appendedMessages.push({ userId, author, content });
    const role = author === 'Student' ? 'user' : author.includes('Agent') ? 'assistant' : 'system';
    return {
      ...mockState.activeDebate,
      messages: [
        ...mockState.activeDebate.messages,
        {
          id: `msg-${mockState.appendedMessages.length}`,
          role,
          author,
          time: '09:01 AM',
          content,
        },
      ],
    };
  },
  getActiveDebate: () => mockState.activeDebate,
}));

mock.module('../../src/server/stores/knowledgeBaseStore.ts', () => ({
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
  AgentFactory: {
    createAgent: async (_agentName: string, config: unknown) => {
      mockState.agentConfigs.push(config);
      return { name: 'mock-rival-agent' };
    },
  },
}));

mock.module('@openai/agents', () => ({
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
    expect(mockState.searchCalls).toEqual([
      {
        userId: 'user-1',
        query: 'Algorithms optimize addiction.',
        limit: 3,
      },
    ]);
    expect(mockState.runPrompts).toEqual([
      'Please provide your rebuttal based on the current debate state.',
    ]);
  });

  test('builds the rival agent config from debate state, transcript, and knowledge context', async () => {
    await RoundOrchestrator.processTurn('user-1', 'Algorithms optimize addiction.');

    expect(mockState.agentConfigs).toHaveLength(1);
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

    expect(mockState.appendedMessages[1]).toEqual({
      userId: 'user-1',
      author: 'Rival Agent A',
      content: 'AI rebuttal grounded in the retrieved evidence.',
    });
    expect(updatedDebate.messages.at(-1)).toMatchObject({
      role: 'assistant',
      author: 'Rival Agent A',
      content: 'AI rebuttal grounded in the retrieved evidence.',
    });
  });

  test('serializes structured agent output before appending it to the debate', async () => {
    mockState.finalOutput = {
      speech: 'Structured rebuttal',
      citations: ['doc-1'],
    };

    await RoundOrchestrator.processTurn('user-1', 'Algorithms optimize addiction.');

    expect(mockState.appendedMessages[1]?.content).toBe('{"speech":"Structured rebuttal","citations":["doc-1"]}');
  });

  test('uses a deterministic mock rival response when no OpenAI API key is configured', async () => {
    delete process.env.OPENAI_API_KEY;

    await RoundOrchestrator.processTurn('user-1', 'Algorithms optimize addiction.');

    expect(mockState.runPrompts).toEqual([]);
    expect(mockState.appendedMessages[1]).toMatchObject({
      author: 'Rival Agent A',
      content: expect.stringContaining('Mock Rival Agent A'),
    });
  });
});
