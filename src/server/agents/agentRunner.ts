import { run, type Agent } from '@openai/agents';
import { z } from 'zod';
import type { DebatePhase } from '../../shared/debatePhases.ts';
import { CoachingSchema, SpeechSchema } from '../../shared/schemas/agentOutputs.ts';
import type { ActiveDebate } from '../../shared/types.ts';
import { AgentFactory, type AgentType } from './agentFactory.ts';

export interface AgentRunResult {
  role: 'assistant';
  author: string;
  content: string;
  rawOutput?: unknown;
}

export interface AgentRunner {
  runForPhase(debate: ActiveDebate, phase: DebatePhase): Promise<AgentRunResult | null>;
}

const COACHING_PHASES: ReadonlySet<DebatePhase> = new Set(['student_prep_optional']);

const JUDGE_PHASES: ReadonlySet<DebatePhase> = new Set([
  'judge_opening',
  'judge_deliberation',
  'judge_feedback',
]);

const FIRST_SPEAKER_PHASES: ReadonlySet<DebatePhase> = new Set([
  'constructive_pro',
  'constructive_con',
]);

const RIVAL_SPEECH_PHASES: ReadonlySet<DebatePhase> = new Set([
  'constructive_pro',
  'constructive_con',
  'rebuttal_pro',
  'rebuttal_con',
  'summary_pro',
  'summary_con',
  'final_focus_pro',
  'final_focus_con',
]);

function getRivalAgentType(phase: DebatePhase): 'RivalA' | 'RivalB' {
  return FIRST_SPEAKER_PHASES.has(phase) ? 'RivalA' : 'RivalB';
}

function isRivalSpeechPhase(phase: DebatePhase): boolean {
  return RIVAL_SPEECH_PHASES.has(phase);
}

function getOpponentSide(studentSide: 'Proponent' | 'Opponent'): 'Proponent' | 'Opponent' {
  return studentSide === 'Proponent' ? 'Opponent' : 'Proponent';
}

function buildAgentContext(debate: ActiveDebate): string {
  const recentMessages = debate.messages.slice(-10);
  if (recentMessages.length === 0) {
    return 'No prior messages.';
  }

  return recentMessages
    .map((message) => `[${message.role}] ${message.author}: ${message.content}`)
    .join('\n');
}

function buildPerformanceContext(_debate: ActiveDebate): string {
  // TODO: Replace with real performance analysis once student history/retrieval is available.
  return 'Student is preparing for the current phase. Focus on clarity, evidence, and rebuttal readiness.';
}

function extractSpeechContent(rawOutput: unknown): string {
  if (typeof rawOutput === 'string') {
    try {
      const parsed = JSON.parse(rawOutput);
      const validated = SpeechSchema.parse(parsed);
      return validated.content;
    } catch {
      return rawOutput;
    }
  }

  const validated = SpeechSchema.parse(rawOutput);
  return validated.content;
}

function extractCoachingContent(rawOutput: unknown): string {
  if (typeof rawOutput === 'string') {
    try {
      const parsed = JSON.parse(rawOutput);
      const validated = CoachingSchema.parse(parsed);
      return `${validated.suggestion}\n\nStrategy: ${validated.strategy}`;
    } catch {
      return rawOutput;
    }
  }

  const validated = CoachingSchema.parse(rawOutput);
  return `${validated.suggestion}\n\nStrategy: ${validated.strategy}`;
}

async function runAgent(agent: Agent, input: string): Promise<unknown> {
  if (!process.env.OPENAI_API_KEY) {
    return `Mock response for: ${input}`;
  }

  const result = await run(agent, input);
  return result.finalOutput;
}

export class DefaultAgentRunner implements AgentRunner {
  async runForPhase(debate: ActiveDebate, phase: DebatePhase): Promise<AgentRunResult | null> {
    if (JUDGE_PHASES.has(phase)) {
      // Judge agent is owned by Hallie; leave judge execution out of Carl's scope.
      return null;
    }

    if (COACHING_PHASES.has(phase)) {
      return this.runTeammateAgent(debate, phase);
    }

    if (isRivalSpeechPhase(phase)) {
      return this.runRivalAgent(debate, phase);
    }

    // Crossfire, complete, and other non-speech phases do not invoke agents.
    return null;
  }

  private async runRivalAgent(
    debate: ActiveDebate,
    phase: DebatePhase,
  ): Promise<AgentRunResult | null> {
    const agentType = getRivalAgentType(phase);
    const side = getOpponentSide(debate.stance);
    const speakerRole = side === 'Proponent' ? 'pro1' : 'con1';

    const agent = await AgentFactory.createAgent(agentType, {
      debateId: debate.id,
      speakerId: `rival-${agentType.toLowerCase()}`,
      speakerRole,
      side,
      topic: debate.topic,
      phase,
      rigor: debate.rigor,
      context: buildAgentContext(debate),
      allowedActions: ['speak', 'cite evidence'],
    });

    const rawOutput = await runAgent(agent, `Deliver your ${phase} speech.`);
    const content = extractSpeechContent(rawOutput);

    return {
      role: 'assistant',
      author: `${side} ${agentType === 'RivalA' ? 'First' : 'Second'} Speaker`,
      content,
      rawOutput,
    };
  }

  private async runTeammateAgent(
    debate: ActiveDebate,
    phase: DebatePhase,
  ): Promise<AgentRunResult | null> {
    const agent = await AgentFactory.createAgent('Teammate', {
      debateId: debate.id,
      studentId: `student-${debate.stance.toLowerCase()}`,
      side: debate.stance,
      topic: debate.topic,
      phase,
      context: buildAgentContext(debate),
      performanceContext: buildPerformanceContext(debate),
      allowedActions: ['suggest frameworks', 'review citations'],
    });

    const rawOutput = await runAgent(agent, `Provide coaching for the ${phase} phase.`);
    const content = extractCoachingContent(rawOutput);

    return {
      role: 'assistant',
      author: 'Teammate Coach',
      content,
      rawOutput,
    };
  }
}

export const defaultAgentRunner: AgentRunner = new DefaultAgentRunner();
