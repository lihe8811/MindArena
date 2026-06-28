/**
 * Simple in-memory Q&A store for addition problems and answers.
 * Collected by the judge throughout the debate round.
 */

export interface QnaEntry {
  id: string;
  sessionId: string;
  phase: string;
  speaker: string;
  type: 'problem' | 'answer';
  expression: string;   // e.g. "3 + 7"
  result: string;       // e.g. "10"
  timestamp: number;
}

let entries: QnaEntry[] = [];

/**
 * Records an addition problem or answer.
 */
export function recordQna(entry: Omit<QnaEntry, 'id' | 'timestamp'>): QnaEntry {
  const full: QnaEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  entries.push(full);
  return full;
}

/**
 * Returns all Q&A entries for a session.
 */
export function getQnaForSession(sessionId: string): QnaEntry[] {
  return entries.filter(e => e.sessionId === sessionId);
}

/**
 * Clears Q&A entries for a session (e.g., when session ends).
 */
export function clearQnaForSession(sessionId: string): void {
  entries = entries.filter(e => e.sessionId !== sessionId);
}

/**
 * Formats all Q&A entries for a session as a readable string
 * to be included in judge feedback.
 */
export function formatQnaForFeedback(sessionId: string): string {
  const sessionEntries = getQnaForSession(sessionId);
  if (sessionEntries.length === 0) {
    return 'No addition problems were submitted during this round.';
  }

  const lines = ['## Addition Problems & Answers\n'];
  for (const entry of sessionEntries) {
    const label = entry.type === 'problem' ? '❓ Problem' : '✅ Answer';
    lines.push(`- [${label}] ${entry.expression} = ${entry.result} (by ${entry.speaker}, phase: ${entry.phase})`);
  }
  return lines.join('\n');
}