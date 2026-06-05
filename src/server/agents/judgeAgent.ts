import { DebatePhase } from '../orchestration/phases';
import { AgentCall, AgentCallResult } from '../orchestration/stateMachine';

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

export async function callJudgeAgent(
  agentCall: AgentCall,
  phase: DebatePhase,
  input: JudgeOpeningInput | JudgeDeliberationInput | JudgeFeedbackInput
): Promise<AgentCallResult> {
  switch (phase) {
    case 'judge_opening':
      return handleJudgeOpening(agentCall, input as JudgeOpeningInput);
    case 'judge_deliberation':
      return handleJudgeDeliberation(agentCall, input as JudgeDeliberationInput);
    case 'judge_feedback':
      return handleJudgeFeedback(agentCall, input as JudgeFeedbackInput);
    default:
      return {
        agentRole: 'judge',
        content: `[JUDGE] 裁判已就绪，等待阶段指令。`,
        timestamp: Date.now(),
      };
  }
}

async function handleJudgeOpening(
  agentCall: AgentCall,
  input: JudgeOpeningInput
): Promise<AgentCallResult> {
  const { topic, format, timeLimitMinutes } = input;

  const content = `[JUDGE OPENING] 欢迎来到本次辩论赛。

辩题：${topic}
赛制：${format}
总时长：${timeLimitMinutes} 分钟

规则说明：
1. 双方轮流发言，不得打断对方
2. 质询环节提问方有权打断，回答方需简洁回应
3. 裁判将根据论点质量、证据强度、反驳效果综合评判

现在，让我们开始第一轮立论。`;

  await simulateThinking(500);

  return {
    agentRole: 'judge',
    content,
    timestamp: Date.now(),
  };
}

async function handleJudgeDeliberation(
  agentCall: AgentCall,
  input: JudgeDeliberationInput
): Promise<AgentCallResult> {
  const { topic, transcript, studentSide } = input;

  const proArgs = extractArguments(transcript, 'pro');
  const conArgs = extractArguments(transcript, 'con');

  const content = `[JUDGE DELIBERATION] 裁判评议中...

--- 论点梳理 ---
正方核心论点：
${proArgs.map((a, i) => `${i + 1}. ${a}`).join('\n') || '（无明显论点）'}

反方核心论点：
${conArgs.map((a, i) => `${i + 1}. ${a}`).join('\n') || '（无明显论点）'}

--- 初步评估 ---
- 论证完整性：待评估
- 证据质量：待评估
- 反驳有效性：待评估

裁判正在综合评判双方表现...`;

  await simulateThinking(800);

  return {
    agentRole: 'judge',
    content,
    timestamp: Date.now(),
  };
}

async function handleJudgeFeedback(
  agentCall: AgentCall,
  input: JudgeFeedbackInput
): Promise<AgentCallResult> {
  const {
    winner,
    reason,
    studentSpeakerPoints,
    opponentSpeakerPoints,
    keyIssues,
    improvementSuggestions,
  } = input;

  const content = `[JUDGE FEEDBACK] 最终裁决

胜方：${winner === 'tie' ? '平局' : winner === 'pro' ? '正方' : '反方'}

裁决理由：
${reason}

评分：
- 学生方：${studentSpeakerPoints} 分
- 对手方：${opponentSpeakerPoints} 分

关键议题：
${keyIssues.map((issue, i) => `${i + 1}. ${issue}`).join('\n') || '无'}

改进建议：
${improvementSuggestions.map((s, i) => `${i + 1}. ${s}`).join('\n') || '无'}

感谢双方的精彩表现！`;

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

export function createMockJudgeInput(phase: DebatePhase): JudgeOpeningInput | JudgeDeliberationInput | JudgeFeedbackInput {
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
