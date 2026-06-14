import {
  enterDebatePhase,
  getActiveDebate,
  recordDebateUserInput,
  startDebateForUser,
} from '../stores/appStore.ts';
import {
  getNextDebatePhase,
  type DebatePhase,
} from '@/shared/debatePhases';
import type { ActiveDebate } from '@/shared/types';

export class RoundOrchestrator {
  static initializeRound(userId: string) {
    return this.advanceUntilUserInput(userId, 'setup');
  }

  static startDebate(userId: string) {
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

  static processTurn(userId: string, content: string) {
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

  private static advanceUntilUserInput(
    userId: string,
    startingPhase: DebatePhase,
  ): ActiveDebate {
    let phase: DebatePhase | null = startingPhase;
    let debate: ActiveDebate | null = null;

    while (phase) {
      debate = enterDebatePhase(userId, phase);
      if (debate.awaitingUserInput || debate.status === 'Completed') {
        return debate;
      }
      phase = getNextDebatePhase(phase);
    }

    if (!debate) {
      throw new Error('Unable to advance debate phases.');
    }
    return debate;
  }
}
