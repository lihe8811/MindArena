export type SpeakerRole = 'first_speaker' | 'second_speaker';

export type SpeechPhase =
  | 'constructive'
  | 'crossfire_1'
  | 'rebuttal'
  | 'crossfire_2'
  | 'summary'
  | 'final_focus';

export type DebateSide = 'pro' | 'con';

export interface SpeakerAssignment {
  speakerId: string;
  speakerName: string;
  role: SpeakerRole;
  teamId: string;
}

export interface SpeechRecord {
  speechId: string;
  debateId: string;
  speakerId: string;
  speakerRole: SpeakerRole;
  side: DebateSide;
  phase: SpeechPhase;
  startedAt: number;
  endedAt?: number;
}

export interface RuleViolation {
  id: string;
  debateId: string;
  type: ViolationType;
  severity: 'minor' | 'major' | 'critical';
  description: string;
  detectedAt: number;
  speakerId?: string;
  speechId?: string;
  autoResolved: boolean;
}

export type ViolationType =
  | 'wrong_side'
  | 'wrong_speaker_role'
  | 'illegal_prep_timing'
  | 'excessive_partner_assistance'
  | 'new_final_focus_argument'
  | 'prep_during_speech'
  | 'prep_during_crossfire';

export interface RulesCheckResult {
  passed: boolean;
  violations: RuleViolation[];
  warnings: string[];
}

export interface PrepTimeRecord {
  teamId: string;
  totalAllocatedMs: number;
  usedMs: number;
  remainingMs: number;
  sessions: PrepSession[];
}

export interface PrepSession {
  startedAt: number;
  endedAt: number;
  durationMs: number;
  takenBeforePhase: SpeechPhase;
}

export interface ArgumentRecord {
  argumentId: string;
  debateId: string;
  speakerId: string;
  phase: SpeechPhase;
  content: string;
  timestamp: number;
  isNew: boolean;
}

class RulesMarshal {
  private speechRecords: Map<string, SpeechRecord> = new Map();
  private debateSpeeches: Map<string, Set<string>> = new Map();
  private violations: Map<string, RuleViolation> = new Map();
  private prepTimeRecords: Map<string, PrepTimeRecord> = new Map();
  private argumentRecords: Map<string, ArgumentRecord> = new Map();
  private debateArguments: Map<string, Set<string>> = new Map();

  private speakerRolePhases: Record<SpeakerRole, SpeechPhase[]> = {
    first_speaker: ['constructive', 'summary'],
    second_speaker: ['rebuttal', 'final_focus'],
  };

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  checkWrongSide(
    debateId: string,
    assignedSide: DebateSide,
    actualArguments: string,
    speechPhase: SpeechPhase
  ): RulesCheckResult {
    const violations: RuleViolation[] = [];
    const warnings: string[] = [];

    if (speechPhase === 'rebuttal') {
      const proIndicators = ['we support', 'we affirm', 'our argument', 'pro side', 'in favor'];
      const conIndicators = ['we oppose', 'we negate', 'their argument', 'con side', 'against'];

      const lowerArgs = actualArguments.toLowerCase();
      const hasProLanguage = proIndicators.some((ind) => lowerArgs.includes(ind));
      const hasConLanguage = conIndicators.some((ind) => lowerArgs.includes(ind));

      if (assignedSide === 'pro' && hasConLanguage && !hasProLanguage) {
        const violation: RuleViolation = {
          id: this.generateId('violation'),
          debateId,
          type: 'wrong_side',
          severity: 'critical',
          description: `Team assigned to PRO side appears to be arguing CON position in ${speechPhase}`,
          detectedAt: Date.now(),
          autoResolved: false,
        };
        violations.push(violation);
        this.violations.set(violation.id, violation);
      } else if (assignedSide === 'con' && hasProLanguage && !hasConLanguage) {
        const violation: RuleViolation = {
          id: this.generateId('violation'),
          debateId,
          type: 'wrong_side',
          severity: 'critical',
          description: `Team assigned to CON side appears to be arguing PRO position in ${speechPhase}`,
          detectedAt: Date.now(),
          autoResolved: false,
        };
        violations.push(violation);
        this.violations.set(violation.id, violation);
      }
    }

    return { passed: violations.length === 0, violations, warnings };
  }

  checkSpeakerRole(
    debateId: string,
    speakerId: string,
    speakerRole: SpeakerRole,
    phase: SpeechPhase
  ): RulesCheckResult {
    const violations: RuleViolation[] = [];
    const warnings: string[] = [];

    const allowedPhases = this.speakerRolePhases[speakerRole];
    const isCrossfire = phase.startsWith('crossfire');

    if (!isCrossfire && !allowedPhases.includes(phase)) {
      const violation: RuleViolation = {
        id: this.generateId('violation'),
        debateId,
        type: 'wrong_speaker_role',
        severity: 'major',
        description: `${speakerRole} is not allowed to speak during ${phase} phase. Allowed phases: ${allowedPhases.join(', ')}`,
        detectedAt: Date.now(),
        speakerId,
        autoResolved: false,
      };
      violations.push(violation);
      this.violations.set(violation.id, violation);
    }

    const speechId = this.generateId('speech');
    const speechRecord: SpeechRecord = {
      speechId,
      debateId,
      speakerId,
      speakerRole,
      side: 'pro',
      phase,
      startedAt: Date.now(),
    };

    this.speechRecords.set(speechId, speechRecord);

    if (!this.debateSpeeches.has(debateId)) {
      this.debateSpeeches.set(debateId, new Set());
    }
    this.debateSpeeches.get(debateId)!.add(speechId);

    return { passed: violations.length === 0, violations, warnings };
  }

  checkIllegalPrepTiming(
    debateId: string,
    teamId: string,
    currentPhase: SpeechPhase,
    isPrepRunning: boolean
  ): RulesCheckResult {
    const violations: RuleViolation[] = [];
    const warnings: string[] = [];

    const illegalDuringSpeech = ['constructive', 'rebuttal', 'summary', 'final_focus'];
    const illegalDuringCrossfire = ['crossfire_1', 'crossfire_2'];

    if (isPrepRunning) {
      if (illegalDuringSpeech.includes(currentPhase)) {
        const violation: RuleViolation = {
          id: this.generateId('violation'),
          debateId,
          type: 'prep_during_speech',
          severity: 'major',
          description: `Prep time cannot be taken during ${currentPhase} speech`,
          detectedAt: Date.now(),
          autoResolved: true,
        };
        violations.push(violation);
        this.violations.set(violation.id, violation);
      } else if (illegalDuringCrossfire.includes(currentPhase)) {
        const violation: RuleViolation = {
          id: this.generateId('violation'),
          debateId,
          type: 'prep_during_crossfire',
          severity: 'major',
          description: `Prep time cannot be taken during ${currentPhase}`,
          detectedAt: Date.now(),
          autoResolved: true,
        };
        violations.push(violation);
        this.violations.set(violation.id, violation);
      }
    }

    return { passed: violations.length === 0, violations, warnings };
  }

  checkExcessivePartnerAssistance(
    debateId: string,
    speakerId: string,
    partnerId: string,
    assistanceEvents: { timestamp: number; type: string }[]
  ): RulesCheckResult {
    const violations: RuleViolation[] = [];
    const warnings: string[] = [];

    const THRESHOLD_EVENTS = 3;
    const THRESHOLD_WINDOW_MS = 60 * 1000;

    if (assistanceEvents.length >= THRESHOLD_EVENTS) {
      const sortedEvents = assistanceEvents.sort((a, b) => a.timestamp - b.timestamp);

      for (let i = 0; i <= sortedEvents.length - THRESHOLD_EVENTS; i++) {
        const windowStart = sortedEvents[i].timestamp;
        const windowEnd = sortedEvents[i + THRESHOLD_EVENTS - 1].timestamp;

        if (windowEnd - windowStart <= THRESHOLD_WINDOW_MS) {
          const violation: RuleViolation = {
            id: this.generateId('violation'),
            debateId,
            type: 'excessive_partner_assistance',
            severity: 'minor',
            description: `Excessive partner assistance detected: ${THRESHOLD_EVENTS} assistance events within ${THRESHOLD_WINDOW_MS / 1000} seconds`,
            detectedAt: Date.now(),
            speakerId,
            autoResolved: false,
          };
          violations.push(violation);
          this.violations.set(violation.id, violation);
          break;
        }
      }
    }

    if (assistanceEvents.length > 0 && violations.length === 0) {
      warnings.push(`Partner assistance recorded (${assistanceEvents.length} events). Monitor for excessive assistance.`);
    }

    return { passed: violations.length === 0, violations, warnings };
  }

  checkNewFinalFocusArgument(
    debateId: string,
    speakerId: string,
    argumentContent: string,
    previousPhases: SpeechPhase[]
  ): RulesCheckResult {
    const violations: RuleViolation[] = [];
    const warnings: string[] = [];

    // Initialize debate arguments if not exists
    if (!this.debateArguments.has(debateId)) {
      this.debateArguments.set(debateId, new Set());
    }

    const debateArgs = this.debateArguments.get(debateId)!;

    const previousArguments: ArgumentRecord[] = [];
    for (const argId of debateArgs) {
      const arg = this.argumentRecords.get(argId);
      if (arg && previousPhases.includes(arg.phase)) {
        previousArguments.push(arg);
      }
    }

    const newClaims = this.extractClaims(argumentContent);
    const existingClaims = new Set(previousArguments.flatMap((arg) => this.extractClaims(arg.content)));

    const trulyNewClaims = newClaims.filter((claim) => !this.isSimilarClaim(claim, existingClaims));

    if (trulyNewClaims.length > 0) {
      const violation: RuleViolation = {
        id: this.generateId('violation'),
        debateId,
        type: 'new_final_focus_argument',
        severity: 'major',
        description: `New arguments detected in Final Focus that were not raised in previous speeches: ${trulyNewClaims.join('; ')}`,
        detectedAt: Date.now(),
        speakerId,
        autoResolved: false,
      };
      violations.push(violation);
      this.violations.set(violation.id, violation);
    }

    const argumentId = this.generateId('argument');
    const argumentRecord: ArgumentRecord = {
      argumentId,
      debateId,
      speakerId,
      phase: 'final_focus',
      content: argumentContent,
      timestamp: Date.now(),
      isNew: trulyNewClaims.length > 0,
    };

    this.argumentRecords.set(argumentId, argumentRecord);
    debateArgs.add(argumentId);

    return { passed: violations.length === 0, violations, warnings };
  }

  private extractClaims(content: string): string[] {
    const sentences = content.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
    const claims: string[] = [];

    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (
        lower.includes('contention') ||
        lower.includes('argument') ||
        lower.includes('therefore') ||
        lower.includes('because') ||
        lower.includes('leads to') ||
        lower.includes('causes') ||
        lower.includes('results in')
      ) {
        claims.push(sentence);
      }
    }

    return claims;
  }

  private isSimilarClaim(claim: string, existingClaims: Set<string>): boolean {
    const normalizedClaim = claim.toLowerCase().trim();

    for (const existing of existingClaims) {
      const normalizedExisting = existing.toLowerCase().trim();

      if (normalizedClaim === normalizedExisting) return true;

      const claimWords = new Set(normalizedClaim.split(/\s+/));
      const existingWords = new Set(normalizedExisting.split(/\s+/));

      const intersection = new Set([...claimWords].filter((x) => existingWords.has(x)));
      const union = new Set([...claimWords, ...existingWords]);

      const similarity = intersection.size / union.size;
      if (similarity > 0.7) return true;
    }

    return false;
  }

  initializePrepTime(teamId: string, totalAllocatedMs: number = 3 * 60 * 1000): void {
    const record: PrepTimeRecord = {
      teamId,
      totalAllocatedMs,
      usedMs: 0,
      remainingMs: totalAllocatedMs,
      sessions: [],
    };
    this.prepTimeRecords.set(teamId, record);
  }

  recordPrepSession(teamId: string, durationMs: number, takenBeforePhase: SpeechPhase): boolean {
    const record = this.prepTimeRecords.get(teamId);
    if (!record) return false;

    if (durationMs > record.remainingMs) {
      return false;
    }

    const session: PrepSession = {
      startedAt: Date.now() - durationMs,
      endedAt: Date.now(),
      durationMs,
      takenBeforePhase,
    };

    record.sessions.push(session);
    record.usedMs += durationMs;
    record.remainingMs -= durationMs;

    this.prepTimeRecords.set(teamId, record);
    return true;
  }

  getPrepTimeRecord(teamId: string): PrepTimeRecord | null {
    return this.prepTimeRecords.get(teamId) ?? null;
  }

  getDebateViolations(debateId: string): RuleViolation[] {
    return Array.from(this.violations.values()).filter((v) => v.debateId === debateId);
  }

  getSpeakerViolations(debateId: string, speakerId: string): RuleViolation[] {
    return this.getDebateViolations(debateId).filter((v) => v.speakerId === speakerId);
  }

  clearDebateRecords(debateId: string): void {
    const speechIds = this.debateSpeeches.get(debateId);
    if (speechIds) {
      for (const id of speechIds) {
        this.speechRecords.delete(id);
      }
      this.debateSpeeches.delete(debateId);
    }

    const argIds = this.debateArguments.get(debateId);
    if (argIds) {
      for (const id of argIds) {
        this.argumentRecords.delete(id);
      }
      this.debateArguments.delete(debateId);
    }

    for (const [id, violation] of this.violations) {
      if (violation.debateId === debateId) {
        this.violations.delete(id);
      }
    }
  }
}

export const rulesMarshal = new RulesMarshal();
