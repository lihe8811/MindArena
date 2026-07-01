import { Agent } from '@openai/agents';
import { createJudgeAgent, JudgeAgentInput } from './judgeAgent.ts';
import { createRivalAgentA, RivalAgentAConfig } from './rivalAgentA.ts';
import { createRivalAgentB, RivalAgentBConfig } from './rivalAgentB.ts';
import { createTeammateAgent, TeammateAgentConfig } from './teammateAgent.ts';

export type AgentType = 'RivalA' | 'RivalB' | 'Teammate' | 'Judge';

/**
 * Factory for creating debate agents.
 * Centralizes agent creation and configuration.
 */
export class AgentFactory {
  /**
   * Creates an agent based on the specified type and configuration.
   */
  static async createAgent(type: AgentType, config: any): Promise<Agent<any, any>> {
    switch (type) {
      case 'RivalA':
        return await createRivalAgentA(config as RivalAgentAConfig);
      case 'RivalB':
        return await createRivalAgentB(config as RivalAgentBConfig);
      case 'Teammate':
        return await createTeammateAgent(config as TeammateAgentConfig);
      case 'Judge': {
        const judgeConfig = config as JudgeAgentInput;
        return await createJudgeAgent(judgeConfig.phase, judgeConfig.input);
      }
      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
  }
}
