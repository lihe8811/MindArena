export interface ToolValidationResult {
  allowed: boolean;
  sanitizedParams?: Record<string, unknown>;
  errors: string[];
  warnings: string[];
}

export interface ToolExecutionContext {
  debateId?: string;
  speakerId?: string;
  phase?: string;
  userRole?: string;
  timestamp: number;
}

export interface ToolPermission {
  toolName: string;
  allowedRoles: string[];
  allowedPhases?: string[];
  requiresAuth: boolean;
}

class ToolGuardrails {
  private readonly MAX_PARAM_SIZE = 10000;
  private readonly MAX_NESTING_DEPTH = 5;

  private toolPermissions: Map<string, ToolPermission> = new Map([
    [
      'calculator_evaluate',
      {
        toolName: 'calculator_evaluate',
        allowedRoles: ['user', 'agent', 'orchestrator'],
        requiresAuth: false,
      },
    ],
    [
      'calculator_statistics',
      {
        toolName: 'calculator_statistics',
        allowedRoles: ['user', 'agent', 'orchestrator'],
        requiresAuth: false,
      },
    ],
    [
      'calculator_time',
      {
        toolName: 'calculator_time',
        allowedRoles: ['user', 'agent', 'orchestrator'],
        requiresAuth: false,
      },
    ],
    [
      'calculator_compare',
      {
        toolName: 'calculator_compare',
        allowedRoles: ['user', 'agent', 'orchestrator'],
        requiresAuth: false,
      },
    ],
    [
      'calculator_percentage',
      {
        toolName: 'calculator_percentage',
        allowedRoles: ['user', 'agent', 'orchestrator'],
        requiresAuth: false,
      },
    ],
    [
      'evidence_record',
      {
        toolName: 'evidence_record',
        allowedRoles: ['user', 'agent'],
        allowedPhases: ['constructive', 'rebuttal', 'summary', 'final_focus'],
        requiresAuth: true,
      },
    ],
    [
      'evidence_check_citation',
      {
        toolName: 'evidence_check_citation',
        allowedRoles: ['user', 'agent', 'orchestrator'],
        requiresAuth: false,
      },
    ],
    [
      'evidence_get_full',
      {
        toolName: 'evidence_get_full',
        allowedRoles: ['user', 'agent', 'orchestrator'],
        requiresAuth: false,
      },
    ],
    [
      'evidence_get_context',
      {
        toolName: 'evidence_get_context',
        allowedRoles: ['user', 'agent', 'orchestrator'],
        requiresAuth: true,
      },
    ],
    [
      'evidence_get_debate',
      {
        toolName: 'evidence_get_debate',
        allowedRoles: ['user', 'agent', 'orchestrator'],
        requiresAuth: true,
      },
    ],
    [
      'evidence_report_problem',
      {
        toolName: 'evidence_report_problem',
        allowedRoles: ['user', 'agent'],
        requiresAuth: true,
      },
    ],
    [
      'evidence_generate_citation',
      {
        toolName: 'evidence_generate_citation',
        allowedRoles: ['user', 'agent', 'orchestrator'],
        requiresAuth: false,
      },
    ],
  ]);

  validateToolCall(
    toolName: string,
    params: Record<string, unknown>,
    context: ToolExecutionContext
  ): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const permission = this.toolPermissions.get(toolName);
    if (!permission) {
      errors.push(`Unknown tool: ${toolName}`);
      return { allowed: false, errors, warnings };
    }

    if (permission.requiresAuth && !context.speakerId) {
      errors.push(`Tool ${toolName} requires authentication`);
    }

    if (context.userRole && !permission.allowedRoles.includes(context.userRole)) {
      errors.push(`Role ${context.userRole} is not allowed to use tool ${toolName}`);
    }

    if (permission.allowedPhases && context.phase) {
      if (!permission.allowedPhases.includes(context.phase)) {
        errors.push(`Tool ${toolName} cannot be used during ${context.phase} phase`);
      }
    }

    const paramValidation = this.validateParams(params);
    if (!paramValidation.valid) {
      errors.push(...paramValidation.errors);
    }

    if (paramValidation.warnings.length > 0) {
      warnings.push(...paramValidation.warnings);
    }

    const sanitizedParams = this.sanitizeParams(params);

    return {
      allowed: errors.length === 0,
      sanitizedParams,
      errors,
      warnings,
    };
  }

  private validateParams(params: Record<string, unknown>): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const size = JSON.stringify(params).length;
    if (size > this.MAX_PARAM_SIZE) {
      errors.push(`Parameters exceed maximum size of ${this.MAX_PARAM_SIZE} bytes`);
    }

    const depth = this.calculateNestingDepth(params);
    if (depth > this.MAX_NESTING_DEPTH) {
      errors.push(`Parameters exceed maximum nesting depth of ${this.MAX_NESTING_DEPTH}`);
    }

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        if (value.length > 5000) {
          warnings.push(`Parameter ${key} is very long (${value.length} chars)`);
        }

        const suspicious = this.checkSuspiciousContent(value);
        if (suspicious) {
          warnings.push(`Parameter ${key} may contain suspicious content`);
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private calculateNestingDepth(obj: unknown, currentDepth = 0): number {
    if (currentDepth > this.MAX_NESTING_DEPTH) {
      return currentDepth;
    }

    if (typeof obj !== 'object' || obj === null) {
      return currentDepth;
    }

    if (Array.isArray(obj)) {
      return Math.max(
        currentDepth,
        ...obj.map((item) => this.calculateNestingDepth(item, currentDepth + 1))
      );
    }

    return Math.max(
      currentDepth,
      ...Object.values(obj).map((value) => this.calculateNestingDepth(value, currentDepth + 1))
    );
  }

  private checkSuspiciousContent(value: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /SELECT\s+.*\s+FROM/i,
      /INSERT\s+INTO/i,
      /DELETE\s+FROM/i,
      /DROP\s+TABLE/i,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(value));
  }

  private sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.deepSanitize(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private sanitizeString(str: string): string {
    return str
      .replace(/[<>]/g, (match) => (match === '<' ? '&lt;' : '&gt;'))
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .trim();
  }

  private deepSanitize(obj: unknown): unknown {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepSanitize(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.deepSanitize(value);
      }
      return sanitized;
    }

    return obj;
  }

  registerToolPermission(permission: ToolPermission): void {
    this.toolPermissions.set(permission.toolName, permission);
  }

  removeToolPermission(toolName: string): boolean {
    return this.toolPermissions.delete(toolName);
  }

  validateCalculatorParams(params: Record<string, unknown>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if ('expression' in params && typeof params.expression === 'string') {
      const validPattern = /^[\d+\-*/().\s]+$/;
      if (!validPattern.test(params.expression)) {
        errors.push('Expression contains invalid characters');
      }
    }

    if ('numbers' in params && Array.isArray(params.numbers)) {
      if (!params.numbers.every((n) => typeof n === 'number')) {
        errors.push('All items in numbers array must be numeric');
      }
    }

    return {
      allowed: errors.length === 0,
      sanitizedParams: params,
      errors,
      warnings,
    };
  }

  validateEvidenceParams(params: Record<string, unknown>): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if ('debateId' in params && typeof params.debateId !== 'string') {
      errors.push('debateId must be a string');
    }

    if ('citation' in params && typeof params.citation === 'object' && params.citation !== null) {
      const citation = params.citation as Record<string, unknown>;
      const requiredFields = ['authorOrSource', 'qualifications', 'title', 'publicationDate'];

      for (const field of requiredFields) {
        if (!(field in citation) || typeof citation[field] !== 'string') {
          errors.push(`Citation missing required field: ${field}`);
        }
      }
    }

    if ('claimText' in params && typeof params.claimText === 'string') {
      if (params.claimText.length < 10) {
        warnings.push('Claim text is very short');
      }
    }

    return {
      allowed: errors.length === 0,
      sanitizedParams: params,
      errors,
      warnings,
    };
  }

  validateBatchToolCalls(
    calls: Array<{ toolName: string; params: Record<string, unknown> }>,
    context: ToolExecutionContext
  ): { valid: boolean; results: ToolValidationResult[] } {
    const results = calls.map((call) => this.validateToolCall(call.toolName, call.params, context));

    return {
      valid: results.every((r) => r.allowed),
      results,
    };
  }

  checkToolDependencies(
    toolName: string,
    dependencies: string[]
  ): { satisfied: boolean; missing: string[] } {
    const requiredDeps: Record<string, string[]> = {
      evidence_get_context: ['evidence_record'],
      evidence_report_problem: ['evidence_record'],
    };

    const required = requiredDeps[toolName] || [];
    const missing = required.filter((dep) => !dependencies.includes(dep));

    return {
      satisfied: missing.length === 0,
      missing,
    };
  }
}

export const toolGuardrails = new ToolGuardrails();
