import { describe, it, expect, beforeEach } from 'bun:test';
import { rulesMarshal } from '@/server/services/rulesMarshal';

describe('RulesMarshal', () => {
  beforeEach(() => {
    rulesMarshal.clearDebateRecords('test-debate');
  });

  describe('Wrong Side Detection', () => {
    it('should detect PRO team arguing CON position', () => {
      const result = rulesMarshal.checkWrongSide(
        'test-debate',
        'pro',
        'We oppose this resolution because it causes harm. The con side is correct.',
        'rebuttal'
      );

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('wrong_side');
      expect(result.violations[0].severity).toBe('critical');
    });

    it('should detect CON team arguing PRO position', () => {
      const result = rulesMarshal.checkWrongSide(
        'test-debate',
        'con',
        'We support this resolution. It is beneficial. We affirm the pro side.',
        'rebuttal'
      );

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('wrong_side');
    });

    it('should pass when PRO argues PRO', () => {
      const result = rulesMarshal.checkWrongSide(
        'test-debate',
        'pro',
        'We support this resolution. Our argument shows clear benefits.',
        'rebuttal'
      );

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should not check wrong side before rebuttal', () => {
      const result = rulesMarshal.checkWrongSide(
        'test-debate',
        'pro',
        'We oppose this resolution',
        'constructive'
      );

      expect(result.passed).toBe(true);
    });
  });

  describe('Speaker Role Checks', () => {
    it('should allow first speaker in constructive', () => {
      const result = rulesMarshal.checkSpeakerRole(
        'test-debate',
        'speaker1',
        'first_speaker',
        'constructive'
      );

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow first speaker in summary', () => {
      const result = rulesMarshal.checkSpeakerRole(
        'test-debate',
        'speaker1',
        'first_speaker',
        'summary'
      );

      expect(result.passed).toBe(true);
    });

    it('should not allow first speaker in rebuttal', () => {
      const result = rulesMarshal.checkSpeakerRole(
        'test-debate',
        'speaker1',
        'first_speaker',
        'rebuttal'
      );

      expect(result.passed).toBe(false);
      expect(result.violations[0].type).toBe('wrong_speaker_role');
    });

    it('should allow second speaker in rebuttal', () => {
      const result = rulesMarshal.checkSpeakerRole(
        'test-debate',
        'speaker2',
        'second_speaker',
        'rebuttal'
      );

      expect(result.passed).toBe(true);
    });

    it('should allow second speaker in final focus', () => {
      const result = rulesMarshal.checkSpeakerRole(
        'test-debate',
        'speaker2',
        'second_speaker',
        'final_focus'
      );

      expect(result.passed).toBe(true);
    });

    it('should not allow second speaker in constructive', () => {
      const result = rulesMarshal.checkSpeakerRole(
        'test-debate',
        'speaker2',
        'second_speaker',
        'constructive'
      );

      expect(result.passed).toBe(false);
    });

    it('should allow any speaker in crossfire', () => {
      const result1 = rulesMarshal.checkSpeakerRole(
        'test-debate',
        'speaker1',
        'first_speaker',
        'crossfire_1'
      );

      const result2 = rulesMarshal.checkSpeakerRole(
        'test-debate',
        'speaker2',
        'second_speaker',
        'crossfire_2'
      );

      expect(result1.passed).toBe(true);
      expect(result2.passed).toBe(true);
    });
  });

  describe('Prep Time Checks', () => {
    it('should initialize prep time', () => {
      rulesMarshal.initializePrepTime('team1', 3 * 60 * 1000);
      const record = rulesMarshal.getPrepTimeRecord('team1');

      expect(record).toBeDefined();
      expect(record?.totalAllocatedMs).toBe(180000);
      expect(record?.remainingMs).toBe(180000);
    });

    it('should record prep session', () => {
      rulesMarshal.initializePrepTime('team1', 3 * 60 * 1000);
      const success = rulesMarshal.recordPrepSession('team1', 30000, 'constructive');

      expect(success).toBe(true);

      const record = rulesMarshal.getPrepTimeRecord('team1');
      expect(record?.usedMs).toBe(30000);
      expect(record?.remainingMs).toBe(150000);
      expect(record?.sessions).toHaveLength(1);
    });

    it('should not allow prep exceeding remaining time', () => {
      rulesMarshal.initializePrepTime('team1', 60000);
      const success = rulesMarshal.recordPrepSession('team1', 120000, 'constructive');

      expect(success).toBe(false);
    });

    it('should detect illegal prep during speech', () => {
      const result = rulesMarshal.checkIllegalPrepTiming(
        'test-debate',
        'team1',
        'constructive',
        true
      );

      expect(result.passed).toBe(false);
      expect(result.violations[0].type).toBe('prep_during_speech');
    });

    it('should detect illegal prep during crossfire', () => {
      const result = rulesMarshal.checkIllegalPrepTiming(
        'test-debate',
        'team1',
        'crossfire_1',
        true
      );

      expect(result.passed).toBe(false);
      expect(result.violations[0].type).toBe('prep_during_crossfire');
    });

    it('should allow prep when not running', () => {
      const result = rulesMarshal.checkIllegalPrepTiming(
        'test-debate',
        'team1',
        'constructive',
        false
      );

      expect(result.passed).toBe(true);
    });
  });

  describe('Partner Assistance Checks', () => {
    it('should detect excessive partner assistance', () => {
      const assistanceEvents = [
        { timestamp: 1000, type: 'whisper' },
        { timestamp: 2000, type: 'note_pass' },
        { timestamp: 3000, type: 'gesture' },
      ];

      const result = rulesMarshal.checkExcessivePartnerAssistance(
        'test-debate',
        'speaker1',
        'partner1',
        assistanceEvents
      );

      expect(result.passed).toBe(false);
      expect(result.violations[0].type).toBe('excessive_partner_assistance');
    });

    it('should not flag assistance within threshold', () => {
      const assistanceEvents = [
        { timestamp: 1000, type: 'whisper' },
        { timestamp: 70000, type: 'note_pass' },
      ];

      const result = rulesMarshal.checkExcessivePartnerAssistance(
        'test-debate',
        'speaker1',
        'partner1',
        assistanceEvents
      );

      expect(result.passed).toBe(true);
    });

    it('should warn about assistance events', () => {
      const assistanceEvents = [
        { timestamp: 1000, type: 'whisper' },
        { timestamp: 2000, type: 'note_pass' },
      ];

      const result = rulesMarshal.checkExcessivePartnerAssistance(
        'test-debate',
        'speaker1',
        'partner1',
        assistanceEvents
      );

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('New Final Focus Argument Detection', () => {
    it('should detect new arguments in final focus', () => {
      // First, record an argument in final focus (simulating previous speeches)
      rulesMarshal.checkNewFinalFocusArgument(
        'test-debate',
        'speaker1',
        'Our first contention is that space exploration benefits humanity because it drives innovation.',
        []
      );

      // Now check for new arguments - include 'final_focus' in previous phases since that's how they're recorded
      const previousPhases: Array<'constructive' | 'rebuttal' | 'final_focus'> = ['constructive', 'rebuttal', 'final_focus'];
      const result = rulesMarshal.checkNewFinalFocusArgument(
        'test-debate',
        'speaker2',
        'A new contention about healthcare reform that was never discussed before in this debate.',
        previousPhases
      );

      expect(result.passed).toBe(false);
      expect(result.violations[0].type).toBe('new_final_focus_argument');
    });

    it('should allow analysis in final focus', () => {
      // First, record an argument in final focus (simulating previous speeches)
      rulesMarshal.checkNewFinalFocusArgument(
        'test-debate',
        'speaker1',
        'Our contention is that space exploration benefits humanity.',
        []
      );

      // Now check for analysis in final focus (should be allowed - refers to existing argument)
      const previousPhases: Array<'constructive' | 'rebuttal' | 'final_focus'> = ['constructive', 'rebuttal', 'final_focus'];
      const result = rulesMarshal.checkNewFinalFocusArgument(
        'test-debate',
        'speaker2',
        'Our contention is that space exploration benefits humanity and we win.',
        previousPhases
      );

      expect(result.passed).toBe(true);
    });
  });

  describe('Violation Management', () => {
    it('should get debate violations', () => {
      rulesMarshal.checkWrongSide('test-debate', 'pro', 'We oppose', 'rebuttal');
      rulesMarshal.checkSpeakerRole('test-debate', 'speaker1', 'first_speaker', 'rebuttal');

      const violations = rulesMarshal.getDebateViolations('test-debate');
      expect(violations.length).toBeGreaterThanOrEqual(2);
    });

    it('should get speaker violations', () => {
      rulesMarshal.checkSpeakerRole('test-debate', 'speaker1', 'first_speaker', 'rebuttal');

      const violations = rulesMarshal.getSpeakerViolations('test-debate', 'speaker1');
      expect(violations.length).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should clear debate records', () => {
      rulesMarshal.checkSpeakerRole('test-debate', 'speaker1', 'first_speaker', 'constructive');
      rulesMarshal.initializePrepTime('team1', 180000);

      rulesMarshal.clearDebateRecords('test-debate');

      const violations = rulesMarshal.getDebateViolations('test-debate');
      expect(violations).toHaveLength(0);
    });
  });
});
