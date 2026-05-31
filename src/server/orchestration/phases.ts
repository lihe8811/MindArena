export type DebatePhase =
  | 'setup'
  | 'judge_opening'
  | 'student_prep_optional'
  | 'constructive_pro'
  | 'constructive_con'
  | 'crossfire_1'
  | 'rebuttal_pro'
  | 'rebuttal_con'
  | 'crossfire_2'
  | 'summary_pro'
  | 'summary_con'
  | 'grand_crossfire'
  | 'final_focus_pro'
  | 'final_focus_con'
  | 'judge_deliberation'
  | 'judge_feedback'
  | 'complete';

export type AgentRole = 'judge' | 'rival_a' | 'rival_b' | 'teammate';

export type AgentMode = 'text' | 'realtime';

export type DebateSide = 'pro' | 'con';

export type SpeakerRole = 'first_speaker' | 'second_speaker';

export const PHASES: DebatePhase[] = [
  'setup',
  'judge_opening',
  'student_prep_optional',
  'constructive_pro',
  'constructive_con',
  'crossfire_1',
  'rebuttal_pro',
  'rebuttal_con',
  'crossfire_2',
  'summary_pro',
  'summary_con',
  'grand_crossfire',
  'final_focus_pro',
  'final_focus_con',
  'judge_deliberation',
  'judge_feedback',
  'complete',
];

export const PHASE_TRANSITIONS: Record<DebatePhase, DebatePhase | null> = {
  setup: 'judge_opening',
  judge_opening: 'student_prep_optional',
  student_prep_optional: 'constructive_pro',
  constructive_pro: 'constructive_con',
  constructive_con: 'crossfire_1',
  crossfire_1: 'rebuttal_pro',
  rebuttal_pro: 'rebuttal_con',
  rebuttal_con: 'crossfire_2',
  crossfire_2: 'summary_pro',
  summary_pro: 'summary_con',
  summary_con: 'grand_crossfire',
  grand_crossfire: 'final_focus_pro',
  final_focus_pro: 'final_focus_con',
  final_focus_con: 'judge_deliberation',
  judge_deliberation: 'judge_feedback',
  judge_feedback: 'complete',
  complete: null,
};

export interface PhaseAgentCall {
  agentRole: AgentRole;
  mode: AgentMode;
  description: string;
}

export interface PhaseConfig {
  phase: DebatePhase;
  description: string;
  agentCalls: PhaseAgentCall[];
  allowsStudentInput: boolean;
  allowsPrepTime: boolean;
  timerDurationSeconds?: number;
}

export const PHASE_CONFIGS: Record<DebatePhase, PhaseConfig> = {
  setup: {
    phase: 'setup',
    description: '初始化设置',
    agentCalls: [],
    allowsStudentInput: false,
    allowsPrepTime: false,
  },
  judge_opening: {
    phase: 'judge_opening',
    description: '裁判开场介绍规则',
    agentCalls: [
      { agentRole: 'judge', mode: 'text', description: '介绍规则、辩题、格式约束、时间限制' },
    ],
    allowsStudentInput: false,
    allowsPrepTime: false,
  },
  student_prep_optional: {
    phase: 'student_prep_optional',
    description: '学生可选准备时间',
    agentCalls: [
      { agentRole: 'teammate', mode: 'text', description: '提供战略建议、反驳框架、论点权衡、清晰度改进' },
    ],
    allowsStudentInput: true,
    allowsPrepTime: true,
  },
  constructive_pro: {
    phase: 'constructive_pro',
    description: '正方立论',
    agentCalls: [
      { agentRole: 'rival_a', mode: 'text', description: '正方一辩立论（非学生方时）' },
      { agentRole: 'rival_b', mode: 'text', description: '正方二辩立论（非学生方时）' },
    ],
    allowsStudentInput: true,
    allowsPrepTime: false,
    timerDurationSeconds: 480,
  },
  constructive_con: {
    phase: 'constructive_con',
    description: '反方立论',
    agentCalls: [
      { agentRole: 'rival_a', mode: 'text', description: '反方一辩立论（非学生方时）' },
      { agentRole: 'rival_b', mode: 'text', description: '反方二辩立论（非学生方时）' },
    ],
    allowsStudentInput: true,
    allowsPrepTime: false,
    timerDurationSeconds: 480,
  },
  crossfire_1: {
    phase: 'crossfire_1',
    description: '第一轮交叉质询',
    agentCalls: [
      { agentRole: 'rival_a', mode: 'text', description: '与学生进行交叉质询' },
    ],
    allowsStudentInput: true,
    allowsPrepTime: false,
    timerDurationSeconds: 180,
  },
  rebuttal_pro: {
    phase: 'rebuttal_pro',
    description: '正方反驳',
    agentCalls: [
      { agentRole: 'rival_a', mode: 'text', description: '正方二辩反驳（非学生方时）' },
      { agentRole: 'rival_b', mode: 'text', description: '正方一辩反驳（非学生方时）' },
    ],
    allowsStudentInput: true,
    allowsPrepTime: false,
    timerDurationSeconds: 300,
  },
  rebuttal_con: {
    phase: 'rebuttal_con',
    description: '反方反驳',
    agentCalls: [
      { agentRole: 'rival_a', mode: 'text', description: '反方二辩反驳（非学生方时）' },
      { agentRole: 'rival_b', mode: 'text', description: '反方一辩反驳（非学生方时）' },
    ],
    allowsStudentInput: true,
    allowsPrepTime: false,
    timerDurationSeconds: 300,
  },
  crossfire_2: {
    phase: 'crossfire_2',
    description: '第二轮交叉质询',
    agentCalls: [
      { agentRole: 'rival_a', mode: 'text', description: '与学生进行交叉质询' },
    ],
    allowsStudentInput: true,
    allowsPrepTime: false,
    timerDurationSeconds: 180,
  },
  summary_pro: {
    phase: 'summary_pro',
    description: '正方总结',
    agentCalls: [
      { agentRole: 'rival_a', mode: 'text', description: '正方二辩总结（非学生方时）' },
      { agentRole: 'rival_b', mode: 'text', description: '正方一辩总结（非学生方时）' },
    ],
    allowsStudentInput: true,
    allowsPrepTime: false,
    timerDurationSeconds: 180,
  },
  summary_con: {
    phase: 'summary_con',
    description: '反方总结',
    agentCalls: [
      { agentRole: 'rival_a', mode: 'text', description: '反方二辩总结（非学生方时）' },
      { agentRole: 'rival_b', mode: 'text', description: '反方一辩总结（非学生方时）' },
    ],
    allowsStudentInput: true,
    allowsPrepTime: false,
    timerDurationSeconds: 180,
  },
  grand_crossfire: {
    phase: 'grand_crossfire',
    description: '大交叉质询',
    agentCalls: [
      { agentRole: 'rival_a', mode: 'text', description: '参与大交叉质询' },
      { agentRole: 'rival_b', mode: 'text', description: '参与大交叉质询' },
      { agentRole: 'teammate', mode: 'text', description: '辅助学生参与大交叉质询' },
    ],
    allowsStudentInput: true,
    allowsPrepTime: false,
    timerDurationSeconds: 180,
  },
  final_focus_pro: {
    phase: 'final_focus_pro',
    description: '正方最终陈词',
    agentCalls: [
      { agentRole: 'rival_a', mode: 'text', description: '正方一辩最终陈词（非学生方时）' },
      { agentRole: 'rival_b', mode: 'text', description: '正方二辩最终陈词（非学生方时）' },
    ],
    allowsStudentInput: true,
    allowsPrepTime: false,
    timerDurationSeconds: 120,
  },
  final_focus_con: {
    phase: 'final_focus_con',
    description: '反方最终陈词',
    agentCalls: [
      { agentRole: 'rival_a', mode: 'text', description: '反方一辩最终陈词（非学生方时）' },
      { agentRole: 'rival_b', mode: 'text', description: '反方二辩最终陈词（非学生方时）' },
    ],
    allowsStudentInput: true,
    allowsPrepTime: false,
    timerDurationSeconds: 120,
  },
  judge_deliberation: {
    phase: 'judge_deliberation',
    description: '裁判评议',
    agentCalls: [
      { agentRole: 'judge', mode: 'text', description: '内部评议，决定胜负、评分、关键问题' },
    ],
    allowsStudentInput: false,
    allowsPrepTime: false,
  },
  judge_feedback: {
    phase: 'judge_feedback',
    description: '裁判反馈',
    agentCalls: [
      { agentRole: 'judge', mode: 'text', description: '输出结构化反馈（winner, reason, speaker_points, key_issues, improvement_suggestions）' },
    ],
    allowsStudentInput: false,
    allowsPrepTime: false,
  },
  complete: {
    phase: 'complete',
    description: '辩论结束',
    agentCalls: [],
    allowsStudentInput: false,
    allowsPrepTime: false,
  },
};

export function getNextPhase(currentPhase: DebatePhase): DebatePhase | null {
  return PHASE_TRANSITIONS[currentPhase];
}

export function isTerminalPhase(phase: DebatePhase): boolean {
  return phase === 'complete';
}

export function getPhaseIndex(phase: DebatePhase): number {
  return PHASES.indexOf(phase);
}

export function getPhaseByIndex(index: number): DebatePhase | null {
  return PHASES[index] || null;
}