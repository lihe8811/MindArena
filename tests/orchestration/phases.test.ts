import { describe, it, expect } from 'bun:test';
import type { DebatePhase } from '@/server/orchestration/phases';
import {
  PHASES,
  PHASE_TRANSITIONS,
  PHASE_CONFIGS,
  getNextPhase,
  isTerminalPhase,
  getPhaseIndex,
  getPhaseByIndex,
} from '@/server/orchestration/phases';

describe('Phase Definitions', () => {
  it('should have exactly 17 phases', () => {
    expect(PHASES).toHaveLength(17);
  });

  it('should start with setup and end with complete', () => {
    expect(PHASES[0]).toBe('setup');
    expect(PHASES[PHASES.length - 1]).toBe('complete');
  });

  it('should have correct phase ordering', () => {
    const expectedPhases: DebatePhase[] = [];
    let current: DebatePhase | null = 'setup';
    while (current) {
      expectedPhases.push(current);
      current = getNextPhase(current);
    }
    expect(PHASES).toEqual(expectedPhases);
  });
});

describe('Phase Transitions', () => {
  it('should transition setup -> judge_opening', () => {
    expect(getNextPhase('setup')).toBe('judge_opening');
  });

  it('should transition judge_opening -> student_prep_optional', () => {
    expect(getNextPhase('judge_opening')).toBe('student_prep_optional');
  });

  it('should transition student_prep_optional -> constructive_pro', () => {
    expect(getNextPhase('student_prep_optional')).toBe('constructive_pro');
  });

  it('should transition constructive_pro -> constructive_con', () => {
    expect(getNextPhase('constructive_pro')).toBe('constructive_con');
  });

  it('should transition constructive_con -> crossfire_1', () => {
    expect(getNextPhase('constructive_con')).toBe('crossfire_1');
  });

  it('should transition crossfire_1 -> rebuttal_pro', () => {
    expect(getNextPhase('crossfire_1')).toBe('rebuttal_pro');
  });

  it('should transition rebuttal_pro -> rebuttal_con', () => {
    expect(getNextPhase('rebuttal_pro')).toBe('rebuttal_con');
  });

  it('should transition rebuttal_con -> crossfire_2', () => {
    expect(getNextPhase('rebuttal_con')).toBe('crossfire_2');
  });

  it('should transition crossfire_2 -> summary_pro', () => {
    expect(getNextPhase('crossfire_2')).toBe('summary_pro');
  });

  it('should transition summary_pro -> summary_con', () => {
    expect(getNextPhase('summary_pro')).toBe('summary_con');
  });

  it('should transition summary_con -> grand_crossfire', () => {
    expect(getNextPhase('summary_con')).toBe('grand_crossfire');
  });

  it('should transition grand_crossfire -> final_focus_pro', () => {
    expect(getNextPhase('grand_crossfire')).toBe('final_focus_pro');
  });

  it('should transition final_focus_pro -> final_focus_con', () => {
    expect(getNextPhase('final_focus_pro')).toBe('final_focus_con');
  });

  it('should transition final_focus_con -> judge_deliberation', () => {
    expect(getNextPhase('final_focus_con')).toBe('judge_deliberation');
  });

  it('should transition judge_deliberation -> judge_feedback', () => {
    expect(getNextPhase('judge_deliberation')).toBe('judge_feedback');
  });

  it('should transition judge_feedback -> complete', () => {
    expect(getNextPhase('judge_feedback')).toBe('complete');
  });

  it('should return null for complete phase', () => {
    expect(getNextPhase('complete')).toBeNull();
  });

  it('should have no transitions for complete phase', () => {
    expect(PHASE_TRANSITIONS['complete']).toBeNull();
  });
});

describe('Terminal Phase', () => {
  it('should identify complete as terminal', () => {
    expect(isTerminalPhase('complete')).toBe(true);
  });

  it('should identify non-complete phases as non-terminal', () => {
    expect(isTerminalPhase('setup')).toBe(false);
    expect(isTerminalPhase('judge_opening')).toBe(false);
    expect(isTerminalPhase('judge_feedback')).toBe(false);
  });
});

describe('Phase Index Helpers', () => {
  it('should return correct phase index', () => {
    expect(getPhaseIndex('setup')).toBe(0);
    expect(getPhaseIndex('judge_opening')).toBe(1);
    expect(getPhaseIndex('complete')).toBe(16);
  });

  it('should return correct phase by index', () => {
    expect(getPhaseByIndex(0)).toBe('setup');
    expect(getPhaseByIndex(1)).toBe('judge_opening');
    expect(getPhaseByIndex(16)).toBe('complete');
  });

  it('should return null for out of bounds index', () => {
    expect(getPhaseByIndex(-1)).toBeNull();
    expect(getPhaseByIndex(17)).toBeNull();
  });
});

describe('Phase Configurations', () => {
  it('should have configuration for all phases', () => {
    for (const phase of PHASES) {
      expect(PHASE_CONFIGS[phase]).toBeDefined();
      expect(PHASE_CONFIGS[phase].phase).toBe(phase);
    }
  });

  it('should have correct agent calls for judge_opening', () => {
    const config = PHASE_CONFIGS['judge_opening'];
    expect(config.agentCalls).toHaveLength(1);
    expect(config.agentCalls[0].agentRole).toBe('judge');
    expect(config.agentCalls[0].mode).toBe('text');
  });

  it('should have correct agent calls for student_prep_optional', () => {
    const config = PHASE_CONFIGS['student_prep_optional'];
    expect(config.agentCalls).toHaveLength(1);
    expect(config.agentCalls[0].agentRole).toBe('teammate');
    expect(config.agentCalls[0].mode).toBe('text');
  });

  it('should have correct timer durations for speech phases', () => {
    expect(PHASE_CONFIGS['constructive_pro'].timerDurationSeconds).toBe(480);
    expect(PHASE_CONFIGS['constructive_con'].timerDurationSeconds).toBe(480);
    expect(PHASE_CONFIGS['crossfire_1'].timerDurationSeconds).toBe(180);
    expect(PHASE_CONFIGS['rebuttal_pro'].timerDurationSeconds).toBe(300);
    expect(PHASE_CONFIGS['rebuttal_con'].timerDurationSeconds).toBe(300);
    expect(PHASE_CONFIGS['crossfire_2'].timerDurationSeconds).toBe(180);
    expect(PHASE_CONFIGS['summary_pro'].timerDurationSeconds).toBe(180);
    expect(PHASE_CONFIGS['summary_con'].timerDurationSeconds).toBe(180);
    expect(PHASE_CONFIGS['grand_crossfire'].timerDurationSeconds).toBe(180);
    expect(PHASE_CONFIGS['final_focus_pro'].timerDurationSeconds).toBe(120);
    expect(PHASE_CONFIGS['final_focus_con'].timerDurationSeconds).toBe(120);
  });

  it('should not have timer for non-speech phases', () => {
    expect(PHASE_CONFIGS['setup'].timerDurationSeconds).toBeUndefined();
    expect(PHASE_CONFIGS['judge_opening'].timerDurationSeconds).toBeUndefined();
    expect(PHASE_CONFIGS['judge_deliberation'].timerDurationSeconds).toBeUndefined();
    expect(PHASE_CONFIGS['judge_feedback'].timerDurationSeconds).toBeUndefined();
    expect(PHASE_CONFIGS['complete'].timerDurationSeconds).toBeUndefined();
  });

  it('should allow student input for speech and crossfire phases', () => {
    expect(PHASE_CONFIGS['constructive_pro'].allowsStudentInput).toBe(true);
    expect(PHASE_CONFIGS['crossfire_1'].allowsStudentInput).toBe(true);
    expect(PHASE_CONFIGS['rebuttal_pro'].allowsStudentInput).toBe(true);
    expect(PHASE_CONFIGS['grand_crossfire'].allowsStudentInput).toBe(true);
    expect(PHASE_CONFIGS['final_focus_pro'].allowsStudentInput).toBe(true);
  });

  it('should not allow student input for judge phases', () => {
    expect(PHASE_CONFIGS['judge_opening'].allowsStudentInput).toBe(false);
    expect(PHASE_CONFIGS['judge_deliberation'].allowsStudentInput).toBe(false);
    expect(PHASE_CONFIGS['judge_feedback'].allowsStudentInput).toBe(false);
  });

  it('should allow prep time only for student_prep_optional', () => {
    expect(PHASE_CONFIGS['student_prep_optional'].allowsPrepTime).toBe(true);
    expect(PHASE_CONFIGS['setup'].allowsPrepTime).toBe(false);
    expect(PHASE_CONFIGS['constructive_pro'].allowsPrepTime).toBe(false);
  });
});