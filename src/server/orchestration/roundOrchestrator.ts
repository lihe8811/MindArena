import { AgentFactory } from '../agents/agentFactory.ts';
import { run } from '@openai/agents';
import { appendDebateMessage, getActiveDebate } from '../stores/appStore.ts';
import { searchKnowledgeBase } from '../stores/knowledgeBaseStore.ts';

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
}
