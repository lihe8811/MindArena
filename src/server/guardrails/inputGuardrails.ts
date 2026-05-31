export interface InputValidationResult {
  allowed: boolean;
  sanitized?: string;
  errors: string[];
  warnings: string[];
}

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface ContentCheckResult {
  hasProfanity: boolean;
  hasPersonalInfo: boolean;
  hasInjectionAttempt: boolean;
  riskScore: number;
  flaggedWords: string[];
}

class InputGuardrails {
  private rateLimitMap: Map<string, RateLimitEntry> = new Map();

  private readonly MAX_INPUT_LENGTH = 10000;
  private readonly PROFANITY_LIST = [
    'damn', 'hell', 'crap', 'stupid', 'idiot', 'moron'
  ];
  private readonly SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|#|\/\*|\*\/)/,
    /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i,
    /;\s*\b(SELECT|INSERT|UPDATE|DELETE)\b/i,
    /'\s*OR\s*'\d+'=\s*'\d+/i,
    /UNION\s+SELECT/i,
  ];
  private readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];
  private readonly PERSONAL_INFO_PATTERNS = [
    /\b\d{3}-\d{2}-\d{4}\b/,
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    /\b\d{3}-\d{3}-\d{4}\b/,
  ];

  validateInput(input: string, userId?: string): InputValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!input || input.trim().length === 0) {
      errors.push('Input cannot be empty');
      return { allowed: false, errors, warnings };
    }

    if (input.length > this.MAX_INPUT_LENGTH) {
      errors.push(`Input exceeds maximum length of ${this.MAX_INPUT_LENGTH} characters`);
      return { allowed: false, errors, warnings };
    }

    const contentCheck = this.checkContent(input);

    if (contentCheck.hasInjectionAttempt) {
      errors.push('Input contains potentially malicious content');
    }

    if (contentCheck.hasPersonalInfo) {
      warnings.push('Input may contain personal information');
    }

    if (contentCheck.hasProfanity) {
      warnings.push(`Input contains flagged language: ${contentCheck.flaggedWords.join(', ')}`);
    }

    if (contentCheck.riskScore > 0.7) {
      errors.push('Input risk score too high');
    }

    if (userId && !this.checkRateLimit(userId)) {
      errors.push('Rate limit exceeded. Please slow down.');
    }

    const sanitized = this.sanitizeInput(input);

    return {
      allowed: errors.length === 0,
      sanitized,
      errors,
      warnings,
    };
  }

  checkContent(input: string): ContentCheckResult {
    const lowerInput = input.toLowerCase();
    const flaggedWords: string[] = [];
    let riskScore = 0;

    for (const word of this.PROFANITY_LIST) {
      if (lowerInput.includes(word)) {
        flaggedWords.push(word);
        riskScore += 0.1;
      }
    }

    let hasInjectionAttempt = false;
    for (const pattern of [...this.SQL_INJECTION_PATTERNS, ...this.XSS_PATTERNS]) {
      if (pattern.test(input)) {
        hasInjectionAttempt = true;
        riskScore += 0.5;
        break;
      }
    }

    let hasPersonalInfo = false;
    for (const pattern of this.PERSONAL_INFO_PATTERNS) {
      if (pattern.test(input)) {
        hasPersonalInfo = true;
        riskScore += 0.2;
        break;
      }
    }

    return {
      hasProfanity: flaggedWords.length > 0,
      hasPersonalInfo,
      hasInjectionAttempt,
      riskScore: Math.min(riskScore, 1),
      flaggedWords,
    };
  }

  sanitizeInput(input: string): string {
    let sanitized = input;

    sanitized = sanitized
      .replace(/[<>]/g, (match) => (match === '<' ? '&lt;' : '&gt;'))
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/&/g, '&amp;');

    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
  }

  checkRateLimit(userId: string, maxRequests: number = 60, windowMs: number = 60000): boolean {
    const now = Date.now();
    const entry = this.rateLimitMap.get(userId);

    if (!entry || entry.resetAt < now) {
      this.rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (entry.count >= maxRequests) {
      return false;
    }

    entry.count += 1;
    this.rateLimitMap.set(userId, entry);
    return true;
  }

  validateDebateInput(input: string, context?: { phase?: string; speakerRole?: string }): InputValidationResult {
    const baseValidation = this.validateInput(input);

    if (!baseValidation.allowed) {
      return baseValidation;
    }

    const warnings = [...baseValidation.warnings];

    if (context?.phase === 'final_focus') {
      const newArgumentIndicators = ['first', 'new', 'additionally', 'moreover', 'furthermore'];
      const lowerInput = input.toLowerCase();

      for (const indicator of newArgumentIndicators) {
        if (lowerInput.includes(indicator)) {
          warnings.push(`Potential new argument language detected in Final Focus: "${indicator}"`);
        }
      }
    }

    return {
      ...baseValidation,
      warnings,
    };
  }

  validateEvidenceInput(citation: Record<string, string>): InputValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const requiredFields = ['authorOrSource', 'qualifications', 'title', 'publicationDate'];

    for (const field of requiredFields) {
      if (!citation[field] || citation[field].trim().length === 0) {
        errors.push(`Missing required citation field: ${field}`);
      }
    }

    if (citation.url) {
      try {
        new URL(citation.url);
      } catch {
        warnings.push('URL format appears invalid');
      }
    }

    if (citation.publicationDate) {
      const datePattern = /\d{4}/;
      if (!datePattern.test(citation.publicationDate)) {
        warnings.push('Publication date should include a year');
      }
    }

    return {
      allowed: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateTimerCommand(command: string, params?: Record<string, unknown>): InputValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const validCommands = ['start', 'pause', 'resume', 'stop', 'reset', 'create'];

    if (!validCommands.includes(command)) {
      errors.push(`Invalid timer command: ${command}`);
    }

    if (command === 'create' && params) {
      if (!params.type || !['speech', 'prep', 'crossfire'].includes(params.type as string)) {
        errors.push('Timer creation requires valid type: speech, prep, or crossfire');
      }

      if (!params.totalTimeMs || typeof params.totalTimeMs !== 'number' || params.totalTimeMs <= 0) {
        errors.push('Timer creation requires positive totalTimeMs');
      }
    }

    return {
      allowed: errors.length === 0,
      errors,
      warnings,
    };
  }

  clearRateLimit(userId: string): void {
    this.rateLimitMap.delete(userId);
  }

  getRateLimitStatus(userId: string): { remaining: number; resetAt: number } | null {
    const entry = this.rateLimitMap.get(userId);
    if (!entry) return null;

    return {
      remaining: Math.max(0, 60 - entry.count),
      resetAt: entry.resetAt,
    };
  }
}

export const inputGuardrails = new InputGuardrails();
