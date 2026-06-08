export type TranscriptEventType =
  | 'speech'
  | 'crossfire'
  | 'prep_time'
  | 'timer_event'
  | 'rule_violation'
  | 'evidence_request'
  | 'system';

export interface TranscriptEvent {
  id: string;
  debateId: string;
  sessionId: string;
  type: TranscriptEventType;
  phase: string;
  speakerId?: string;
  speakerName?: string;
  speakerRole?: string;
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface TranscriptSummary {
  debateId: string;
  sessionId: string;
  totalEvents: number;
  eventsByType: Record<TranscriptEventType, number>;
  eventsByPhase: Record<string, number>;
  speakers: string[];
  startTime: number;
  endTime: number;
  durationMs: number;
}

export interface TranscriptFilter {
  debateId?: string;
  sessionId?: string;
  types?: TranscriptEventType[];
  phases?: string[];
  speakerIds?: string[];
  startTime?: number;
  endTime?: number;
  searchQuery?: string;
}

export interface TranscriptSession {
  sessionId: string;
  debateId: string;
  name: string;
  createdAt: number;
  endedAt?: number;
  eventIds: string[];
}

class TranscriptService {
  private events: Map<string, TranscriptEvent> = new Map();
  private debateEvents: Map<string, Set<string>> = new Map();
  private sessionEvents: Map<string, Set<string>> = new Map();
  private sessions: Map<string, TranscriptSession> = new Map();
  private debateSessions: Map<string, Set<string>> = new Map();

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  createSession(debateId: string, name: string): TranscriptSession {
    const sessionId = this.generateId('session');
    const session: TranscriptSession = {
      sessionId,
      debateId,
      name,
      createdAt: Date.now(),
      eventIds: [],
    };

    this.sessions.set(sessionId, session);

    if (!this.debateSessions.has(debateId)) {
      this.debateSessions.set(debateId, new Set());
    }
    this.debateSessions.get(debateId)!.add(sessionId);

    return session;
  }

  endSession(sessionId: string): TranscriptSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.endedAt = Date.now();
    this.sessions.set(sessionId, session);
    return session;
  }

  appendEvent(
    debateId: string,
    sessionId: string,
    type: TranscriptEventType,
    phase: string,
    content: string,
    options?: {
      speakerId?: string;
      speakerName?: string;
      speakerRole?: string;
      metadata?: Record<string, unknown>;
    }
  ): TranscriptEvent {
    const id = this.generateId('event');
    const event: TranscriptEvent = {
      id,
      debateId,
      sessionId,
      type,
      phase,
      content,
      timestamp: Date.now(),
      ...options,
    };

    this.events.set(id, event);

    if (!this.debateEvents.has(debateId)) {
      this.debateEvents.set(debateId, new Set());
    }
    this.debateEvents.get(debateId)!.add(id);

    if (!this.sessionEvents.has(sessionId)) {
      this.sessionEvents.set(sessionId, new Set());
    }
    this.sessionEvents.get(sessionId)!.add(id);

    const session = this.sessions.get(sessionId);
    if (session) {
      session.eventIds.push(id);
      this.sessions.set(sessionId, session);
    }

    return event;
  }

  getEvent(eventId: string): TranscriptEvent | null {
    return this.events.get(eventId) ?? null;
  }

  listEvents(filter?: TranscriptFilter): TranscriptEvent[] {
    let events = Array.from(this.events.values());

    if (filter) {
      if (filter.debateId) {
        events = events.filter((e) => e.debateId === filter.debateId);
      }

      if (filter.sessionId) {
        events = events.filter((e) => e.sessionId === filter.sessionId);
      }

      if (filter.types && filter.types.length > 0) {
        events = events.filter((e) => filter.types!.includes(e.type));
      }

      if (filter.phases && filter.phases.length > 0) {
        events = events.filter((e) => filter.phases!.includes(e.phase));
      }

      if (filter.speakerIds && filter.speakerIds.length > 0) {
        events = events.filter((e) => e.speakerId && filter.speakerIds!.includes(e.speakerId));
      }

      if (filter.startTime !== undefined) {
        events = events.filter((e) => e.timestamp >= filter.startTime!);
      }

      if (filter.endTime !== undefined) {
        events = events.filter((e) => e.timestamp <= filter.endTime!);
      }

      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        events = events.filter((e) => e.content.toLowerCase().includes(query));
      }
    }

    return events.sort((a, b) => a.timestamp - b.timestamp);
  }

  listDebateEvents(debateId: string): TranscriptEvent[] {
    const eventIds = this.debateEvents.get(debateId);
    if (!eventIds) return [];

    return Array.from(eventIds)
      .map((id) => this.events.get(id))
      .filter((e): e is TranscriptEvent => e !== undefined)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  listSessionEvents(sessionId: string): TranscriptEvent[] {
    const eventIds = this.sessionEvents.get(sessionId);
    if (!eventIds) return [];

    return Array.from(eventIds)
      .map((id) => this.events.get(id))
      .filter((e): e is TranscriptEvent => e !== undefined)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  summarizeSession(sessionId: string): TranscriptSummary | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const events = this.listSessionEvents(sessionId);
    if (events.length === 0) {
      return {
        debateId: session.debateId,
        sessionId,
        totalEvents: 0,
        eventsByType: {} as Record<TranscriptEventType, number>,
        eventsByPhase: {},
        speakers: [],
        startTime: session.createdAt,
        endTime: session.endedAt ?? Date.now(),
        durationMs: (session.endedAt ?? Date.now()) - session.createdAt,
      };
    }

    const eventsByType: Partial<Record<TranscriptEventType, number>> = {};
    const eventsByPhase: Record<string, number> = {};
    const speakers = new Set<string>();

    for (const event of events) {
      eventsByType[event.type] = (eventsByType[event.type] ?? 0) + 1;
      eventsByPhase[event.phase] = (eventsByPhase[event.phase] ?? 0) + 1;
      if (event.speakerName) {
        speakers.add(event.speakerName);
      }
    }

    const startTime = events[0].timestamp;
    const endTime = events[events.length - 1].timestamp;

    return {
      debateId: session.debateId,
      sessionId,
      totalEvents: events.length,
      eventsByType: eventsByType as Record<TranscriptEventType, number>,
      eventsByPhase,
      speakers: Array.from(speakers),
      startTime,
      endTime,
      durationMs: endTime - startTime,
    };
  }

  summarizeDebate(debateId: string): TranscriptSummary[] {
    const sessionIds = this.debateSessions.get(debateId);
    if (!sessionIds) return [];

    return Array.from(sessionIds)
      .map((id) => this.summarizeSession(id))
      .filter((s): s is TranscriptSummary => s !== null);
  }

  getSession(sessionId: string): TranscriptSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  getDebateSessions(debateId: string): TranscriptSession[] {
    const sessionIds = this.debateSessions.get(debateId);
    if (!sessionIds) return [];

    return Array.from(sessionIds)
      .map((id) => this.sessions.get(id))
      .filter((s): s is TranscriptSession => s !== undefined)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  searchEvents(debateId: string, query: string): TranscriptEvent[] {
    const events = this.listDebateEvents(debateId);
    const lowerQuery = query.toLowerCase();

    return events.filter(
      (e) =>
        e.content.toLowerCase().includes(lowerQuery) ||
        e.speakerName?.toLowerCase().includes(lowerQuery) ||
        e.phase.toLowerCase().includes(lowerQuery)
    );
  }

  getEventsByPhase(debateId: string, phase: string): TranscriptEvent[] {
    return this.listDebateEvents(debateId).filter((e) => e.phase === phase);
  }

  getEventsByType(debateId: string, type: TranscriptEventType): TranscriptEvent[] {
    return this.listDebateEvents(debateId).filter((e) => e.type === type);
  }

  getSpeakerEvents(debateId: string, speakerId: string): TranscriptEvent[] {
    return this.listDebateEvents(debateId).filter((e) => e.speakerId === speakerId);
  }

  getTimeline(debateId: string): { timestamp: number; label: string; eventId: string }[] {
    const events = this.listDebateEvents(debateId);

    return events.map((e) => ({
      timestamp: e.timestamp,
      label: `${e.phase}${e.speakerName ? ` - ${e.speakerName}` : ''}`,
      eventId: e.id,
    }));
  }

  exportTranscript(sessionId: string, format: 'json' | 'text' = 'json'): string {
    const events = this.listSessionEvents(sessionId);

    if (format === 'text') {
      return events
        .map((e) => {
          const time = new Date(e.timestamp).toISOString();
          const speaker = e.speakerName ? `[${e.speakerName}] ` : '';
          return `[${time}] ${speaker}${e.content}`;
        })
        .join('\n');
    }

    return JSON.stringify(events, null, 2);
  }

  clearSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    for (const eventId of session.eventIds) {
      this.events.delete(eventId);
      this.debateEvents.get(session.debateId)?.delete(eventId);
    }

    this.sessionEvents.delete(sessionId);
    this.sessions.delete(sessionId);
    this.debateSessions.get(session.debateId)?.delete(sessionId);
  }

  clearDebate(debateId: string): void {
    const sessionIds = this.debateSessions.get(debateId);
    if (sessionIds) {
      for (const sessionId of sessionIds) {
        this.clearSession(sessionId);
      }
    }
  }
}

export const transcriptService = new TranscriptService();
