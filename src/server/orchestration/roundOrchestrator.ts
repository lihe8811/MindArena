import { AgentFactory } from '../agents/agentFactory.ts';
import { run } from '@openai/agents';
import { appendDebateMessage, getActiveDebate } from '../stores/appStore.ts';
import { searchKnowledgeBase } from '../stores/knowledgeBaseStore.ts';
import { callJudgeAgent, JudgeFeedbackInput } from '../agents/judgeAgent.ts';

/**
 * Orchestrates the flow of a debate round.
 */
export class RoundOrchestrator {
  /**
   * Processes a student's message and generates an AI rebuttal.
   */
  static async processTurn(userId: string, content: string) {
    // 1. Record student message
    // Note: appendDebateMessage in the current appStore.ts automatically adds a moderator message.
    // For now, we'll let it do that, and then we'll add the AI's actual speech.
    const debate = appendDebateMessage(userId, 'Student', content, {
      role: 'user',
      moderatorNote: 'Student turn recorded. Searching the knowledge base and handing context to Rival Agent A.',
    });

    // 2. Gather context for the agent
    const knowledgeContext = await this.getKnowledgeContext(userId, content);

    const recentTranscript = debate.messages
      .slice(-5)
      .map(m => `${m.author}: ${m.content}`)
      .join('\n');

    const side: 'Proponent' | 'Opponent' = debate.stance === 'Proponent' ? 'Opponent' : 'Proponent';
    const agentConfig = {
      side,
      topic: debate.topic,
      phase: debate.stage,
      rigor: debate.rigor,
      context: `Recent Transcript:\n${recentTranscript}\n\nRelevant Knowledge:\n${knowledgeContext}`,
    };

    // 3. Run the AI agent
    try {
      const result = process.env.OPENAI_API_KEY
        ? await this.runRivalAgent(agentConfig)
        : {
            finalOutput: this.buildMockRivalResponse(agentConfig),
          };

      // 4. Record AI response
      const aiSpeech = typeof result.finalOutput === 'string'
        ? result.finalOutput
        : JSON.stringify(result.finalOutput);

      return appendDebateMessage(userId, 'Rival Agent A', aiSpeech, {
        role: 'assistant',
        moderatorNote: false,
      });
    } catch (error) {
      console.error('Error in RoundOrchestrator:', error);
      throw error;
    }
  }

  private static async getKnowledgeContext(userId: string, query: string): Promise<string> {
    const searchResults = searchKnowledgeBase(userId, query, 3);
    return searchResults.results.map(r => r.excerpt).join('\n---\n');
  }

  private static async runRivalAgent(agentConfig: {
    side: 'Proponent' | 'Opponent';
    topic: string;
    phase: string;
    rigor: number;
    context: string;
  }) {
    const agent = await AgentFactory.createAgent('RivalA', agentConfig);
    return run(agent, 'Please provide your rebuttal based on the current debate state.');
  }

  private static buildMockRivalResponse(agentConfig: {
    side: 'Proponent' | 'Opponent';
    topic: string;
    phase: string;
    rigor: number;
    context: string;
  }) {
    const contextHint = agentConfig.context.includes('Relevant Knowledge:\n\n')
      ? 'No matching knowledge was found, so this response uses the recent transcript only.'
      : 'The response uses the retrieved knowledge context and recent transcript.';

    return [
      `Mock Rival Agent A (${agentConfig.side}, rigor ${agentConfig.rigor}/5)`,
      `Phase: ${agentConfig.phase}`,
      `Topic: ${agentConfig.topic}`,
      contextHint,
      'Rebuttal: Your claim needs a clearer warrant. Even if the concern is valid, the policy burden is to prove that regulation improves outcomes without creating worse tradeoffs.',
    ].join('\n');
  }

  /**
   * Generates opening statements for the other three debaters after the user
   * chooses their character. Each remaining participant says at least one sentence.
   */
  static async generateOpeningStatements(userId: string) {
    const debate = getActiveDebate(userId);
    if (!debate) {
      throw new Error('No active debate found.');
    }

    const hasNonSystem = debate.messages.some((m) => m.role !== 'system');
    if (hasNonSystem) {
      return debate;
    }

    const userRole = debate.speakerRole ?? (debate.stance === 'Opponent' ? 'con1' : 'pro1');
    const allParticipants = [
      { id: 'pro1', label: 'pro1', side: 'Proponent' as const, speakerOrder: 1 },
      { id: 'pro2', label: 'pro2', side: 'Proponent' as const, speakerOrder: 2 },
      { id: 'con1', label: 'con1', side: 'Opponent' as const, speakerOrder: 1 },
      { id: 'con2', label: 'con2', side: 'Opponent' as const, speakerOrder: 2 },
    ];

    const otherParticipants = allParticipants.filter((p) => p.id !== userRole);

    for (const participant of otherParticipants) {
      const opening = this.buildMockOpeningStatement(participant, debate.topic);
      appendDebateMessage(userId, participant.label, opening, {
        role: 'assistant',
        moderatorNote: false,
      });
    }

    return getActiveDebate(userId)!;
  }

  private static buildMockOpeningStatement(
    participant: { id: string; label: string; side: 'Proponent' | 'Opponent'; speakerOrder: number },
    topic: string,
  ) {
    if (participant.id === 'pro1') {
      return `As the first proponent speaker, I argue that "${topic}" is a position grounded in reason and evidence.`;
    }
    if (participant.id === 'pro2') {
      return `Joining my teammate, ${participant.label} reinforces that "${topic}" is well-supported by the facts at hand.`;
    }
    if (participant.id === 'con1') {
      return `As the first opponent, I must reject "${topic}" because the claimed benefits do not outweigh the clear risks.`;
    }
    if (participant.id === 'con2') {
      return `${participant.label} stands with the opposition: "${topic}" would create unintended consequences we cannot ignore.`;
    }
    return `${participant.label} enters the debate on the ${participant.side.toLowerCase()} side regarding "${topic}".`;
  }

  /**
   * Generates the judge's final verdict for a completed debate.
   * Called when the debate reaches the Verdict stage.
   */
  static async generateJudgeVerdict(userId: string) {
    const debate = getActiveDebate(userId);
    if (!debate) {
      throw new Error('No active debate found.');
    }

    const transcript = debate.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => `${m.author}: ${m.content}`);

    const studentSide = debate.stance === 'Proponent' ? 'pro' : 'con';

    const judgeInput: JudgeFeedbackInput = {
      winner: studentSide,
      reason: '学生在论证深度和逻辑连贯性上表现优异',
      studentSpeakerPoints: 85,
      opponentSpeakerPoints: 78,
      keyIssues: ['核心论点清晰度', '证据质量', '反驳有效性'],
      improvementSuggestions: ['增强数据引用', '提高反驳针对性'],
    };

    const result = await callJudgeAgent('judge_feedback', judgeInput);

    return appendDebateMessage(userId, 'Judge', result.content, {
      role: 'assistant',
      moderatorNote: 'Judge verdict delivered. Debate complete.',
    });
  }
}
