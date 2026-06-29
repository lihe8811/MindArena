import { Agent } from '@openai/agents';
import fs from 'node:fs';
import path from 'node:path';
import { SpeechSchema } from '../../shared/schemas/agentOutputs.ts';
import { createAgentGuardrails } from './agentGuardrails.ts';
import { rivalAgentTools } from './toolAdapter.ts';

export interface RivalAgentAConfig {
  debateId: string;
  speakerId: string;
  speakerRole: string;
  side: 'Proponent' | 'Opponent';
  topic: string;
  phase: string;
  rigor: number;
  context: string;
  allowedActions?: string[];
}

/**
 * Creates an instance of Rival Agent A using the OpenAI Agents SDK.
 */
export async function createRivalAgentA(config: RivalAgentAConfig) {
  if (!config.debateId || config.debateId.trim() === '') {
    throw new Error('RivalAgentAConfig.debateId is required');
  }

  const promptPath = path.join(import.meta.dir, '../prompts/rivalA.md');
  const instructions = fs.readFileSync(promptPath, 'utf-8')
    .replace(/{{debate_id}}/g, config.debateId)
    .replace(/{{speaker_id}}/g, config.speakerId)
    .replace(/{{speaker_role}}/g, config.speakerRole)
    .replace(/{{side}}/g, config.side)
    .replace(/{{topic}}/g, config.topic)
    .replace(/{{phase}}/g, config.phase)
    .replace(/{{rigor}}/g, config.rigor.toString())
    .replace(/{{allowed_actions}}/g, (config.allowedActions ?? []).join(', '))
    .replace(/{{context}}/g, config.context);

  const { inputGuardrails, outputGuardrails } = createAgentGuardrails({
    debateId: config.debateId,
    phase: config.phase,
    speakerRole: config.speakerRole,
    side: config.side,
    type: 'rival_a',
  });

  return new Agent({
    name: 'Rival Agent A',
    instructions,
    outputType: SpeechSchema,
    tools: rivalAgentTools,
    toolUseBehavior: 'run_llm_again',
    inputGuardrails,
    outputGuardrails,
    handoffs: [],
  });
}
