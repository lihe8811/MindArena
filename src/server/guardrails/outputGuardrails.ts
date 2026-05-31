export interface OutputValidationResult {
  allowed: boolean;
  sanitized?: string;
  errors: string[];
  warnings: string[];
}

export interface OutputQualityCheck {
  isAppropriate: boolean;
  lengthCheck: 'ok' | 'too_short' | 'too_long';
  hasDebateStructure: boolean;
  hasEvidence: boolean;
  qualityScore: number;
  suggestions: string[];
}

class OutputGuardrails {
  private readonly MAX_OUTPUT_LENGTH = 50000;
  private readonly MIN_OUTPUT_LENGTH = 10;

  private readonly INAPPROPRIATE_CONTENT = [
    'hate speech',
    'discriminatory',
    'harassment',
    'bullying',
  ];

  validateOutput(output: string, context?: { phase?: string; type?: string }): OutputValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!output || output.trim().length === 0) {
      errors.push('Output cannot be empty');
      return { allowed: false, errors, warnings };
    }

    if (output.length < this.MIN_OUTPUT_LENGTH) {
      errors.push(`Output is too short (minimum ${this.MIN_OUTPUT_LENGTH} characters)`);
    }

    if (output.length > this.MAX_OUTPUT_LENGTH) {
      errors.push(`Output exceeds maximum length of ${this.MAX_OUTPUT_LENGTH} characters`);
    }

    const lowerOutput = output.toLowerCase();
    for (const content of this.INAPPROPRIATE_CONTENT) {
      if (lowerOutput.includes(content)) {
        errors.push(`Output contains inappropriate content: ${content}`);
      }
    }

    if (context?.phase === 'final_focus' && output.length > 2000) {
      warnings.push('Final Focus speech may be too long (recommended: under 2 minutes)');
    }

    const sanitized = this.sanitizeOutput(output);

    return {
      allowed: errors.length === 0,
      sanitized,
      errors,
      warnings,
    };
  }

  checkOutputQuality(output: string, expectedType?: string): OutputQualityCheck {
    const suggestions: string[] = [];
    let qualityScore = 1.0;

    let lengthCheck: 'ok' | 'too_short' | 'too_long' = 'ok';
    if (output.length < 50) {
      lengthCheck = 'too_short';
      qualityScore -= 0.2;
      suggestions.push('Output is quite short; consider expanding on key points');
    } else if (output.length > 10000) {
      lengthCheck = 'too_long';
      qualityScore -= 0.1;
      suggestions.push('Output is very long; consider being more concise');
    }

    const hasDebateStructure = this.checkDebateStructure(output);
    if (!hasDebateStructure) {
      qualityScore -= 0.15;
      suggestions.push('Consider using standard debate structure (claim, warrant, impact)');
    }

    const hasEvidence = this.checkForEvidence(output);
    if (!hasEvidence && expectedType === 'constructive') {
      qualityScore -= 0.2;
      suggestions.push('Constructive speeches should include cited evidence');
    }

    const lowerOutput = output.toLowerCase();
    let isAppropriate = true;
    for (const content of this.INAPPROPRIATE_CONTENT) {
      if (lowerOutput.includes(content)) {
        isAppropriate = false;
        qualityScore = 0;
        break;
      }
    }

    return {
      isAppropriate,
      lengthCheck,
      hasDebateStructure,
      hasEvidence,
      qualityScore: Math.max(0, qualityScore),
      suggestions,
    };
  }

  private checkDebateStructure(output: string): boolean {
    const lowerOutput = output.toLowerCase();
    const structureIndicators = [
      'because',
      'therefore',
      'thus',
      'as a result',
      'this means',
      'leads to',
      'contention',
      'argument',
    ];

    return structureIndicators.some((indicator) => lowerOutput.includes(indicator));
  }

  private checkForEvidence(output: string): boolean {
    const evidenceIndicators = [
      /according to/i,
      /cites?\s+\w+/i,
      /\(\d{4}\)/,
      /\d{4}\s*,\s*\w+/,
      /study|research|survey|data|statistics/i,
    ];

    return evidenceIndicators.some((pattern) => pattern.test(output));
  }

  sanitizeOutput(output: string): string {
    let sanitized = output;

    sanitized = sanitized.replace(/\x00/g, '');

    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    sanitized = sanitized.trim();

    return sanitized;
  }

  formatDebateOutput(output: string, context: { phase: string; speakerName: string; side: string }): string {
    let formatted = output;

    if (!formatted.startsWith(context.speakerName)) {
      formatted = `[${context.speakerName} - ${context.side}]\n${formatted}`;
    }

    if (context.phase === 'constructive' && !this.checkForEvidence(formatted)) {
      formatted = `${formatted}\n\n[Note: This speech should include cited evidence]`;
    }

    return formatted;
  }

  validateEvidenceOutput(evidence: { citation?: string; quote?: string; context?: string }): OutputValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!evidence.citation || evidence.citation.trim().length === 0) {
      errors.push('Evidence output must include a citation');
    }

    if (!evidence.quote && !evidence.context) {
      warnings.push('Evidence should include either a direct quote or context');
    }

    if (evidence.citation && evidence.citation.length < 20) {
      warnings.push('Citation appears incomplete');
    }

    return {
      allowed: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateTimerOutput(timerState: { timeRemainingMs: number; status: string }): OutputValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof timerState.timeRemainingMs !== 'number') {
      errors.push('Timer output must include numeric timeRemainingMs');
    }

    if (timerState.timeRemainingMs < 0) {
      errors.push('Timer time remaining cannot be negative');
    }

    const validStatuses = ['idle', 'running', 'paused', 'expired'];
    if (!validStatuses.includes(timerState.status)) {
      errors.push(`Invalid timer status: ${timerState.status}`);
    }

    return {
      allowed: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateTranscriptOutput(events: unknown[]): OutputValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(events)) {
      errors.push('Transcript output must be an array of events');
      return { allowed: false, errors, warnings };
    }

    if (events.length === 0) {
      warnings.push('Transcript contains no events');
    }

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (typeof event !== 'object' || event === null) {
        errors.push(`Event ${i} is not a valid object`);
        continue;
      }

      const e = event as Record<string, unknown>;
      if (!e.id || typeof e.id !== 'string') {
        errors.push(`Event ${i} is missing valid id`);
      }
      if (!e.timestamp || typeof e.timestamp !== 'number') {
        errors.push(`Event ${i} is missing valid timestamp`);
      }
    }

    return {
      allowed: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export const outputGuardrails = new OutputGuardrails();
