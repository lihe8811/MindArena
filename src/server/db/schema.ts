import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const debateSide = pgEnum('debate_side', ['Proponent', 'Opponent']);
export const debateStatus = pgEnum('debate_status', ['Ready', 'In Progress', 'Completed', 'Terminated']);
export const messageRole = pgEnum('message_role', ['system', 'user', 'assistant', 'judge', 'tool']);

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    title: text('title').notNull(),
    streak: integer('streak').notNull().default(0),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex('users_email_unique').on(table.email),
  }),
);

export const sessions = pgTable(
  'sessions',
  {
    token: text('token').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    userIdx: index('sessions_user_id_idx').on(table.userId),
    expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
  }),
);

export const debateSessions = pgTable(
  'debate_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    topic: text('topic').notNull(),
    stance: debateSide('stance').notNull(),
    rigor: integer('rigor').notNull(),
    stage: text('stage').notNull(),
    timerLabel: text('timer_label').notNull(),
    status: debateStatus('status').notNull(),
    score: integer('score'),
    opponent: text('opponent').notNull(),
    domain: text('domain').notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userStatusIdx: index('debate_sessions_user_status_idx').on(table.userId, table.status),
  }),
);

export const transcriptEvents = pgTable(
  'transcript_events',
  {
    id: text('id').primaryKey(),
    debateSessionId: text('debate_session_id')
      .notNull()
      .references(() => debateSessions.id, { onDelete: 'cascade' }),
    phase: text('phase').notNull(),
    role: messageRole('role').notNull(),
    speaker: text('speaker').notNull(),
    content: text('content').notNull(),
    startTime: timestamp('start_time', { withTimezone: true }),
    endTime: timestamp('end_time', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    debatePhaseIdx: index('transcript_events_debate_phase_idx').on(table.debateSessionId, table.phase),
  }),
);

export const evidenceClaims = pgTable(
  'evidence_claims',
  {
    id: text('id').primaryKey(),
    debateSessionId: text('debate_session_id')
      .notNull()
      .references(() => debateSessions.id, { onDelete: 'cascade' }),
    transcriptEventId: text('transcript_event_id').references(() => transcriptEvents.id, { onDelete: 'set null' }),
    speaker: text('speaker').notNull(),
    claimText: text('claim_text').notNull(),
    author: text('author'),
    authorQualification: text('author_qualification'),
    publicationYear: integer('publication_year'),
    title: text('title'),
    publicationDate: text('publication_date'),
    url: text('url'),
    quotedText: text('quoted_text'),
    fullContext: text('full_context'),
    citationStatus: text('citation_status').notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    debateIdx: index('evidence_claims_debate_session_id_idx').on(table.debateSessionId),
  }),
);

export const judgeDecisions = pgTable('judge_decisions', {
  id: text('id').primaryKey(),
  debateSessionId: text('debate_session_id')
    .notNull()
    .references(() => debateSessions.id, { onDelete: 'cascade' }),
  winner: text('winner').notNull(),
  reasonForDecision: text('reason_for_decision').notNull(),
  studentSpeakerPoints: integer('student_speaker_points'),
  opponentSpeakerPoints: integer('opponent_speaker_points'),
  keyIssues: jsonb('key_issues').notNull().default([]),
  ruleNotes: jsonb('rule_notes').notNull().default([]),
  improvementSuggestions: jsonb('improvement_suggestions').notNull().default([]),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const agentRuns = pgTable(
  'agent_runs',
  {
    id: text('id').primaryKey(),
    debateSessionId: text('debate_session_id').references(() => debateSessions.id, { onDelete: 'cascade' }),
    agentRole: text('agent_role').notNull(),
    phase: text('phase'),
    input: jsonb('input').notNull().default({}),
    output: jsonb('output').notNull().default({}),
    traceId: text('trace_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    debateIdx: index('agent_runs_debate_session_id_idx').on(table.debateSessionId),
    traceIdx: index('agent_runs_trace_id_idx').on(table.traceId),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  debateSessions: many(debateSessions),
}));

export const debateSessionsRelations = relations(debateSessions, ({ many, one }) => ({
  user: one(users, {
    fields: [debateSessions.userId],
    references: [users.id],
  }),
  transcriptEvents: many(transcriptEvents),
  evidenceClaims: many(evidenceClaims),
  judgeDecisions: many(judgeDecisions),
  agentRuns: many(agentRuns),
}));
