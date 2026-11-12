/**
 * Shared test helpers.
 *
 * Environment contract for tests (all set here, before app code loads):
 *   - dedicated test Mongo database (TEST_MONGODB_URI or sb-test-mongo)
 *   - local SMTP capture server on port 2525 (no external email is sent)
 *   - Ollama for embeddings + LLM (local, free) unless TEST_MOCK_AI=1
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'sb-test-jwt-secret-0123456789abcdef0123456789abcdef';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27020/sb_test';
process.env.MAIL_PROVIDER = 'smtp';
process.env.EMAIL_HOST = '127.0.0.1';
process.env.EMAIL_PORT = '2525';
// No EMAIL_USER/PASS on purpose: exercises the no-auth SMTP path.
process.env.MAIL_FROM = 'Second Brain <secondbrain@facelessforge.ethinx.solutions>';
process.env.CLIENT_URL = 'http://localhost:3050';
process.env.OLLAMA_URL = process.env.TEST_OLLAMA_URL || 'http://127.0.0.1:11434';
if (process.env.TEST_MOCK_AI === '1') {
  process.env.EMBED_PROVIDER = 'none';
  process.env.LLM_PROVIDER = 'none';
}

const request = require('supertest');
const { SMTPServer } = require('smtp-server');
const { app, connectDatabase } = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');

/* ----------------------------- SMTP capture ----------------------------- */

let smtpCapture = null;

function startSmtpCapture(port = 2525) {
  if (smtpCapture) return smtpCapture;
  const messages = [];
  const server = new SMTPServer({
    authOptional: true,
    disabledCommands: ['STARTTLS'],
    onData(stream, session, callback) {
      let raw = '';
      stream.on('data', (chunk) => { raw += chunk.toString('utf8'); });
      stream.on('end', () => {
        messages.push({ raw, receivedAt: new Date() });
        callback();
      });
      stream.on('error', () => callback());
    },
    onRcptTo(address, session, callback) { callback(); },
  });
  server.listen(port, '127.0.0.1');
  smtpCapture = {
    server,
    messages,
    clear() { messages.length = 0; },
    /** Wait (max 10s) until a message arrives whose raw body matches the regex. */
    waitFor(pattern, timeoutMs = 10000) {
      const found = messages.find((m) => pattern.test(m.raw));
      if (found) return Promise.resolve(found);
      const started = Date.now();
      return new Promise((resolve, reject) => {
        const poll = () => {
          const msg = messages.find((m) => pattern.test(m.raw));
          if (msg) return resolve(msg);
          if (Date.now() - started > timeoutMs) {
            return reject(new Error(`Timed out waiting for email matching ${pattern} (${messages.length} captured)`));
          }
          setTimeout(poll, 100);
        };
        poll();
      });
    },
  };
  return smtpCapture;
}

/** Extract a 64-hex token from a captured email (verification or reset link).
 * Nodemailer quoted-printable encodes '=' as =3D and wraps lines with =CRLF;
 * normalize both before matching. */
function extractToken(rawEmail) {
  const normalized = String(rawEmail)
    .replace(/=\r?\n/g, '') // soft line breaks
    .replace(/=3D/gi, '='); // quoted-printable '='
  const match = /token=([a-f0-9]{64})/.exec(normalized);
  return match ? match[1] : null;
}

/* ------------------------------ user helpers ----------------------------- */

let userSeq = 0;

async function createUser({ name, email, password } = {}) {
  userSeq += 1;
  const suffix = `${Date.now()}-${userSeq}`;
  const payload = {
    name: name || `Test User ${suffix}`,
    email: email || `user-${suffix}@example.invalid`,
    password: password || 'TestPass123!',
  };
  const res = await request(app).post('/api/auth/register').send(payload);
  if (res.status !== 201) throw new Error(`Registration failed: ${JSON.stringify(res.body)}`);

  // Capture the verification email and confirm the address (full code path).
  const msg = await startSmtpCapture().waitFor(new RegExp(`${payload.email.replace(/[.\\]/g, '\\$&')}`));
  const token = extractToken(msg.raw);
  if (!token) throw new Error('Verification email did not contain a token');
  const verifyRes = await request(app).post('/api/auth/verify-email').send({ token });
  if (verifyRes.status !== 200) throw new Error(`Verification failed: ${JSON.stringify(verifyRes.body)}`);

  const loginRes = await request(app).post('/api/auth/login').send({ email: payload.email, password: payload.password });
  if (loginRes.status !== 200) throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);

  return { ...payload, token: loginRes.body.token, id: loginRes.body.user.id };
}

/** Register only (no verification) - for unverified-account tests. */
async function createUnverifiedUser() {
  userSeq += 1;
  const payload = {
    name: `Unverified ${userSeq}`,
    email: `unverified-${Date.now()}-${userSeq}@example.invalid`,
    password: 'TestPass123!',
  };
  const res = await request(app).post('/api/auth/register').send(payload);
  if (res.status !== 201) throw new Error(`Registration failed: ${JSON.stringify(res.body)}`);
  return payload;
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

/* ------------------------------- lifecycle ------------------------------- */

async function setupTestDb() {
  startSmtpCapture(); // must be listening before any registration
  await connectDatabase();
  const db = mongoose.connection.db;
  // Drop ONLY this test database (fresh database name per run is safer, but
  // the sb_test* name is exclusively ours - never a production DB).
  const name = mongoose.connection.name;
  if (!name.startsWith('sb_test')) {
    throw new Error(`Refusing to run tests against non-test database: ${name}`);
  }
  await db.dropDatabase();
}

async function teardownTestDb() {
  if (smtpCapture) {
    smtpCapture.server.close();
    smtpCapture = null;
  }
  await mongoose.connection.close();
}

module.exports = {
  request,
  app,
  connectDatabase,
  User,
  setupTestDb,
  teardownTestDb,
  createUser,
  createUnverifiedUser,
  authHeader,
  startSmtpCapture,
  extractToken,
};
