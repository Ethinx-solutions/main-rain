/**
 * Text chunking for the AI Second Brain.
 *
 * Strategy: paragraph-aware packing into target-size chunks with a small
 * word-aligned overlap, then a hard cap on chunks per document so a single
 * oversized upload cannot blow the embedding budget (cost control).
 */

const DEFAULT_TARGET_CHARS = 800;
const DEFAULT_OVERLAP_CHARS = 150;
const DEFAULT_MAX_CHUNKS = 400;

function normalizeText(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function lastWords(text, maxChars) {
  if (text.length <= maxChars) return text;
  const slice = text.slice(-maxChars);
  const spaceIdx = slice.indexOf(' ');
  return spaceIdx > 0 ? slice.slice(spaceIdx + 1) : slice;
}

/**
 * @param {string} raw input text
 * @param {object} opts { targetChars, overlapChars, maxChunks }
 * @returns {{ chunks: string[], truncated: boolean, totalChars: number }}
 */
function chunkText(raw, opts = {}) {
  const targetChars = Math.max(200, parseInt(opts.targetChars || DEFAULT_TARGET_CHARS, 10));
  const overlapChars = Math.max(0, Math.min(parseInt(opts.overlapChars || DEFAULT_OVERLAP_CHARS, 10), targetChars - 50));
  const maxChunks = Math.max(1, parseInt(opts.maxChunks || DEFAULT_MAX_CHUNKS, 10));

  const text = normalizeText(raw);
  if (!text) return { chunks: [], truncated: false, totalChars: 0 };

  const chunks = [];
  let truncated = false;

  const paragraphs = text.split(/\n{2,}/);
  let current = '';

  const flush = () => {
    if (!current.trim()) return;
    if (chunks.length >= maxChunks) {
      truncated = true;
      current = '';
      return;
    }
    chunks.push(current.trim());
    // Start the next chunk with a small overlap from the tail of this one.
    current = overlapChars > 0 ? lastWords(current, overlapChars) : '';
  };

  const pushLongParagraph = (para) => {
    // Split very long paragraphs on sentence-ish boundaries, then words.
    let rest = para;
    while (rest.length > 0) {
      if (chunks.length >= maxChunks) { truncated = true; break; }
      if (current.length + rest.length <= targetChars) {
        current += (current ? '\n' : '') + rest;
        rest = '';
        break;
      }
      const room = targetChars - current.length - (current ? 1 : 0);
      if (room <= 0) { flush(); continue; }
      let head = rest.slice(0, room);
      const lastStop = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '), head.lastIndexOf('\n'));
      if (lastStop > room * 0.5) head = head.slice(0, lastStop + 1);
      else {
        const lastSpace = head.lastIndexOf(' ');
        if (lastSpace > room * 0.5) head = head.slice(0, lastSpace);
      }
      current += (current ? '\n' : '') + head.trim();
      rest = rest.slice(head.length).trim();
      flush();
    }
  };

  for (const para of paragraphs) {
    if (truncated) break;
    const p = para.trim();
    if (!p) continue;
    if (p.length > targetChars) {
      // Flush what we have, then hard-split this paragraph.
      flush();
      pushLongParagraph(p);
    } else if (current.length + p.length + 1 <= targetChars) {
      current += (current ? '\n\n' : '') + p;
    } else {
      flush();
      if (!truncated) current += (current ? '\n\n' : '') + p;
    }
  }
  flush();

  return {
    chunks: chunks.filter((c) => c && c.trim().length > 0),
    truncated,
    totalChars: text.length,
  };
}

module.exports = { chunkText, normalizeText };
