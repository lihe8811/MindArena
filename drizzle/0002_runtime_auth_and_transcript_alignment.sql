DO $$ BEGIN
  CREATE TYPE auth_challenge_purpose AS ENUM ('email_verification', 'login_verification', 'password_reset');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE auth_challenge_status AS ENUM ('pending', 'sent', 'consumed', 'expired', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE transcript_speaker_type AS ENUM ('player', 'bot', 'moderator', 'judge', 'system', 'tool');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS remember_session boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS invalidated_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS sessions_invalidated_at_idx ON sessions (invalidated_at);

CREATE TABLE IF NOT EXISTS auth_challenges (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  purpose auth_challenge_purpose NOT NULL,
  status auth_challenge_status NOT NULL DEFAULT 'pending',
  code_hash text NOT NULL,
  delivery_method text NOT NULL DEFAULT 'email',
  requested_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS auth_challenges_user_purpose_idx
  ON auth_challenges (user_id, purpose, status);
CREATE INDEX IF NOT EXISTS auth_challenges_email_purpose_idx
  ON auth_challenges (email, purpose, status);
CREATE INDEX IF NOT EXISTS auth_challenges_expires_at_idx
  ON auth_challenges (expires_at);

CREATE TABLE IF NOT EXISTS debate_status_events (
  id text PRIMARY KEY,
  debate_session_id text NOT NULL REFERENCES debate_sessions(id) ON DELETE CASCADE,
  stage_run_id text REFERENCES debate_stage_runs(id) ON DELETE SET NULL,
  from_status debate_status,
  to_status debate_status NOT NULL,
  from_stage text,
  to_stage text NOT NULL,
  actor_type actor_type NOT NULL DEFAULT 'system',
  actor_label text,
  reason text NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS debate_status_events_debate_created_idx
  ON debate_status_events (debate_session_id, created_at);
CREATE INDEX IF NOT EXISTS debate_status_events_debate_status_idx
  ON debate_status_events (debate_session_id, to_status);

ALTER TABLE transcript_events
  ADD COLUMN IF NOT EXISTS speaker_type transcript_speaker_type NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS speaker_side debate_side,
  ADD COLUMN IF NOT EXISTS word_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS char_count integer NOT NULL DEFAULT 0;
