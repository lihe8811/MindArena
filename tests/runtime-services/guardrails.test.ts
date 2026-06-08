import { describe, it, expect, beforeEach } from 'bun:test';
import { inputGuardrails } from '@/server/guardrails/inputGuardrails';
import { outputGuardrails } from '@/server/guardrails/outputGuardrails';
import { toolGuardrails } from '@/server/guardrails/toolGuardrails';

describe('Guardrails', () => {
  describe('InputGuardrails', () => {
    beforeEach(() => {
      inputGuardrails.clearRateLimit('test-user');
    });

    describe('Basic Validation', () => {
      it('should allow valid input', () => {
        const result = inputGuardrails.validateInput('This is a valid input');
        expect(result.allowed).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject empty input', () => {
        const result = inputGuardrails.validateInput('');
        expect(result.allowed).toBe(false);
        expect(result.errors).toContain('Input cannot be empty');
      });

      it('should reject too long input', () => {
        const longInput = 'a'.repeat(10001);
        const result = inputGuardrails.validateInput(longInput);
        expect(result.allowed).toBe(false);
      });
    });

    describe('Content Safety', () => {
      it('should detect SQL injection', () => {
        const result = inputGuardrails.validateInput('SELECT * FROM users');
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should detect XSS attempts', () => {
        const result = inputGuardrails.validateInput('<script>alert("xss")</script>');
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should detect personal information', () => {
        const result = inputGuardrails.validateInput('My email is test@example.com');
        expect(result.warnings.length).toBeGreaterThan(0);
      });
    });

    describe('Rate Limiting', () => {
      it('should allow requests within limit', () => {
        const result = inputGuardrails.validateInput('Test', 'test-user');
        expect(result.allowed).toBe(true);
      });

      it('should track rate limit status', () => {
        inputGuardrails.validateInput('Test', 'test-user');
        const status = inputGuardrails.getRateLimitStatus('test-user');
        expect(status).toBeDefined();
        expect(status?.remaining).toBeLessThan(60);
      });
    });

    describe('Debate Input Validation', () => {
      it('should validate debate input', () => {
        const result = inputGuardrails.validateDebateInput('My argument is...', {
          phase: 'constructive',
          speakerRole: 'first_speaker',
        });
        expect(result.allowed).toBe(true);
      });

      it('should warn about new argument language in final focus', () => {
        const result = inputGuardrails.validateDebateInput('First, let me introduce a new argument', {
          phase: 'final_focus',
        });
        expect(result.warnings.length).toBeGreaterThan(0);
      });
    });

    describe('Evidence Validation', () => {
      it('should validate complete citation', () => {
        const result = inputGuardrails.validateEvidenceInput({
          authorOrSource: 'Smith, John',
          qualifications: 'Professor',
          title: 'Study',
          publicationDate: '2023',
        });
        expect(result.allowed).toBe(true);
      });

      it('should reject incomplete citation', () => {
        const result = inputGuardrails.validateEvidenceInput({
          authorOrSource: '',
          qualifications: '',
          title: '',
          publicationDate: '',
        });
        expect(result.allowed).toBe(false);
      });
    });

    describe('Timer Validation', () => {
      it('should validate timer command', () => {
        const result = inputGuardrails.validateTimerCommand('start');
        expect(result.allowed).toBe(true);
      });

      it('should reject invalid timer command', () => {
        const result = inputGuardrails.validateTimerCommand('invalid');
        expect(result.allowed).toBe(false);
      });

      it('should validate timer creation params', () => {
        const result = inputGuardrails.validateTimerCommand('create', {
          type: 'speech',
          totalTimeMs: 60000,
        });
        expect(result.allowed).toBe(true);
      });
    });
  });

  describe('OutputGuardrails', () => {
    describe('Basic Validation', () => {
      it('should allow valid output', () => {
        const result = outputGuardrails.validateOutput('This is valid output');
        expect(result.allowed).toBe(true);
      });

      it('should reject empty output', () => {
        const result = outputGuardrails.validateOutput('');
        expect(result.allowed).toBe(false);
      });

      it('should reject too short output', () => {
        const result = outputGuardrails.validateOutput('Hi');
        expect(result.allowed).toBe(false);
      });
    });

    describe('Quality Checks', () => {
      it('should check output quality', () => {
        const result = outputGuardrails.checkOutputQuality(
          'This is a well-structured argument because it has reasoning. Therefore, we win.',
          'constructive'
        );
        expect(result.isAppropriate).toBe(true);
        expect(result.hasDebateStructure).toBe(true);
      });

      it('should detect missing evidence in constructive', () => {
        const result = outputGuardrails.checkOutputQuality(
          'We should win because we are right.',
          'constructive'
        );
        expect(result.hasEvidence).toBe(false);
        expect(result.qualityScore).toBeLessThan(1);
      });

      it('should detect appropriate content', () => {
        const result = outputGuardrails.checkOutputQuality('This is appropriate content');
        expect(result.isAppropriate).toBe(true);
      });
    });

    describe('Formatting', () => {
      it('should format debate output', () => {
        const formatted = outputGuardrails.formatDebateOutput('My argument', {
          phase: 'constructive',
          speakerName: 'Test Speaker',
          side: 'Pro',
        });
        expect(formatted).toContain('Test Speaker');
        expect(formatted).toContain('Pro');
      });
    });

    describe('Evidence Output Validation', () => {
      it('should validate evidence output', () => {
        const result = outputGuardrails.validateEvidenceOutput({
          citation: 'Smith, 2023',
          quote: 'Direct quote',
        });
        expect(result.allowed).toBe(true);
      });

      it('should reject evidence without citation', () => {
        const result = outputGuardrails.validateEvidenceOutput({
          quote: 'Direct quote',
        });
        expect(result.allowed).toBe(false);
      });
    });

    describe('Timer Output Validation', () => {
      it('should validate timer output', () => {
        const result = outputGuardrails.validateTimerOutput({
          timeRemainingMs: 60000,
          status: 'running',
        });
        expect(result.allowed).toBe(true);
      });

      it('should reject invalid timer status', () => {
        const result = outputGuardrails.validateTimerOutput({
          timeRemainingMs: 60000,
          status: 'invalid',
        });
        expect(result.allowed).toBe(false);
      });
    });

    describe('Transcript Output Validation', () => {
      it('should validate transcript events', () => {
        const result = outputGuardrails.validateTranscriptOutput([
          { id: '1', timestamp: Date.now() },
          { id: '2', timestamp: Date.now() },
        ]);
        expect(result.allowed).toBe(true);
      });

      it('should reject non-array transcript', () => {
        const result = outputGuardrails.validateTranscriptOutput('not an array' as unknown as unknown[]);
        expect(result.allowed).toBe(false);
      });
    });
  });

  describe('ToolGuardrails', () => {
    describe('Tool Call Validation', () => {
      it('should allow valid calculator tool', () => {
        const result = toolGuardrails.validateToolCall(
          'calculator_evaluate',
          { expression: '2 + 2' },
          { timestamp: Date.now(), userRole: 'user' }
        );
        expect(result.allowed).toBe(true);
      });

      it('should reject unknown tool', () => {
        const result = toolGuardrails.validateToolCall(
          'unknown_tool',
          {},
          { timestamp: Date.now() }
        );
        expect(result.allowed).toBe(false);
      });

      it('should check role permissions', () => {
        const result = toolGuardrails.validateToolCall(
          'evidence_record',
          { debateId: '1', claimText: 'Test' },
          { timestamp: Date.now(), userRole: 'spectator' }
        );
        expect(result.allowed).toBe(false);
      });

      it('should check phase restrictions', () => {
        const result = toolGuardrails.validateToolCall(
          'evidence_record',
          { debateId: '1', claimText: 'Test' },
          { timestamp: Date.now(), userRole: 'user', phase: 'crossfire_1' }
        );
        expect(result.allowed).toBe(false);
      });
    });

    describe('Parameter Validation', () => {
      it('should validate parameter size', () => {
        const largeParams = { data: 'x'.repeat(20000) };
        const result = toolGuardrails.validateToolCall(
          'calculator_evaluate',
          largeParams,
          { timestamp: Date.now() }
        );
        expect(result.allowed).toBe(false);
      });

      it('should sanitize parameters', () => {
        const result = toolGuardrails.validateToolCall(
          'calculator_evaluate',
          { expression: '<script>alert(1)</script>' },
          { timestamp: Date.now() }
        );
        expect(result.sanitizedParams?.expression).not.toContain('<script>');
      });
    });

    describe('Calculator Validation', () => {
      it('should validate calculator expression', () => {
        const result = toolGuardrails.validateCalculatorParams({
          expression: '2 + 2',
        });
        expect(result.allowed).toBe(true);
      });

      it('should reject invalid expression characters', () => {
        const result = toolGuardrails.validateCalculatorParams({
          expression: '2 + abc',
        });
        expect(result.allowed).toBe(false);
      });

      it('should validate numbers array', () => {
        const result = toolGuardrails.validateCalculatorParams({
          numbers: [1, 2, 3],
        });
        expect(result.allowed).toBe(true);
      });

      it('should reject non-numeric array', () => {
        const result = toolGuardrails.validateCalculatorParams({
          numbers: [1, 'two', 3],
        });
        expect(result.allowed).toBe(false);
      });
    });

    describe('Evidence Validation', () => {
      it('should validate evidence params', () => {
        const result = toolGuardrails.validateEvidenceParams({
          debateId: 'test-debate',
          citation: {
            authorOrSource: 'Smith',
            qualifications: 'Professor',
            title: 'Study',
            publicationDate: '2023',
          },
          claimText: 'Test claim',
        });
        expect(result.allowed).toBe(true);
      });

      it('should reject missing citation fields', () => {
        const result = toolGuardrails.validateEvidenceParams({
          debateId: 'test-debate',
          citation: {
            authorOrSource: 'Smith',
          },
          claimText: 'Test claim',
        });
        expect(result.allowed).toBe(false);
      });

      it('should warn about short claim text', () => {
        const result = toolGuardrails.validateEvidenceParams({
          debateId: 'test-debate',
          citation: {
            authorOrSource: 'Smith',
            qualifications: 'Professor',
            title: 'Study',
            publicationDate: '2023',
          },
          claimText: 'Hi',
        });
        expect(result.warnings.length).toBeGreaterThan(0);
      });
    });

    describe('Batch Validation', () => {
      it('should validate batch tool calls', () => {
        const result = toolGuardrails.validateBatchToolCalls(
          [
            { toolName: 'calculator_evaluate', params: { expression: '2 + 2' } },
            { toolName: 'calculator_evaluate', params: { expression: '3 + 3' } },
          ],
          { timestamp: Date.now(), userRole: 'user' }
        );
        expect(result.valid).toBe(true);
      });

      it('should reject batch with invalid call', () => {
        const result = toolGuardrails.validateBatchToolCalls(
          [
            { toolName: 'calculator_evaluate', params: { expression: '2 + 2' } },
            { toolName: 'unknown_tool', params: {} },
          ],
          { timestamp: Date.now() }
        );
        expect(result.valid).toBe(false);
      });
    });

    describe('Permission Management', () => {
      it('should register tool permission', () => {
        toolGuardrails.registerToolPermission({
          toolName: 'test_tool',
          allowedRoles: ['admin'],
          requiresAuth: false,
        });

        const result = toolGuardrails.validateToolCall(
          'test_tool',
          {},
          { timestamp: Date.now(), userRole: 'admin' }
        );
        expect(result.allowed).toBe(true);
      });

      it('should remove tool permission', () => {
        toolGuardrails.registerToolPermission({
          toolName: 'temp_tool',
          allowedRoles: ['user'],
          requiresAuth: false,
        });

        toolGuardrails.removeToolPermission('temp_tool');

        const result = toolGuardrails.validateToolCall(
          'temp_tool',
          {},
          { timestamp: Date.now() }
        );
        expect(result.allowed).toBe(false);
      });
    });
  });
});
