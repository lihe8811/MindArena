import { describe, it, expect, beforeEach } from 'bun:test';
import { evidenceTools } from '@/server/tools/evidenceTools';
import { evidenceClerk } from '@/server/services/evidenceClerk';

describe('EvidenceTools', () => {
  beforeEach(() => {
    evidenceClerk.clearDebateEvidence('test-debate');
  });

  const mockCitation = {
    authorOrSource: 'Smith, John',
    qualifications: 'Professor of Economics at Harvard University',
    title: 'The Impact of Technology on Economic Growth',
    publicationDate: '2023',
    pageNumbers: '45-67',
    url: 'https://example.com/article',
  };

  describe('Recording Evidence', () => {
    it('should record evidence successfully', () => {
      const result = evidenceTools.recordEvidence({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Test Speaker',
        speechPhase: 'constructive',
        claimText: 'Technology increases productivity by 20%',
        citation: mockCitation,
      });

      expect(result.success).toBe(true);
      expect(result.claimId).toBeDefined();
      expect(result.citationCheck).toBeDefined();
    });

    it('should check citation completeness', () => {
      const result = evidenceTools.recordEvidence({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Test Speaker',
        speechPhase: 'constructive',
        claimText: 'Test claim',
        citation: mockCitation,
      });

      expect(result.citationCheck?.isComplete).toBe(true);
      expect(result.citationCheck?.missingFields).toHaveLength(0);
    });

    it('should detect incomplete citation', () => {
      const result = evidenceTools.recordEvidence({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Test Speaker',
        speechPhase: 'constructive',
        claimText: 'Test claim',
        citation: {
          authorOrSource: '',
          qualifications: '',
          title: '',
          publicationDate: '',
        },
      });

      expect(result.success).toBe(true);
      expect(result.citationCheck?.isComplete).toBe(false);
      expect(result.citationCheck?.missingFields.length).toBeGreaterThan(0);
    });
  });

  describe('Checking Citations', () => {
    it('should validate complete citation', () => {
      const result = evidenceTools.checkCitation(mockCitation);

      expect(result.success).toBe(true);
      expect(result.isComplete).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should detect missing fields', () => {
      const result = evidenceTools.checkCitation({
        authorOrSource: 'Smith',
        qualifications: '',
        title: 'Study',
        publicationDate: '',
      });

      expect(result.success).toBe(false);
      expect(result.isComplete).toBe(false);
      expect(result.missingFields.length).toBeGreaterThan(0);
    });

    it('should warn about invalid URL', () => {
      const result = evidenceTools.checkCitation({
        ...mockCitation,
        url: 'not-a-valid-url',
      });

      expect(result.warnings).toContain('URL format appears invalid');
    });
  });

  describe('Retrieving Evidence', () => {
    it('should get evidence full', () => {
      const recorded = evidenceTools.recordEvidence({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Test Speaker',
        speechPhase: 'constructive',
        claimText: 'Test claim',
        citation: mockCitation,
        fullContext: 'This is the full context',
      });

      const result = evidenceTools.getEvidenceFull(recorded.claimId!);

      expect(result.success).toBe(true);
      expect(result.claim).toBeDefined();
      expect(result.contextAvailable).toBe(true);
    });

    it('should get evidence in context', () => {
      const recorded = evidenceTools.recordEvidence({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Test Speaker',
        speechPhase: 'constructive',
        claimText: 'Test claim',
        citation: mockCitation,
        fullContext: 'Full context here',
      });

      const result = evidenceTools.getEvidenceInContext(recorded.claimId!);

      expect(result.success).toBe(true);
      expect(result.context).toBe('Full context here');
    });

    it('should return null for non-existent claim', () => {
      const result = evidenceTools.getEvidenceFull('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.claim).toBeNull();
    });

    it('should get all debate evidence', () => {
      evidenceTools.recordEvidence({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Speaker 1',
        speechPhase: 'constructive',
        claimText: 'Claim 1',
        citation: mockCitation,
      });

      evidenceTools.recordEvidence({
        debateId: 'test-debate',
        speakerId: 'speaker2',
        speakerName: 'Speaker 2',
        speechPhase: 'rebuttal',
        claimText: 'Claim 2',
        citation: mockCitation,
      });

      const result = evidenceTools.getDebateEvidence('test-debate');

      expect(result.success).toBe(true);
      expect(result.claims).toHaveLength(2);
    });

    it('should get speaker evidence', () => {
      evidenceTools.recordEvidence({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Speaker 1',
        speechPhase: 'constructive',
        claimText: 'Claim 1',
        citation: mockCitation,
      });

      evidenceTools.recordEvidence({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Speaker 1',
        speechPhase: 'rebuttal',
        claimText: 'Claim 2',
        citation: mockCitation,
      });

      const result = evidenceTools.getSpeakerEvidence('test-debate', 'speaker1');

      expect(result.success).toBe(true);
      expect(result.claims).toHaveLength(2);
    });

    it('should get phase evidence', () => {
      evidenceTools.recordEvidence({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Speaker 1',
        speechPhase: 'constructive',
        claimText: 'Claim 1',
        citation: mockCitation,
      });

      evidenceTools.recordEvidence({
        debateId: 'test-debate',
        speakerId: 'speaker2',
        speakerName: 'Speaker 2',
        speechPhase: 'rebuttal',
        claimText: 'Claim 2',
        citation: mockCitation,
      });

      const result = evidenceTools.getPhaseEvidence('test-debate', 'constructive');

      expect(result.success).toBe(true);
      expect(result.claims).toHaveLength(1);
    });
  });

  describe('Reporting Problems', () => {
    it('should report an evidence problem', () => {
      const recorded = evidenceTools.recordEvidence({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Test Speaker',
        speechPhase: 'constructive',
        claimText: 'Test claim',
        citation: mockCitation,
      });

      const result = evidenceTools.reportEvidenceProblem(
        'test-debate',
        recorded.claimId!,
        'opponent1',
        'missing_context',
        'Context was not provided'
      );

      expect(result.success).toBe(true);
      expect(result.problemId).toBeDefined();
    });
  });

  describe('Citation Generation', () => {
    it('should generate citation', () => {
      const recorded = evidenceTools.recordEvidence({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Test Speaker',
        speechPhase: 'constructive',
        claimText: 'Test claim',
        citation: mockCitation,
      });

      const result = evidenceTools.generateCitation(recorded.claimId!);

      expect(result.success).toBe(true);
      expect(result.citation).toContain('Smith, John');
      expect(result.citation).toContain('2023');
    });

    it('should fail for non-existent claim', () => {
      const result = evidenceTools.generateCitation('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Claim not found');
    });
  });

  describe('Context Requests', () => {
    it('should request context', () => {
      const recorded = evidenceTools.recordEvidence({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Test Speaker',
        speechPhase: 'constructive',
        claimText: 'Test claim',
        citation: mockCitation,
      });

      const result = evidenceTools.requestEvidenceContext(recorded.claimId!, 'opponent1');

      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
    });

    it('should provide context', () => {
      const recorded = evidenceTools.recordEvidence({
        debateId: 'test-debate',
        speakerId: 'speaker1',
        speakerName: 'Test Speaker',
        speechPhase: 'constructive',
        claimText: 'Test claim',
        citation: mockCitation,
      });

      const request = evidenceTools.requestEvidenceContext(recorded.claimId!, 'opponent1');
      const result = evidenceTools.provideEvidenceContext(request.requestId!, 'Full context here');

      expect(result.success).toBe(true);
    });

    it('should fail for non-existent request', () => {
      const result = evidenceTools.provideEvidenceContext('non-existent', 'Context');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Context request not found');
    });
  });

  describe('Validation', () => {
    it('should validate citation format', () => {
      const result = evidenceTools.validateCitationFormat(mockCitation);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should provide suggestions', () => {
      const result = evidenceTools.validateCitationFormat({
        authorOrSource: 'Smith',
        qualifications: 'Prof',
        title: 'Study',
        publicationDate: '2023',
        journalName: 'Journal of Economics',
      });

      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should detect missing required fields', () => {
      const result = evidenceTools.validateCitationFormat({
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
