import { describe, it, expect } from 'bun:test';
import type { DebatePhase } from '@/server/orchestration/phases';
import { getNextPhase } from '@/server/orchestration/phases';
import { RoundStateMachine } from '@/server/orchestration/stateMachine';

describe('RoundStateMachine - Initialization', () => {
  it('should initialize with correct state for pro first speaker', () => {
    const machine = new RoundStateMachine('session-1', 'pro', 'first_speaker');
    const state = machine.getState();

    expect(state.sessionId).toBe('session-1');
    expect(state.phase).toBe('setup');
    expect(state.studentSide).toBe('pro');
    expect(state.studentSpeakerRole).toBe('first_speaker');
    expect(state.rivalASpeakerRole).toBe('first_speaker');
    expect(state.rivalBSpeakerRole).toBe('second_speaker');
    expect(state.prepTimeRemainingStudent).toBe(480);
    expect(state.prepTimeRemainingOpponent).toBe(480);
    expect(state.speechTimeRemaining).toBe(0);
  });

  it('should initialize with correct state for pro second speaker', () => {
    const machine = new RoundStateMachine('session-2', 'pro', 'second_speaker');
    const state = machine.getState();

    expect(state.sessionId).toBe('session-2');
    expect(state.studentSide).toBe('pro');
    expect(state.studentSpeakerRole).toBe('second_speaker');
    expect(state.rivalASpeakerRole).toBe('second_speaker');
    expect(state.rivalBSpeakerRole).toBe('first_speaker');
  });

  it('should initialize with correct state for con first speaker', () => {
    const machine = new RoundStateMachine('session-3', 'con', 'first_speaker');
    const state = machine.getState();

    expect(state.studentSide).toBe('con');
    expect(state.studentSpeakerRole).toBe('first_speaker');
    expect(state.rivalASpeakerRole).toBe('first_speaker');
    expect(state.rivalBSpeakerRole).toBe('second_speaker');
  });

  it('should initialize with correct state for con second speaker', () => {
    const machine = new RoundStateMachine('session-4', 'con', 'second_speaker');
    const state = machine.getState();

    expect(state.studentSide).toBe('con');
    expect(state.studentSpeakerRole).toBe('second_speaker');
    expect(state.rivalASpeakerRole).toBe('second_speaker');
    expect(state.rivalBSpeakerRole).toBe('first_speaker');
  });
});

describe('RoundStateMachine - Phase Advancement', () => {
  it('should advance from setup to judge_opening', async () => {
    const machine = new RoundStateMachine('session-1', 'pro', 'first_speaker');
    const nextPhase = await machine.advancePhase();

    expect(nextPhase).toBe('judge_opening');
    expect(machine.getState().phase).toBe('judge_opening');
    expect(machine.getState().activeSpeaker).toBe('judge');
  });

  it('should advance through all phases to complete', async () => {
    const machine = new RoundStateMachine('session-1', 'pro', 'first_speaker');

    const expectedPhases: DebatePhase[] = [];
    let current: DebatePhase | null = 'judge_opening';
    while (current) {
      expectedPhases.push(current);
      current = getNextPhase(current);
    }

    for (const expectedPhase of expectedPhases) {
      const nextPhase = await machine.advancePhase();
      expect(nextPhase).toBe(expectedPhase);
      expect(machine.getState().phase).toBe(expectedPhase);
    }

    expect(await machine.advancePhase()).toBeNull();
  });
});

describe('RoundStateMachine - Active Speaker Assignment', () => {
  it('should set judge as active speaker in judge_opening', async () => {
    const machine = new RoundStateMachine('session-1', 'pro', 'first_speaker');
    await machine.advancePhase();
    expect(machine.getState().activeSpeaker).toBe('judge');
  });

  it('should set teammate as active speaker in student_prep_optional', async () => {
    const machine = new RoundStateMachine('session-1', 'pro', 'first_speaker');
    await machine.advancePhase();
    await machine.advancePhase();
    expect(machine.getState().activeSpeaker).toBe('teammate');
  });

  it('should set student as active speaker when student is pro in constructive_pro', () => {
    const machine = new RoundStateMachine('session-1', 'pro', 'first_speaker');
    machine.setPhase('constructive_pro');
    expect(machine.getState().activeSpeaker).toBe('student');
  });

  it('should set rival_a as active speaker when student is con in constructive_pro', () => {
    const machine = new RoundStateMachine('session-1', 'con', 'first_speaker');
    machine.setPhase('constructive_pro');
    expect(machine.getState().activeSpeaker).toBe('rival_a');
  });

  it('should set student as active speaker when student is con in constructive_con', () => {
    const machine = new RoundStateMachine('session-1', 'con', 'first_speaker');
    machine.setPhase('constructive_con');
    expect(machine.getState().activeSpeaker).toBe('student');
  });

  it('should set rival_a as active speaker when student is pro in constructive_con', () => {
    const machine = new RoundStateMachine('session-1', 'pro', 'first_speaker');
    machine.setPhase('constructive_con');
    expect(machine.getState().activeSpeaker).toBe('rival_a');
  });

  it('should set student as active speaker in grand_crossfire', () => {
    const machine = new RoundStateMachine('session-1', 'pro', 'first_speaker');
    machine.setPhase('grand_crossfire');
    expect(machine.getState().activeSpeaker).toBe('student');
  });
});

describe('RoundStateMachine - Timer Management', () => {
  it('should set timer for speech phases', () => {
    const machine = new RoundStateMachine('session-1', 'pro', 'first_speaker');
    machine.setPhase('constructive_pro');
    expect(machine.getState().speechTimeRemaining).toBe(480);
  });

  it('should decrement timer', () => {
    const machine = new RoundStateMachine('session-1', 'pro', 'first_speaker');
    machine.setPhase('constructive_pro');
    machine.updateTimer(60);
    expect(machine.getState().speechTimeRemaining).toBe(420);
  });

  it('should not go below zero', () => {
    const machine = new RoundStateMachine('session-1', 'pro', 'first_speaker');
    machine.setPhase('constructive_pro');
    machine.updateTimer(500);
    expect(machine.getState().speechTimeRemaining).toBe(0);
  });

  it('should identify phase as complete when timer reaches zero', () => {
    const machine = new RoundStateMachine('session-1', 'pro', 'first_speaker');
    machine.setPhase('constructive_pro');
    machine.updateTimer(480);
    expect(machine.isPhaseComplete()).toBe(true);
  });

  it('should identify phase as not complete when timer is positive', () => {
    const machine = new RoundStateMachine('session-1', 'pro', 'first_speaker');
    machine.setPhase('constructive_pro');
    expect(machine.isPhaseComplete()).toBe(false);
  });
});

describe('RoundStateMachine - Prep Time Management', () => {
  it('should allow using prep time', () => {
    const machine = new RoundStateMachine('session-1', 'pro', 'first_speaker');
    const result = machine.usePrepTime(60);
    expect(result).toBe(true);
    expect(machine.getState().prepTimeRemainingStudent).toBe(420);
  });

  it('should not allow using more prep time than available', () => {
    const machine = new RoundStateMachine('session-1', 'pro', 'first_speaker');
    const result = machine.usePrepTime(500);
    expect(result).toBe(false);
    expect(machine.getState().prepTimeRemainingStudent).toBe(480);
  });
});

describe('RoundStateMachine - Allowed Actions', () => {
  it('should allow advance_phase in setup', () => {
    const machine = new RoundStateMachine('session-1', 'pro', 'first_speaker');
    const actions = machine.getState().allowedActions;
    expect(actions).toContain('advance_phase');
  });

  it('should allow student actions in constructive_pro', () => {
    const machine = new RoundStateMachine('session-1', 'pro', 'first_speaker');
    machine.setPhase('constructive_pro');
    const actions = machine.getState().allowedActions;
    expect(actions).toContain('submit_speech');
    expect(actions).toContain('request_evidence_check');
    expect(actions).toContain('advance_phase');
    expect(actions).toContain('pause_timer');
  });

  it('should not allow student actions in judge phases', () => {
    const machine = new RoundStateMachine('session-1', 'pro', 'first_speaker');
    machine.setPhase('judge_deliberation');
    const actions = machine.getState().allowedActions;
    expect(actions).not.toContain('submit_speech');
    expect(actions).not.toContain('request_evidence_check');
  });
});

describe('RoundStateMachine - Agent Calls', () => {
  it('should return judge agent for judge_opening', () => {
    const machine = new RoundStateMachine('session-1', 'pro', 'first_speaker');
    machine.setPhase('judge_opening');
    const agents = machine.getAgentsForCurrentPhase();
    expect(agents).toHaveLength(1);
    expect(agents[0].agentRole).toBe('judge');
    expect(agents[0].mode).toBe('text');
  });

  it('should return rival_a for constructive_pro when student is con', () => {
    const machine = new RoundStateMachine('session-1', 'con', 'first_speaker');
    machine.setPhase('constructive_pro');
    const agents = machine.getAgentsForCurrentPhase();
    expect(agents.some(a => a.agentRole === 'rival_a')).toBe(true);
  });

  it('should return rival_a for constructive_con when student is pro', () => {
    const machine = new RoundStateMachine('session-1', 'pro', 'first_speaker');
    machine.setPhase('constructive_con');
    const agents = machine.getAgentsForCurrentPhase();
    expect(agents.some(a => a.agentRole === 'rival_a')).toBe(true);
  });

  it('should return all agents for grand_crossfire', () => {
    const machine = new RoundStateMachine('session-1', 'pro', 'first_speaker');
    machine.setPhase('grand_crossfire');
    const agents = machine.getAgentsForCurrentPhase();
    expect(agents.some(a => a.agentRole === 'rival_a')).toBe(true);
    expect(agents.some(a => a.agentRole === 'rival_b')).toBe(true);
    expect(agents.some(a => a.agentRole === 'teammate')).toBe(true);
  });
});