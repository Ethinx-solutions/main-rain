/**
 * Embedding generation service.
 *
 * Providers (EMBED_PROVIDER):
 *   - ollama  (default, local + free): OLLAMA_URL, model OLLAMA_EMBED_MODEL
 *   - openai  (optional, metered):     OPENAI_API_KEY, model OPENAI_EMBED_MODEL
 *   - none    : ingestion fails fast with a clear, non-fatal error
 *
 * Cost controls: batched calls, per-call timeout, bounded retries, input cap.
 */
const { fetchWithTimeout, withRetries } = require('./http');

const EMBED_PROVIDER = (process.env.EMBED_PROVIDER || 'ollama').toLowerCase();
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
const OPENAI_EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
const EMBED_TIMEOUT_MS = parseInt(process.env.EMBED_TIMEOUT_MS || '30000', 10);
const EMBED_RETRIES = parseInt(process.env.EMBED_RETRIES || '1', 10);
// Hard cap on characters sent per embedding input (cost/length control).
const MAX_INPUT_CHARS = parseInt(process.env.EMBED_MAX_INPUT_CHARS || '6000', 10);

class EmbeddingProviderError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EmbeddingProviderError';
  }
}

/** Public description of the configured provider for /api/ai/status. */
function getEmbedConfig() {
  const provider = EMBED_PROVIDER;
  const model = provider === 'openai' ? OPENAI_EMBED_MODEL : provider === 'ollama' ? OLLAMA_EMBED_MODEL : null;
  const configured =
    provider === 'none' ? false :
    provider === 'openai' ? Boolean(process.env.OPENAI_API_KEY) :
    provider === 'ollama' ? Boolean(OLLAMA_URL) : false;
  return { provider, model, configured, maxInputChars: MAX_INPUT_CHARS };
}

async function embedViaOllama(texts) {
  const res = await withRetries(
    () => fetchWithTimeout(
      `${OLLAMA_URL.replace(/\/$/, '')}/api/embed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: OLLAMA_EMBED_MODEL, input: texts }),
      },
      EMBED_TIMEOUT_MS
    ),
    EMBED_RETRIES,
    { label: 'ollama-embed' }
  );
  if (!res.ok) {
    const err = new EmbeddingProviderError(`Ollama embed failed with status ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const vectors = data && data.embeddings;
  if (!Array.isArray(vectors) || vectors.length !== texts.length) {
    throw new EmbeddingProviderError('Ollama embed returned an unexpected payload');
  }
  return vectors;
}

async function embedViaOpenAI(texts) {
  if (!process.env.OPENAI_API_KEY) {
    throw new EmbeddingProviderError('OPENAI_API_KEY is not configured');
  }
  const res = await withRetries(
    () => fetchWithTimeout(
      'https://api.openai.com/v1/embeddings',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: OPENAI_EMBED_MODEL, input: texts }),
      },
      EMBED_TIMEOUT_MS
    ),
    EMBED_RETRIES,
    { label: 'openai-embed' }
  );
  if (!res.ok) {
    const err = new EmbeddingProviderError(`OpenAI embed failed with status ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  if (!data || !Array.isArray(data.data) || data.data.length !== texts.length) {
    throw new EmbeddingProviderError('OpenAI embed returned an unexpected payload');
  }
  return data.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/**
 * Embed an array of texts. Returns { vectors: number[][], model, provider }.
 * Throws EmbeddingProviderError on failure.
 */
async function embedTexts(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new EmbeddingProviderError('No text provided for embedding');
  }
  const capped = texts.map((t) => (t && t.length > MAX_INPUT_CHARS ? t.slice(0, MAX_INPUT_CHARS) : t));
  if (EMBED_PROVIDER === 'ollama') {
    const vectors = await embedViaOllama(capped);
    return { vectors, model: OLLAMA_EMBED_MODEL, provider: 'ollama' };
  }
  if (EMBED_PROVIDER === 'openai') {
    const vectors = await embedViaOpenAI(capped);
    return { vectors, model: OPENAI_EMBED_MODEL, provider: 'openai' };
  }
  throw new EmbeddingProviderError('No embedding provider configured (EMBED_PROVIDER=none)');
}

module.exports = { embedTexts, getEmbedConfig, EmbeddingProviderError };
