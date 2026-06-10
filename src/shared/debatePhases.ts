import type { DebateParticipantId } from './types';

export const DEBATE_PHASES = [
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
] as const;

export type DebatePhase = (typeof DEBATE_PHASES)[number];

export const DEBATE_ROLE_NAMES: Record<DebateParticipantId, string> = {
  pro1: 'First Pro Speaker',
  pro2: 'Second Pro Speaker',
  con1: 'First Con Speaker',
  con2: 'Second Con Speaker',
};

const USER_PHASES_BY_ROLE: Record<DebateParticipantId, ReadonlySet<DebatePhase>> = {
  pro1: new Set(['constructive_pro', 'crossfire_1', 'summary_pro', 'grand_crossfire']),
  pro2: new Set(['rebuttal_pro', 'crossfire_2', 'grand_crossfire', 'final_focus_pro']),
  con1: new Set(['constructive_con', 'crossfire_1', 'summary_con', 'grand_crossfire']),
  con2: new Set(['rebuttal_con', 'crossfire_2', 'grand_crossfire', 'final_focus_con']),
};

export function getNextDebatePhase(phase: DebatePhase): DebatePhase | null {
  const currentIndex = DEBATE_PHASES.indexOf(phase);
  return DEBATE_PHASES[currentIndex + 1] ?? null;
}

export function phaseWaitsForUser(
  phase: DebatePhase,
  speakerRole: DebateParticipantId,
) {
  return USER_PHASES_BY_ROLE[speakerRole].has(phase);
}

export function getUserPhasesForRole(role: DebateParticipantId) {
  return [...USER_PHASES_BY_ROLE[role]];
}

export function getDebateRoleName(role: DebateParticipantId) {
  return DEBATE_ROLE_NAMES[role];
}
