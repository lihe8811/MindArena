import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import type {
  KnowledgeChunkPreview,
  KnowledgeDocument,
  KnowledgeDocumentDetail,
  KnowledgeSearchResponse,
  KnowledgeSearchResult,
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

function toPublicDocument(document: StoredKnowledgeDocument): KnowledgeDocument {
  const { rawText: _rawText, ...publicDocument } = document;
  return publicDocument;
}

export function listKnowledgeDocuments(ownerUserId: string) {
  return loadStore()
    .documents.filter((document) => document.ownerUserId === ownerUserId)
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
  const id = `knw-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const createdAt = new Date().toISOString();

  const document: StoredKnowledgeDocument = {
    id,
    ownerUserId: input.ownerUserId,
    title: input.title,
    category: input.category,
    sourceType: input.sourceType,
    status: 'Indexed',
    summary: summarize(input.content),
    chunkCount: 0,
    wordCount: wordCount(input.content),
    createdAt,
    rawText: input.content,
    fileName: input.fileName,
    mimeType: input.mimeType,
  };

  const textChunks = chunkText(input.content);
  document.chunkCount = textChunks.length;

  const chunks: KnowledgeChunk[] = textChunks.map((text, index) => ({
    id: `${id}-ch-${index}`,
    documentId: id,
    index,
    text,
    vector: embedText(text),
  }));

  store.documents.push(document);
  store.chunks.push(...chunks);
  saveStore(store);

  return toPublicDocument(document);
}

export async function createKnowledgeFromFile(input: Omit<CreateKnowledgeInput, 'content' | 'sourceType'> & { content: Buffer }) {
  const text = await parseFileText(input.fileName || 'unknown', input.mimeType || '', input.content);
  return createKnowledgeEntry({
    ...input,
    content: text,
    sourceType: 'file',
  });
}

export function deleteKnowledgeDocument(ownerUserId: string, documentId: string) {
  const store = loadStore();
  const index = store.documents.findIndex((doc) => doc.id === documentId && doc.ownerUserId === ownerUserId);

  if (index === -1) {
    throw new Error('Knowledge document not found.');
  }

  store.documents.splice(index, 1);
  store.chunks = store.chunks.filter((chunk) => chunk.documentId !== documentId);
  saveStore(store);

  return listKnowledgeDocuments(ownerUserId);
}

export function searchKnowledgeBase(ownerUserId: string, query: string, limit = 8): KnowledgeSearchResponse {
  const store = loadStore();
  const queryVector = embedText(query);

  const userDocumentIds = new Set(
    store.documents.filter((doc) => doc.ownerUserId === ownerUserId).map((doc) => doc.id),
  );

  const results = store.chunks
    .filter((chunk) => userDocumentIds.has(chunk.documentId))
    .map((chunk) => {
      const document = store.documents.find((doc) => doc.id === chunk.documentId)!;
      return {
        id: chunk.id,
        documentId: chunk.documentId,
        documentTitle: document.title,
        category: document.category,
        sourceType: document.sourceType,
        excerpt: chunk.text,
        score: cosineSimilarity(queryVector, chunk.vector),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    query,
    total: results.length,
    results,
  };
}

export function reindexKnowledgeDocument(ownerUserId: string, documentId: string): KnowledgeDocumentDetail {
  const store = loadStore();
  const document = store.documents.find((entry) => entry.id === documentId && entry.ownerUserId === ownerUserId);

  if (!document) {
    throw new Error('Knowledge document not found.');
  }

  // Remove existing chunks
  store.chunks = store.chunks.filter((chunk) => chunk.documentId !== documentId);

  // Regenerate chunks
  const textChunks = chunkText(document.rawText);
  document.chunkCount = textChunks.length;
  document.wordCount = wordCount(document.rawText);

  const chunks: KnowledgeChunk[] = textChunks.map((text, index) => ({
    id: `${documentId}-ch-${index}`,
    documentId,
    index,
    text,
    vector: embedText(text),
  }));

  store.chunks.push(...chunks);
  saveStore(store);

  return getKnowledgeDocumentDetail(ownerUserId, documentId);
}
