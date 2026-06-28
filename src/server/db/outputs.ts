/**
 * output.json — stores everything agents and the student say during the debate.
 * This is the full conversation transcript in structured form.
 */

export type OutputSpeakerType = 'judge' | 'rival_a' | 'rival_b' | 'teammate' | 'student';

export interface OutputEntry {
  id: string;
  sessionId: string;
  phase: string;
  speakerType: OutputSpeakerType;
  speakerRole?: string;     // e.g. "first_speaker", "second_speaker"
  content: string;
  isAdditionProblem?: boolean;
  additionExpression?: string;
  additionAnswer?: string;
  timestamp: number;
}

const outputs: OutputEntry[] = [];

/**
 * Records a single output entry from an agent or the student.
 */
export function recordOutput(entry: Omit<OutputEntry, 'id' | 'timestamp'>): OutputEntry {
  // Detect addition problem / answer tags in content
  const problemMatch = entry.content.match(/\[ADD_PROBLEM\](.+?)\[\/ADD_PROBLEM\]/);
  const answerMatch = entry.content.match(/\[ADD_ANSWER\](.+?)\[\/ADD_ANSWER\]/);

  const full: OutputEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    isAdditionProblem: !!problemMatch,
    additionExpression: problemMatch ? problemMatch[1].trim() : undefined,
    additionAnswer: answerMatch ? answerMatch[1].trim() : undefined,
  };
  outputs.push(full);
  return full;
}

/**
 * Returns all output entries for a session.
 */
export function getOutputsForSession(sessionId: string): OutputEntry[] {
  return outputs.filter((o) => o.sessionId === sessionId);
}

/**
 * Returns output entries for a specific phase in a session.
 */
export function getOutputsForPhase(sessionId: string, phase: string): OutputEntry[] {
  return outputs.filter((o) => o.sessionId === sessionId && o.phase === phase);
}

/**
 * Returns the latest output entry for a speaker in a phase.
 */
export function getLatestOutput(
  sessionId: string,
  speakerType: OutputSpeakerType,
  phase: string,
): OutputEntry | null {
  const matches = outputs.filter(
    (o) =>
      o.sessionId === sessionId &&
      o.speakerType === speakerType &&
      o.phase === phase,
  );
  return matches[matches.length - 1] ?? null;
}

/**
 * Clears all output entries for a session.
 */
export function clearOutputsForSession(sessionId: string): void {
  const removed = outputs.filter((o) => o.sessionId !== sessionId);
  outputs.length = 0;
  removed;
}

/**
 * Exports all outputs as a JSON-serializable array.
 */
export function exportOutputsJson(sessionId: string): object[] {
  return getOutputsForSession(sessionId);
}

/**
 * Formats outputs as a readable conversation transcript.
 */
export function formatTranscript(sessionId: string): string {
  const sessionOutputs = getOutputsForSession(sessionId);
  if (sessionOutputs.length === 0) {
    return 'No transcript available for this session.';
  }

  const lines: string[] = [];
  let currentPhase = '';

  for (const o of sessionOutputs) {
    if (o.phase !== currentPhase) {
      lines.push(`\n### ${o.phase.replace(/_/g, ' ').toUpperCase()}\n`);
      currentPhase = o.phase;
    }
    const speaker = o.speakerRole
      ? `${o.speakerType} (${o.speakerRole.replace('_', ' ')})`
      : o.speakerType;
    lines.push(`**${speaker}:** ${o.content}`);
  }

  return lines.join('\n');
}