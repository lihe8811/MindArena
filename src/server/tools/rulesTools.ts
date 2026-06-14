import { eq, ilike, and, inArray, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { db } from '@/server/db/connection';
import * as schema from '@/server/db/schema';

const { knowledgeDocuments, knowledgeChunks, debateSessionKnowledgeDocuments, knowledgeSourceType } = schema;

export interface RuleDocument {
  id: string;
  title: string;
  category: string;
  summary: string;
  sourceType: string;
  chunkCount: number;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleChunk {
  chunkIndex: number;
  text: string;
}

export interface RuleDetail extends RuleDocument {
  chunks: RuleChunk[];
  rawText: string;
}

export interface RuleSearchResult {
  success: boolean;
  rules?: RuleDocument[];
  error?: string;
}

export interface RuleDetailResult {
  success: boolean;
  rule?: RuleDetail;
  error?: string;
}

export interface RuleChunkSearchResult {
  success: boolean;
  matches?: Array<{
    documentId: string;
    title: string;
    category: string;
    chunkIndex: number;
    text: string;
  }>;
  error?: string;
}

export class RulesTools {
  private database: NeonHttpDatabase<typeof schema>;

  constructor(database: NeonHttpDatabase<typeof schema> = db) {
    this.database = database;
  }

  /**
   * List all rule documents stored in the knowledge base.
   * Includes documents with source_type = 'rule' and documents
   * whose title looks like a rulebook (e.g. "Rules", "Rulebook").
   */
  async listRules(): Promise<RuleSearchResult> {
    try {
      const docs = await this.database
        .select({
          id: knowledgeDocuments.id,
          title: knowledgeDocuments.title,
          category: knowledgeDocuments.category,
          summary: knowledgeDocuments.summary,
          sourceType: knowledgeDocuments.sourceType,
          chunkCount: knowledgeDocuments.chunkCount,
          wordCount: knowledgeDocuments.wordCount,
          createdAt: knowledgeDocuments.createdAt,
          updatedAt: knowledgeDocuments.updatedAt,
        })
        .from(knowledgeDocuments)
        .where(
          sql`${knowledgeDocuments.sourceType} = ${knowledgeSourceType.enumValues[0]} OR ${knowledgeDocuments.title} ILIKE '%rules%' OR ${knowledgeDocuments.title} ILIKE '%rulebook%'`
        );

      return { success: true, rules: docs };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list rules',
      };
    }
  }

  /**
   * Search rule chunks by keyword. Returns matching excerpts
   * so agents can learn about specific behaviors or errors.
   * Falls back to searching raw_text on rule-like documents when
   * no chunks exist.
   */
  async searchRules(query: string, limit = 8): Promise<RuleChunkSearchResult> {
    try {
      const trimmed = query.trim();
      if (!trimmed) {
        return { success: true, matches: [] };
      }

      const pattern = `%${trimmed}%`;

      // Try chunk search first
      const chunkMatches = await this.database
        .select({
          documentId: knowledgeChunks.documentId,
          title: knowledgeDocuments.title,
          category: knowledgeDocuments.category,
          chunkIndex: knowledgeChunks.chunkIndex,
          text: knowledgeChunks.text,
        })
        .from(knowledgeChunks)
        .innerJoin(
          knowledgeDocuments,
          eq(knowledgeChunks.documentId, knowledgeDocuments.id)
        )
        .where(
          and(
            eq(knowledgeDocuments.sourceType, knowledgeSourceType.enumValues[0]),
            ilike(knowledgeChunks.text, pattern)
          )
        )
        .limit(limit);

      if (chunkMatches.length > 0) {
        return { success: true, matches: chunkMatches };
      }

      // Fallback: search raw_text on rule-like documents
      const textMatches = await this.database
        .select({
          id: knowledgeDocuments.id,
          title: knowledgeDocuments.title,
          category: knowledgeDocuments.category,
          rawText: knowledgeDocuments.rawText,
        })
        .from(knowledgeDocuments)
        .where(
          and(
            sql`${knowledgeDocuments.sourceType} = ${knowledgeSourceType.enumValues[0]} OR ${knowledgeDocuments.title} ILIKE '%rules%' OR ${knowledgeDocuments.title} ILIKE '%rulebook%'`,
            ilike(knowledgeDocuments.rawText, pattern)
          )
        )
        .limit(limit);

      const matches = textMatches.map((doc) => ({
        documentId: doc.id,
        title: doc.title,
        category: doc.category,
        chunkIndex: 0,
        text: doc.rawText.substring(0, 2000),
      }));

      return { success: true, matches };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search rules',
      };
    }
  }

  /**
   * Get a single rule document with all its chunks.
   */
  async getRuleById(documentId: string): Promise<RuleDetailResult> {
    try {
      const [doc] = await this.database
        .select()
        .from(knowledgeDocuments)
        .where(eq(knowledgeDocuments.id, documentId))
        .limit(1);

      if (!doc) {
        return { success: false, error: 'Rule not found' };
      }

      const chunks = await this.database
        .select({
          chunkIndex: knowledgeChunks.chunkIndex,
          text: knowledgeChunks.text,
        })
        .from(knowledgeChunks)
        .where(eq(knowledgeChunks.documentId, documentId))
        .orderBy(knowledgeChunks.chunkIndex);

      return {
        success: true,
        rule: {
          id: doc.id,
          title: doc.title,
          category: doc.category,
          summary: doc.summary,
          sourceType: doc.sourceType,
          chunkCount: doc.chunkCount,
          wordCount: doc.wordCount,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          rawText: doc.rawText,
          chunks,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch rule',
      };
    }
  }

  /**
   * Get all rules attached to a specific debate session.
   */
  async getRulesForDebate(debateSessionId: string): Promise<RuleSearchResult> {
    try {
      const links = await this.database
        .select({ knowledgeDocumentId: debateSessionKnowledgeDocuments.knowledgeDocumentId })
        .from(debateSessionKnowledgeDocuments)
        .where(eq(debateSessionKnowledgeDocuments.debateSessionId, debateSessionId));

      if (links.length === 0) {
        return { success: true, rules: [] };
      }

      const documentIds = links.map((l) => l.knowledgeDocumentId);

      const docs = await this.database
        .select({
          id: knowledgeDocuments.id,
          title: knowledgeDocuments.title,
          category: knowledgeDocuments.category,
          summary: knowledgeDocuments.summary,
          sourceType: knowledgeDocuments.sourceType,
          chunkCount: knowledgeDocuments.chunkCount,
          wordCount: knowledgeDocuments.wordCount,
          createdAt: knowledgeDocuments.createdAt,
          updatedAt: knowledgeDocuments.updatedAt,
        })
        .from(knowledgeDocuments)
        .where(
          and(
            inArray(knowledgeDocuments.id, documentIds),
            eq(knowledgeDocuments.sourceType, knowledgeSourceType.enumValues[0])
          )
        );

      return { success: true, rules: docs };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch debate rules',
      };
    }
  }

  /**
   * Search rule documents by title or category (not chunk text).
   */
  async findRulesByTitleOrCategory(query: string, limit = 8): Promise<RuleSearchResult> {
    try {
      const trimmed = query.trim();
      if (!trimmed) {
        return { success: true, rules: [] };
      }

      const pattern = `%${trimmed}%`;

      const docs = await this.database
        .select({
          id: knowledgeDocuments.id,
          title: knowledgeDocuments.title,
          category: knowledgeDocuments.category,
          summary: knowledgeDocuments.summary,
          sourceType: knowledgeDocuments.sourceType,
          chunkCount: knowledgeDocuments.chunkCount,
          wordCount: knowledgeDocuments.wordCount,
          createdAt: knowledgeDocuments.createdAt,
          updatedAt: knowledgeDocuments.updatedAt,
        })
        .from(knowledgeDocuments)
        .where(
          and(
            eq(knowledgeDocuments.sourceType, knowledgeSourceType.enumValues[0]),
            sql`${knowledgeDocuments.title} ILIKE ${pattern} OR ${knowledgeDocuments.category} ILIKE ${pattern}`
          )
        )
        .limit(limit);

      return { success: true, rules: docs };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find rules',
      };
    }
  }
}

export const rulesTools = new RulesTools();
