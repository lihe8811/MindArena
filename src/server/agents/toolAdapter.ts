import { tool } from '@openai/agents-core';
import { z } from 'zod';
import { calculatorTools } from '../tools/calculatorTools.ts';
import { evidenceTools } from '../tools/evidenceTools.ts';
import { searchTools } from '../tools/searchTools.ts';

const calculatorEvaluateTool = tool({
  name: 'calculator_evaluate',
  description: 'Evaluate a mathematical expression safely (e.g., "2 + 2 * 3").',
  parameters: z.object({
    expression: z.string().describe('Mathematical expression to evaluate.'),
  }),
  execute: async ({ expression }) => {
    const result = calculatorTools.evaluate(expression);
    return JSON.stringify(result);
  },
});

const calculatorStatisticsTool = tool({
  name: 'calculator_statistics',
  description: 'Calculate statistics for a set of numbers.',
  parameters: z.object({
    numbers: z.array(z.number()).describe('Array of numbers to analyze.'),
  }),
  execute: async ({ numbers }) => {
    const result = calculatorTools.calculateStatistics(numbers);
    return JSON.stringify(result);
  },
});

const calculatorCompareTool = tool({
  name: 'calculator_compare',
  description: 'Compare two numeric values.',
  parameters: z.object({
    a: z.number().describe('First value.'),
    b: z.number().describe('Second value.'),
  }),
  execute: async ({ a, b }) => {
    const result = calculatorTools.compareValues(a, b);
    return JSON.stringify(result);
  },
});

const calculatorPercentageTool = tool({
  name: 'calculator_percentage',
  description: 'Calculate a percentage.',
  parameters: z.object({
    value: z.number().describe('Part value.'),
    total: z.number().describe('Total value.'),
  }),
  execute: async ({ value, total }) => {
    const result = calculatorTools.calculatePercentage(value, total);
    return JSON.stringify(result);
  },
});

const evidenceCitationSchema = z.object({
  authorOrSource: z.string(),
  qualifications: z.string(),
  title: z.string(),
  publicationDate: z.string(),
  pageNumbers: z.string().optional(),
  url: z.string().optional(),
  journalName: z.string().optional(),
  volumeIssue: z.string().optional(),
});

const evidenceRecordTool = tool({
  name: 'evidence_record',
  description: 'Record a piece of evidence with its citation for a debate claim.',
  parameters: z.object({
    debateId: z.string(),
    speakerId: z.string(),
    speakerName: z.string(),
    speechPhase: z.string(),
    claimText: z.string(),
    citation: evidenceCitationSchema,
    fullContext: z.string().optional(),
    paraphrasedText: z.string().optional(),
    directQuote: z.string().optional(),
  }),
  execute: async (params) => {
    const result = evidenceTools.recordEvidence(params);
    return JSON.stringify(result);
  },
});

const evidenceCheckCitationTool = tool({
  name: 'evidence_check_citation',
  description: 'Validate a citation for completeness before recording it.',
  parameters: z.object({
    citation: evidenceCitationSchema,
  }),
  execute: async ({ citation }) => {
    const result = evidenceTools.checkCitation(citation);
    return JSON.stringify(result);
  },
});

const evidenceGetFullTool = tool({
  name: 'evidence_get_full',
  description: 'Get the full evidence record including context availability.',
  parameters: z.object({
    claimId: z.string().describe('ID of the evidence claim.'),
  }),
  execute: async ({ claimId }) => {
    const result = evidenceTools.getEvidenceFull(claimId);
    return JSON.stringify(result);
  },
});

const evidenceGetContextTool = tool({
  name: 'evidence_get_context',
  description: 'Get the evidence with its full context paragraph.',
  parameters: z.object({
    claimId: z.string().describe('ID of the evidence claim.'),
  }),
  execute: async ({ claimId }) => {
    const result = evidenceTools.getEvidenceInContext(claimId);
    return JSON.stringify(result);
  },
});

const evidenceGetDebateTool = tool({
  name: 'evidence_get_debate',
  description: 'Get all recorded evidence for a debate.',
  parameters: z.object({
    debateId: z.string().describe('ID of the debate.'),
  }),
  execute: async ({ debateId }) => {
    const result = evidenceTools.getDebateEvidence(debateId);
    return JSON.stringify(result);
  },
});

const evidenceReportProblemTool = tool({
  name: 'evidence_report_problem',
  description: 'Report a problem with a piece of evidence.',
  parameters: z.object({
    debateId: z.string(),
    claimId: z.string(),
    reportedBy: z.string(),
    problemType: z.string(),
    description: z.string(),
  }),
  execute: async (params) => {
    const result = evidenceTools.reportEvidenceProblem(
      params.debateId,
      params.claimId,
      params.reportedBy,
      params.problemType,
      params.description,
    );
    return JSON.stringify(result);
  },
});

const evidenceGenerateCitationTool = tool({
  name: 'evidence_generate_citation',
  description: 'Generate a formatted citation string for a recorded claim.',
  parameters: z.object({
    claimId: z.string().describe('ID of the evidence claim.'),
  }),
  execute: async ({ claimId }) => {
    const result = evidenceTools.generateCitation(claimId);
    return JSON.stringify(result);
  },
});

const searchEvidenceTool = tool({
  name: 'search_evidence',
  description: 'Search the web for supporting evidence for a claim.',
  parameters: z.object({
    claim: z.string().describe('Claim to search evidence for.'),
  }),
  execute: async ({ claim }) => {
    const result = await searchTools.searchEvidence(claim);
    return JSON.stringify(result);
  },
});

const searchRebuttalTool = tool({
  name: 'search_rebuttal',
  description: 'Search the web for rebuttal evidence against a claim.',
  parameters: z.object({
    claim: z.string().describe('Claim to search rebuttal material for.'),
  }),
  execute: async ({ claim }) => {
    const result = await searchTools.searchRebuttal(claim);
    return JSON.stringify(result);
  },
});

export const rivalAgentTools = [
  calculatorEvaluateTool,
  calculatorStatisticsTool,
  calculatorCompareTool,
  calculatorPercentageTool,
  evidenceRecordTool,
  evidenceCheckCitationTool,
  evidenceGetFullTool,
  evidenceGetContextTool,
  evidenceGetDebateTool,
  evidenceReportProblemTool,
  evidenceGenerateCitationTool,
  searchEvidenceTool,
  searchRebuttalTool,
];

export const teammateAgentTools = [
  calculatorEvaluateTool,
  calculatorCompareTool,
  calculatorPercentageTool,
  evidenceCheckCitationTool,
  evidenceGetFullTool,
  evidenceGetContextTool,
  evidenceGetDebateTool,
  evidenceGenerateCitationTool,
  searchEvidenceTool,
  searchRebuttalTool,
];

export type RivalAgentToolName = (typeof rivalAgentTools)[number]['name'];
export type TeammateAgentToolName = (typeof teammateAgentTools)[number]['name'];
