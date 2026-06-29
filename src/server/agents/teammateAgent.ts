import { Agent } from '@openai/agents';
import fs from 'node:fs';
import path from 'node:path';
import { CoachingSchema } from '../../shared/schemas/agentOutputs.ts';
import { createAgentGuardrails } from './agentGuardrails.ts';
import { teammateAgentTools } from './toolAdapter.ts';

export interface TeammateAgentConfig {
  debateId: string;
  studentId: string;
  side: 'Proponent' | 'Opponent';
  topic: string;
  phase: string;
  context: string;
  performanceContext: string;
  allowedActions?: string[];
}

/**
 * Creates an instance of the Teammate Coach using the OpenAI Agents SDK.
 */
export async function createTeammateAgent(config: TeammateAgentConfig) {
  if (!config.studentId || config.studentId.trim() === '') {
    throw new Error('TeammateAgentConfig.studentId is required');
  }

  const promptPath = path.join(import.meta.dir, '../prompts/teammate.md');
  const instructions = fs.readFileSync(promptPath, 'utf-8')
    .replace(/{{debate_id}}/g, config.debateId)
    .replace(/{{student_id}}/g, config.studentId)
    .replace(/{{side}}/g, config.side)
    .replace(/{{topic}}/g, config.topic)
    .replace(/{{phase}}/g, config.phase)
    .replace(/{{context}}/g, config.context)
    .replace(/{{performance_context}}/g, config.performanceContext)
    .replace(/{{allowed_actions}}/g, (config.allowedActions ?? []).join(', '));

  const { inputGuardrails, outputGuardrails } = createAgentGuardrails({
    debateId: config.debateId,
    phase: config.phase,
    side: config.side,
    type: 'teammate',
  });

  return new Agent({
    name: 'Teammate Coach',
    instructions,
    outputType: CoachingSchema,
    tools: teammateAgentTools,
    toolUseBehavior: 'run_llm_again',
    inputGuardrails,
    outputGuardrails,
    handoffs: [],
  });
}

export function buildMockTeammateResponse(config: {
  side: 'Proponent' | 'Opponent';
  topic: string;
  phase: string;
  context: string;
  performanceContext: string;
}): string {
  return [
    `Mock Teammate Coach (${config.side})`,
    `Phase: ${config.phase}`,
    `Topic: ${config.topic}`,
    `Performance Note: ${config.performanceContext}`,
    'Coaching: Focus on linking your evidence back to the resolution. Your structure is solid — tighten the warrant and impact steps.',
  ].join('\n');
}
