import { z } from 'zod';

/**
 * Schema for structured speech output from a debate agent.
 */
export const SpeechSchema = z.object({
  content: z.string().describe('The actual speech content, formatted for delivery.'),
  citations: z.array(z.string()).describe('List of evidence citations used in the speech.'),
  phase: z.string().describe('The current debate phase (e.g., Constructive, Rebuttal, Summary, Final Focus).'),
  suggestedAction: z.string().optional().describe('Optional next action suggested for the student or teammate.'),
});

export type SpeechOutput = z.infer<typeof SpeechSchema>;

/**
 * Schema for structured coaching output from the teammate agent.
 */
export const CoachingSchema = z.object({
  suggestion: z.string().describe('The main coaching tip or strategy for the student.'),
  strategy: z.string().describe('The overall strategic guidance for this phase of the debate.'),
  improvements: z.array(z.string()).describe('Specific areas where the student can improve.'),
  rebuttalPoints: z.array(z.string()).optional().describe('Optional specific points for rebutting the opponent.'),
});

export type CoachingOutput = z.infer<typeof CoachingSchema>;
