import type { RunContext } from '@openai/agents';
import { inputGuardrails } from '../guardrails/inputGuardrails.ts';
import { outputGuardrails } from '../guardrails/outputGuardrails.ts';

export interface AgentGuardrailContext {
  debateId?: string;
  phase?: string;
  speakerRole?: string;
  side?: string;
  type?: string;
}

export function createAgentGuardrails(capturedContext: AgentGuardrailContext = {}) {
  const debateInputGuardrail = {
    name: 'debate_input_safety',
    runInParallel: false,
    execute: async ({ input, context }: { input: string | unknown[]; context: RunContext }) => {
      const text = Array.isArray(input) ? input.map((item) => JSON.stringify(item)).join('\n') : String(input);
      const runContext = (context?.context ?? {}) as AgentGuardrailContext;
      const result = inputGuardrails.validateDebateInput(text, {
        phase: runContext.phase ?? capturedContext.phase,
        speakerRole: runContext.speakerRole ?? capturedContext.speakerRole,
      });
      return {
        tripwireTriggered: !result.allowed,
        outputInfo: { errors: result.errors, warnings: result.warnings },
      };
    },
  };

  const debateOutputGuardrail = {
    name: 'debate_output_quality',
    execute: async ({ agentOutput, context }: { agentOutput: unknown; context: RunContext }) => {
      const text = typeof agentOutput === 'string' ? agentOutput : JSON.stringify(agentOutput);
      const runContext = (context?.context ?? {}) as AgentGuardrailContext;
      const result = outputGuardrails.validateOutput(text, {
        phase: runContext.phase ?? capturedContext.phase,
        type: runContext.type ?? capturedContext.type,
      });
      return {
        tripwireTriggered: !result.allowed,
        outputInfo: { errors: result.errors, warnings: result.warnings },
      };
    },
  };

  return {
    inputGuardrails: [debateInputGuardrail],
    outputGuardrails: [debateOutputGuardrail],
  };
}
