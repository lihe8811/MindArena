import {
  DebatePhase,
  DebateSide,
  SpeakerRole,
  AgentRole,
  AgentMode,
  getNextPhase,
  isTerminalPhase,
  PHASE_CONFIGS,
} from './phases';

export interface DebateState {
  sessionId: string;
  phase: DebatePhase;
  studentSide: DebateSide;
  studentSpeakerRole: SpeakerRole;
  rivalASpeakerRole: SpeakerRole;
  rivalBSpeakerRole: SpeakerRole;
  prepTimeRemainingStudent: number;
  prepTimeRemainingOpponent: number;
  speechTimeRemaining: number;
  allowedActions: string[];
  activeSpeaker: AgentRole | 'student' | null;
}

export interface AgentCall {
  agentRole: AgentRole;
  mode: AgentMode;
  side?: DebateSide;
  speakerRole?: SpeakerRole;
}

export interface AgentCallResult {
  agentRole: AgentRole;
  content: string;
  timestamp: number;
}

export async function callAgentDummy(agentCall: AgentCall): Promise<AgentCallResult> {
  const roleLabels: Record<AgentRole, string> = {
    judge: '裁判 (judge)',
    rival_a: '对手A (rival_a)',
    rival_b: '对手B (rival_b)',
    teammate: '队友 (teammate)',
  };

  const content = `[DUMMY] 我是 ${roleLabels[agentCall.agentRole]}，正在执行当前阶段任务。`;

  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    agentRole: agentCall.agentRole,
    content,
    timestamp: Date.now(),
  };
}

export class RoundStateMachine {
  private state: DebateState;

  constructor(sessionId: string, studentSide: DebateSide, studentSpeakerRole: SpeakerRole) {
    const opponentSide: DebateSide = studentSide === 'pro' ? 'con' : 'pro';
    const rivalASpeakerRole: SpeakerRole = studentSpeakerRole === 'first_speaker' ? 'first_speaker' : 'second_speaker';
    const rivalBSpeakerRole: SpeakerRole = studentSpeakerRole === 'first_speaker' ? 'second_speaker' : 'first_speaker';

    this.state = {
      sessionId,
      phase: 'setup',
      studentSide,
      studentSpeakerRole,
      rivalASpeakerRole,
      rivalBSpeakerRole,
      prepTimeRemainingStudent: 480,
      prepTimeRemainingOpponent: 480,
      speechTimeRemaining: 0,
      allowedActions: ['advance_phase'],
      activeSpeaker: null,
    };
  }

  getState(): DebateState {
    return { ...this.state };
  }

  async advancePhase(): Promise<DebatePhase | null> {
    const nextPhase = getNextPhase(this.state.phase);
    if (nextPhase) {
      this.state.phase = nextPhase;
      this.state.activeSpeaker = this.determineActiveSpeaker();
      this.state.speechTimeRemaining = PHASE_CONFIGS[nextPhase].timerDurationSeconds || 0;
      this.state.allowedActions = this.getAllowedActions();

      const agentCalls = this.getAgentsForCurrentPhase();
      if (agentCalls.length > 0) {
        console.log(`[advancePhase] ${nextPhase}: calling ${agentCalls.length} agent(s)`);
        const results = await Promise.all(agentCalls.map((call) => callAgentDummy(call)));
        for (const result of results) {
          console.log(`[advancePhase] ${result.agentRole} responded: ${result.content}`);
        }
      }
    }
    return nextPhase;
  }

  private determineActiveSpeaker(): AgentRole | 'student' | null {
    const { phase, studentSide, studentSpeakerRole, rivalASpeakerRole } = this.state;

    const proSpeaker = studentSide === 'pro' ? 'student' : ('rival_a' as AgentRole);
    const conSpeaker = studentSide === 'con' ? 'student' : ('rival_a' as AgentRole);

    switch (phase) {
      case 'judge_opening':
        return 'judge';
      case 'student_prep_optional':
        return 'teammate';
      case 'constructive_pro':
        return proSpeaker;
      case 'constructive_con':
        return conSpeaker;
      case 'crossfire_1':
        return studentSide === 'pro' ? 'student' : 'rival_a';
      case 'rebuttal_pro':
        return proSpeaker;
      case 'rebuttal_con':
        return conSpeaker;
      case 'crossfire_2':
        return studentSide === 'con' ? 'student' : 'rival_a';
      case 'summary_pro':
        return proSpeaker;
      case 'summary_con':
        return conSpeaker;
      case 'grand_crossfire':
        return 'student';
      case 'final_focus_pro':
        return proSpeaker;
      case 'final_focus_con':
        return conSpeaker;
      case 'judge_deliberation':
        return 'judge';
      case 'judge_feedback':
        return 'judge';
      default:
        return null;
    }
  }

  private getAllowedActions(): string[] {
    const { phase } = this.state;
    const config = PHASE_CONFIGS[phase];
    const actions: string[] = [];

    if (config.allowsStudentInput) {
      actions.push('submit_speech');
      actions.push('request_evidence_check');
    }
    if (config.allowsPrepTime) {
      actions.push('use_prep_time');
      actions.push('consult_teammate');
    }
    if (!isTerminalPhase(phase)) {
      actions.push('advance_phase');
    }
    if (config.timerDurationSeconds && config.timerDurationSeconds > 0) {
      actions.push('pause_timer');
    }

    return actions;
  }

  getAgentsForCurrentPhase(): AgentCall[] {
    const { phase, studentSide, studentSpeakerRole, rivalASpeakerRole, rivalBSpeakerRole } = this.state;
    const config = PHASE_CONFIGS[phase];
    const agentCalls: AgentCall[] = [];

    for (const call of config.agentCalls) {
      let shouldInclude = true;

      if (phase.includes('pro')) {
        shouldInclude = studentSide !== 'pro';
      } else if (phase.includes('con')) {
        shouldInclude = studentSide !== 'con';
      }

      if (shouldInclude) {
        let speakerRole: SpeakerRole | undefined;
        if (call.agentRole === 'rival_a') {
          speakerRole = rivalASpeakerRole;
        } else if (call.agentRole === 'rival_b') {
          speakerRole = rivalBSpeakerRole;
        }

        agentCalls.push({
          agentRole: call.agentRole,
          mode: call.mode,
          side: phase.includes('pro') ? 'pro' : phase.includes('con') ? 'con' : undefined,
          speakerRole,
        });
      }
    }

    if (config.allowsStudentInput && this.state.activeSpeaker === 'student') {
      agentCalls.push({
        agentRole: 'teammate',
        mode: 'text',
        side: studentSide,
        speakerRole: studentSpeakerRole,
      });
    }

    return agentCalls;
  }

  updateTimer(deltaSeconds: number): void {
    this.state.speechTimeRemaining = Math.max(0, this.state.speechTimeRemaining - deltaSeconds);
  }

  usePrepTime(seconds: number): boolean {
    if (this.state.prepTimeRemainingStudent >= seconds) {
      this.state.prepTimeRemainingStudent -= seconds;
      return true;
    }
    return false;
  }

  setPhase(phase: DebatePhase): void {
    this.state.phase = phase;
    this.state.activeSpeaker = this.determineActiveSpeaker();
    this.state.speechTimeRemaining = PHASE_CONFIGS[phase].timerDurationSeconds || 0;
    this.state.allowedActions = this.getAllowedActions();
  }

  isPhaseComplete(): boolean {
    return this.state.speechTimeRemaining <= 0;
  }
}