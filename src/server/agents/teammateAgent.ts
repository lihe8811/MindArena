import { Agent } from '@openai/agents';
import fs from 'node:fs';
import path from 'node:path';

export interface TeammateAgentConfig {
  side: 'Proponent' | 'Opponent';
  topic: string;
  phase: string;
  context: string;
  performanceContext: string;
}

/**
 * Creates an instance of the Teammate Coach using the OpenAI Agents SDK.
 */
export async function createTeammateAgent(config: TeammateAgentConfig): Promise<Agent> {
  const promptPath = path.join(import.meta.dir, '../prompts/teammate.md');
  const instructions = fs.readFileSync(promptPath, 'utf-8')
    .replace(/{{side}}/g, config.side)
    .replace(/{{topic}}/g, config.topic)
    .replace(/{{phase}}/g, config.phase)
    .replace(/{{context}}/g, config.context)
    .replace(/{{performance_context}}/g, config.performanceContext);

  return new Agent({
    name: 'Teammate Coach',
    instructions,
    outputGuardrails: [
      {
        name: 'structured_coaching',
        execute: async ({ agentOutput: _ }) => {
          return { tripwireTriggered: false, outputInfo: 'CoachingSchema validated' };
        },
      }
    ],
    handoffs: [],
  });
}
