import { evidenceClerk, type EvidenceCitation, type EvidenceClaim } from '../services/evidenceClerk';
import { searchTools, type BraveSearchResult } from './searchTools';
export type { BraveSearchResult };

export interface RecordEvidenceParams {
  debateId: string;
  speakerId: string;
  speakerName: string;
  speechPhase: string;
  claimText: string;
  citation: Omit<EvidenceCitation, 'id'>;
  fullContext?: string;
  paraphrasedText?: string;
  directQuote?: string;
}

export interface RecordEvidenceResult {
  success: boolean;
  claimId?: string;
  citationCheck?: {
    isComplete: boolean;
    missingFields: string[];
    warnings: string[];
  };
  error?: string;
}

export interface CheckCitationResult {
  success: boolean;
  citationId?: string;
  isComplete: boolean;
  missingFields: string[];
  warnings: string[];
  formattedCitation?: string;
}

export interface EvidenceLookupResult {
  success: boolean;
  claims?: EvidenceClaim[];
  claim?: EvidenceClaim | null;
  contextAvailable?: boolean;
  context?: string | null;
  error?: string;
}

export interface ReportProblemResult {
  success: boolean;
  problemId?: string;
  error?: string;
}

class EvidenceTools {
  recordEvidence(params: RecordEvidenceParams): RecordEvidenceResult {
    try {
      const citation: EvidenceCitation = {
        id: `citation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...params.citation,
      };

      const citationCheck = evidenceClerk.checkCitationCompleteness(citation);

      const claim = evidenceClerk.recordClaim({
        debateId: params.debateId,
        speakerId: params.speakerId,
        speakerName: params.speakerName,
        speechPhase: params.speechPhase,
        timestamp: Date.now(),
        claimText: params.claimText,
        citation,
        fullContext: params.fullContext,
        paraphrasedText: params.paraphrasedText,
        directQuote: params.directQuote,
      });

      return {
        success: true,
        claimId: claim.id,
        citationCheck: {
          isComplete: citationCheck.isComplete,
          missingFields: citationCheck.missingFields,
          warnings: citationCheck.warnings,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record evidence',
      };
    }
  }

  checkCitation(citation: Omit<EvidenceCitation, 'id'>): CheckCitationResult {
    try {
      const fullCitation: EvidenceCitation = {
        id: `citation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...citation,
      };

      const validation = evidenceClerk.validateEvidenceFormat(citation);
      if (!validation.valid) {
        return {
          success: false,
          citationId: fullCitation.id,
          isComplete: false,
          missingFields: validation.errors.map((e) => e.split(' ')[0].toLowerCase()),
          warnings: [],
        };
      }

      const check = evidenceClerk.checkCitationCompleteness(fullCitation);

      return {
        success: true,
        citationId: fullCitation.id,
        isComplete: check.isComplete,
        missingFields: check.missingFields,
        warnings: check.warnings,
      };
    } catch (error) {
      return {
        success: false,
        citationId: '',
        isComplete: false,
        missingFields: ['unknown'],
        warnings: [error instanceof Error ? error.message : 'Citation check failed'],
      };
    }
  }

  getEvidenceFull(claimId: string): EvidenceLookupResult {
    try {
      const { claim, contextAvailable } = evidenceClerk.showEvidenceInFull(claimId);

      return {
        success: claim !== null,
        claim,
        contextAvailable,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve evidence',
      };
    }
  }

  getEvidenceInContext(claimId: string): EvidenceLookupResult {
    try {
      const { claim, context } = evidenceClerk.showEvidenceInContext(claimId);

      return {
        success: claim !== null,
        claim,
        context,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve evidence context',
      };
    }
  }

  getDebateEvidence(debateId: string): EvidenceLookupResult {
    try {
      const claims = evidenceClerk.getDebateClaims(debateId);

      return {
        success: true,
        claims,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve debate evidence',
      };
    }
  }

  getSpeakerEvidence(debateId: string, speakerId: string): EvidenceLookupResult {
    try {
      const claims = evidenceClerk.getClaimsBySpeaker(debateId, speakerId);

      return {
        success: true,
        claims,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve speaker evidence',
      };
    }
  }

  getPhaseEvidence(debateId: string, phase: string): EvidenceLookupResult {
    try {
      const claims = evidenceClerk.getClaimsByPhase(debateId, phase);

      return {
        success: true,
        claims,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve phase evidence',
      };
    }
  }

  reportEvidenceProblem(
    debateId: string,
    claimId: string,
    reportedBy: string,
    problemType: 'missing_citation' | 'incomplete_citation' | 'missing_context' | 'misrepresented' | 'other',
    description: string
  ): ReportProblemResult {
    try {
      const problem = evidenceClerk.reportEvidenceProblem(
        debateId,
        claimId,
        reportedBy,
        problemType,
        description
      );

      return {
        success: true,
        problemId: problem.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to report problem',
      };
    }
  }

  requestEvidenceContext(claimId: string, requestedBy: string): { success: boolean; requestId?: string; error?: string } {
    try {
      const request = evidenceClerk.requestContext(claimId, requestedBy);

      return {
        success: true,
        requestId: request.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request context',
      };
    }
  }

  provideEvidenceContext(requestId: string, contextText: string): { success: boolean; error?: string } {
    try {
      const request = evidenceClerk.provideContext(requestId, contextText);

      if (!request) {
        return {
          success: false,
          error: 'Context request not found',
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to provide context',
      };
    }
  }

  generateCitation(claimId: string): { success: boolean; citation?: string; error?: string } {
    try {
      const citation = evidenceClerk.generateCitationSummary(claimId);

      if (!citation) {
        return {
          success: false,
          error: 'Claim not found',
        };
      }

      return {
        success: true,
        citation,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate citation',
      };
    }
  }

  validateCitationFormat(citation: Partial<EvidenceCitation>): {
    valid: boolean;
    errors: string[];
    suggestions: string[];
  } {
    const validation = evidenceClerk.validateEvidenceFormat(citation);
    const suggestions: string[] = [];

    if (!citation.pageNumbers && citation.journalName) {
      suggestions.push('Consider adding page numbers for journal citations');
    }

    if (!citation.url && !citation.journalName) {
      suggestions.push('Consider adding a URL for online sources');
    }

    if (citation.qualifications && citation.qualifications.length < 10) {
      suggestions.push('Consider providing more detailed qualifications');
    }

    return {
      valid: validation.valid,
      errors: validation.errors,
      suggestions,
    };
  }

  /**
   * Search the web for evidence supporting a claim.
   */
  async searchEvidence(claim: string): Promise<BraveSearchResult> {
    return searchTools.searchEvidence(claim);
  }

  /**
   * Search the web for rebuttal evidence against a claim.
   */
  async searchRebuttal(claim: string): Promise<BraveSearchResult> {
    return searchTools.searchRebuttal(claim);
  }
}

export const evidenceTools = new EvidenceTools();

export const evidenceToolDefinitions = {
  recordEvidence: {
    name: 'evidence_record',
    description: 'Record a piece of evidence with its citation for a debate claim',
    parameters: {
      type: 'object',
      properties: {
        debateId: { type: 'string', description: 'ID of the debate' },
        speakerId: { type: 'string', description: 'ID of the speaker' },
        speakerName: { type: 'string', description: 'Name of the speaker' },
        speechPhase: { type: 'string', description: 'Phase of speech (e.g., constructive, rebuttal)' },
        claimText: { type: 'string', description: 'The claim being made' },
        citation: {
          type: 'object',
          properties: {
            authorOrSource: { type: 'string' },
            qualifications: { type: 'string' },
            title: { type: 'string' },
            publicationDate: { type: 'string' },
            pageNumbers: { type: 'string', optional: true },
            url: { type: 'string', optional: true },
            journalName: { type: 'string', optional: true },
            volumeIssue: { type: 'string', optional: true },
          },
          required: ['authorOrSource', 'qualifications', 'title', 'publicationDate'],
        },
        fullContext: { type: 'string', optional: true },
        paraphrasedText: { type: 'string', optional: true },
        directQuote: { type: 'string', optional: true },
      },
      required: ['debateId', 'speakerId', 'speakerName', 'speechPhase', 'claimText', 'citation'],
    },
    handler: (params: RecordEvidenceParams) => evidenceTools.recordEvidence(params),
  },

  checkCitation: {
    name: 'evidence_check_citation',
    description: 'Check if a citation has all required fields',
    parameters: {
      type: 'object',
      properties: {
        citation: {
          type: 'object',
          properties: {
            authorOrSource: { type: 'string' },
            qualifications: { type: 'string' },
            title: { type: 'string' },
            publicationDate: { type: 'string' },
            pageNumbers: { type: 'string', optional: true },
            url: { type: 'string', optional: true },
            journalName: { type: 'string', optional: true },
            volumeIssue: { type: 'string', optional: true },
          },
          required: ['authorOrSource', 'qualifications', 'title', 'publicationDate'],
        },
      },
      required: ['citation'],
    },
    handler: (params: { citation: Omit<EvidenceCitation, 'id'> }) => evidenceTools.checkCitation(params.citation),
  },

  getEvidenceFull: {
    name: 'evidence_get_full',
    description: 'Get the full evidence record including context availability',
    parameters: {
      type: 'object',
      properties: {
        claimId: { type: 'string', description: 'ID of the evidence claim' },
      },
      required: ['claimId'],
    },
    handler: (params: { claimId: string }) => evidenceTools.getEvidenceFull(params.claimId),
  },

  getEvidenceInContext: {
    name: 'evidence_get_context',
    description: 'Get the evidence with its full context paragraph',
    parameters: {
      type: 'object',
      properties: {
        claimId: { type: 'string', description: 'ID of the evidence claim' },
      },
      required: ['claimId'],
    },
    handler: (params: { claimId: string }) => evidenceTools.getEvidenceInContext(params.claimId),
  },

  getDebateEvidence: {
    name: 'evidence_get_debate',
    description: 'Get all evidence for a debate',
    parameters: {
      type: 'object',
      properties: {
        debateId: { type: 'string', description: 'ID of the debate' },
      },
      required: ['debateId'],
    },
    handler: (params: { debateId: string }) => evidenceTools.getDebateEvidence(params.debateId),
  },

  reportEvidenceProblem: {
    name: 'evidence_report_problem',
    description: 'Report a problem with a piece of evidence',
    parameters: {
      type: 'object',
      properties: {
        debateId: { type: 'string' },
        claimId: { type: 'string' },
        reportedBy: { type: 'string' },
        problemType: {
          type: 'string',
          enum: ['missing_citation', 'incomplete_citation', 'missing_context', 'misrepresented', 'other'],
        },
        description: { type: 'string' },
      },
      required: ['debateId', 'claimId', 'reportedBy', 'problemType', 'description'],
    },
    handler: (params: {
      debateId: string;
      claimId: string;
      reportedBy: string;
      problemType: 'missing_citation' | 'incomplete_citation' | 'missing_context' | 'misrepresented' | 'other';
      description: string;
    }) => evidenceTools.reportEvidenceProblem(
      params.debateId,
      params.claimId,
      params.reportedBy,
      params.problemType,
      params.description
    ),
  },

  generateCitation: {
    name: 'evidence_generate_citation',
    description: 'Generate a properly formatted citation string from a claim',
    parameters: {
      type: 'object',
      properties: {
        claimId: { type: 'string', description: 'ID of the evidence claim' },
      },
      required: ['claimId'],
    },
    handler: (params: { claimId: string }) => evidenceTools.generateCitation(params.claimId),
  },
};
