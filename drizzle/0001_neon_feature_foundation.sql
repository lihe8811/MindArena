CREATE EXTENSION IF NOT EXISTS vector;

DO $$ BEGIN
  CREATE TYPE debate_format AS ENUM ('Policy', 'Lincoln-Douglas', 'Cross-exam');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE template_visibility AS ENUM ('private', 'shared', 'system');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE stage_run_status AS ENUM ('pending', 'active', 'locked', 'completed', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE knowledge_visibility AS ENUM ('private', 'shared', 'team');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE share_permission AS ENUM ('view', 'use_in_debate', 'manage');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE highlight_type AS ENUM ('bookmark', 'strong_claim', 'needs_citation', 'logical_fallacy', 'note');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE background_job_type AS ENUM (
    'knowledge_ingest',
    'knowledge_reindex',
    'debate_export',
    'debate_import',
    'replay_render'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE background_job_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'retrying', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE artifact_kind AS ENUM ('export', 'import');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE artifact_format AS ENUM ('markdown', 'pdf', 'json');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE actor_type AS ENUM ('user', 'system', 'agent', 'tool');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE tool_call_status AS ENUM ('queued', 'running', 'succeeded', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS user_settings (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  title text NOT NULL,
  default_stance debate_side NOT NULL DEFAULT 'Proponent',
  default_rigor integer NOT NULL DEFAULT 3,
  email_notifications boolean NOT NULL DEFAULT true,
  remember_session boolean NOT NULL DEFAULT true,
  compact_sidebar boolean NOT NULL DEFAULT false,
  auto_open_arena boolean NOT NULL DEFAULT true,
  theme text NOT NULL DEFAULT 'system',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_quotas (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  max_documents integer NOT NULL DEFAULT 200,
  max_storage_bytes integer NOT NULL DEFAULT 104857600,
  max_file_bytes integer NOT NULL DEFAULT 8388608,
  max_jobs_per_hour integer NOT NULL DEFAULT 30,
  max_debates_per_day integer NOT NULL DEFAULT 30,
  max_collections integer NOT NULL DEFAULT 25,
  current_storage_bytes integer NOT NULL DEFAULT 0,
  current_document_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS debate_templates (
  id text PRIMARY KEY,
  owner_user_id text REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  format debate_format NOT NULL,
  description text NOT NULL,
  default_rigor integer NOT NULL DEFAULT 3,
  scoring_rubric jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_evidence_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_timers jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility template_visibility NOT NULL DEFAULT 'system',
  is_system boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS debate_templates_slug_unique ON debate_templates (slug);
CREATE INDEX IF NOT EXISTS debate_templates_owner_user_id_idx ON debate_templates (owner_user_id);

CREATE TABLE IF NOT EXISTS debate_template_stages (
  id text PRIMARY KEY,
  template_id text NOT NULL REFERENCES debate_templates(id) ON DELETE CASCADE,
  stage_key text NOT NULL,
  label text NOT NULL,
  stage_order integer NOT NULL,
  duration_seconds integer NOT NULL,
  speaker_side text,
  required_evidence boolean NOT NULL DEFAULT false,
  allows_cross_questions boolean NOT NULL DEFAULT false,
  rubric jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS debate_template_stages_template_order_unique
  ON debate_template_stages (template_id, stage_order);
CREATE UNIQUE INDEX IF NOT EXISTS debate_template_stages_template_key_unique
  ON debate_template_stages (template_id, stage_key);

CREATE TABLE IF NOT EXISTS opponent_profiles (
  id text PRIMARY KEY,
  name text NOT NULL,
  strategy_key text NOT NULL,
  description text NOT NULL,
  script_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS opponent_profiles_strategy_key_unique ON opponent_profiles (strategy_key);

ALTER TABLE debate_sessions
  ADD COLUMN IF NOT EXISTS template_id text,
  ADD COLUMN IF NOT EXISTS opponent_profile_id text,
  ADD COLUMN IF NOT EXISTS format debate_format NOT NULL DEFAULT 'Policy',
  ADD COLUMN IF NOT EXISTS current_stage_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phase_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS phase_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS phase_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS round_structure jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS scoring_summary jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$ BEGIN
  ALTER TABLE debate_sessions
    ADD CONSTRAINT debate_sessions_template_id_fkey
    FOREIGN KEY (template_id) REFERENCES debate_templates(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE debate_sessions
    ADD CONSTRAINT debate_sessions_opponent_profile_id_fkey
    FOREIGN KEY (opponent_profile_id) REFERENCES opponent_profiles(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS debate_sessions_template_id_idx ON debate_sessions (template_id);

CREATE TABLE IF NOT EXISTS debate_stage_runs (
  id text PRIMARY KEY,
  debate_session_id text NOT NULL REFERENCES debate_sessions(id) ON DELETE CASCADE,
  template_stage_id text REFERENCES debate_template_stages(id) ON DELETE SET NULL,
  stage_key text NOT NULL,
  label text NOT NULL,
  stage_order integer NOT NULL,
  duration_seconds integer NOT NULL,
  status stage_run_status NOT NULL DEFAULT 'pending',
  required_evidence boolean NOT NULL DEFAULT false,
  rubric jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz,
  deadline_at timestamptz,
  locked_at timestamptz,
  completed_at timestamptz,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS debate_stage_runs_debate_order_unique
  ON debate_stage_runs (debate_session_id, stage_order);
CREATE INDEX IF NOT EXISTS debate_stage_runs_debate_status_idx
  ON debate_stage_runs (debate_session_id, status);

CREATE TABLE IF NOT EXISTS knowledge_index_profiles (
  id text PRIMARY KEY,
  owner_user_id text REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  document_type text NOT NULL,
  chunk_size integer NOT NULL DEFAULT 900,
  chunk_overlap integer NOT NULL DEFAULT 120,
  is_system boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_index_profiles_owner_type_idx
  ON knowledge_index_profiles (owner_user_id, document_type);

CREATE TABLE IF NOT EXISTS knowledge_collections (
  id text PRIMARY KEY,
  owner_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'violet',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_collections_owner_slug_unique
  ON knowledge_collections (owner_user_id, slug);
CREATE INDEX IF NOT EXISTS knowledge_collections_owner_user_id_idx
  ON knowledge_collections (owner_user_id);

ALTER TABLE knowledge_documents
  ADD COLUMN IF NOT EXISTS index_profile_id text,
  ADD COLUMN IF NOT EXISTS visibility knowledge_visibility NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS file_size_bytes integer,
  ADD COLUMN IF NOT EXISTS checksum text,
  ADD COLUMN IF NOT EXISTS source_fingerprint text,
  ADD COLUMN IF NOT EXISTS version_group_id text,
  ADD COLUMN IF NOT EXISTS version_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_latest_version boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS extraction_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS chunk_config jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$ BEGIN
  ALTER TABLE knowledge_documents
    ADD CONSTRAINT knowledge_documents_index_profile_id_fkey
    FOREIGN KEY (index_profile_id) REFERENCES knowledge_index_profiles(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS knowledge_documents_version_group_id_idx
  ON knowledge_documents (version_group_id);
CREATE INDEX IF NOT EXISTS knowledge_documents_checksum_idx
  ON knowledge_documents (checksum);

CREATE TABLE IF NOT EXISTS knowledge_document_collections (
  knowledge_document_id text NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  collection_id text NOT NULL REFERENCES knowledge_collections(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (knowledge_document_id, collection_id)
);

CREATE TABLE IF NOT EXISTS knowledge_table_cards (
  id text PRIMARY KEY,
  document_id text NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  schema_name text,
  table_name text NOT NULL,
  summary text NOT NULL,
  row_estimate integer,
  column_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  sample_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_table_cards_document_table_unique
  ON knowledge_table_cards (document_id, table_name);

CREATE TABLE IF NOT EXISTS knowledge_document_shares (
  id text PRIMARY KEY,
  document_id text NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  created_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
  share_token text NOT NULL,
  permission share_permission NOT NULL DEFAULT 'view',
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_document_shares_share_token_unique
  ON knowledge_document_shares (share_token);
CREATE INDEX IF NOT EXISTS knowledge_document_shares_document_id_idx
  ON knowledge_document_shares (document_id);

ALTER TABLE debate_session_knowledge_documents
  ADD COLUMN IF NOT EXISTS attached_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE transcript_events
  ADD COLUMN IF NOT EXISTS stage_run_id text,
  ADD COLUMN IF NOT EXISTS sequence integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

DO $$ BEGIN
  ALTER TABLE transcript_events
    ADD CONSTRAINT transcript_events_stage_run_id_fkey
    FOREIGN KEY (stage_run_id) REFERENCES debate_stage_runs(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS transcript_events_debate_sequence_unique
  ON transcript_events (debate_session_id, sequence);

CREATE TABLE IF NOT EXISTS debate_highlights (
  id text PRIMARY KEY,
  debate_session_id text NOT NULL REFERENCES debate_sessions(id) ON DELETE CASCADE,
  transcript_event_id text REFERENCES transcript_events(id) ON DELETE CASCADE,
  created_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
  type highlight_type NOT NULL,
  label text NOT NULL,
  note text,
  color text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS debate_highlights_debate_session_id_idx
  ON debate_highlights (debate_session_id);

CREATE TABLE IF NOT EXISTS knowledge_citations (
  id text PRIMARY KEY,
  debate_session_id text NOT NULL REFERENCES debate_sessions(id) ON DELETE CASCADE,
  transcript_event_id text REFERENCES transcript_events(id) ON DELETE SET NULL,
  knowledge_document_id text NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  knowledge_chunk_id text REFERENCES knowledge_chunks(id) ON DELETE SET NULL,
  created_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
  excerpt text NOT NULL,
  citation_label text,
  relevance_score integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_citations_debate_session_id_idx
  ON knowledge_citations (debate_session_id);
CREATE INDEX IF NOT EXISTS knowledge_citations_knowledge_document_id_idx
  ON knowledge_citations (knowledge_document_id);

CREATE TABLE IF NOT EXISTS debate_scorecards (
  id text PRIMARY KEY,
  debate_session_id text NOT NULL REFERENCES debate_sessions(id) ON DELETE CASCADE,
  judge_user_id text REFERENCES users(id) ON DELETE SET NULL,
  judge_type text NOT NULL DEFAULT 'self',
  winner text,
  rubric jsonb NOT NULL DEFAULT '[]'::jsonb,
  category_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_score integer,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS debate_scorecards_debate_session_id_idx
  ON debate_scorecards (debate_session_id);

ALTER TABLE judge_decisions
  ADD COLUMN IF NOT EXISTS scorecard_id text;

DO $$ BEGIN
  ALTER TABLE judge_decisions
    ADD CONSTRAINT judge_decisions_scorecard_id_fkey
    FOREIGN KEY (scorecard_id) REFERENCES debate_scorecards(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS debate_artifacts (
  id text PRIMARY KEY,
  debate_session_id text REFERENCES debate_sessions(id) ON DELETE CASCADE,
  created_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
  kind artifact_kind NOT NULL,
  format artifact_format NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  status text NOT NULL DEFAULT 'ready',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS debate_artifacts_debate_session_id_idx
  ON debate_artifacts (debate_session_id);

CREATE TABLE IF NOT EXISTS debate_imports (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  format text NOT NULL,
  status background_job_status NOT NULL DEFAULT 'queued',
  transcript_preview text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS debate_imports_user_id_idx
  ON debate_imports (user_id);

ALTER TABLE agent_runs
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS tool_definitions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  input_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tool_definitions_name_unique
  ON tool_definitions (name);

CREATE TABLE IF NOT EXISTS tool_calls (
  id text PRIMARY KEY,
  debate_session_id text REFERENCES debate_sessions(id) ON DELETE CASCADE,
  agent_run_id text REFERENCES agent_runs(id) ON DELETE SET NULL,
  tool_definition_id text REFERENCES tool_definitions(id) ON DELETE SET NULL,
  tool_name text NOT NULL,
  status tool_call_status NOT NULL DEFAULT 'queued',
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tool_calls_debate_session_id_idx
  ON tool_calls (debate_session_id);

CREATE TABLE IF NOT EXISTS background_jobs (
  id text PRIMARY KEY,
  owner_user_id text REFERENCES users(id) ON DELETE CASCADE,
  type background_job_type NOT NULL,
  status background_job_status NOT NULL DEFAULT 'queued',
  resource_type text NOT NULL,
  resource_id text,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  progress integer NOT NULL DEFAULT 0,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  run_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS background_jobs_owner_status_idx
  ON background_jobs (owner_user_id, status);
CREATE INDEX IF NOT EXISTS background_jobs_resource_idx
  ON background_jobs (resource_type, resource_id);

CREATE TABLE IF NOT EXISTS audit_events (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  actor_type actor_type NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  summary text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_user_id_idx
  ON audit_events (user_id);
CREATE INDEX IF NOT EXISTS audit_events_resource_idx
  ON audit_events (resource_type, resource_id);
