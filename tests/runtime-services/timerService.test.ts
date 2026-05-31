import { describe, it, expect, beforeEach } from 'bun:test';
import { timerService, type TimerConfig } from '@/server/services/timerService';

describe('TimerService', () => {
  beforeEach(() => {
    timerService.destroyAllDebateTimers('test-debate');
  });

  describe('Timer Creation', () => {
    it('should create a timer with valid config', () => {
      const timerId = timerService.createTimer('test-debate', {
        totalTimeMs: 60000,
        type: 'speech',
        speakerRole: 'first_speaker',
        speakerName: 'Test Speaker',
        phase: 'constructive',
      });

      expect(timerId).toBeDefined();
      expect(timerId.startsWith('timer_')).toBe(true);
    });

    it('should create a speech timer with correct duration', () => {
      const timerId = timerService.createSpeechTimer(
        'test-debate',
        'constructive',
        'first_speaker',
        'Test Speaker'
      );

      const state = timerService.getTimerState(timerId);
      expect(state).toBeDefined();
      expect(state?.totalTimeMs).toBe(4 * 60 * 1000);
      expect(state?.type).toBe('speech');
    });

    it('should create a prep timer with correct duration', () => {
      const timerId = timerService.createPrepTimer('test-debate', 'team1');

      const state = timerService.getTimerState(timerId);
      expect(state).toBeDefined();
      expect(state?.totalTimeMs).toBe(3 * 60 * 1000);
      expect(state?.type).toBe('prep');
    });
  });

  describe('Timer Control', () => {
    it('should start a timer successfully', () => {
      const timerId = timerService.createTimer('test-debate', {
        totalTimeMs: 60000,
        type: 'speech',
      });

      const started = timerService.startTimer(timerId);
      expect(started).toBe(true);

      const state = timerService.getTimerState(timerId);
      expect(state?.status).toBe('running');
    });

    it('should pause a running timer', () => {
      const timerId = timerService.createTimer('test-debate', {
        totalTimeMs: 60000,
        type: 'speech',
      });

      timerService.startTimer(timerId);
      const paused = timerService.pauseTimer(timerId);
      expect(paused).toBe(true);

      const state = timerService.getTimerState(timerId);
      expect(state?.status).toBe('paused');
    });

    it('should resume a paused timer', () => {
      const timerId = timerService.createTimer('test-debate', {
        totalTimeMs: 60000,
        type: 'speech',
      });

      timerService.startTimer(timerId);
      timerService.pauseTimer(timerId);
      const resumed = timerService.resumeTimer(timerId);
      expect(resumed).toBe(true);

      const state = timerService.getTimerState(timerId);
      expect(state?.status).toBe('running');
    });

    it('should stop a timer', () => {
      const timerId = timerService.createTimer('test-debate', {
        totalTimeMs: 60000,
        type: 'speech',
      });

      timerService.startTimer(timerId);
      const stopped = timerService.stopTimer(timerId);
      expect(stopped).toBe(true);

      const state = timerService.getTimerState(timerId);
      expect(state?.status).toBe('idle');
    });

    it('should reset a timer', () => {
      const timerId = timerService.createTimer('test-debate', {
        totalTimeMs: 60000,
        type: 'speech',
      });

      timerService.startTimer(timerId);
      timerService.pauseTimer(timerId);
      const reset = timerService.resetTimer(timerId);
      expect(reset).toBe(true);

      const state = timerService.getTimerState(timerId);
      expect(state?.status).toBe('idle');
      expect(state?.timeRemainingMs).toBe(60000);
    });
  });

  describe('Timer Expiration', () => {
    it('should expire timer when time runs out', (done) => {
      let expired = false;
      const timerId = timerService.createTimer('test-debate', {
        totalTimeMs: 100,
        type: 'speech',
        onExpire: () => {
          expired = true;
        },
      });

      timerService.startTimer(timerId);

      setTimeout(() => {
        const state = timerService.getTimerState(timerId);
        expect(state?.status).toBe('expired');
        expect(expired).toBe(true);
        done();
      }, 300);
    });
  });

  describe('Timer Queries', () => {
    it('should get all debate timers', () => {
      timerService.createTimer('test-debate', { totalTimeMs: 60000, type: 'speech' });
      timerService.createTimer('test-debate', { totalTimeMs: 180000, type: 'prep' });

      const timers = timerService.getDebateTimers('test-debate');
      expect(timers).toHaveLength(2);
    });

    it('should format time correctly', () => {
      expect(timerService.formatTimeRemaining(65000)).toBe('1:05');
      expect(timerService.formatTimeRemaining(60000)).toBe('1:00');
      expect(timerService.formatTimeRemaining(59000)).toBe('0:59');
      expect(timerService.formatTimeRemaining(3000)).toBe('0:03');
    });
  });

  describe('Timer Cleanup', () => {
    it('should destroy a timer', () => {
      const timerId = timerService.createTimer('test-debate', {
        totalTimeMs: 60000,
        type: 'speech',
      });

      const destroyed = timerService.destroyTimer(timerId);
      expect(destroyed).toBe(true);

      const state = timerService.getTimerState(timerId);
      expect(state).toBeNull();
    });

    it('should destroy all debate timers', () => {
      timerService.createTimer('test-debate', { totalTimeMs: 60000, type: 'speech' });
      timerService.createTimer('test-debate', { totalTimeMs: 180000, type: 'prep' });

      timerService.destroyAllDebateTimers('test-debate');

      const timers = timerService.getDebateTimers('test-debate');
      expect(timers).toHaveLength(0);
    });
  });

  describe('Timer Event Payloads', () => {
    it('should include all required fields in event payload', () => {
      const timerId = timerService.createTimer('test-debate', {
        totalTimeMs: 60000,
        type: 'speech',
        speakerRole: 'first_speaker',
        speakerName: 'Test Speaker',
        phase: 'constructive',
      });

      const state = timerService.getTimerState(timerId);
      expect(state).toBeDefined();
      expect(state?.timerId).toBe(timerId);
      expect(state?.debateId).toBe('test-debate');
      expect(state?.type).toBe('speech');
      expect(state?.speakerRole).toBe('first_speaker');
      expect(state?.speakerName).toBe('Test Speaker');
      expect(state?.phase).toBe('constructive');
      expect(state?.timestamp).toBeDefined();
    });
  });
});
