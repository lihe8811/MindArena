CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE debate_side AS ENUM ('Proponent', 'Opponent');
CREATE TYPE debate_status AS ENUM ('Ready', 'In Progress', 'Completed', 'Terminated');
CREATE TYPE knowledge_source_type AS ENUM ('rule', 'file');
CREATE TYPE knowledge_status AS ENUM ('Indexed', 'Processing', 'Failed');
CREATE TYPE message_role AS ENUM ('system', 'user', 'assistant', 'judge', 'tool');

CREATE TABLE users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  title text NOT NULL,
  streak integer NOT NULL DEFAULT 0,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_unique ON users (email);

CREATE TABLE sessions (
  token text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE debate_sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  stance debate_side NOT NULL,
  rigor integer NOT NULL,
  stage text NOT NULL,
  timer_label text NOT NULL,
  status debate_status NOT NULL,
  score integer,
  opponent text NOT NULL,
  domain text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX debate_sessions_user_status_idx ON debate_sessions (user_id, status);

CREATE TABLE knowledge_documents (
  id text PRIMARY KEY,
  owner_user_id text REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL,
  source_type knowledge_source_type NOT NULL,
  status knowledge_status NOT NULL,
  summary text NOT NULL,
  chunk_count integer NOT NULL,
  word_count integer NOT NULL,
  file_name text,
  mime_type text,
  raw_text text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX knowledge_documents_owner_user_id_idx ON knowledge_documents (owner_user_id);

CREATE TABLE knowledge_chunks (
  id text PRIMARY KEY,
  document_id text NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  text text NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX knowledge_chunks_document_id_idx ON knowledge_chunks (document_id);
CREATE UNIQUE INDEX knowledge_chunks_document_chunk_unique ON knowledge_chunks (document_id, chunk_index);
CREATE INDEX knowledge_chunks_embedding_hnsw_idx ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);

CREATE TABLE debate_session_knowledge_documents (
  debate_session_id text NOT NULL REFERENCES debate_sessions(id) ON DELETE CASCADE,
  knowledge_document_id text NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  PRIMARY KEY (debate_session_id, knowledge_document_id)
);

CREATE TABLE transcript_events (
  id text PRIMARY KEY,
  debate_session_id text NOT NULL REFERENCES debate_sessions(id) ON DELETE CASCADE,
  phase text NOT NULL,
  role message_role NOT NULL,
  speaker text NOT NULL,
  content text NOT NULL,
  start_time timestamptz,
  end_time timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX transcript_events_debate_phase_idx ON transcript_events (debate_session_id, phase);

CREATE TABLE evidence_claims (
  id text PRIMARY KEY,
  debate_session_id text NOT NULL REFERENCES debate_sessions(id) ON DELETE CASCADE,
  transcript_event_id text REFERENCES transcript_events(id) ON DELETE SET NULL,
  speaker text NOT NULL,
  claim_text text NOT NULL,
  author text,
  author_qualification text,
  publication_year integer,
  title text,
  publication_date text,
  url text,
  quoted_text text,
  full_context text,
  citation_status text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX evidence_claims_debate_session_id_idx ON evidence_claims (debate_session_id);

CREATE TABLE judge_decisions (
  id text PRIMARY KEY,
  debate_session_id text NOT NULL REFERENCES debate_sessions(id) ON DELETE CASCADE,
  winner text NOT NULL,
  reason_for_decision text NOT NULL,
  student_speaker_points integer,
  opponent_speaker_points integer,
  key_issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  rule_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  improvement_suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE agent_runs (
  id text PRIMARY KEY,
  debate_session_id text REFERENCES debate_sessions(id) ON DELETE CASCADE,
  agent_role text NOT NULL,
  phase text,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  trace_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX agent_runs_debate_session_id_idx ON agent_runs (debate_session_id);
CREATE INDEX agent_runs_trace_id_idx ON agent_runs (trace_id);
