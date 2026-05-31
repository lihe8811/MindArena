import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { customType } from 'drizzle-orm/pg-core/columns/custom';

const vector = customType<{ data: number[]; driverData: string }>({
  dataType: (config: { dimensions: number }) => `vector(${config.dimensions})`,
  toDriver: (value: number[]) => JSON.stringify(value),
  fromDriver: (value: string) => {
    try {
      return JSON.parse(value) as number[];
    } catch {
      return [];
    }
  },
});

export const debateSide = pgEnum('debate_side', ['Proponent', 'Opponent']);
export const debateStatus = pgEnum('debate_status', ['Ready', 'In Progress', 'Completed']);
export const debateFormat = pgEnum('debate_format', ['Policy', 'Lincoln-Douglas', 'Cross-exam']);
export const templateVisibility = pgEnum('template_visibility', ['private', 'shared', 'system']);
export const stageRunStatus = pgEnum('stage_run_status', ['pending', 'active', 'locked', 'completed', 'skipped']);
export const knowledgeSourceType = pgEnum('knowledge_source_type', ['rule', 'file']);
export const knowledgeStatus = pgEnum('knowledge_status', ['Indexed', 'Processing', 'Failed']);
export const knowledgeVisibility = pgEnum('knowledge_visibility', ['private', 'shared', 'team']);
export const sharePermission = pgEnum('share_permission', ['view', 'use_in_debate', 'manage']);
export const messageRole = pgEnum('message_role', ['system', 'user', 'assistant', 'judge', 'tool']);
export const highlightType = pgEnum('highlight_type', [
  'bookmark',
  'strong_claim',
  'needs_citation',
  'logical_fallacy',
  'note',
]);
export const backgroundJobType = pgEnum('background_job_type', [
  'knowledge_ingest',
  'knowledge_reindex',
  'debate_export',
  'debate_import',
  'replay_render',
]);
export const backgroundJobStatus = pgEnum('background_job_status', [
  'queued',
  'running',
  'succeeded',
  'failed',
  'retrying',
  'cancelled',
]);
export const artifactKind = pgEnum('artifact_kind', ['export', 'import']);
export const artifactFormat = pgEnum('artifact_format', ['markdown', 'pdf', 'json']);
export const actorType = pgEnum('actor_type', ['user', 'system', 'agent', 'tool']);
export const toolCallStatus = pgEnum('tool_call_status', ['queued', 'running', 'succeeded', 'failed']);
export const authChallengePurpose = pgEnum('auth_challenge_purpose', [
  'email_verification',
  'login_verification',
  'password_reset',
]);
export const authChallengeStatus = pgEnum('auth_challenge_status', [
  'pending',
  'sent',
  'consumed',
  'expired',
  'cancelled',
]);
export const transcriptSpeakerType = pgEnum('transcript_speaker_type', [
  'player',
  'bot',
  'moderator',
  'judge',
  'system',
  'tool',
]);

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    title: text('title').notNull(),
    streak: integer('streak').notNull().default(0),
    passwordHash: text('password_hash').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex('users_email_unique').on(table.email),
  }),
);

export const userSettings = pgTable('user_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  title: text('title').notNull(),
  defaultStance: debateSide('default_stance').notNull().default('Proponent'),
  defaultRigor: integer('default_rigor').notNull().default(3),
  emailNotifications: boolean('email_notifications').notNull().default(true),
  rememberSession: boolean('remember_session').notNull().default(true),
  compactSidebar: boolean('compact_sidebar').notNull().default(false),
  autoOpenArena: boolean('auto_open_arena').notNull().default(true),
  theme: text('theme').notNull().default('system'),
  metadata: jsonb('metadata').notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userQuotas = pgTable('user_quotas', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  maxDocuments: integer('max_documents').notNull().default(200),
  maxStorageBytes: integer('max_storage_bytes').notNull().default(100 * 1024 * 1024),
  maxFileBytes: integer('max_file_bytes').notNull().default(8 * 1024 * 1024),
  maxJobsPerHour: integer('max_jobs_per_hour').notNull().default(30),
  maxDebatesPerDay: integer('max_debates_per_day').notNull().default(30),
  maxCollections: integer('max_collections').notNull().default(25),
  currentStorageBytes: integer('current_storage_bytes').notNull().default(0),
  currentDocumentCount: integer('current_document_count').notNull().default(0),
  metadata: jsonb('metadata').notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  'sessions',
  {
    token: text('token').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rememberSession: boolean('remember_session').notNull().default(true),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    invalidatedAt: timestamp('invalidated_at', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    userIdx: index('sessions_user_id_idx').on(table.userId),
    expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
    activeIdx: index('sessions_invalidated_at_idx').on(table.invalidatedAt),
  }),
);

export const authChallenges = pgTable(
  'auth_challenges',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    purpose: authChallengePurpose('purpose').notNull(),
    status: authChallengeStatus('status').notNull().default('pending'),
    codeHash: text('code_hash').notNull(),
    deliveryMethod: text('delivery_method').notNull().default('email'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    attemptCount: integer('attempt_count').notNull().default(0),
    metadata: jsonb('metadata').notNull().default({}),
  },
  (table) => ({
    userPurposeIdx: index('auth_challenges_user_purpose_idx').on(table.userId, table.purpose, table.status),
    emailPurposeIdx: index('auth_challenges_email_purpose_idx').on(table.email, table.purpose, table.status),
    expiresIdx: index('auth_challenges_expires_at_idx').on(table.expiresAt),
  }),
);

export const debateTemplates = pgTable(
  'debate_templates',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id').references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    format: debateFormat('format').notNull(),
    description: text('description').notNull(),
    defaultRigor: integer('default_rigor').notNull().default(3),
    scoringRubric: jsonb('scoring_rubric').notNull().default([]),
    requiredEvidenceRules: jsonb('required_evidence_rules').notNull().default([]),
    defaultTimers: jsonb('default_timers').notNull().default({}),
    visibility: templateVisibility('visibility').notNull().default('system'),
    isSystem: boolean('is_system').notNull().default(false),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('debate_templates_slug_unique').on(table.slug),
    ownerIdx: index('debate_templates_owner_user_id_idx').on(table.ownerUserId),
  }),
);

export const debateTemplateStages = pgTable(
  'debate_template_stages',
  {
    id: text('id').primaryKey(),
    templateId: text('template_id')
      .notNull()
      .references(() => debateTemplates.id, { onDelete: 'cascade' }),
    stageKey: text('stage_key').notNull(),
    label: text('label').notNull(),
    stageOrder: integer('stage_order').notNull(),
    durationSeconds: integer('duration_seconds').notNull(),
    speakerSide: text('speaker_side'),
    requiredEvidence: boolean('required_evidence').notNull().default(false),
    allowsCrossQuestions: boolean('allows_cross_questions').notNull().default(false),
    rubric: jsonb('rubric').notNull().default([]),
    metadata: jsonb('metadata').notNull().default({}),
  },
  (table) => ({
    templateOrderUnique: uniqueIndex('debate_template_stages_template_order_unique').on(
      table.templateId,
      table.stageOrder,
    ),
    templateKeyUnique: uniqueIndex('debate_template_stages_template_key_unique').on(table.templateId, table.stageKey),
  }),
);

export const opponentProfiles = pgTable(
  'opponent_profiles',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    strategyKey: text('strategy_key').notNull(),
    description: text('description').notNull(),
    scriptConfig: jsonb('script_config').notNull().default({}),
    isSystem: boolean('is_system').notNull().default(true),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    strategyKeyUnique: uniqueIndex('opponent_profiles_strategy_key_unique').on(table.strategyKey),
  }),
);

export const debateSessions = pgTable(
  'debate_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    templateId: text('template_id').references(() => debateTemplates.id, { onDelete: 'set null' }),
    opponentProfileId: text('opponent_profile_id').references(() => opponentProfiles.id, { onDelete: 'set null' }),
    format: debateFormat('format').notNull().default('Policy'),
    topic: text('topic').notNull(),
    stance: debateSide('stance').notNull(),
    rigor: integer('rigor').notNull(),
    stage: text('stage').notNull(),
    timerLabel: text('timer_label').notNull(),
    currentStageOrder: integer('current_stage_order').notNull().default(0),
    phaseStartedAt: timestamp('phase_started_at', { withTimezone: true }),
    phaseDeadlineAt: timestamp('phase_deadline_at', { withTimezone: true }),
    phaseLockedAt: timestamp('phase_locked_at', { withTimezone: true }),
    status: debateStatus('status').notNull(),
    score: integer('score'),
    opponent: text('opponent').notNull(),
    domain: text('domain').notNull(),
    roundStructure: jsonb('round_structure').notNull().default([]),
    scoringSummary: jsonb('scoring_summary').notNull().default({}),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userStatusIdx: index('debate_sessions_user_status_idx').on(table.userId, table.status),
    templateIdx: index('debate_sessions_template_id_idx').on(table.templateId),
  }),
);

export const debateStageRuns = pgTable(
  'debate_stage_runs',
  {
    id: text('id').primaryKey(),
    debateSessionId: text('debate_session_id')
      .notNull()
      .references(() => debateSessions.id, { onDelete: 'cascade' }),
    templateStageId: text('template_stage_id').references(() => debateTemplateStages.id, { onDelete: 'set null' }),
    stageKey: text('stage_key').notNull(),
    label: text('label').notNull(),
    stageOrder: integer('stage_order').notNull(),
    durationSeconds: integer('duration_seconds').notNull(),
    status: stageRunStatus('status').notNull().default('pending'),
    requiredEvidence: boolean('required_evidence').notNull().default(false),
    rubric: jsonb('rubric').notNull().default([]),
    startedAt: timestamp('started_at', { withTimezone: true }),
    deadlineAt: timestamp('deadline_at', { withTimezone: true }),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    notes: text('notes'),
    metadata: jsonb('metadata').notNull().default({}),
  },
  (table) => ({
    debateOrderUnique: uniqueIndex('debate_stage_runs_debate_order_unique').on(table.debateSessionId, table.stageOrder),
    debateStatusIdx: index('debate_stage_runs_debate_status_idx').on(table.debateSessionId, table.status),
  }),
);

export const debateStatusEvents = pgTable(
  'debate_status_events',
  {
    id: text('id').primaryKey(),
    debateSessionId: text('debate_session_id')
      .notNull()
      .references(() => debateSessions.id, { onDelete: 'cascade' }),
    stageRunId: text('stage_run_id').references(() => debateStageRuns.id, { onDelete: 'set null' }),
    fromStatus: debateStatus('from_status'),
    toStatus: debateStatus('to_status').notNull(),
    fromStage: text('from_stage'),
    toStage: text('to_stage').notNull(),
    actorType: actorType('actor_type').notNull().default('system'),
    actorLabel: text('actor_label'),
    reason: text('reason').notNull(),
    snapshot: jsonb('snapshot').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    debateCreatedIdx: index('debate_status_events_debate_created_idx').on(table.debateSessionId, table.createdAt),
    debateStatusIdx: index('debate_status_events_debate_status_idx').on(table.debateSessionId, table.toStatus),
  }),
);

export const knowledgeIndexProfiles = pgTable(
  'knowledge_index_profiles',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id').references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    documentType: text('document_type').notNull(),
    chunkSize: integer('chunk_size').notNull().default(900),
    chunkOverlap: integer('chunk_overlap').notNull().default(120),
    isSystem: boolean('is_system').notNull().default(false),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerTypeIdx: index('knowledge_index_profiles_owner_type_idx').on(table.ownerUserId, table.documentType),
  }),
);

export const knowledgeCollections = pgTable(
  'knowledge_collections',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull().default(''),
    color: text('color').notNull().default('violet'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerSlugUnique: uniqueIndex('knowledge_collections_owner_slug_unique').on(table.ownerUserId, table.slug),
    ownerIdx: index('knowledge_collections_owner_user_id_idx').on(table.ownerUserId),
  }),
);

export const knowledgeDocuments = pgTable(
  'knowledge_documents',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id').references(() => users.id, { onDelete: 'cascade' }),
    indexProfileId: text('index_profile_id').references(() => knowledgeIndexProfiles.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    category: text('category').notNull(),
    sourceType: knowledgeSourceType('source_type').notNull(),
    status: knowledgeStatus('status').notNull(),
    visibility: knowledgeVisibility('visibility').notNull().default('private'),
    summary: text('summary').notNull(),
    chunkCount: integer('chunk_count').notNull(),
    wordCount: integer('word_count').notNull(),
    fileName: text('file_name'),
    mimeType: text('mime_type'),
    fileSizeBytes: integer('file_size_bytes'),
    checksum: text('checksum'),
    sourceFingerprint: text('source_fingerprint'),
    versionGroupId: text('version_group_id'),
    versionNumber: integer('version_number').notNull().default(1),
    isLatestVersion: boolean('is_latest_version').notNull().default(true),
    rawText: text('raw_text').notNull(),
    extractionSummary: jsonb('extraction_summary').notNull().default({}),
    chunkConfig: jsonb('chunk_config').notNull().default({}),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIdx: index('knowledge_documents_owner_user_id_idx').on(table.ownerUserId),
    versionGroupIdx: index('knowledge_documents_version_group_id_idx').on(table.versionGroupId),
    checksumIdx: index('knowledge_documents_checksum_idx').on(table.checksum),
  }),
);

export const knowledgeDocumentCollections = pgTable(
  'knowledge_document_collections',
  {
    knowledgeDocumentId: text('knowledge_document_id')
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
    collectionId: text('collection_id')
      .notNull()
      .references(() => knowledgeCollections.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.knowledgeDocumentId, table.collectionId] }),
  }),
);

export const knowledgeTableCards = pgTable(
  'knowledge_table_cards',
  {
    id: text('id').primaryKey(),
    documentId: text('document_id')
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
    schemaName: text('schema_name'),
    tableName: text('table_name').notNull(),
    summary: text('summary').notNull(),
    rowEstimate: integer('row_estimate'),
    columnSchema: jsonb('column_schema').notNull().default([]),
    sampleRows: jsonb('sample_rows').notNull().default([]),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    documentTableUnique: uniqueIndex('knowledge_table_cards_document_table_unique').on(table.documentId, table.tableName),
  }),
);

export const knowledgeDocumentShares = pgTable(
  'knowledge_document_shares',
  {
    id: text('id').primaryKey(),
    documentId: text('document_id')
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
    createdByUserId: text('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    shareToken: text('share_token').notNull(),
    permission: sharePermission('permission').notNull().default('view'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    shareTokenUnique: uniqueIndex('knowledge_document_shares_share_token_unique').on(table.shareToken),
    documentIdx: index('knowledge_document_shares_document_id_idx').on(table.documentId),
  }),
);

export const knowledgeChunks = pgTable(
  'knowledge_chunks',
  {
    id: text('id').primaryKey(),
    documentId: text('document_id')
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    text: text('text').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    documentIdx: index('knowledge_chunks_document_id_idx').on(table.documentId),
    documentChunkUnique: uniqueIndex('knowledge_chunks_document_chunk_unique').on(table.documentId, table.chunkIndex),
  }),
);

export const debateSessionKnowledgeDocuments = pgTable(
  'debate_session_knowledge_documents',
  {
    debateSessionId: text('debate_session_id')
      .notNull()
      .references(() => debateSessions.id, { onDelete: 'cascade' }),
    knowledgeDocumentId: text('knowledge_document_id')
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
    attachedAt: timestamp('attached_at', { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb('metadata').notNull().default({}),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.debateSessionId, table.knowledgeDocumentId] }),
  }),
);

export const transcriptEvents = pgTable(
  'transcript_events',
  {
    id: text('id').primaryKey(),
    debateSessionId: text('debate_session_id')
      .notNull()
      .references(() => debateSessions.id, { onDelete: 'cascade' }),
    stageRunId: text('stage_run_id').references(() => debateStageRuns.id, { onDelete: 'set null' }),
    phase: text('phase').notNull(),
    sequence: integer('sequence').notNull().default(0),
    role: messageRole('role').notNull(),
    speakerType: transcriptSpeakerType('speaker_type').notNull().default('system'),
    speakerSide: debateSide('speaker_side'),
    speaker: text('speaker').notNull(),
    content: text('content').notNull(),
    wordCount: integer('word_count').notNull().default(0),
    charCount: integer('char_count').notNull().default(0),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    startTime: timestamp('start_time', { withTimezone: true }),
    endTime: timestamp('end_time', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    debatePhaseIdx: index('transcript_events_debate_phase_idx').on(table.debateSessionId, table.phase),
    debateSequenceUnique: uniqueIndex('transcript_events_debate_sequence_unique').on(table.debateSessionId, table.sequence),
  }),
);

export const debateHighlights = pgTable(
  'debate_highlights',
  {
    id: text('id').primaryKey(),
    debateSessionId: text('debate_session_id')
      .notNull()
      .references(() => debateSessions.id, { onDelete: 'cascade' }),
    transcriptEventId: text('transcript_event_id').references(() => transcriptEvents.id, { onDelete: 'cascade' }),
    createdByUserId: text('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    type: highlightType('type').notNull(),
    label: text('label').notNull(),
    note: text('note'),
    color: text('color'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    debateIdx: index('debate_highlights_debate_session_id_idx').on(table.debateSessionId),
  }),
);

export const knowledgeCitations = pgTable(
  'knowledge_citations',
  {
    id: text('id').primaryKey(),
    debateSessionId: text('debate_session_id')
      .notNull()
      .references(() => debateSessions.id, { onDelete: 'cascade' }),
    transcriptEventId: text('transcript_event_id').references(() => transcriptEvents.id, { onDelete: 'set null' }),
    knowledgeDocumentId: text('knowledge_document_id')
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
    knowledgeChunkId: text('knowledge_chunk_id').references(() => knowledgeChunks.id, { onDelete: 'set null' }),
    createdByUserId: text('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    excerpt: text('excerpt').notNull(),
    citationLabel: text('citation_label'),
    relevanceScore: integer('relevance_score'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    debateIdx: index('knowledge_citations_debate_session_id_idx').on(table.debateSessionId),
    documentIdx: index('knowledge_citations_knowledge_document_id_idx').on(table.knowledgeDocumentId),
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

export const debateScorecards = pgTable(
  'debate_scorecards',
  {
    id: text('id').primaryKey(),
    debateSessionId: text('debate_session_id')
      .notNull()
      .references(() => debateSessions.id, { onDelete: 'cascade' }),
    judgeUserId: text('judge_user_id').references(() => users.id, { onDelete: 'set null' }),
    judgeType: text('judge_type').notNull().default('self'),
    winner: text('winner'),
    rubric: jsonb('rubric').notNull().default([]),
    categoryScores: jsonb('category_scores').notNull().default({}),
    totalScore: integer('total_score'),
    notes: text('notes'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    debateIdx: index('debate_scorecards_debate_session_id_idx').on(table.debateSessionId),
  }),
);

export const judgeDecisions = pgTable('judge_decisions', {
  id: text('id').primaryKey(),
  debateSessionId: text('debate_session_id')
    .notNull()
    .references(() => debateSessions.id, { onDelete: 'cascade' }),
  scorecardId: text('scorecard_id').references(() => debateScorecards.id, { onDelete: 'set null' }),
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

export const debateArtifacts = pgTable(
  'debate_artifacts',
  {
    id: text('id').primaryKey(),
    debateSessionId: text('debate_session_id').references(() => debateSessions.id, { onDelete: 'cascade' }),
    createdByUserId: text('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    kind: artifactKind('kind').notNull(),
    format: artifactFormat('format').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    status: text('status').notNull().default('ready'),
    payload: jsonb('payload').notNull().default({}),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    debateIdx: index('debate_artifacts_debate_session_id_idx').on(table.debateSessionId),
  }),
);

export const debateImports = pgTable(
  'debate_imports',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sourceName: text('source_name').notNull(),
    format: text('format').notNull(),
    status: backgroundJobStatus('status').notNull().default('queued'),
    transcriptPreview: text('transcript_preview'),
    payload: jsonb('payload').notNull().default({}),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('debate_imports_user_id_idx').on(table.userId),
  }),
);

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
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    debateIdx: index('agent_runs_debate_session_id_idx').on(table.debateSessionId),
    traceIdx: index('agent_runs_trace_id_idx').on(table.traceId),
  }),
);

export const toolDefinitions = pgTable(
  'tool_definitions',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    inputSchema: jsonb('input_schema').notNull().default({}),
    outputSchema: jsonb('output_schema').notNull().default({}),
    isEnabled: boolean('is_enabled').notNull().default(true),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameUnique: uniqueIndex('tool_definitions_name_unique').on(table.name),
  }),
);

export const toolCalls = pgTable(
  'tool_calls',
  {
    id: text('id').primaryKey(),
    debateSessionId: text('debate_session_id').references(() => debateSessions.id, { onDelete: 'cascade' }),
    agentRunId: text('agent_run_id').references(() => agentRuns.id, { onDelete: 'set null' }),
    toolDefinitionId: text('tool_definition_id').references(() => toolDefinitions.id, { onDelete: 'set null' }),
    toolName: text('tool_name').notNull(),
    status: toolCallStatus('status').notNull().default('queued'),
    requestPayload: jsonb('request_payload').notNull().default({}),
    responsePayload: jsonb('response_payload').notNull().default({}),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    debateIdx: index('tool_calls_debate_session_id_idx').on(table.debateSessionId),
  }),
);

export const backgroundJobs = pgTable(
  'background_jobs',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id').references(() => users.id, { onDelete: 'cascade' }),
    type: backgroundJobType('type').notNull(),
    status: backgroundJobStatus('status').notNull().default('queued'),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id'),
    attemptCount: integer('attempt_count').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    progress: integer('progress').notNull().default(0),
    input: jsonb('input').notNull().default({}),
    result: jsonb('result').notNull().default({}),
    error: text('error'),
    runAt: timestamp('run_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerStatusIdx: index('background_jobs_owner_status_idx').on(table.ownerUserId, table.status),
    resourceIdx: index('background_jobs_resource_idx').on(table.resourceType, table.resourceId),
  }),
);

export const auditEvents = pgTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    actorType: actorType('actor_type').notNull(),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id'),
    summary: text('summary').notNull(),
    details: jsonb('details').notNull().default({}),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('audit_events_user_id_idx').on(table.userId),
    resourceIdx: index('audit_events_resource_idx').on(table.resourceType, table.resourceId),
  }),
);

export const usersRelations = relations(users, ({ many, one }) => ({
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  quotas: one(userQuotas, {
    fields: [users.id],
    references: [userQuotas.userId],
  }),
  sessions: many(sessions),
  debateSessions: many(debateSessions),
  debateTemplates: many(debateTemplates),
  knowledgeDocuments: many(knowledgeDocuments),
  knowledgeCollections: many(knowledgeCollections),
  authChallenges: many(authChallenges),
  backgroundJobs: many(backgroundJobs),
  auditEvents: many(auditEvents),
}));

export const debateSessionsRelations = relations(debateSessions, ({ many, one }) => ({
  user: one(users, {
    fields: [debateSessions.userId],
    references: [users.id],
  }),
  template: one(debateTemplates, {
    fields: [debateSessions.templateId],
    references: [debateTemplates.id],
  }),
  stageRuns: many(debateStageRuns),
  statusEvents: many(debateStatusEvents),
  transcriptEvents: many(transcriptEvents),
  highlights: many(debateHighlights),
  citations: many(knowledgeCitations),
  evidenceClaims: many(evidenceClaims),
  judgeDecisions: many(judgeDecisions),
  scorecards: many(debateScorecards),
  artifacts: many(debateArtifacts),
  agentRuns: many(agentRuns),
  toolCalls: many(toolCalls),
}));

export const authChallengesRelations = relations(authChallenges, ({ one }) => ({
  user: one(users, {
    fields: [authChallenges.userId],
    references: [users.id],
  }),
}));

export const knowledgeDocumentsRelations = relations(knowledgeDocuments, ({ many, one }) => ({
  owner: one(users, {
    fields: [knowledgeDocuments.ownerUserId],
    references: [users.id],
  }),
  indexProfile: one(knowledgeIndexProfiles, {
    fields: [knowledgeDocuments.indexProfileId],
    references: [knowledgeIndexProfiles.id],
  }),
  chunks: many(knowledgeChunks),
  tableCards: many(knowledgeTableCards),
  shares: many(knowledgeDocumentShares),
  collectionLinks: many(knowledgeDocumentCollections),
  citations: many(knowledgeCitations),
}));
