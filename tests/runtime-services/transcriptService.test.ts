import { describe, it, expect, beforeEach } from 'bun:test';
import { transcriptService } from '@/server/services/transcriptService';

describe('TranscriptService', () => {
  beforeEach(() => {
    transcriptService.clearDebate('test-debate');
  });

  describe('Session Management', () => {
    it('should create a session', () => {
      const session = transcriptService.createSession('test-debate', 'Round 1');

      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();
      expect(session.debateId).toBe('test-debate');
      expect(session.name).toBe('Round 1');
    });

    it('should end a session', () => {
      const session = transcriptService.createSession('test-debate', 'Round 1');
      const ended = transcriptService.endSession(session.sessionId);

      expect(ended).toBeDefined();
      expect(ended?.endedAt).toBeDefined();
    });

    it('should get debate sessions', () => {
      transcriptService.createSession('test-debate', 'Round 1');
      transcriptService.createSession('test-debate', 'Round 2');

      const sessions = transcriptService.getDebateSessions('test-debate');
      expect(sessions).toHaveLength(2);
    });
  });

  describe('Event Management', () => {
    it('should append an event', () => {
      const session = transcriptService.createSession('test-debate', 'Round 1');
      const event = transcriptService.appendEvent(
        'test-debate',
        session.sessionId,
        'speech',
        'constructive',
        'This is my argument',
        { speakerId: 'speaker1', speakerName: 'Test Speaker', speakerRole: 'first_speaker' }
      );

      expect(event).toBeDefined();
      expect(event.id).toBeDefined();
      expect(event.content).toBe('This is my argument');
      expect(event.speakerName).toBe('Test Speaker');
    });

    it('should get an event by ID', () => {
      const session = transcriptService.createSession('test-debate', 'Round 1');
      const event = transcriptService.appendEvent(
        'test-debate',
        session.sessionId,
        'speech',
        'constructive',
        'Test content'
      );

      const retrieved = transcriptService.getEvent(event.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(event.id);
    });

    it('should list debate events', () => {
      const session = transcriptService.createSession('test-debate', 'Round 1');

      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'constructive', 'Content 1');
      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'rebuttal', 'Content 2');

      const events = transcriptService.listDebateEvents('test-debate');
      expect(events).toHaveLength(2);
    });

    it('should list session events', () => {
      const session = transcriptService.createSession('test-debate', 'Round 1');

      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'constructive', 'Content 1');
      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'rebuttal', 'Content 2');

      const events = transcriptService.listSessionEvents(session.sessionId);
      expect(events).toHaveLength(2);
    });
  });

  describe('Filtering', () => {
    it('should filter by type', () => {
      const session = transcriptService.createSession('test-debate', 'Round 1');

      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'constructive', 'Speech content');
      transcriptService.appendEvent('test-debate', session.sessionId, 'prep_time', 'prep', 'Prep content');
      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'rebuttal', 'Rebuttal content');

      const events = transcriptService.listEvents({
        debateId: 'test-debate',
        types: ['speech'],
      });

      expect(events).toHaveLength(2);
    });

    it('should filter by phase', () => {
      const session = transcriptService.createSession('test-debate', 'Round 1');

      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'constructive', 'Content 1');
      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'rebuttal', 'Content 2');

      const events = transcriptService.listEvents({
        debateId: 'test-debate',
        phases: ['constructive'],
      });

      expect(events).toHaveLength(1);
      expect(events[0].phase).toBe('constructive');
    });

    it('should filter by speaker', () => {
      const session = transcriptService.createSession('test-debate', 'Round 1');

      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'constructive', 'Content 1', {
        speakerId: 'speaker1',
      });
      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'rebuttal', 'Content 2', {
        speakerId: 'speaker2',
      });

      const events = transcriptService.listEvents({
        debateId: 'test-debate',
        speakerIds: ['speaker1'],
      });

      expect(events).toHaveLength(1);
    });

    it('should filter by time range', () => {
      const session = transcriptService.createSession('test-debate', 'Round 1');
      const now = Date.now();

      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'constructive', 'Content 1');

      const events = transcriptService.listEvents({
        debateId: 'test-debate',
        startTime: now - 1000,
        endTime: now + 1000,
      });

      expect(events.length).toBeGreaterThan(0);
    });

    it('should search by query', () => {
      const session = transcriptService.createSession('test-debate', 'Round 1');

      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'constructive', 'Technology improves education');
      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'rebuttal', 'Climate change is important');

      const events = transcriptService.listEvents({
        debateId: 'test-debate',
        searchQuery: 'technology',
      });

      expect(events).toHaveLength(1);
      expect(events[0].content).toContain('Technology');
    });
  });

  describe('Summary', () => {
    it('should summarize a session', () => {
      const session = transcriptService.createSession('test-debate', 'Round 1');

      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'constructive', 'Content 1', {
        speakerName: 'Speaker 1',
      });
      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'rebuttal', 'Content 2', {
        speakerName: 'Speaker 2',
      });

      const summary = transcriptService.summarizeSession(session.sessionId);

      expect(summary).toBeDefined();
      expect(summary?.totalEvents).toBe(2);
      expect(summary?.speakers).toContain('Speaker 1');
      expect(summary?.speakers).toContain('Speaker 2');
      expect(summary?.eventsByType.speech).toBe(2);
    });

    it('should summarize a debate', () => {
      transcriptService.createSession('test-debate', 'Round 1');
      transcriptService.createSession('test-debate', 'Round 2');

      const summaries = transcriptService.summarizeDebate('test-debate');
      expect(summaries).toHaveLength(2);
    });
  });

  describe('Specialized Queries', () => {
    it('should get events by phase', () => {
      const session = transcriptService.createSession('test-debate', 'Round 1');

      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'constructive', 'Content 1');
      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'constructive', 'Content 2');
      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'rebuttal', 'Content 3');

      const events = transcriptService.getEventsByPhase('test-debate', 'constructive');
      expect(events).toHaveLength(2);
    });

    it('should get events by type', () => {
      const session = transcriptService.createSession('test-debate', 'Round 1');

      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'constructive', 'Content 1');
      transcriptService.appendEvent('test-debate', session.sessionId, 'prep_time', 'prep', 'Content 2');

      const events = transcriptService.getEventsByType('test-debate', 'prep_time');
      expect(events).toHaveLength(1);
    });

    it('should get speaker events', () => {
      const session = transcriptService.createSession('test-debate', 'Round 1');

      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'constructive', 'Content 1', {
        speakerId: 'speaker1',
      });
      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'rebuttal', 'Content 2', {
        speakerId: 'speaker1',
      });

      const events = transcriptService.getSpeakerEvents('test-debate', 'speaker1');
      expect(events).toHaveLength(2);
    });

    it('should search events', () => {
      const session = transcriptService.createSession('test-debate', 'Round 1');

      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'constructive', 'Technology is good');
      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'rebuttal', 'Technology is bad');

      const results = transcriptService.searchEvents('test-debate', 'good');
      expect(results).toHaveLength(1);
    });

    it('should get timeline', () => {
      const session = transcriptService.createSession('test-debate', 'Round 1');

      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'constructive', 'Content 1', {
        speakerName: 'Speaker 1',
      });

      const timeline = transcriptService.getTimeline('test-debate');
      expect(timeline.length).toBeGreaterThan(0);
      expect(timeline[0].label).toContain('constructive');
    });
  });

  describe('Export', () => {
    it('should export transcript as JSON', () => {
      const session = transcriptService.createSession('test-debate', 'Round 1');
      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'constructive', 'Content');

      const json = transcriptService.exportTranscript(session.sessionId, 'json');
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
    });

    it('should export transcript as text', () => {
      const session = transcriptService.createSession('test-debate', 'Round 1');
      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'constructive', 'Content', {
        speakerName: 'Speaker 1',
      });

      const text = transcriptService.exportTranscript(session.sessionId, 'text');

      expect(text).toContain('Speaker 1');
      expect(text).toContain('Content');
    });
  });

  describe('Cleanup', () => {
    it('should clear a session', () => {
      const session = transcriptService.createSession('test-debate', 'Round 1');
      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'constructive', 'Content');

      transcriptService.clearSession(session.sessionId);

      const events = transcriptService.listSessionEvents(session.sessionId);
      expect(events).toHaveLength(0);
    });

    it('should clear a debate', () => {
      const session = transcriptService.createSession('test-debate', 'Round 1');
      transcriptService.appendEvent('test-debate', session.sessionId, 'speech', 'constructive', 'Content');

      transcriptService.clearDebate('test-debate');

      const events = transcriptService.listDebateEvents('test-debate');
      expect(events).toHaveLength(0);
    });
  });
});
