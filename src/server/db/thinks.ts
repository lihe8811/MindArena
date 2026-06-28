/**
 * think.json — stores what each agent is "thinking" during the debate.
 * Updated in real-time as agents process their inputs.
 */

import { recordQna } from '../agents/qnaStore';

export interface ThinkEntry {
  id: string;
  sessionId: string;
  phase: string;
  agentRole: string;
  thought: string;
  timestamp: number;
}

const thinks: ThinkEntry[] = [];

/**
 * Records a thought from an agent during a debate phase.
 */
export function recordThink(entry: Omit<ThinkEntry, 'id' | 'timestamp'>): ThinkEntry {
  const full: ThinkEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  thinks.push(full);
  return full;
}

/**
 * Returns all thoughts for a session, optionally filtered by phase.
 */
export function getThinksForSession(sessionId: string, phase?: string): ThinkEntry[] {
  return thinks.filter(
    (t) => t.sessionId === sessionId && (phase ? t.phase === phase : true),
  );
}

/**
 * Returns the most recent thought for a given agent in a session phase.
 */
export function getLatestThink(sessionId: string, agentRole: string, phase: string): ThinkEntry | null {
  const matches = thinks.filter(
    (t) => t.sessionId === sessionId && t.agentRole === agentRole && t.phase === phase,
  );
  return matches[matches.length - 1] ?? null;
}

/**
 * Clears all thoughts for a session (e.g., when session ends).
 */
export function clearThinksForSession(sessionId: string): void {
  const removed = thinks.filter((t) => t.sessionId !== sessionId);
  thinks.length = 0;
  removed; // just to avoid unused warning — array is mutated in place
}

/**
 * Formats all thoughts for a session as a readable string.
 */
export function formatThinksForSession(sessionId: string): string {
  const sessionThinks = getThinksForSession(sessionId);
  if (sessionThinks.length === 0) {
    return 'No thoughts recorded for this session.';
  }

  const lines = ['## Agent Thoughts\n'];
  for (const t of sessionThinks) {
    lines.push(`- **[${t.agentRole}]** (${t.phase}): ${t.thought}`);
  }
  return lines.join('\n');
}

/**
 * Exports all thoughts as a JSON-serializable array.
 */
export function exportThinksJson(sessionId: string): object[] {
  return getThinksForSession(sessionId);
}