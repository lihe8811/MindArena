import { describe, expect, test } from 'bun:test';
import { getTableName } from 'drizzle-orm';

import {
  agentRuns,
  backgroundJobs,
  debateArtifacts,
  debateHighlights,
  debateImports,
  debateScorecards,
  debateSessions,
  debateStageRuns,
  debateTemplateStages,
  debateTemplates,
  evidenceClaims,
  judgeDecisions,
  knowledgeChunks,
  knowledgeCollections,
  knowledgeCitations,
  knowledgeDocumentCollections,
  knowledgeDocumentShares,
  knowledgeDocuments,
  knowledgeIndexProfiles,
  knowledgeTableCards,
  opponentProfiles,
  sessions,
  toolCalls,
  toolDefinitions,
  transcriptEvents,
  userQuotas,
  userSettings,
  users,
} from '../../src/server/db/schema';

describe('database schema', () => {
  test('defines the Neon-backed core and extension tables', () => {
    expect([
      users,
      userSettings,
      userQuotas,
      sessions,
      debateTemplates,
      debateTemplateStages,
      opponentProfiles,
      debateSessions,
      debateStageRuns,
      transcriptEvents,
      debateHighlights,
      knowledgeCitations,
      evidenceClaims,
      debateScorecards,
      judgeDecisions,
      debateArtifacts,
      debateImports,
      knowledgeIndexProfiles,
      knowledgeCollections,
      knowledgeDocuments,
      knowledgeDocumentCollections,
      knowledgeTableCards,
      knowledgeDocumentShares,
      knowledgeChunks,
      backgroundJobs,
      agentRuns,
      toolDefinitions,
      toolCalls,
    ].map(getTableName)).toEqual([
      'users',
      'user_settings',
      'user_quotas',
      'sessions',
      'debate_templates',
      'debate_template_stages',
      'opponent_profiles',
      'debate_sessions',
      'debate_stage_runs',
      'transcript_events',
      'debate_highlights',
      'knowledge_citations',
      'evidence_claims',
      'debate_scorecards',
      'judge_decisions',
      'debate_artifacts',
      'debate_imports',
      'knowledge_index_profiles',
      'knowledge_collections',
      'knowledge_documents',
      'knowledge_document_collections',
      'knowledge_table_cards',
      'knowledge_document_shares',
      'knowledge_chunks',
      'background_jobs',
      'agent_runs',
      'tool_definitions',
      'tool_calls',
    ]);
  });

  test('stores knowledge chunk embeddings with the configured vector dimensions', () => {
    expect(knowledgeChunks.embedding.getSQLType()).toBe('vector(1536)');
  });

  test('supports debate templates and stage timers at the schema level', () => {
    expect(debateTemplates.format.enumValues).toEqual(['Policy', 'Lincoln-Douglas', 'Cross-exam']);
    expect(debateStageRuns.status.enumValues).toEqual(['pending', 'active', 'locked', 'completed', 'skipped']);
  });
});
