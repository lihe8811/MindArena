import { Agent, run } from '@openai/agents';
import fs from 'node:fs';
import path from 'node:path';

export type JudgePhase = 'judge_opening' | 'judge_deliberation' | 'judge_feedback';

export interface JudgeOpeningInput {
  topic: string;
  format: string;
  timeLimitMinutes: number;
}

export interface JudgeDeliberationInput {
  topic: string;
  transcript: string[];
  studentSide: 'pro' | 'con';
}

export interface JudgeFeedbackInput {
  winner: 'pro' | 'con' | 'tie';
  reason: string;
  studentSpeakerPoints: number;
  opponentSpeakerPoints: number;
  keyIssues: string[];
  improvementSuggestions: string[];
}

export interface JudgeDecision {
  winner: 'pro' | 'con' | 'tie';
  reasonForDecision: string;
  studentSpeakerPoints: number;
  opponentSpeakerPoints: number;
  keyIssues: string[];
  ruleNotes: string[];
  improvementSuggestions: string[];
}

export interface JudgeAgentResult {
  agentRole: 'judge';
  content: string;
  timestamp: number;
}

export type JudgeAgentInput = {
  phase: JudgePhase;
  input: JudgeOpeningInput | JudgeDeliberationInput | JudgeFeedbackInput;
};

export async function callJudgeAgent(
  phase: JudgePhase,
  input: JudgeOpeningInput | JudgeDeliberationInput | JudgeFeedbackInput
): Promise<JudgeAgentResult> {
  if (!process.env.OPENAI_API_KEY) {
    return handleMockJudgeAgent(phase, input);
  }

  const agent = await createJudgeAgent(phase, input);
  const result = await run(agent, 'Please deliver your judge response for this phase.');
  const content = typeof result.finalOutput === 'string'
    ? result.finalOutput
    : JSON.stringify(result.finalOutput);

  return {
    agentRole: 'judge',
    content,
    timestamp: Date.now(),
  };
}

export async function createJudgeAgent(
  phase: JudgePhase,
  input: JudgeOpeningInput | JudgeDeliberationInput | JudgeFeedbackInput,
): Promise<Agent> {
  const promptPath = path.join(import.meta.dir, '../prompts/judge.md');
  const template = fs.readFileSync(promptPath, 'utf-8');

  const phaseInstructions = getPhaseInstructions(phase);
  const context = buildJudgeContext(phase, input);

  const instructions = template
    .replace(/{{phase}}/g, phase)
    .replace(/{{phaseInstructions}}/g, phaseInstructions)
    .replace(/{{topic}}/g, context.topic)
    .replace(/{{format}}/g, context.format)
    .replace(/{{studentSide}}/g, context.studentSide)
    .replace(/{{timeLimitMinutes}}/g, String(context.timeLimitMinutes))
    .replace(/{{transcript}}/g, context.transcript)
    .replace(/{{deliberationInput}}/g, context.deliberationInput)
    .replace(/{{feedbackInput}}/g, context.feedbackInput);

  return new Agent({
    name: 'Judge Agent',
    instructions,
    handoffs: [],
  });
}

function getPhaseInstructions(phase: JudgePhase): string {
  switch (phase) {
    case 'judge_opening':
      return `Welcome the debaters and the audience. State the resolution, the format, the time limits, and the basic rules of engagement. Keep the tone formal and encouraging.`;
    case 'judge_deliberation':
      return `Review the arguments presented so far. Summarize the key claims on both sides, identify the clash points, and explain what you are weighing as you form your decision. Do not deliver a final verdict yet.`;
    case 'judge_feedback':
      return `Deliver the final verdict. Name the winner, explain the reasoning, provide speaker points, highlight the key issues that decided the round, and offer concrete improvement suggestions for both sides.`;
    default:
      return `Provide a helpful judge response.`;
  }
}

function buildJudgeContext(
  phase: JudgePhase,
  input: JudgeOpeningInput | JudgeDeliberationInput | JudgeFeedbackInput,
) {
  const defaults = {
    topic: 'Unknown resolution',
    format: 'NHSDLC Public Forum',
    studentSide: 'pro',
    timeLimitMinutes: 40,
    transcript: '',
    deliberationInput: '',
    feedbackInput: '',
  };

  if (phase === 'judge_opening') {
    const opening = input as JudgeOpeningInput;
    return {
      ...defaults,
      topic: opening.topic,
      format: opening.format,
      timeLimitMinutes: opening.timeLimitMinutes,
    };
  }

  if (phase === 'judge_deliberation') {
    const deliberation = input as JudgeDeliberationInput;
    return {
      ...defaults,
      topic: deliberation.topic,
      studentSide: deliberation.studentSide,
      transcript: deliberation.transcript.length
        ? `## Transcript\n\n${deliberation.transcript.join('\n')}`
        : '',
      deliberationInput: `The student is arguing on the ${deliberation.studentSide} side.`,
    };
  }

  const feedback = input as JudgeFeedbackInput;
  return {
    ...defaults,
    feedbackInput: `## Proposed Verdict\n\n- Winner: ${feedback.winner}\n- Reason: ${feedback.reason}\n- Student speaker points: ${feedback.studentSpeakerPoints}\n- Opponent speaker points: ${feedback.opponentSpeakerPoints}\n- Key issues: ${feedback.keyIssues.join(', ')}\n- Improvement suggestions: ${feedback.improvementSuggestions.join(', ')}`,
  };
}

async function handleMockJudgeAgent(
  phase: JudgePhase,
  input: JudgeOpeningInput | JudgeDeliberationInput | JudgeFeedbackInput,
): Promise<JudgeAgentResult> {
  switch (phase) {
    case 'judge_opening':
      return handleJudgeOpening(input as JudgeOpeningInput);
    case 'judge_deliberation':
      return handleJudgeDeliberation(input as JudgeDeliberationInput);
    case 'judge_feedback':
      return handleJudgeFeedback(input as JudgeFeedbackInput);
    default:
      return {
        agentRole: 'judge',
        content: `[JUDGE] 裁判已就绪，等待阶段指令。`,
        timestamp: Date.now(),
      };
  }
}

async function handleJudgeOpening(input: JudgeOpeningInput): Promise<JudgeAgentResult> {
  const { topic, format, timeLimitMinutes } = input;

  const content = `[JUDGE OPENING] 欢迎来到本次辩论赛。\n\n辩题：${topic}\n赛制：${format}\n总时长：${timeLimitMinutes} 分钟\n\n规则说明：\n1. 双方轮流发言，不得打断对方\n2. 质询环节提问方有权打断，回答方需简洁回应\n3. 裁判将根据论点质量、证据强度、反驳效果综合评判\n\n现在，让我们开始第一轮立论。`;

  await simulateThinking(500);

  return {
    agentRole: 'judge',
    content,
    timestamp: Date.now(),
  };
}

async function handleJudgeDeliberation(
  input: JudgeDeliberationInput,
): Promise<JudgeAgentResult> {
  const { topic, transcript, studentSide } = input;

  const proArgs = extractArguments(transcript, 'pro');
  const conArgs = extractArguments(transcript, 'con');

  const content = `[JUDGE DELIBERATION] 裁判评议中...\n\n--- 论点梳理 ---\n正方核心论点：\n${proArgs.map((a, i) => `${i + 1}. ${a}`).join('\n') || '（无明显论点）'}\n\n反方核心论点：\n${conArgs.map((a, i) => `${i + 1}. ${a}`).join('\n') || '（无明显论点）'}\n\n--- 初步评估 ---\n- 论证完整性：待评估\n- 证据质量：待评估\n- 反驳有效性：待评估\n\n裁判正在综合评判双方表现...`;

  await simulateThinking(800);

  return {
    agentRole: 'judge',
    content,
    timestamp: Date.now(),
  };
}

async function handleJudgeFeedback(input: JudgeFeedbackInput): Promise<JudgeAgentResult> {
  const {
    winner,
    reason,
    studentSpeakerPoints,
    opponentSpeakerPoints,
    keyIssues,
    improvementSuggestions,
  } = input;

  const content = `[JUDGE FEEDBACK] 最终裁决\n\n胜方：${winner === 'tie' ? '平局' : winner === 'pro' ? '正方' : '反方'}\n\n裁决理由：\n${reason}\n\n评分：\n- 学生方：${studentSpeakerPoints} 分\n- 对手方：${opponentSpeakerPoints} 分\n\n关键议题：\n${keyIssues.map((issue, i) => `${i + 1}. ${issue}`).join('\n') || '无'}\n\n改进建议：\n${improvementSuggestions.map((s, i) => `${i + 1}. ${s}`).join('\n') || '无'}\n\n感谢双方的精彩表现！`;

  await simulateThinking(600);

  return {
    agentRole: 'judge',
    content,
    timestamp: Date.now(),
  };
}

function extractArguments(transcript: string[], side: 'pro' | 'con'): string[] {
  const prefix = side === 'pro' ? '[PRO]' : '[CON]';
  return transcript
    .filter((line) => line.startsWith(prefix))
    .map((line) => line.replace(prefix, '').trim())
    .slice(0, 3);
}

function simulateThinking(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockJudgeInput(
  phase: JudgePhase,
): JudgeOpeningInput | JudgeDeliberationInput | JudgeFeedbackInput {
  switch (phase) {
    case 'judge_opening':
      return {
        topic: 'Technology has done more harm than good',
        format: 'NHSDLC Public Forum',
        timeLimitMinutes: 40,
      };
    case 'judge_deliberation':
      return {
        topic: 'Technology has done more harm than good',
        transcript: [],
        studentSide: 'pro',
      };
    case 'judge_feedback':
      return {
        winner: 'pro',
        reason: '正方在论证深度和证据质量上表现更优',
        studentSpeakerPoints: 85,
        opponentSpeakerPoints: 78,
        keyIssues: ['技术对就业的影响', '隐私与数据安全', '数字鸿沟'],
        improvementSuggestions: ['增强反驳针对性', '引用更多权威数据'],
      };
    default:
      return {
        topic: 'Unknown',
        format: 'Unknown',
        timeLimitMinutes: 0,
      } as JudgeOpeningInput;
  }
}
