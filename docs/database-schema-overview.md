# MindArena Database Schema Overview

This schema is organized around four core domains: account/auth, debate runtime, knowledge base, and platform/audit support.

## Account And Auth

- `users`: core account record, password hash, verification state, login timestamps.
- `user_settings`: per-user defaults and workspace behavior.
- `user_quotas`: limits for docs, jobs, storage, and collections.
- `sessions`: server-side sessions, expiry, remember-session flag, invalidation state.
- `auth_challenges`: one-time verification records for signup, login, and password reset codes.

## Debate Runtime

- `debate_templates`: reusable debate formats such as Policy, Lincoln-Douglas, and Cross-exam.
- `debate_template_stages`: ordered stages, timers, rubric, and evidence requirements for each template.
- `opponent_profiles`: scripted opponent definitions and strategy configs.
- `debate_sessions`: current debate state, active stage, timers, format, score summary, and metadata.
- `debate_stage_runs`: stage-by-stage execution state for a debate session.
- `debate_status_events`: append-only history of debate status or stage transitions.
- `transcript_events`: every utterance from player, bot, moderator, judge, or tool, including sequence and word counts.
- `debate_highlights`: bookmarks and manual annotations over transcript events.
- `knowledge_citations`: links from transcript messages to knowledge documents or chunks.
- `evidence_claims`: extracted or manually attached evidence metadata for a debate claim.
- `debate_scorecards`: rubric scoring records for a debate.
- `judge_decisions`: winner, reasoning, speaker points, and improvement notes.
- `debate_artifacts`: generated exports and imported debate assets.
- `debate_imports`: imported transcripts or external debate records.

## Knowledge Base

- `knowledge_index_profiles`: chunking and indexing presets per document type.
- `knowledge_collections`: user-owned collections for grouping documents.
- `knowledge_documents`: stored rule/file documents, version metadata, extraction summary, and chunk config.
- `knowledge_document_collections`: join table between documents and collections.
- `knowledge_table_cards`: schema/sample summaries for uploaded database-like sources.
- `knowledge_document_shares`: shareable access records for knowledge documents.
- `knowledge_chunks`: vectorized chunks for retrieval.
- `debate_session_knowledge_documents`: documents attached to a debate session.

## Agent, Tools, Jobs, Audit

- `agent_runs`: model or scripted-agent executions during a debate.
- `tool_definitions`: tool registry for future tool-calling flows.
- `tool_calls`: per-call records for tools used in a debate or agent run.
- `background_jobs`: async work such as ingest, reindex, export, and replay generation.
- `audit_events`: user/system activity log across auth, knowledge, and debate actions.

## Key Modeling Rules

- Account verification, login verification, and password reset all use `auth_challenges`.
- Debate current status lives on `debate_sessions`, while every transition is appended to `debate_status_events`.
- Every spoken or generated message should be inserted into `transcript_events`, one row per utterance.
- Knowledge attached to a debate should be tracked through `debate_session_knowledge_documents` and `knowledge_citations`.
- Score summaries can be cached on `debate_sessions`, but full scoring should live in `debate_scorecards` and `judge_decisions`.
