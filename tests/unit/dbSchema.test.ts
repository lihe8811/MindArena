import { describe, expect, test } from 'bun:test';
import { getTableName } from 'drizzle-orm';

import {
  agentRuns,
  debateSessions,
  evidenceClaims,
  judgeDecisions,
  knowledgeChunks,
  knowledgeDocuments,
  sessions,
  transcriptEvents,
  users,
} from '../../src/server/db/schema';

describe('database schema', () => {
  test('defines the canonical MVP tables', () => {
    expect([
      users,
      sessions,
      debateSessions,
      transcriptEvents,
      evidenceClaims,
      judgeDecisions,
      knowledgeDocuments,
      knowledgeChunks,
      agentRuns,
    ].map(getTableName)).toEqual([
      'users',
      'sessions',
      'debate_sessions',
      'transcript_events',
      'evidence_claims',
      'judge_decisions',
      'knowledge_documents',
      'knowledge_chunks',
      'agent_runs',
    ]);
  });

  test('stores knowledge chunk embeddings with the configured vector dimensions', () => {
    expect(knowledgeChunks.embedding.getSQLType()).toBe('vector(1536)');
  });
});
