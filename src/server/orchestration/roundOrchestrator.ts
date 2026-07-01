/**
 * RoundOrchestrator — NHSDLC Debate State Machine + Full Agent Coordination
 *
 * Coordinates all four debate agents (Judge, RivalA, RivalB, Teammate) through
 * the full NHSDLC round. Every phase tells the right agent(s) to run with:
 *   - All prior output (so agents see what everyone else said)
 *   - All prior Q&A (addition problems)
 *   - The student's last input (when applicable)
 *
 * Results are stored in output.json and think.json so the judge sees everything.
 */

import { run } from '@openai/agents';
import {
  enterDebatePhase,
  getActiveDebate,
  recordDebateUserInput,
  startDebateForUser,
  appendDebateMessage,
} from '../stores/appStore';
import {
  getNextDebatePhase,
  type DebatePhase,
} from '@/shared/debatePhases';
import type { ActiveDebate } from '@/shared/types';
import { recordOutput, getOutputsForSession, exportOutputsJson, type OutputSpeakerType } from '../db/outputs';
import { recordThink, exportThinksJson } from '../db/thinks';
import { recordQna, getQnaForSession, formatQnaForFeedback } from '../agents/qnaStore';
import { callJudgeAgent } from '../agents/judgeAgent';
import { createRivalAgentA, type RivalAgentAConfig } from '../agents/rivalAgentA';
import { createRivalAgentB, type RivalAgentBConfig } from '../agents/rivalAgentB';
import { createTeammateAgent, type TeammateAgentConfig } from '../agents/teammateAgent';
import type { AgentRunner } from '../agents/agentRunner.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentRunResult {
  agentRole: string;
  output: string;
  thought: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTranscript(sessionId: string): string[] {
  return getOutputsForSession(sessionId).map(
    (o) => `[${o.speakerType}]${o.content}`,
  );
}

function buildContext(sessionId: string): string {
  const outputs = getOutputsForSession(sessionId);
  if (outputs.length === 0) return 'No prior output yet.';

  const lines: string[] = [];
  let lastPhase = '';
  for (const o of outputs) {
    if (o.phase !== lastPhase) {
      lines.push(`\n--- ${o.phase.replace(/_/g, ' ').toUpperCase()} ---`);
      lastPhase = o.phase;
    }
    lines.push(`[${o.speakerType}]: ${o.content}`);
  }
  return lines.join('\n');
}

function extractQna(content: string, sessionId: string, phase: string, speaker: string) {
  const problemRe = /\[ADD_PROBLEM\](.+?)\[\/ADD_PROBLEM\]/g;
  const answerRe = /\[ADD_ANSWER\](.+?)\[\/ADD_ANSWER\]/g;

  const problems: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = problemRe.exec(content)) !== null) problems.push(m[1].trim());
  while ((m = answerRe.exec(content)) !== null) {
    const expr = problems.shift() ?? '? + ?';
    recordQna({ sessionId, phase, speaker, type: 'answer', expression: expr, result: m[1].trim() });
  }
  for (const expr of problems) {
    recordQna({ sessionId, phase, speaker, type: 'problem', expression: expr, result: '(unanswered)' });
  }
}

function recordSpeakerOutput(
  sessionId: string,
  phase: string,
  speakerType: OutputSpeakerType,
  content: string,
) {
  recordOutput({ sessionId, phase, speakerType, content });
  extractQna(content, sessionId, phase, speakerType);
}

// ---------------------------------------------------------------------------
// Agent runners
// ---------------------------------------------------------------------------

async function runRival(
  config: RivalAgentAConfig,
  sessionId: string,
  phase: DebatePhase,
  priorContext: string,
  priorQna: string,
): Promise<{ output: string; thought: string }> {
  const agent = await createRivalAgentA(config);

  // THINK pass
  const thinkPrompt = buildPrompt(phase, priorContext, priorQna, 'rival') +
    '\n\nBefore speaking, briefly think about what you want to say and how. Write your thought process in [THOUGHT]...[/THOUGHT] tags.';
  const thoughtResult = await run(agent, thinkPrompt);
  const thoughtRaw = typeof thoughtResult.finalOutput === 'string'
    ? thoughtResult.finalOutput
    : JSON.stringify(thoughtResult.finalOutput);
  const cleanThought = thoughtRaw.match(/\[THOUGHT\]([\s\S]+?)\[\/THOUGHT\]/)?.[1]?.trim()
    ?? thoughtRaw.replace(/\[THOUGHT\][\s\S]*?\[\/THOUGHT\]/g, '').trim();
  recordThink({ sessionId, phase, agentRole: 'rival_a', thought: cleanThought || thoughtRaw });

  // OUTPUT pass
  const outputPrompt = buildPrompt(phase, priorContext, priorQna, 'rival') +
    '\n\nNow deliver your actual speech based on your thinking.';
  const outputResult = await run(agent, outputPrompt);
  const output = typeof outputResult.finalOutput === 'string'
    ? outputResult.finalOutput
    : JSON.stringify(outputResult.finalOutput);

  return { output, thought: cleanThought || '' };
}

async function runRivalB(
  config: RivalAgentBConfig,
  sessionId: string,
  phase: DebatePhase,
  priorContext: string,
  priorQna: string,
): Promise<{ output: string; thought: string }> {
  const agent = await createRivalAgentB(config);

  const thinkPrompt = buildPrompt(phase, priorContext, priorQna, 'rival') +
    '\n\nBefore speaking, briefly think about what you want to say and how. Write your thought process in [THOUGHT]...[/THOUGHT] tags.';
  const thoughtResult = await run(agent, thinkPrompt);
  const thoughtRaw = typeof thoughtResult.finalOutput === 'string'
    ? thoughtResult.finalOutput
    : JSON.stringify(thoughtResult.finalOutput);
  const cleanThought = thoughtRaw.match(/\[THOUGHT\]([\s\S]+?)\[\/THOUGHT\]/)?.[1]?.trim()
    ?? thoughtRaw.replace(/\[THOUGHT\][\s\S]*?\[\/THOUGHT\]/g, '').trim();
  recordThink({ sessionId, phase, agentRole: 'rival_b', thought: cleanThought || thoughtRaw });

  const outputPrompt = buildPrompt(phase, priorContext, priorQna, 'rival') +
    '\n\nNow deliver your actual speech based on your thinking.';
  const outputResult = await run(agent, outputPrompt);
  const output = typeof outputResult.finalOutput === 'string'
    ? outputResult.finalOutput
    : JSON.stringify(outputResult.finalOutput);

  return { output, thought: cleanThought || '' };
}

async function runTeammate(
  config: TeammateAgentConfig,
  sessionId: string,
  phase: DebatePhase,
  priorContext: string,
  priorQna: string,
): Promise<{ output: string; thought: string }> {
  const agent = await createTeammateAgent(config);

  const thinkPrompt = buildPrompt(phase, priorContext, priorQna, 'teammate') +
    '\n\nBefore coaching, think about what advice would be most helpful. Write your thoughts in [THOUGHT]...[/THOUGHT] tags.';
  const thoughtResult = await run(agent, thinkPrompt);
  const thoughtRaw = typeof thoughtResult.finalOutput === 'string'
    ? thoughtResult.finalOutput
    : JSON.stringify(thoughtResult.finalOutput);
  const cleanThought = thoughtRaw.match(/\[THOUGHT\]([\s\S]+?)\[\/THOUGHT\]/)?.[1]?.trim()
    ?? thoughtRaw.replace(/\[THOUGHT\][\s\S]*?\[\/THOUGHT\]/g, '').trim();
  recordThink({ sessionId, phase, agentRole: 'teammate', thought: cleanThought || thoughtRaw });

  const outputPrompt = buildPrompt(phase, priorContext, priorQna, 'teammate') +
    '\n\nNow deliver your coaching advice based on your thinking.';
  const outputResult = await run(agent, outputPrompt);
  const output = typeof outputResult.finalOutput === 'string'
    ? outputResult.finalOutput
    : JSON.stringify(outputResult.finalOutput);

  return { output, thought: cleanThought || '' };
}

function buildPrompt(
  phase: DebatePhase,
  priorContext: string,
  priorQna: string,
  role: 'rival' | 'teammate',
): string {
  const roleLabel = role === 'rival' ? 'Debate Rival' : 'Teammate Coach';
  return `# Debate Phase: ${phase.replace(/_/g, ' ').toUpperCase()}
Role: ${roleLabel}

## All Prior Output in This Debate
${priorContext}

## Addition Problems & Answers So Far
${priorQna}

## Your Task
Deliver your ${role === 'rival' ? 'speech or response' : 'coaching advice'} for this phase.
${role === 'rival'
  ? 'Be persuasive, on-topic, and follow NHSDLC format rules. You may include addition problems using [ADD_PROBLEM]X + Y[/ADD_PROBLEM] and answers using [ADD_ANSWER]Z[/ADD_ANSWER].'
  : 'Be specific, encouraging, and focused on helping the student improve.'}
`;
}

// ---------------------------------------------------------------------------
// Phase → Agent Routing
// ---------------------------------------------------------------------------

function getAgentsForPhase(
  phase: DebatePhase,
  debate: ActiveDebate,
): Array<{ role: 'judge' | 'rival_a' | 'rival_b' | 'teammate'; speakerType: OutputSpeakerType }> {
  const isPro = debate.stance === 'Proponent';

  switch (phase) {
    case 'judge_opening':
      return [{ role: 'judge', speakerType: 'judge' }];

    case 'student_prep_optional':
      return [{ role: 'teammate', speakerType: 'teammate' }];

    case 'constructive_pro':
      return isPro ? [] : [{ role: 'rival_a', speakerType: 'rival_a' }];

    case 'constructive_con':
      return isPro ? [{ role: 'rival_a', speakerType: 'rival_a' }] : [];

    case 'crossfire_1':
    case 'crossfire_2':
    case 'grand_crossfire':
      return [{ role: 'rival_a', speakerType: 'rival_a' }];

    case 'rebuttal_pro':
      return isPro ? [] : [{ role: 'rival_b', speakerType: 'rival_b' }];

    case 'rebuttal_con':
      return isPro ? [{ role: 'rival_b', speakerType: 'rival_b' }] : [];

    case 'summary_pro':
      return isPro ? [] : [{ role: 'rival_a', speakerType: 'rival_a' }];

    case 'summary_con':
      return isPro ? [{ role: 'rival_a', speakerType: 'rival_a' }] : [];

    case 'final_focus_pro':
      return isPro ? [] : [{ role: 'rival_b', speakerType: 'rival_b' }];

    case 'final_focus_con':
      return isPro ? [{ role: 'rival_b', speakerType: 'rival_b' }] : [];

    case 'judge_deliberation':
      return [{ role: 'judge', speakerType: 'judge' }];

    case 'judge_feedback':
      return [{ role: 'judge', speakerType: 'judge' }];

    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Main Orchestrator
// ---------------------------------------------------------------------------

export class RoundOrchestrator {
  static agentRunner: AgentRunner | null = null;

  static initializeRound(userId: string) {
    return this.advanceUntilUserInput(userId, 'setup');
  }

  static startDebate(userId: string) {
    const debate = getActiveDebate(userId);
    if (!debate) throw new Error('No active debate found.');
    if (debate.status !== 'Prep') throw new Error('Debate has already started.');

    startDebateForUser(userId);
    return this.advanceUntilUserInput(userId, 'setup');
  }

  static processTurn(userId: string, content: string) {
    const debate = getActiveDebate(userId);
    if (!debate) throw new Error('No active debate found.');
    if (!debate.awaitingUserInput) throw new Error('The debate is not waiting for user input.');

    // Record student input in output store
    recordSpeakerOutput(debate.id, debate.stage as DebatePhase, 'student', content);

    recordDebateUserInput(userId, content);
    const nextPhase = getNextDebatePhase(debate.stage as DebatePhase);
    if (!nextPhase) return debate;

    return this.advanceUntilUserInput(userId, nextPhase);
  }

  /**
   * Advance through phases until we hit one that waits for user input,
   * running all non-user phases with the appropriate agents.
   */
  private static advanceUntilUserInput(
    userId: string,
    startingPhase: DebatePhase,
  ): ActiveDebate {
    let phase: DebatePhase | null = startingPhase;

    while (phase) {
      const updatedDebate = enterDebatePhase(userId, phase);
      const { id: sessionId, stage: currentPhase, awaitingUserInput } = updatedDebate;

      if (awaitingUserInput || updatedDebate.status === 'Completed') {
        return updatedDebate;
      }

      // Run all agents for this phase (non-blocking)
      this.runPhaseAgents(userId, updatedDebate, currentPhase as DebatePhase);

      // Advance to next phase
      phase = getNextDebatePhase(currentPhase as DebatePhase);
    }

    return getActiveDebate(userId)!;
  }

  /**
   * Run all non-student agents for a phase, storing outputs and thoughts.
   * All agent runs are fire-and-forget (non-blocking) so the HTTP response
   * returns immediately while agents process in the background.
   */
  private static runPhaseAgents(
    userId: string,
    debate: ActiveDebate,
    phase: DebatePhase,
  ) {
    const { id: sessionId, topic, stance, rigor } = debate;
    const isPro = stance === 'Proponent';
    const studentSide = isPro ? 'Proponent' : 'Opponent';
    const rivalSide = isPro ? 'Opponent' : 'Proponent';

    const priorContext = buildContext(sessionId);
    const priorQna = formatQnaForFeedback(sessionId);
    const transcript = getTranscript(sessionId);

    const agentsToRun = getAgentsForPhase(phase, debate);

    for (const { role } of agentsToRun) {
      if (role === 'judge') {
        const judgePhaseMap: Record<string, 'judge_opening' | 'judge_deliberation' | 'judge_feedback'> = {
          judge_opening: 'judge_opening',
          judge_deliberation: 'judge_deliberation',
          judge_feedback: 'judge_feedback',
        };
        const judgePhase = judgePhaseMap[phase] ?? 'judge_deliberation';

        const input = judgePhase === 'judge_opening'
          ? { topic, format: 'NHSDLC Public Forum', timeLimitMinutes: 40 }
          : { topic, transcript, studentSide: isPro ? 'pro' : 'con' as 'pro' | 'con' };

        callJudgeAgent(judgePhase, input as any)
          .then((result) => {
            recordThink({ sessionId, phase, agentRole: 'judge', thought: `[Judge ${judgePhase}]: Reviewed all prior output and Q&A.` });
            recordSpeakerOutput(sessionId, phase, 'judge', result.content);
            appendDebateMessage(userId, 'Judge Agent', result.content);
          })
          .catch((err) => {
            const errMsg = `[Judge error] ${err instanceof Error ? err.message : String(err)}`;
            recordSpeakerOutput(sessionId, phase, 'judge', errMsg);
          });
        continue;
      }

      if (role === 'teammate') {
        const config: TeammateAgentConfig = {
          debateId: sessionId,
          studentId: userId,
          side: studentSide as 'Proponent' | 'Opponent',
          topic,
          phase,
          context: priorContext,
          performanceContext: `Current phase: ${phase}. Prior Q&A: ${priorQna}`,
        };

        runTeammate(config, sessionId, phase, priorContext, priorQna)
          .then(({ output }) => {
            recordSpeakerOutput(sessionId, phase, 'teammate', output);
            appendDebateMessage(userId, 'Teammate Coach', output);
          })
          .catch((err) => {
            const errMsg = `[Teammate error] ${err instanceof Error ? err.message : String(err)}`;
            recordSpeakerOutput(sessionId, phase, 'teammate', errMsg);
          });
        continue;
      }

      if (role === 'rival_a') {
        const config: RivalAgentAConfig = {
          debateId: sessionId,
          speakerId: 'rival-a',
          speakerRole: rivalSide === 'Proponent' ? 'pro1' : 'con1',
          side: rivalSide as 'Proponent' | 'Opponent',
          topic,
          phase,
          rigor,
          context: priorContext,
        };

        runRival(config, sessionId, phase, priorContext, priorQna)
          .then(({ output }) => {
            recordSpeakerOutput(sessionId, phase, 'rival_a', output);
            appendDebateMessage(userId, 'Rival Agent A', output);
          })
          .catch((err) => {
            const errMsg = `[RivalA error] ${err instanceof Error ? err.message : String(err)}`;
            recordSpeakerOutput(sessionId, phase, 'rival_a', errMsg);
          });
        continue;
      }

      if (role === 'rival_b') {
        const config: RivalAgentBConfig = {
          debateId: sessionId,
          speakerId: 'rival-b',
          speakerRole: rivalSide === 'Proponent' ? 'pro2' : 'con2',
          side: rivalSide as 'Proponent' | 'Opponent',
          topic,
          phase,
          rigor,
          context: priorContext,
        };

        runRivalB(config, sessionId, phase, priorContext, priorQna)
          .then(({ output }) => {
            recordSpeakerOutput(sessionId, phase, 'rival_b', output);
            appendDebateMessage(userId, 'Rival Agent B', output);
          })
          .catch((err) => {
            const errMsg = `[RivalB error] ${err instanceof Error ? err.message : String(err)}`;
            recordSpeakerOutput(sessionId, phase, 'rival_b', errMsg);
          });
        continue;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Query helpers (for API routes)
  // ---------------------------------------------------------------------------

  static getTranscriptJson(sessionId: string) {
    return exportOutputsJson(sessionId);
  }

  static getThinksJson(sessionId: string) {
    return exportThinksJson(sessionId);
  }

  static getQnaJson(sessionId: string) {
    return getQnaForSession(sessionId);
  }
}
