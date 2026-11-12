/**
 * End-to-end verification for EthinX Second Brain.
 *
 * Boots a real backend (fresh isolated Mongo DB + local SMTP capture server)
 * and walks the full user journey:
 *   1  register  2  verify email  3  login  4  note/task/link  5  upload
 *   6  indexed   7  ask          8  AI retrieval  9  citations
 *   10 tenant isolation  11 password reset  12 clean-restart survival
 *
 * Usage: node scripts/e2e-verify.js
 * Exit 0 = all steps GREEN.
 */
const { spawn } = require('child_process');
const crypto = require('crypto');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { SMTPServer } = require('smtp-server');

const BACKEND_PORT = 5051;
const SMTP_PORT = 2526;
const RUN_ID = crypto.randomBytes(4).toString('hex');
const DB_NAME = `sb_e2e_${RUN_ID}`;
const ROOT = path.join(__dirname, '..');

const results = [];
function step(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

/* ------------------------------ SMTP capture ----------------------------- */
const mails = [];
const smtpServer = new SMTPServer({
  authOptional: true,
  disabledCommands: ['STARTTLS'],
  onData(stream, session, cb) {
    let raw = '';
    stream.on('data', (c) => { raw += c.toString('utf8'); });
    stream.on('end', () => { mails.push(raw); cb(); });
  },
});

function waitForMail(pattern, timeoutMs = 15000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      const found = mails.find((m) => pattern.test(m));
      if (found) return resolve(found);
      if (Date.now() - started > timeoutMs) return reject(new Error('no email captured'));
      setTimeout(poll, 150);
    };
    poll();
  });
}

function extractToken(raw) {
  const normalized = String(raw).replace(/=\r?\n/g, '').replace(/=3D/gi, '=');
  const m = /token=([a-f0-9]{64})/.exec(normalized);
  return m ? m[1] : null;
}

/* --------------------------------- HTTP ---------------------------------- */
async function call(method, urlPath, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    headers['Content-Type'] = `multipart/form-data; boundary=${form.boundary}`;
    payload = form.buffer;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port: BACKEND_PORT, method, path: urlPath, headers, timeout: 180000 },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(data); } catch { json = data; }
          resolve({ status: res.statusCode, body: json });
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('request timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

/** Build a multipart/form-data body without extra dependencies. */
function buildForm(filename, contentType, buffer) {
  const boundary = `----sb${crypto.randomBytes(8).toString('hex')}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return { boundary, buffer: Buffer.concat([head, buffer, tail]) };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForIndexed(token, docId, timeoutMs = 90000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const res = await call('GET', `/api/documents/${docId}`, { token });
    if (res.status === 200 && res.body.document && res.body.document.status !== 'processing') {
      return res.body.document;
    }
    await sleep(500);
  }
  throw new Error('document indexing timed out');
}

/* ----------------------------- process control ---------------------------- */
let backend = null;

function startBackend() {
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(BACKEND_PORT),
    MONGODB_URI: `mongodb://127.0.0.1:27020/${DB_NAME}`,
    JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    MAIL_PROVIDER: 'smtp',
    EMAIL_HOST: '127.0.0.1',
    EMAIL_PORT: String(SMTP_PORT),
    MAIL_FROM: 'Second Brain <secondbrain@facelessforge.ethinx.solutions>',
    CLIENT_URL: 'http://localhost:3050',
    EMBED_PROVIDER: 'ollama',
    LLM_PROVIDER: 'ollama',
    OLLAMA_URL: process.env.TEST_OLLAMA_URL || 'http://127.0.0.1:11434',
    RATE_LIMIT_MAX: '100000',
    AUTH_RATE_LIMIT_MAX: '100000',
  };
  backend = spawn('node', ['server.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  backend.stdout.on('data', (d) => process.stdout.write(`[backend] ${d}`));
  backend.stderr.on('data', (d) => process.stderr.write(`[backend:err] ${d}`));
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = async () => {
      try {
        const res = await call('GET', '/api/health');
        if (res.status === 200) return resolve();
      } catch { /* not up yet */ }
      if (Date.now() - started > 30000) return reject(new Error('backend did not start'));
      setTimeout(poll, 400);
    };
    poll();
  });
}

function stopBackend() {
  return new Promise((resolve) => {
    if (!backend) return resolve();
    backend.on('exit', resolve);
    backend.kill('SIGTERM');
    setTimeout(resolve, 5000);
  });
}

function exec(command, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(command, args, { stdio: 'inherit' });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))));
  });
}

/* ---------------------------------- run ----------------------------------- */
(async () => {
  const fact = `The Aurora project deadline is March 14, 2027 and the budget is 42,000 dollars.`;
  const marker = `E2E-${RUN_ID}`;
  const docText = [
    'Aurora Project Brief',
    '',
    `${fact} FactCode-${RUN_ID}`,
    '',
    'The Aurora project team consists of four engineers and one designer. Weekly reviews happen on Tuesdays at 10am.',
    'The preferred cloud vendor is Hetzner and finance is handled in Berlin. Parking permits cost 90 dollars per year.',
  ].join('\n');

  const passwordA = `PassA-${crypto.randomBytes(4).toString('hex')}!`;
  const emailA = `e2e-a-${RUN_ID}@example.invalid`;
  const emailB = `e2e-b-${RUN_ID}@example.invalid`;

  smtpServer.listen(SMTP_PORT, '127.0.0.1');
  await startBackend();
  console.log(`Backend up on :${BACKEND_PORT}, db ${DB_NAME}\n`);

  // 1. Register
  const reg = await call('POST', '/api/auth/register', { body: { name: 'E2E User A', email: emailA, password: passwordA } });
  step('1. User registers', reg.status === 201 && reg.body.emailSent === true && reg.body.requiresVerification === true,
    `status ${reg.status}, emailSent=${reg.body.emailSent}`);

  // 2. Verify email
  const mailA = await waitForMail(new RegExp(emailA.replace(/[.\\]/g, '\\$&')));
  const verifyToken = extractToken(mailA);
  const verify = await call('POST', '/api/auth/verify-email', { body: { token: verifyToken } });
  step('2. User verifies email (real email generated + captured)', verify.status === 200 && verify.body.user && verify.body.user.isVerified === true);

  // 3. Login
  const login = await call('POST', '/api/auth/login', { body: { email: emailA, password: passwordA } });
  const tokenA = login.body && login.body.token;
  step('3. User logs in (JWT session)', login.status === 200 && Boolean(tokenA));
  const me = await call('GET', '/api/auth/me', { token: tokenA });
  step('3b. Session resolves /auth/me', me.status === 200 && me.body.user.email === emailA);

  // 4. Create note, task, link
  const note = await call('POST', '/api/notes', { token: tokenA, body: { title: `E2E note ${marker}`, content: `${fact} Marker ${marker}`, tags: ['e2e'] } });
  const task = await call('POST', '/api/tasks', { token: tokenA, body: { title: `E2E task ${marker}`, description: 'do the thing', priority: 'high' } });
  const link = await call('POST', '/api/links', { token: tokenA, body: { title: `E2E link ${marker}`, url: 'https://example.invalid/e2e' } });
  step('4. User creates note + task + link',
    note.status === 201 && task.status === 201 && link.status === 201,
    `note ${note.status}, task ${task.status}, link ${link.status}`);
  const noteId = note.body && note.body._id;

  // 5. Upload document
  const form = buildForm('aurora-brief.txt', 'text/plain', Buffer.from(docText, 'utf8'));
  const upload = await call('POST', '/api/documents', { token: tokenA, form });
  const docId = upload.body && upload.body.document && upload.body.document._id;
  step('5. User uploads a document', upload.status === 201 && Boolean(docId), `status ${upload.status}`);

  // 6. Indexed
  const doc = await waitForIndexed(tokenA, docId);
  step('6. Document is indexed (chunked + embedded)', doc.status === 'ready' && doc.chunkCount > 0,
    `chunks=${doc.chunkCount}, model=${doc.embeddingModel}`);

  // 7 + 8 + 9. Ask, retrieve, cite
  const query = await call('POST', '/api/ai/query', { token: tokenA, body: { question: 'When is the Aurora project deadline and what is its budget?' } });
  const answer = (query.body && query.body.answer) || '';
  const sources = (query.body && query.body.sources) || [];
  step('7. User asks a question', query.status === 200, `tookMs=${query.body && query.body.tookMs}`);
  step('8. AI retrieves relevant information', sources.length > 0 && sources[0].document === 'aurora-brief.txt',
    `top source: ${sources[0] && sources[0].document} (score ${sources[0] && sources[0].score})`);
  const cited = sources.filter((s) => s.cited);
  const citationInAnswer = cited.some((s) => answer.includes(`[${s.ref}]`));
  step('9. AI answers with source citations', citationInAnswer,
    `answer excerpt: "${answer.slice(0, 90)}..."`);

  // 10. Tenant isolation
  const passwordB = `PassB-${crypto.randomBytes(4).toString('hex')}!`;
  const regB = await call('POST', '/api/auth/register', { body: { name: 'E2E User B', email: emailB, password: passwordB } });
  const mailB = await waitForMail(new RegExp(emailB.replace(/[.\\]/g, '\\$&')));
  await call('POST', '/api/auth/verify-email', { body: { token: extractToken(mailB) } });
  const loginB = await call('POST', '/api/auth/login', { body: { email: emailB, password: passwordB } });
  step('10. setup user B', loginB.status === 200, `status ${loginB.status}`);
  const tokenB = loginB.body && loginB.body.token;

  const bReadA = await call('GET', `/api/notes/${noteId}`, { token: tokenB });
  const bListDocs = await call('GET', '/api/documents', { token: tokenB });
  const bQuery = await call('POST', '/api/ai/query', { token: tokenB, body: { question: 'When is the Aurora project deadline and what is its budget?' } });
  const bDelete = await call('DELETE', `/api/documents/${docId}`, { token: tokenB });
  step('10b. Another user cannot access or retrieve the first user\'s data',
    bReadA.status === 404
    && bListDocs.status === 200 && bListDocs.body.total === 0
    && bQuery.status === 200 && bQuery.body.sources.length === 0
    && bDelete.status === 404,
    `direct note read ${bReadA.status}, docs total ${bListDocs.body && bListDocs.body.total}, AI sources ${(bQuery.body && bQuery.body.sources || []).length}`);

  // 11. Password reset
  const newPassword = `NewPass-${crypto.randomBytes(4).toString('hex')}!`;
  const forgot = await call('POST', '/api/auth/forgot-password', { body: { email: emailA } });
  const resetMail = await waitForMail(/Password Reset - Second Brain/);
  const resetToken = extractToken(resetMail);
  const reset = await call('POST', '/api/auth/reset-password', { body: { token: resetToken, password: newPassword } });
  const oldLogin = await call('POST', '/api/auth/login', { body: { email: emailA, password: passwordA } });
  const newLogin = await call('POST', '/api/auth/login', { body: { email: emailA, password: newPassword } });
  step('11. Password reset works', forgot.status === 200 && reset.status === 200 && oldLogin.status === 400 && newLogin.status === 200,
    `old login ${oldLogin.status}, new login ${newLogin.status}`);
  const tokenA2 = newLogin.body && newLogin.body.token;

  // 12. Clean restart survival: stop backend, restart mongo container, restart backend
  await stopBackend();
  await exec('docker', ['restart', 'sb-test-mongo']);
  await sleep(3000);
  await startBackend();
  const loginAfter = await call('POST', '/api/auth/login', { body: { email: emailA, password: newPassword } });
  const tokenAfter = loginAfter.body && loginAfter.body.token;
  const noteAfter = await call('GET', `/api/notes/${noteId}`, { token: tokenAfter });
  const queryAfter = await call('POST', '/api/ai/query', { token: tokenAfter, body: { question: 'What is the Aurora budget?' } });
  const docsAfter = await call('GET', '/api/documents', { token: tokenAfter });
  step('12. Application survives a clean restart (backend + database)',
    loginAfter.status === 200
    && noteAfter.status === 200
    && docsAfter.status === 200 && docsAfter.body.total >= 1
    && queryAfter.status === 200 && (queryAfter.body.sources || []).length > 0,
    `login ${loginAfter.status}, note ${noteAfter.status}, docs ${docsAfter.body && docsAfter.body.total}, AI sources ${(queryAfter.body && queryAfter.body.sources || []).length}`);

  console.log('\n============================== SUMMARY ==============================');
  const failed = results.filter((r) => !r.ok);
  results.forEach((r) => console.log(`${r.ok ? ' ✓' : ' ✗'} ${r.name}`));
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  await stopBackend();
  smtpServer.close();
  if (fs.existsSync('/tmp/cra-dev.log')) {
    console.log('Frontend dev server log: /tmp/cra-dev.log (leave running for inspection)');
  }
  process.exit(failed.length === 0 ? 0 : 1);
})().catch(async (err) => {
  console.error('\nE2E FATAL:', err);
  await stopBackend();
  smtpServer.close();
  process.exit(1);
});
