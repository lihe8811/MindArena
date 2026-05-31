export interface EvidenceCitation {
  id: string;
  authorOrSource: string;
  qualifications: string;
  title: string;
  publicationDate: string;
  pageNumbers?: string;
  url?: string;
  journalName?: string;
  volumeIssue?: string;
}

export interface EvidenceClaim {
  id: string;
  debateId: string;
  speakerId: string;
  speakerName: string;
  speechPhase: string;
  timestamp: number;
  claimText: string;
  citation: EvidenceCitation;
  fullContext?: string;
  paraphrasedText?: string;
  directQuote?: string;
}

export interface CitationCompletenessCheck {
  citationId: string;
  isComplete: boolean;
  missingFields: string[];
  warnings: string[];
}

export interface EvidenceProblem {
  id: string;
  debateId: string;
  claimId: string;
  reportedBy: string;
  reportedAt: number;
  problemType: 'missing_citation' | 'incomplete_citation' | 'missing_context' | 'misrepresented' | 'other';
  description: string;
  status: 'open' | 'under_review' | 'resolved';
  resolution?: string;
}

export interface EvidenceContextRequest {
  id: string;
  claimId: string;
  requestedBy: string;
  requestedAt: number;
  provided: boolean;
  contextText?: string;
}

class EvidenceClerk {
  private claims: Map<string, EvidenceClaim> = new Map();
  private debateClaims: Map<string, Set<string>> = new Map();
  private problems: Map<string, EvidenceProblem> = new Map();
  private contextRequests: Map<string, EvidenceContextRequest> = new Map();

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  recordClaim(claim: Omit<EvidenceClaim, 'id'>): EvidenceClaim {
    const id = this.generateId('claim');
    const fullClaim: EvidenceClaim = { ...claim, id };

    this.claims.set(id, fullClaim);

    if (!this.debateClaims.has(claim.debateId)) {
      this.debateClaims.set(claim.debateId, new Set());
    }
    this.debateClaims.get(claim.debateId)!.add(id);

    return fullClaim;
  }

  getClaim(claimId: string): EvidenceClaim | null {
    return this.claims.get(claimId) ?? null;
  }

  getDebateClaims(debateId: string): EvidenceClaim[] {
    const claimIds = this.debateClaims.get(debateId);
    if (!claimIds) return [];

    return Array.from(claimIds)
      .map((id) => this.claims.get(id))
      .filter((claim): claim is EvidenceClaim => claim !== undefined);
  }

  getClaimsBySpeaker(debateId: string, speakerId: string): EvidenceClaim[] {
    return this.getDebateClaims(debateId).filter((claim) => claim.speakerId === speakerId);
  }

  getClaimsByPhase(debateId: string, phase: string): EvidenceClaim[] {
    return this.getDebateClaims(debateId).filter((claim) => claim.speechPhase === phase);
  }

  checkCitationCompleteness(citation: EvidenceCitation): CitationCompletenessCheck {
    const missingFields: string[] = [];
    const warnings: string[] = [];

    if (!citation.authorOrSource?.trim()) {
      missingFields.push('authorOrSource');
    }

    if (!citation.qualifications?.trim()) {
      missingFields.push('qualifications');
    }

    if (!citation.title?.trim()) {
      missingFields.push('title');
    }

    if (!citation.publicationDate?.trim()) {
      missingFields.push('publicationDate');
    }

    if (citation.url && !this.isValidUrl(citation.url)) {
      warnings.push('URL format appears invalid');
    }

    if (citation.journalName && !citation.volumeIssue) {
      warnings.push('Journal citation should include volume and issue information');
    }

    const isComplete = missingFields.length === 0;

    return {
      citationId: citation.id,
      isComplete,
      missingFields,
      warnings,
    };
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  showEvidenceInFull(claimId: string): { claim: EvidenceClaim | null; contextAvailable: boolean } {
    const claim = this.claims.get(claimId);
    if (!claim) {
      return { claim: null, contextAvailable: false };
    }

    const contextAvailable = !!claim.fullContext && claim.fullContext.trim().length > 0;

    return { claim, contextAvailable };
  }

  showEvidenceInContext(claimId: string): { claim: EvidenceClaim | null; context: string | null } {
    const claim = this.claims.get(claimId);
    if (!claim) {
      return { claim: null, context: null };
    }

    return {
      claim,
      context: claim.fullContext ?? null,
    };
  }

  reportEvidenceProblem(
    debateId: string,
    claimId: string,
    reportedBy: string,
    problemType: EvidenceProblem['problemType'],
    description: string
  ): EvidenceProblem {
    const id = this.generateId('problem');
    const problem: EvidenceProblem = {
      id,
      debateId,
      claimId,
      reportedBy,
      reportedAt: Date.now(),
      problemType,
      description,
      status: 'open',
    };

    this.problems.set(id, problem);
    return problem;
  }

  getProblem(problemId: string): EvidenceProblem | null {
    return this.problems.get(problemId) ?? null;
  }

  getDebateProblems(debateId: string): EvidenceProblem[] {
    return Array.from(this.problems.values()).filter((p) => p.debateId === debateId);
  }

  getClaimProblems(claimId: string): EvidenceProblem[] {
    return Array.from(this.problems.values()).filter((p) => p.claimId === claimId);
  }

  updateProblemStatus(
    problemId: string,
    status: EvidenceProblem['status'],
    resolution?: string
  ): EvidenceProblem | null {
    const problem = this.problems.get(problemId);
    if (!problem) return null;

    problem.status = status;
    if (resolution !== undefined) {
      problem.resolution = resolution;
    }

    this.problems.set(problemId, problem);
    return problem;
  }

  requestContext(claimId: string, requestedBy: string): EvidenceContextRequest {
    const id = this.generateId('context_req');
    const request: EvidenceContextRequest = {
      id,
      claimId,
      requestedBy,
      requestedAt: Date.now(),
      provided: false,
    };

    this.contextRequests.set(id, request);
    return request;
  }

  provideContext(requestId: string, contextText: string): EvidenceContextRequest | null {
    const request = this.contextRequests.get(requestId);
    if (!request) return null;

    request.provided = true;
    request.contextText = contextText;

    const claim = this.claims.get(request.claimId);
    if (claim) {
      claim.fullContext = contextText;
      this.claims.set(request.claimId, claim);
    }

    this.contextRequests.set(requestId, request);
    return request;
  }

  getContextRequest(requestId: string): EvidenceContextRequest | null {
    return this.contextRequests.get(requestId) ?? null;
  }

  getPendingContextRequests(debateId: string): EvidenceContextRequest[] {
    const claimIds = this.debateClaims.get(debateId);
    if (!claimIds) return [];

    return Array.from(this.contextRequests.values()).filter(
      (req) => claimIds.has(req.claimId) && !req.provided
    );
  }

  validateEvidenceFormat(citation: Partial<EvidenceCitation>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!citation.authorOrSource?.trim()) {
      errors.push('Author or source name is required');
    }

    if (!citation.qualifications?.trim()) {
      errors.push('Author qualifications are required');
    }

    if (!citation.title?.trim()) {
      errors.push('Title is required');
    }

    if (!citation.publicationDate?.trim()) {
      errors.push('Publication date is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  generateCitationSummary(claimId: string): string | null {
    const claim = this.claims.get(claimId);
    if (!claim) return null;

    const { citation } = claim;
    const parts: string[] = [];

    parts.push(`According to ${citation.authorOrSource}`);

    if (citation.qualifications) {
      parts.push(`, ${citation.qualifications}`);
    }

    if (citation.publicationDate) {
      parts.push(` in ${citation.publicationDate}`);
    }

    if (citation.title) {
      parts.push(`, "${citation.title}"`);
    }

    if (citation.journalName) {
      parts.push(`, ${citation.journalName}`);
    }

    if (citation.volumeIssue) {
      parts.push(`, ${citation.volumeIssue}`);
    }

    if (citation.pageNumbers) {
      parts.push(`, pp. ${citation.pageNumbers}`);
    }

    return parts.join('') + '.';
  }

  clearDebateEvidence(debateId: string): void {
    const claimIds = this.debateClaims.get(debateId);
    if (!claimIds) return;

    for (const claimId of claimIds) {
      this.claims.delete(claimId);

      for (const [problemId, problem] of this.problems) {
        if (problem.claimId === claimId) {
          this.problems.delete(problemId);
        }
      }

      for (const [requestId, request] of this.contextRequests) {
        if (request.claimId === claimId) {
          this.contextRequests.delete(requestId);
        }
      }
    }

    this.debateClaims.delete(debateId);
  }
}

export const evidenceClerk = new EvidenceClerk();
