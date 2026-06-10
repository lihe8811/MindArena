import { describe, expect, test } from 'bun:test';
import {
  DEBATE_PHASES,
  getDebateRoleName,
  getNextDebatePhase,
  phaseWaitsForUser,
} from '../../src/shared/debatePhases';

describe('debate phases', () => {
  test('matches the documented NHSDLC phase order exactly', () => {
    expect(DEBATE_PHASES).toEqual([
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
    ]);
    expect(getNextDebatePhase('setup')).toBe('judge_opening');
    expect(getNextDebatePhase('judge_feedback')).toBe('complete');
    expect(getNextDebatePhase('complete')).toBeNull();
  });

  test('waits only for phases owned by the selected speaker role', () => {
    expect(phaseWaitsForUser('constructive_pro', 'pro1')).toBe(true);
    expect(phaseWaitsForUser('summary_pro', 'pro1')).toBe(true);
    expect(phaseWaitsForUser('crossfire_1', 'pro1')).toBe(true);
    expect(phaseWaitsForUser('rebuttal_pro', 'pro1')).toBe(false);
    expect(phaseWaitsForUser('crossfire_2', 'pro1')).toBe(false);

    expect(phaseWaitsForUser('constructive_con', 'con1')).toBe(true);
    expect(phaseWaitsForUser('summary_con', 'con1')).toBe(true);
    expect(phaseWaitsForUser('crossfire_1', 'con1')).toBe(true);
    expect(phaseWaitsForUser('rebuttal_con', 'con1')).toBe(false);

    expect(phaseWaitsForUser('rebuttal_pro', 'pro2')).toBe(true);
    expect(phaseWaitsForUser('final_focus_pro', 'pro2')).toBe(true);
    expect(phaseWaitsForUser('crossfire_2', 'pro2')).toBe(true);
    expect(phaseWaitsForUser('constructive_pro', 'pro2')).toBe(false);

    expect(phaseWaitsForUser('rebuttal_con', 'con2')).toBe(true);
    expect(phaseWaitsForUser('final_focus_con', 'con2')).toBe(true);
    expect(phaseWaitsForUser('crossfire_2', 'con2')).toBe(true);
    expect(phaseWaitsForUser('constructive_con', 'con2')).toBe(false);

    for (const role of ['pro1', 'pro2', 'con1', 'con2'] as const) {
      expect(phaseWaitsForUser('grand_crossfire', role)).toBe(true);
      expect(phaseWaitsForUser('student_prep_optional', role)).toBe(false);
      expect(phaseWaitsForUser('judge_feedback', role)).toBe(false);
    }
  });

  test('provides formal names for every debate role', () => {
    expect(getDebateRoleName('pro1')).toBe('First Pro Speaker');
    expect(getDebateRoleName('pro2')).toBe('Second Pro Speaker');
    expect(getDebateRoleName('con1')).toBe('First Con Speaker');
    expect(getDebateRoleName('con2')).toBe('Second Con Speaker');
  });
});
