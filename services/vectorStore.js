/**
 * Vector storage and retrieval over MongoDB.
 *
 * Embeddings are persisted per-chunk in the `chunks` collection (tenant
 * scoped). Retrieval performs cosine similarity in-process over the tenant's
 * chunks, bounded by MAX_SCAN. This is appropriate for pilot scale; a
 * production deployment would move to Atlas Vector Search or pgvector.
 */
const Chunk = require('../models/Chunk');

const MAX_SCAN = parseInt(process.env.VECTOR_MAX_SCAN || '5000', 10);

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Insert chunks with their vectors for one document. */
async function insertChunks(userId, documentId, chunkTexts, vectors, embeddingModel) {
  if (!chunkTexts.length) return [];
  const docs = chunkTexts.map((text, i) => ({
    userId,
    documentId,
    chunkIndex: i,
    text,
    embedding: vectors[i],
    embeddingModel,
    charCount: text.length,
  }));
  return Chunk.insertMany(docs, { ordered: false });
}

async function deleteDocumentChunks(userId, documentId) {
  await Chunk.deleteMany({ userId, documentId });
}

/**
 * Semantic search scoped to one tenant (userId), optionally one document.
 * Returns [{ documentId, chunkIndex, text, score, embeddingModel }].
 */
async function searchChunks(userId, queryVector, { k = 8, documentId = null } = {}) {
  const limit = Math.max(1, Math.min(parseInt(k, 10) || 8, 50));
  const query = { userId };
  if (documentId) query.documentId = documentId;

  const candidates = await Chunk.find(query)
    .select('documentId chunkIndex text embedding embeddingModel')
    .limit(MAX_SCAN)
    .lean();

  const scored = candidates
    .filter((c) => Array.isArray(c.embedding) && c.embedding.length > 0)
    .map((c) => ({
      documentId: c.documentId,
      chunkIndex: c.chunkIndex,
      text: c.text,
      embeddingModel: c.embeddingModel,
      score: cosineSimilarity(queryVector, c.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

async function countChunks(userId) {
  const match = userId ? { userId } : {};
  return Chunk.countDocuments(match);
}

module.exports = { insertChunks, deleteDocumentChunks, searchChunks, countChunks, cosineSimilarity };
