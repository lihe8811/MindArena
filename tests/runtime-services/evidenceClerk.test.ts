import { describe, it, expect, beforeEach } from 'bun:test';
import { evidenceClerk, type EvidenceCitation } from '@/server/services/evidenceClerk';

describe('EvidenceClerk', () => {
  beforeEach(() => {
    evidenceClerk.clearDebateEvidence('test-debate');
  });

  const mockCitation: Omit<EvidenceCitation, 'id'> = {
    authorOrSource: 'Smith, John',
    qualifications: 'Professor of Economics at Harvard University',
    title: 'The Impact of Technology on Economic Growth',
    publicationDate: '2023',
    pageNumbers: '45-67',
    url: 'https://example.com/article',
  };

  describe('Recording Claims', () => {
    it('should record a claim with citation', () => {
      const claim = evidenceClerk.recordClaim({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Test Speaker',
        speechPhase: 'constructive',
        timestamp: Date.now(),
        claimText: 'Technology increases productivity by 20%',
        citation: { id: 'citation_1', ...mockCitation },
      });

      expect(claim).toBeDefined();
      expect(claim.id).toBeDefined();
      expect(claim.claimText).toBe('Technology increases productivity by 20%');
    });

    it('should retrieve a claim by ID', () => {
      const claim = evidenceClerk.recordClaim({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Test Speaker',
        speechPhase: 'constructive',
        timestamp: Date.now(),
        claimText: 'Test claim',
        citation: { id: 'citation_1', ...mockCitation },
      });

      const retrieved = evidenceClerk.getClaim(claim.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(claim.id);
    });

    it('should get all claims for a debate', () => {
      evidenceClerk.recordClaim({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Speaker 1',
        speechPhase: 'constructive',
        timestamp: Date.now(),
        claimText: 'Claim 1',
        citation: { id: 'citation_1', ...mockCitation },
      });

      evidenceClerk.recordClaim({
        debateId: 'test-debate',
        speakerId: 'speaker2',
        speakerName: 'Speaker 2',
        speechPhase: 'rebuttal',
        timestamp: Date.now(),
        claimText: 'Claim 2',
        citation: { id: 'citation_2', ...mockCitation },
      });

      const claims = evidenceClerk.getDebateClaims('test-debate');
      expect(claims).toHaveLength(2);
    });

    it('should get claims by speaker', () => {
      evidenceClerk.recordClaim({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Speaker 1',
        speechPhase: 'constructive',
        timestamp: Date.now(),
        claimText: 'Claim 1',
        citation: { id: 'citation_1', ...mockCitation },
      });

      evidenceClerk.recordClaim({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Speaker 1',
        speechPhase: 'rebuttal',
        timestamp: Date.now(),
        claimText: 'Claim 2',
        citation: { id: 'citation_2', ...mockCitation },
      });

      const claims = evidenceClerk.getClaimsBySpeaker('test-debate', 'speaker1');
      expect(claims).toHaveLength(2);
    });

    it('should get claims by phase', () => {
      evidenceClerk.recordClaim({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Speaker 1',
        speechPhase: 'constructive',
        timestamp: Date.now(),
        claimText: 'Claim 1',
        citation: { id: 'citation_1', ...mockCitation },
      });

      evidenceClerk.recordClaim({
        debateId: 'test-debate',
        speakerId: 'speaker2',
        speakerName: 'Speaker 2',
        speechPhase: 'rebuttal',
        timestamp: Date.now(),
        claimText: 'Claim 2',
        citation: { id: 'citation_2', ...mockCitation },
      });

      const constructiveClaims = evidenceClerk.getClaimsByPhase('test-debate', 'constructive');
      expect(constructiveClaims).toHaveLength(1);
      expect(constructiveClaims[0].claimText).toBe('Claim 1');
    });
  });

  describe('Citation Completeness', () => {
    it('should detect complete citation', () => {
      const citation: EvidenceCitation = {
        id: 'citation_1',
        authorOrSource: 'Smith, John',
        qualifications: 'Professor of Economics',
        title: 'Economic Growth Study',
        publicationDate: '2023',
      };

      const check = evidenceClerk.checkCitationCompleteness(citation);
      expect(check.isComplete).toBe(true);
      expect(check.missingFields).toHaveLength(0);
    });

    it('should detect incomplete citation with missing fields', () => {
      const citation: EvidenceCitation = {
        id: 'citation_1',
        authorOrSource: '',
        qualifications: 'Professor',
        title: 'Study',
        publicationDate: '',
      };

      const check = evidenceClerk.checkCitationCompleteness(citation);
      expect(check.isComplete).toBe(false);
      expect(check.missingFields).toContain('authorOrSource');
      expect(check.missingFields).toContain('publicationDate');
    });

    it('should warn about invalid URL', () => {
      const citation: EvidenceCitation = {
        id: 'citation_1',
        authorOrSource: 'Smith',
        qualifications: 'Professor',
        title: 'Study',
        publicationDate: '2023',
        url: 'not-a-valid-url',
      };

      const check = evidenceClerk.checkCitationCompleteness(citation);
      expect(check.warnings).toContain('URL format appears invalid');
    });

    it('should warn about missing volume/issue for journal', () => {
      const citation: EvidenceCitation = {
        id: 'citation_1',
        authorOrSource: 'Smith',
        qualifications: 'Professor',
        title: 'Study',
        publicationDate: '2023',
        journalName: 'Journal of Economics',
      };

      const check = evidenceClerk.checkCitationCompleteness(citation);
      expect(check.warnings).toContain('Journal citation should include volume and issue information');
    });
  });

  describe('Evidence Context', () => {
    it('should show evidence in full', () => {
      const claim = evidenceClerk.recordClaim({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Speaker 1',
        speechPhase: 'constructive',
        timestamp: Date.now(),
        claimText: 'Test claim',
        citation: { id: 'citation_1', ...mockCitation },
        fullContext: 'This is the full context paragraph from the source.',
      });

      const result = evidenceClerk.showEvidenceInFull(claim.id);
      expect(result.claim).toBeDefined();
      expect(result.contextAvailable).toBe(true);
    });

    it('should show evidence in context', () => {
      const claim = evidenceClerk.recordClaim({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Speaker 1',
        speechPhase: 'constructive',
        timestamp: Date.now(),
        claimText: 'Test claim',
        citation: { id: 'citation_1', ...mockCitation },
        fullContext: 'Full context here',
      });

      const result = evidenceClerk.showEvidenceInContext(claim.id);
      expect(result.claim).toBeDefined();
      expect(result.context).toBe('Full context here');
    });
  });

  describe('Evidence Problems', () => {
    it('should report an evidence problem', () => {
      const claim = evidenceClerk.recordClaim({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Speaker 1',
        speechPhase: 'constructive',
        timestamp: Date.now(),
        claimText: 'Test claim',
        citation: { id: 'citation_1', ...mockCitation },
      });

      const problem = evidenceClerk.reportEvidenceProblem(
        'test-debate',
        claim.id,
        'opponent1',
        'missing_context',
        'The evidence context was not provided when requested'
      );

      expect(problem).toBeDefined();
      expect(problem.problemType).toBe('missing_context');
      expect(problem.status).toBe('open');
    });

    it('should get debate problems', () => {
      const claim = evidenceClerk.recordClaim({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Speaker 1',
        speechPhase: 'constructive',
        timestamp: Date.now(),
        claimText: 'Test claim',
        citation: { id: 'citation_1', ...mockCitation },
      });

      evidenceClerk.reportEvidenceProblem('test-debate', claim.id, 'user1', 'missing_citation', 'Missing citation');
      evidenceClerk.reportEvidenceProblem('test-debate', claim.id, 'user2', 'misrepresented', 'Misrepresented');

      const problems = evidenceClerk.getDebateProblems('test-debate');
      expect(problems).toHaveLength(2);
    });

    it('should update problem status', () => {
      const claim = evidenceClerk.recordClaim({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Speaker 1',
        speechPhase: 'constructive',
        timestamp: Date.now(),
        claimText: 'Test claim',
        citation: { id: 'citation_1', ...mockCitation },
      });

      const problem = evidenceClerk.reportEvidenceProblem('test-debate', claim.id, 'user1', 'missing_citation', 'Missing');
      const updated = evidenceClerk.updateProblemStatus(problem.id, 'resolved', 'Context provided');

      expect(updated).toBeDefined();
      expect(updated?.status).toBe('resolved');
      expect(updated?.resolution).toBe('Context provided');
    });
  });

  describe('Context Requests', () => {
    it('should request context', () => {
      const claim = evidenceClerk.recordClaim({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Speaker 1',
        speechPhase: 'constructive',
        timestamp: Date.now(),
        claimText: 'Test claim',
        citation: { id: 'citation_1', ...mockCitation },
      });

      const request = evidenceClerk.requestContext(claim.id, 'opponent1');
      expect(request).toBeDefined();
      expect(request.provided).toBe(false);
    });

    it('should provide context', () => {
      const claim = evidenceClerk.recordClaim({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Speaker 1',
        speechPhase: 'constructive',
        timestamp: Date.now(),
        claimText: 'Test claim',
        citation: { id: 'citation_1', ...mockCitation },
      });

      const request = evidenceClerk.requestContext(claim.id, 'opponent1');
      const provided = evidenceClerk.provideContext(request.id, 'Full context paragraph here');

      expect(provided).toBeDefined();
      expect(provided?.provided).toBe(true);
      expect(provided?.contextText).toBe('Full context paragraph here');
    });
  });

  describe('Citation Generation', () => {
    it('should generate citation summary', () => {
      const claim = evidenceClerk.recordClaim({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Speaker 1',
        speechPhase: 'constructive',
        timestamp: Date.now(),
        claimText: 'Test claim',
        citation: {
          id: 'citation_1',
          authorOrSource: 'Smith, John',
          qualifications: 'Professor of Economics',
          title: 'Economic Growth',
          publicationDate: '2023',
        },
      });

      const citation = evidenceClerk.generateCitationSummary(claim.id);
      expect(citation).toBeDefined();
      expect(citation).toContain('Smith, John');
      expect(citation).toContain('2023');
    });
  });

  describe('Validation', () => {
    it('should validate evidence format', () => {
      const result = evidenceClerk.validateEvidenceFormat({
        authorOrSource: 'Smith',
        qualifications: 'Professor',
        title: 'Study',
        publicationDate: '2023',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid evidence format', () => {
      const result = evidenceClerk.validateEvidenceFormat({
        authorOrSource: '',
        qualifications: '',
        title: '',
        publicationDate: '',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
