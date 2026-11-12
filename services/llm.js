/**
 * LLM question-answering service (RAG generation step).
 *
 * Providers (LLM_PROVIDER):
 *   - ollama  (default, local + free): OLLAMA_URL, model LLM_MODEL
 *   - openai  (optional, metered):     OPENAI_API_KEY, model OPENAI_LLM_MODEL
 *   - none    : AI answering disabled
 *
 * Cost controls: bounded timeout, bounded retries, capped output.
 */
const { fetchWithTimeout, withRetries } = require('./http');

const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'ollama').toLowerCase();
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen2.5:3b-instruct';
const OPENAI_LLM_MODEL = process.env.OPENAI_LLM_MODEL || 'gpt-5-nano';
const LLM_TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS || '120000', 10);
const LLM_RETRIES = parseInt(process.env.LLM_RETRIES || '1', 10);
const LLM_MAX_OUTPUT_TOKENS = parseInt(process.env.LLM_MAX_OUTPUT_TOKENS || '1024', 10);

class LLMProviderError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LLMProviderError';
  }
}

/** Public description of the configured provider for /api/ai/status. */
function getLLMConfig() {
  const provider = LLM_PROVIDER;
  const model = provider === 'openai' ? OPENAI_LLM_MODEL : provider === 'ollama' ? LLM_MODEL : null;
  const configured =
    provider === 'none' ? false :
    provider === 'openai' ? Boolean(process.env.OPENAI_API_KEY) :
    provider === 'ollama' ? Boolean(OLLAMA_URL) : false;
  return { provider, model, configured };
}

async function chatViaOllama({ system, prompt }) {
  const res = await withRetries(
    () => fetchWithTimeout(
      `${OLLAMA_URL.replace(/\/$/, '')}/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ],
          stream: false,
          options: { temperature: 0.2, num_predict: LLM_MAX_OUTPUT_TOKENS },
        }),
      },
      LLM_TIMEOUT_MS
    ),
    LLM_RETRIES,
    { label: 'ollama-chat' }
  );
  if (!res.ok) {
    const err = new LLMProviderError(`Ollama chat failed with status ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const text = data && data.message && typeof data.message.content === 'string'
    ? data.message.content.trim()
    : '';
  if (!text) throw new LLMProviderError('Ollama chat returned an empty response');
  return text;
}

async function chatViaOpenAI({ system, prompt }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new LLMProviderError('OPENAI_API_KEY is not configured');
  }
  const res = await withRetries(
    () => fetchWithTimeout(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_LLM_MODEL,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ],
          max_completion_tokens: LLM_MAX_OUTPUT_TOKENS,
        }),
      },
      LLM_TIMEOUT_MS
    ),
    LLM_RETRIES,
    { label: 'openai-chat' }
  );
  if (!res.ok) {
    const err = new LLMProviderError(`OpenAI chat failed with status ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const text = data && data.choices && data.choices[0] && data.choices[0].message
    ? (data.choices[0].message.content || '').trim()
    : '';
  if (!text) throw new LLMProviderError('OpenAI chat returned an empty response');
  return text;
}

/**
 * Generate one completion. Returns { text, provider, model }.
 * Throws LLMProviderError on failure.
 */
async function chat({ system, prompt }) {
  if (LLM_PROVIDER === 'ollama') {
    const text = await chatViaOllama({ system, prompt });
    return { text, provider: 'ollama', model: LLM_MODEL };
  }
  if (LLM_PROVIDER === 'openai') {
    const text = await chatViaOpenAI({ system, prompt });
    return { text, provider: 'openai', model: OPENAI_LLM_MODEL };
  }
  throw new LLMProviderError('No LLM provider configured (LLM_PROVIDER=none)');
}

module.exports = { chat, getLLMConfig, LLMProviderError };
