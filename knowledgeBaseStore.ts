import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { KnowledgeDocument, KnowledgeSearchResult } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');
const storePath = path.join(dataDir, 'knowledge-base.json');
const VECTOR_DIMENSIONS = 128;

interface KnowledgeChunk {
  id: string;
  documentId: string;
  index: number;
  text: string;
  vector: number[];
}

interface PersistedKnowledgeStore {
  documents: KnowledgeDocument[];
  chunks: KnowledgeChunk[];
}

interface CreateKnowledgeInput {
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

function parseFileText(fileName: string, mimeType: string, content: Buffer) {
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

export function listKnowledgeDocuments() {
  return loadStore().documents.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
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

  const document: KnowledgeDocument = {
    id: documentId,
    title: input.title.trim() || input.fileName || 'Untitled knowledge',
    category: input.category.trim() || 'General',
    sourceType: input.sourceType,
    status: 'Indexed',
    summary: summarize(parsedText),
    chunkCount: chunks.length,
    wordCount: wordCount(parsedText),
    createdAt,
    fileName: input.fileName,
    mimeType: input.mimeType,
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

  return document;
}

export function createKnowledgeFromFile(input: {
  fileName: string;
  mimeType: string;
  content: Buffer;
  title?: string;
  category?: string;
}) {
  const parsed = parseFileText(input.fileName, input.mimeType, input.content);
  return createKnowledgeEntry({
    title: input.title?.trim() || input.fileName,
    category: input.category?.trim() || 'Uploaded File',
    sourceType: 'file',
    content: parsed,
    fileName: input.fileName,
    mimeType: input.mimeType,
  });
}

export function searchKnowledgeBase(query: string, limit = 8) {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      query: '',
      total: 0,
      results: [] as KnowledgeSearchResult[],
    };
  }

  const store = loadStore();
  const queryVector = embedText(trimmed);
  const scored = store.chunks
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryVector, chunk.vector),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const results: KnowledgeSearchResult[] = scored.map(({ chunk, score }) => {
    const document = store.documents.find((entry) => entry.id === chunk.documentId);

    return {
      id: chunk.id,
      documentId: chunk.documentId,
      documentTitle: document?.title ?? 'Unknown document',
      category: document?.category ?? 'General',
      sourceType: document?.sourceType ?? 'file',
      excerpt: chunk.text.slice(0, 240).trim(),
      score: Number(score.toFixed(4)),
    };
  });

  return {
    query: trimmed,
    total: results.length,
    results,
  };
}
