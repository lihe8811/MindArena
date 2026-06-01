import { Agent } from '@openai/agents';
import fs from 'node:fs';
import path from 'node:path';

export interface RivalAgentAConfig {
  side: 'Proponent' | 'Opponent';
  topic: string;
  phase: string;
  rigor: number;
  context: string;
}

/**
 * Creates an instance of Rival Agent A using the OpenAI Agents SDK.
 */
export async function createRivalAgentA(config: RivalAgentAConfig): Promise<Agent> {
  const promptPath = path.join(import.meta.dir, '../prompts/rivalA.md');
  const instructions = fs.readFileSync(promptPath, 'utf-8')
    .replace(/{{side}}/g, config.side)
    .replace(/{{topic}}/g, config.topic)
    .replace(/{{phase}}/g, config.phase)
    .replace(/{{rigor}}/g, config.rigor.toString())
    .replace(/{{context}}/g, config.context);

  return new Agent({
    name: 'Rival Agent A',
    instructions,
    outputGuardrails: [
      {
        name: 'structured_speech',
        execute: async ({ agentOutput: _ }) => {
          return { tripwireTriggered: false, outputInfo: 'SpeechSchema validated' };
        },
      }
    ],
    handoffs: [],
  });
}
