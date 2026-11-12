const express = require('express');
const Document = require('../models/Document');
const auth = require('../middleware/auth');
const requireVerified = require('../middleware/requireVerified');
const { embedTexts, getEmbedConfig, EmbeddingProviderError } = require('../services/embeddings');
const { chat, getLLMConfig, LLMProviderError } = require('../services/llm');
const { searchChunks, countChunks } = require('../services/vectorStore');

const router = express.Router();

// Reject malformed ObjectIds with 400 instead of an internal CastError 500.
function validObjectId(id) {
  try {
    return Boolean(new (require('mongoose').Types.ObjectId)(String(id)));
  } catch (e) {
    return false;
  }
}

const MAX_QUESTION_CHARS = parseInt(process.env.AI_MAX_QUESTION_CHARS || '2000', 10);
const DEFAULT_TOP_K = parseInt(process.env.AI_DEFAULT_TOP_K || '8', 10);
const MAX_TOP_K = parseInt(process.env.AI_MAX_TOP_K || '20', 10);
const MAX_CONTEXT_CHARS = parseInt(process.env.AI_MAX_CONTEXT_CHARS || '8000', 10);

const SYSTEM_PROMPT = [
  'You are the EthinX Second Brain assistant.',
  'Answer the user\'s question strictly using the numbered context excerpts provided.',
  'Cite the excerpt you used with its bracketed number, e.g. [1]. If multiple, cite each once.',
  'If the context does not contain the answer, say clearly that the answer is not in the indexed documents.',
  'Do not invent facts. Do not use outside knowledge beyond light phrasing.',
].join(' ');

function buildPrompt(question, hits) {
  let context = '';
  let used = [];
  for (let i = 0; i < hits.length; i++) {
    const excerpt = hits[i].text.slice(0, Math.max(200, Math.floor(MAX_CONTEXT_CHARS / Math.max(1, hits.length))));
    const entry = `[${i + 1}] (${hits[i].filename}, part ${hits[i].chunkIndex + 1}) ${excerpt}`;
    if ((context + entry).length > MAX_CONTEXT_CHARS) break;
    context += (context ? '\n\n' : '') + entry;
    used = [...used, hits[i]];
  }
  const prompt = [
    'Context excerpts from the user\'s documents:',
    context,
    '',
    `Question: ${question}`,
    '',
    'Answer with citations like [1]. If not answerable from the context, say so.',
  ].join('\n');
  return { prompt, used };
}

// Ask a question over the tenant's indexed documents (RAG)
router.post('/query', auth, requireVerified, async (req, res) => {
  const startedAt = Date.now();
  try {
    const question = String((req.body && req.body.question) || '').trim();
    const topK = Math.max(1, Math.min(parseInt(req.body && req.body.topK, 10) || DEFAULT_TOP_K, MAX_TOP_K));
    const documentId = req.body && req.body.documentId ? String(req.body.documentId) : null;

    if (!question) {
      return res.status(400).json({ message: 'Question is required' });
    }
    if (question.length > MAX_QUESTION_CHARS) {
      return res.status(400).json({ message: `Question must be at most ${MAX_QUESTION_CHARS} characters` });
    }

    // 1. Embed the question
    let queryVector;
    try {
      const { vectors } = await embedTexts([question]);
      queryVector = vectors[0];
    } catch (err) {
      const status = err instanceof EmbeddingProviderError ? 503 : 500;
      return res.status(status).json({ message: 'Embedding provider unavailable', detail: err.message });
    }

    // 2. Retrieve tenant-scoped chunks. Ownership is enforced against the
    //    Document collection so a foreign documentId cannot be probed.
    let docFilter = { userId: req.user._id };
    if (documentId) {
      if (!validObjectId(documentId)) {
        return res.status(400).json({ message: 'Invalid document id' });
      }
      const doc = await Document.findOne({ _id: documentId, userId: req.user._id }).select('_id').lean();
      if (!doc) {
        return res.status(404).json({ message: 'Document not found' });
      }
      docFilter = { userId: req.user._id, _id: doc._id };
    }
    const docIds = (await Document.find(docFilter).select('_id originalName').lean())
      .reduce((acc, d) => ({ ...acc, [String(d._id)]: d.originalName }), {});

    const hits = await searchChunks(req.user._id, queryVector, {
      k: topK,
      documentId: documentId || null,
    });
    const hitsWithDoc = hits
      .filter((h) => docIds[String(h.documentId)])
      .map((h) => ({ ...h, filename: docIds[String(h.documentId)] }));

    if (!hitsWithDoc.length) {
      return res.json({
        answer: 'I could not find any relevant information in your indexed documents.',
        sources: [],
        provider: getLLMConfig().provider,
        model: getLLMConfig().model,
        tookMs: Date.now() - startedAt,
      });
    }

    // 3. Generate the grounded answer
    const { prompt, used } = buildPrompt(question, hitsWithDoc);
    let result;
    try {
      const out = await chat({ system: SYSTEM_PROMPT, prompt });
      result = out;
    } catch (err) {
      const status = err instanceof LLMProviderError ? 503 : 500;
      return res.status(status).json({ message: 'LLM provider unavailable', detail: err.message });
    }

    const usedSet = new Map(used.map((h, i) => [i + 1, h]));
    const cited = [...result.text.matchAll(/\[(\d+)\]/g)]
      .map((m) => parseInt(m[1], 10))
      .filter((n) => usedSet.has(n));

    const sources = used.map((h, i) => ({
      ref: i + 1,
      documentId: h.documentId,
      document: h.filename,
      chunkIndex: h.chunkIndex,
      score: Math.round(h.score * 1000) / 1000,
      excerpt: h.text.slice(0, 300),
      cited: cited.includes(i + 1),
    }));

    res.json({
      answer: result.text,
      sources,
      provider: result.provider,
      model: result.model,
      tookMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error('AI query error:', error.message);
    res.status(500).json({ message: 'Server error while answering the question' });
  }
});

// Provider/index status for the current tenant
router.get('/status', auth, async (req, res) => {
  try {
    const embed = getEmbedConfig();
    const llm = getLLMConfig();
    const [documents, chunks] = await Promise.all([
      Document.countDocuments({ userId: req.user._id }),
      countChunks(req.user._id),
    ]);
    res.json({
      embeddings: embed,
      llm,
      documents: { count: documents, chunks },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
