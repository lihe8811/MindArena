export type TimerType = 'speech' | 'prep' | 'crossfire';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'expired';

export interface TimerEventPayload {
  timerId: string;
  debateId: string;
  type: TimerType;
  status: TimerStatus;
  timeRemainingMs: number;
  totalTimeMs: number;
  speakerRole?: string;
  speakerName?: string;
  phase?: string;
  timestamp: number;
}

export interface TimerConfig {
  totalTimeMs: number;
  type: TimerType;
  speakerRole?: string;
  speakerName?: string;
  phase?: string;
  onTick?: (payload: TimerEventPayload) => void;
  onExpire?: (payload: TimerEventPayload) => void;
  onPause?: (payload: TimerEventPayload) => void;
  onResume?: (payload: TimerEventPayload) => void;
}

interface TimerState {
  timerId: string;
  debateId: string;
  config: TimerConfig;
  status: TimerStatus;
  timeRemainingMs: number;
  startedAt: number | null;
  pausedAt: number | null;
  intervalId: ReturnType<typeof setInterval> | null;
}

class TimerService {
  private timers: Map<string, TimerState> = new Map();
  private debateTimers: Map<string, Set<string>> = new Map();

  private generateTimerId(): string {
    return `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  createTimer(debateId: string, config: TimerConfig): string {
    const timerId = this.generateTimerId();
    const now = Date.now();

    const state: TimerState = {
      timerId,
      debateId,
      config,
      status: 'idle',
      timeRemainingMs: config.totalTimeMs,
      startedAt: null,
      pausedAt: null,
      intervalId: null,
    };

    this.timers.set(timerId, state);

    if (!this.debateTimers.has(debateId)) {
      this.debateTimers.set(debateId, new Set());
    }
    this.debateTimers.get(debateId)!.add(timerId);

    return timerId;
  }

  startTimer(timerId: string): boolean {
    const state = this.timers.get(timerId);
    if (!state || state.status === 'running' || state.status === 'expired') {
      return false;
    }

    const now = Date.now();
    state.status = 'running';
    state.startedAt = now;
    state.pausedAt = null;

    state.intervalId = setInterval(() => {
      this.tick(timerId);
    }, 100);

    return true;
  }

  pauseTimer(timerId: string): boolean {
    const state = this.timers.get(timerId);
    if (!state || state.status !== 'running') {
      return false;
    }

    const now = Date.now();
    state.status = 'paused';
    state.pausedAt = now;

    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }

    const payload = this.buildEventPayload(state);
    state.config.onPause?.(payload);

    return true;
  }

  resumeTimer(timerId: string): boolean {
    const state = this.timers.get(timerId);
    if (!state || state.status !== 'paused') {
      return false;
    }

    state.status = 'running';
    state.startedAt = Date.now() - (state.config.totalTimeMs - state.timeRemainingMs);
    state.pausedAt = null;

    state.intervalId = setInterval(() => {
      this.tick(timerId);
    }, 100);

    const payload = this.buildEventPayload(state);
    state.config.onResume?.(payload);

    return true;
  }

  stopTimer(timerId: string): boolean {
    const state = this.timers.get(timerId);
    if (!state) {
      return false;
    }

    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }

    state.status = 'idle';
    return true;
  }

  resetTimer(timerId: string): boolean {
    const state = this.timers.get(timerId);
    if (!state) {
      return false;
    }

    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }

    state.status = 'idle';
    state.timeRemainingMs = state.config.totalTimeMs;
    state.startedAt = null;
    state.pausedAt = null;

    return true;
  }

  destroyTimer(timerId: string): boolean {
    const state = this.timers.get(timerId);
    if (!state) {
      return false;
    }

    if (state.intervalId) {
      clearInterval(state.intervalId);
    }

    this.timers.delete(timerId);
    this.debateTimers.get(state.debateId)?.delete(timerId);

    return true;
  }

  destroyAllDebateTimers(debateId: string): void {
    const timerIds = this.debateTimers.get(debateId);
    if (!timerIds) return;

    for (const timerId of timerIds) {
      this.destroyTimer(timerId);
    }

    this.debateTimers.delete(debateId);
  }

  getTimerState(timerId: string): TimerEventPayload | null {
    const state = this.timers.get(timerId);
    if (!state) return null;

    return this.buildEventPayload(state);
  }

  getDebateTimers(debateId: string): TimerEventPayload[] {
    const timerIds = this.debateTimers.get(debateId);
    if (!timerIds) return [];

    return Array.from(timerIds)
      .map((id) => this.getTimerState(id))
      .filter((payload): payload is TimerEventPayload => payload !== null);
  }

  private tick(timerId: string): void {
    const state = this.timers.get(timerId);
    if (!state || state.status !== 'running') return;

    const now = Date.now();
    const elapsed = now - (state.startedAt ?? now);
    state.timeRemainingMs = Math.max(0, state.config.totalTimeMs - elapsed);

    const payload = this.buildEventPayload(state);
    state.config.onTick?.(payload);

    if (state.timeRemainingMs <= 0) {
      state.status = 'expired';
      if (state.intervalId) {
        clearInterval(state.intervalId);
        state.intervalId = null;
      }
      state.config.onExpire?.(payload);
    }
  }

  private buildEventPayload(state: TimerState): TimerEventPayload {
    return {
      timerId: state.timerId,
      debateId: state.debateId,
      type: state.config.type,
      status: state.status,
      timeRemainingMs: state.timeRemainingMs,
      totalTimeMs: state.config.totalTimeMs,
      speakerRole: state.config.speakerRole,
      speakerName: state.config.speakerName,
      phase: state.config.phase,
      timestamp: Date.now(),
    };
  }

  formatTimeRemaining(ms: number): string {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  createSpeechTimer(
    debateId: string,
    speechType: 'constructive' | 'rebuttal' | 'summary' | 'final_focus' | 'crossfire',
    speakerRole: string,
    speakerName: string,
    callbacks?: Pick<TimerConfig, 'onTick' | 'onExpire' | 'onPause' | 'onResume'>
  ): string {
    const speechDurations: Record<string, number> = {
      constructive: 4 * 60 * 1000,
      rebuttal: 4 * 60 * 1000,
      summary: 3 * 60 * 1000,
      final_focus: 2 * 60 * 1000,
      crossfire: 3 * 60 * 1000,
    };

    return this.createTimer(debateId, {
      totalTimeMs: speechDurations[speechType] ?? 4 * 60 * 1000,
      type: speechType === 'crossfire' ? 'crossfire' : 'speech',
      speakerRole,
      speakerName,
      phase: speechType,
      ...callbacks,
    });
  }

  createPrepTimer(
    debateId: string,
    teamId: string,
    totalPrepMs: number = 3 * 60 * 1000,
    callbacks?: Pick<TimerConfig, 'onTick' | 'onExpire' | 'onPause' | 'onResume'>
  ): string {
    return this.createTimer(debateId, {
      totalTimeMs: totalPrepMs,
      type: 'prep',
      speakerRole: `prep_${teamId}`,
      speakerName: `Prep Time (${teamId})`,
      phase: 'preparation',
      ...callbacks,
    });
  }
}

export const timerService = new TimerService();
