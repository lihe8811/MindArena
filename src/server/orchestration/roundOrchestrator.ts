import {
  enterDebatePhase,
  getActiveDebate,
  recordDebateAgentMessage,
  recordDebateUserInput,
  startDebateForUser,
} from '../stores/appStore.ts';
import { defaultAgentRunner, type AgentRunner } from '../agents/agentRunner.ts';
import {
  getNextDebatePhase,
  type DebatePhase,
} from '@/shared/debatePhases';
import type { ActiveDebate } from '@/shared/types';

export class RoundOrchestrator {
  static agentRunner: AgentRunner = defaultAgentRunner;

  static async initializeRound(userId: string) {
    return this.advanceUntilUserInput(userId, 'setup');
  }

  static async startDebate(userId: string) {
    const debate = getActiveDebate(userId);
    if (!debate) {
      throw new Error('No active debate found.');
    }
    if (debate.status !== 'Prep') {
      throw new Error('Debate has already started.');
    }

    startDebateForUser(userId);
    return this.advanceUntilUserInput(userId, 'setup');
  }

  static async processTurn(userId: string, content: string) {
    const debate = getActiveDebate(userId);
    if (!debate) {
      throw new Error('No active debate found.');
    }
    if (!debate.awaitingUserInput) {
      throw new Error('The debate is not waiting for user input.');
    }

    recordDebateUserInput(userId, content);
    const nextPhase = getNextDebatePhase(debate.stage as DebatePhase);
    if (!nextPhase) {
      return debate;
    }

    return this.advanceUntilUserInput(userId, nextPhase);
  }

  private static async advanceUntilUserInput(
    userId: string,
    startingPhase: DebatePhase,
  ): Promise<ActiveDebate> {
    let phase: DebatePhase | null = startingPhase;
    let debate: ActiveDebate | null = null;

    while (phase) {
      debate = enterDebatePhase(userId, phase);
      if (debate.awaitingUserInput || debate.status === 'Completed') {
        return debate;
      }

      const agentResult = await this.agentRunner.runForPhase(debate, phase);
      if (agentResult) {
        debate = recordDebateAgentMessage(
          userId,
          agentResult.content,
          agentResult.author,
        );
      }

      phase = getNextDebatePhase(phase);
    }

    if (!debate) {
      throw new Error('Unable to advance debate phases.');
    }
    return debate;
  }
}
