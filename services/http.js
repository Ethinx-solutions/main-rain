/**
 * Shared HTTP helper with hard timeouts for outbound provider calls.
 * Keeps AI/email integrations from hanging the event loop.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Retry helper: runs `fn` up to 1 + retries times on retryable failures. */
async function withRetries(fn, retries = 1, { label = 'call' } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      const retryable = err.status === undefined || err.status >= 500 || err.name === 'AbortError' || err.code === 'ECONNREFUSED';
      if (attempt < retries && retryable) {
        continue;
      }
      break;
    }
  }
  throw lastError;
}

module.exports = { fetchWithTimeout, withRetries };
