import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import type {
  KnowledgeChunkPreview,
  KnowledgeDocument,
  KnowledgeDocumentDetail,
  KnowledgeSearchResult,
  KnowledgeSearchSuggestion,
} from '@/shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../../../data');
const storePath = path.join(dataDir, 'knowledge-base.json');
const VECTOR_DIMENSIONS = 128;

interface KnowledgeChunk {
  id: string;
  documentId: string;
  index: number;
  text: string;
  vector: number[];
}

interface StoredKnowledgeDocument extends KnowledgeDocument {
  rawText: string;
}

interface PersistedKnowledgeStore {
  documents: StoredKnowledgeDocument[];
  chunks: KnowledgeChunk[];
}

interface CreateKnowledgeInput {
  ownerUserId: string;
  title: string;
  category: string;
  sourceType: 'rule' | 'file';
  content: string;
  fileName?: string;
  mimeType?: string;
}

const defaultStore: PersistedKnowledgeStore = {
  documents: [],
  chunks: [],
};

function ensureStoreFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, JSON.stringify(defaultStore, null, 2), 'utf8');
  }
}

function loadStore(): PersistedKnowledgeStore {
  ensureStoreFile();
  const raw = fs.readFileSync(storePath, 'utf8');
  return JSON.parse(raw) as PersistedKnowledgeStore;
}

function saveStore(store: PersistedKnowledgeStore) {
  ensureStoreFile();
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
}

function cleanText(input: string) {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}

async function parseFileText(fileName: string, mimeType: string, content: Buffer) {
  const extension = path.extname(fileName).toLowerCase();
  const rawText = content.toString('utf8');

  if (
    [
      '.txt',
      '.md',
      '.markdown',
      '.rules',
      '.rule',
      '.csv',
      '.tsv',
      '.yaml',
      '.yml',
      '.xml',
      '.html',
      '.htm',
      '.json',
      '.log',
      '.sql',
    ].includes(extension) ||
    mimeType.startsWith('text/')
  ) {
    if (extension === '.json') {
      try {
        return JSON.stringify(JSON.parse(rawText), null, 2);
      } catch {
        return rawText;
      }
    }

    return cleanText(rawText);
  }

  if (extension === '.pdf' || mimeType === 'application/pdf') {
    const parsed = await pdfParse(content);
    return cleanText(parsed.text);
  }

  if (
    extension === '.docx' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const parsed = await mammoth.extractRawText({ buffer: content });
    return cleanText(parsed.value);
  }

  throw new Error(`Unsupported file type: ${extension || mimeType}`);
}

function chunkText(text: string, chunkSize = 900, overlap = 120) {
  const normalized = cleanText(text);
  if (!normalized) return [];

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    let end = Math.min(cursor + chunkSize, normalized.length);
    const nextBreak = normalized.lastIndexOf('\n', end);
    const sentenceBreak = normalized.lastIndexOf('. ', end);
    const bestBreak = Math.max(nextBreak, sentenceBreak);

    if (bestBreak > cursor + 300) {
      end = bestBreak + 1;
    }

    const piece = normalized.slice(cursor, end).trim();
    if (piece) {
      chunks.push(piece);
    }

    if (end >= normalized.length) break;
    cursor = Math.max(end - overlap, cursor + 1);
  }

  return chunks;
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/gi, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function hashToken(token: string) {
  let hash = 0;
  for (let index = 0; index < token.length; index += 1) {
    hash = (hash * 31 + token.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function embedText(text: string) {
  const vector = new Array<number>(VECTOR_DIMENSIONS).fill(0);

  for (const token of tokenize(text)) {
    const slot = hashToken(token) % VECTOR_DIMENSIONS;
    vector[slot] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) return vector;

  return vector.map((value) => value / magnitude);
}

function cosineSimilarity(a: number[], b: number[]) {
  let score = 0;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    score += a[index] * b[index];
  }
  return score;
}

function summarize(text: string) {
  return text.replace(/\s+/g, ' ').slice(0, 180).trim();
}

function wordCount(text: string) {
  return tokenize(text).length;
}

function normalizeSearchText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(left: string, right: string) {
  if (!left) return right.length;
  if (!right) return left.length;

  const dp = Array.from({ length: left.length + 1 }, () => new Array<number>(right.length + 1).fill(0));
  for (let row = 0; row <= left.length; row += 1) dp[row][0] = row;
  for (let column = 0; column <= right.length; column += 1) dp[0][column] = column;

  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      dp[row][column] = Math.min(
        dp[row - 1][column] + 1,
        dp[row][column - 1] + 1,
        dp[row - 1][column - 1] + cost,
      );
    }
  }

  return dp[left.length][right.length];
}

function isSubsequence(query: string, candidate: string) {
  if (!query) return true;
  let cursor = 0;
  for (const character of candidate) {
    if (character === query[cursor]) {
      cursor += 1;
      if (cursor === query.length) return true;
    }
  }
  return false;
}

function computeKeywordOverlap(query: string, candidate: string) {
  const queryTokens = new Set(tokenize(query));
  const candidateTokens = new Set(tokenize(candidate));
  if (queryTokens.size === 0 || candidateTokens.size === 0) return 0;

  let matches = 0;
  for (const token of queryTokens) {
    if (candidateTokens.has(token)) {
      matches += 1;
    }
  }

  return matches / queryTokens.size;
}

function computeFuzzyTextScore(query: string, candidate: string) {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedCandidate = normalizeSearchText(candidate);

  if (!normalizedQuery || !normalizedCandidate) return 0;
  if (normalizedQuery === normalizedCandidate) return 1;
  if (normalizedCandidate.startsWith(normalizedQuery)) {
    return Math.max(0.92, 1 - (normalizedCandidate.length - normalizedQuery.length) * 0.02);
  }
  if (normalizedCandidate.includes(normalizedQuery)) {
    return 0.84;
  }
  if (isSubsequence(normalizedQuery, normalizedCandidate)) {
    return 0.72;
  }

  const candidateWindow = normalizedCandidate.slice(0, Math.max(normalizedQuery.length + 2, 2));
  const distance = levenshteinDistance(normalizedQuery, candidateWindow);
  const editScore = 1 - distance / Math.max(normalizedQuery.length, candidateWindow.length, 1);
  const keywordScore = computeKeywordOverlap(normalizedQuery, normalizedCandidate);

  return Math.max(editScore * 0.78, keywordScore * 0.65, 0);
}

function toPublicDocument(document: StoredKnowledgeDocument): KnowledgeDocument {
  const { rawText: _rawText, ...publicDocument } = document;
  return publicDocument;
}

export function listKnowledgeDocuments(ownerUserId: string) {
  return loadStore()
    .documents
    .filter((document) => document.ownerUserId === ownerUserId)
    .map(toPublicDocument)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getKnowledgeDocumentDetail(ownerUserId: string, documentId: string): KnowledgeDocumentDetail {
  const store = loadStore();
  const document = store.documents.find((entry) => entry.id === documentId && entry.ownerUserId === ownerUserId);

  if (!document) {
    throw new Error('Knowledge document not found.');
  }

  const chunks: KnowledgeChunkPreview[] = store.chunks
    .filter((chunk) => chunk.documentId === documentId)
    .sort((a, b) => a.index - b.index)
    .map((chunk) => ({
      id: chunk.id,
      index: chunk.index,
      text: chunk.text,
    }));

  return {
    document: toPublicDocument(document),
    chunks,
  };
}

export function createKnowledgeEntry(input: CreateKnowledgeInput) {
  const store = loadStore();
  const parsedText = cleanText(input.content);

  if (!parsedText) {
    throw new Error('Knowledge content is empty after parsing.');
  }

  const documentId = `doc-${Date.now()}`;
  const createdAt = new Date().toISOString();
  const chunks = chunkText(parsedText);

  const document: StoredKnowledgeDocument = {
    id: documentId,
    ownerUserId: input.ownerUserId,
    title: input.title.trim() || input.fileName || 'Untitled knowledge',
    category: input.category.trim() || 'General',
    sourceType: input.sourceType,
    status: 'Indexed',
    summary: summarize(parsedText),
    chunkCount: chunks.length,
    wordCount: wordCount(parsedText),
    createdAt,
    updatedAt: createdAt,
    fileName: input.fileName,
    mimeType: input.mimeType,
    rawText: parsedText,
  };

  const storedChunks: KnowledgeChunk[] = chunks.map((text, index) => ({
    id: `${documentId}-chunk-${index + 1}`,
    documentId,
    index,
    text,
    vector: embedText(text),
  }));

  store.documents.unshift(document);
  store.chunks.push(...storedChunks);
  saveStore(store);

  return toPublicDocument(document);
}

export async function createKnowledgeFromFile(input: {
  ownerUserId: string;
  fileName: string;
  mimeType: string;
  content: Buffer;
  title?: string;
  category?: string;
}) {
  const parsed = await parseFileText(input.fileName, input.mimeType, input.content);
  return createKnowledgeEntry({
    ownerUserId: input.ownerUserId,
    title: input.title?.trim() || input.fileName,
    category: input.category?.trim() || 'Uploaded File',
    sourceType: 'file',
    content: parsed,
    fileName: input.fileName,
    mimeType: input.mimeType,
  });
}

export function deleteKnowledgeDocument(ownerUserId: string, documentId: string) {
  const store = loadStore();
  const before = store.documents.length;
  store.documents = store.documents.filter((document) => !(document.id === documentId && document.ownerUserId === ownerUserId));
  store.chunks = store.chunks.filter((chunk) => chunk.documentId !== documentId);

  if (store.documents.length === before) {
    throw new Error('Knowledge document not found.');
  }

  saveStore(store);
  return listKnowledgeDocuments(ownerUserId);
}

export function reindexKnowledgeDocument(ownerUserId: string, documentId: string) {
  const store = loadStore();
  const document = store.documents.find((entry) => entry.id === documentId && entry.ownerUserId === ownerUserId);

  if (!document) {
    throw new Error('Knowledge document not found.');
  }

  const chunks = chunkText(document.rawText);
  document.status = 'Indexed';
  document.summary = summarize(document.rawText);
  document.chunkCount = chunks.length;
  document.wordCount = wordCount(document.rawText);
  document.updatedAt = new Date().toISOString();

  store.chunks = store.chunks.filter((chunk) => chunk.documentId !== documentId);
  store.chunks.push(
    ...chunks.map((text, index) => ({
      id: `${documentId}-chunk-${index + 1}`,
      documentId,
      index,
      text,
      vector: embedText(text),
    })),
  );

  saveStore(store);
  return getKnowledgeDocumentDetail(ownerUserId, documentId);
}

export function searchKnowledgeBase(ownerUserId: string, query: string, limit = 8) {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      query: '',
      total: 0,
      suggestions: [] as KnowledgeSearchSuggestion[],
      results: [] as KnowledgeSearchResult[],
    };
  }

  const store = loadStore();
  const userDocuments = store.documents.filter((document) => document.ownerUserId === ownerUserId);
  const userDocumentIds = new Set(userDocuments.map((document) => document.id));
  const queryVector = embedText(trimmed);

  const suggestions = userDocuments
    .map((document) => {
      const score = Math.max(
        computeFuzzyTextScore(trimmed, document.title),
        computeFuzzyTextScore(trimmed, document.fileName ?? ''),
        computeFuzzyTextScore(trimmed, document.category),
      );

      return {
        documentId: document.id,
        title: document.title,
        category: document.category,
        score: Number(score.toFixed(4)),
      };
    })
    .filter((item) => item.score >= 0.28)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, Math.min(limit, 6));

  const scored = store.chunks
    .filter((chunk) => userDocumentIds.has(chunk.documentId))
    .map((chunk) => ({
      chunk,
      document: userDocuments.find((entry) => entry.id === chunk.documentId),
    }))
    .map(({ chunk, document }) => {
      const semanticScore = cosineSimilarity(queryVector, chunk.vector);
      const keywordScore = computeKeywordOverlap(trimmed, chunk.text);
      const titleScore = document ? computeFuzzyTextScore(trimmed, document.title) : 0;
      const categoryScore = document ? computeFuzzyTextScore(trimmed, document.category) : 0;
      const score = semanticScore * 0.58 + keywordScore * 0.22 + titleScore * 0.15 + categoryScore * 0.05;

      return {
        chunk,
        document,
        score,
        matchedBy:
          titleScore >= semanticScore && titleScore >= keywordScore
            ? ('title' as const)
            : categoryScore >= semanticScore && categoryScore >= keywordScore
              ? ('category' as const)
              : keywordScore > semanticScore
                ? ('hybrid' as const)
                : ('content' as const),
      };
    })
    .filter((item) => item.score >= 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const results: KnowledgeSearchResult[] = scored.map(({ chunk, document, score, matchedBy }) => {

    return {
      id: chunk.id,
      documentId: chunk.documentId,
      documentTitle: document?.title ?? 'Unknown document',
      category: document?.category ?? 'General',
      sourceType: document?.sourceType ?? 'file',
      excerpt: chunk.text.slice(0, 240).trim(),
      score: Number(score.toFixed(4)),
      matchedBy,
    };
  });

  if (results.length === 0 && suggestions.length > 0) {
    const suggestionResults = suggestions
      .map((suggestion) => {
        const document = userDocuments.find((entry) => entry.id === suggestion.documentId);
        if (!document) return null;

        return {
          id: `suggestion-${document.id}`,
          documentId: document.id,
          documentTitle: document.title,
          category: document.category,
          sourceType: document.sourceType,
          excerpt: document.summary,
          score: suggestion.score,
          matchedBy: 'title' as const,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, limit);

    return {
      query: trimmed,
      total: suggestionResults.length,
      suggestions,
      results: suggestionResults,
    };
  }

  return {
    query: trimmed,
    total: results.length,
    suggestions,
    results,
  };
}
