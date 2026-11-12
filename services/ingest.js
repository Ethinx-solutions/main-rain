/**
 * Document ingestion pipeline: extract -> chunk -> embed -> persist.
 * Tenant-isolated by construction: every write/read carries userId.
 *
 * Cost controls:
 *   - MAX_FILE_BYTES per upload (enforced again here)
 *   - MAX_DOCS_PER_USER tenant quota
 *   - MAX_CHUNKS_PER_DOC truncation cap
 *   - batched embedding calls with provider-side timeouts
 */
const crypto = require('crypto');
const Document = require('../models/Document');
const Chunk = require('../models/Chunk');
const { chunkText } = require('./chunker');
const { embedTexts, EmbeddingProviderError } = require('./embeddings');
const { insertChunks, deleteDocumentChunks } = require('./vectorStore');

const MAX_FILE_BYTES = parseInt(process.env.DOC_MAX_FILE_BYTES || String(10 * 1024 * 1024), 10);
const MAX_DOCS_PER_USER = parseInt(process.env.DOC_MAX_DOCS_PER_USER || '100', 10);
const MAX_CHUNKS_PER_DOC = parseInt(process.env.DOC_MAX_CHUNKS_PER_DOC || '400', 10);
const EMBED_BATCH_SIZE = parseInt(process.env.DOC_EMBED_BATCH || '16', 10);

const TEXT_EXTENSIONS = ['txt', 'md', 'markdown', 'csv', 'json', 'log'];
const SUPPORTED_EXTENSIONS = [...TEXT_EXTENSIONS, 'pdf', 'docx'];

class IngestError extends Error {
  constructor(message, { status = 400 } = {}) {
    super(message);
    this.name = 'IngestError';
    this.status = status;
  }
}

function getExtension(filename) {
  const m = /\.([A-Za-z0-9]+)$/.exec(filename || '');
  return m ? m[1].toLowerCase() : '';
}

/** Extract plain text from an uploaded file buffer. */
async function extractText(buffer, filename, mimeType) {
  const ext = getExtension(filename);
  if (TEXT_EXTENSIONS.includes(ext)) {
    return buffer.toString('utf8').replace(/^\uFEFF/, '');
  }
  if (ext === 'pdf') {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data && data.text ? data.text : '';
  }
  if (ext === 'docx') {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result && result.value ? result.value : '';
  }
  // Fallback for empty/unknown extension but known text mime types.
  if (/^text\//.test(mimeType || '') || mimeType === 'application/json') {
    return buffer.toString('utf8').replace(/^\uFEFF/, '');
  }
  throw new IngestError(`Unsupported file type ".${ext || 'unknown'}". Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`);
}

/**
 * Ingest one uploaded file for one user.
 * @param {ObjectId|String} userId
 * @param {{buffer: Buffer, originalname: string, mimetype: string, size: number}} file
 * @returns {Promise<{document: object, deduped: boolean}>}
 */
async function ingestDocument(userId, file) {
  if (!file || !file.buffer) throw new IngestError('No file provided');
  if (file.size > MAX_FILE_BYTES) {
    throw new IngestError(`File exceeds the ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB limit`, { status: 413 });
  }

  const docCount = await Document.countDocuments({ userId });
  if (docCount >= MAX_DOCS_PER_USER) {
    throw new IngestError(`Document limit reached (${MAX_DOCS_PER_USER} per user)`, { status: 429 });
  }

  const originalName = String(file.originalname || 'untitled').slice(0, 255);
  const ext = getExtension(originalName) || (file.mimetype === 'application/pdf' ? 'pdf' : 'txt');
  const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');

  // Dedupe identical uploads for the same tenant.
  const existing = await Document.findOne({ userId, sha256 }).lean();
  if (existing && existing.status === 'ready') {
    return { document: existing, deduped: true };
  }

  const serverName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext || 'txt'}`;
  const document = await Document.create({
    userId,
    originalName,
    filename: serverName,
    mimeType: file.mimetype || '',
    extension: ext,
    sizeBytes: file.size,
    sha256,
    status: 'processing',
  });

  try {
    // 1. Extract text
    const rawText = await extractText(file.buffer, originalName, file.mimetype);
    if (!rawText || !rawText.trim()) {
      throw new IngestError('No extractable text found in the document');
    }

    // 2. Chunk
    const { chunks, truncated, totalChars } = chunkText(rawText, { maxChunks: MAX_CHUNKS_PER_DOC });
    if (!chunks.length) {
      throw new IngestError('Document produced no text chunks');
    }

    // 3. Embed in batches (bounded, with provider timeouts/retries)
    const vectors = [];
    let embeddingModel = null;
    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
      const { vectors: batchVectors, model } = await embedTexts(batch);
      embeddingModel = model;
      vectors.push(...batchVectors);
    }

    // 4. Persist chunks + mark ready (atomic-enough for pilot: chunks first)
    await insertChunks(document.userId, document._id, chunks, vectors, embeddingModel);
    document.status = 'ready';
    document.chunkCount = chunks.length;
    document.charCount = totalChars;
    document.embeddingModel = embeddingModel;
    document.truncated = truncated;
    document.processedAt = new Date();
    document.statusError = null;
    await document.save();

    return { document: document.toJSON(), deduped: false };
  } catch (err) {
    const message = err instanceof EmbeddingProviderError || err instanceof IngestError
      ? err.message
      : 'Document processing failed';
    try {
      await deleteDocumentChunks(document.userId, document._id);
      document.status = 'failed';
      document.statusError = message;
      document.processedAt = new Date();
      await document.save();
    } catch (markErr) {
      console.error('Failed to record document failure:', markErr.message);
    }
    // Surface a clean error to the route layer (no internal details leak).
    const out = new Error(message);
    out.status = err.status && err.status >= 400 && err.status < 500 ? err.status : 422;
    throw out;
  }
}

/** Delete a document and all of its chunks for a tenant. */
async function deleteDocument(userId, documentId) {
  const document = await Document.findOne({ _id: documentId, userId });
  if (!document) return null;
  await deleteDocumentChunks(userId, document._id);
  await document.deleteOne();
  return document;
}

module.exports = {
  ingestDocument,
  deleteDocument,
  extractText,
  getExtension,
  IngestError,
  SUPPORTED_EXTENSIONS,
  TEXT_EXTENSIONS,
  MAX_FILE_BYTES,
  MAX_DOCS_PER_USER,
  MAX_CHUNKS_PER_DOC,
};
