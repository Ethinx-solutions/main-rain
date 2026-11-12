const {
  request, app, setupTestDb, teardownTestDb, createUser, authHeader,
} = require('./helpers');

/** Build a real single-page PDF containing the given text (pdfkit). */
function buildPdf(text) {
  const PDFDocument = require('pdfkit');
  const chunks = [];
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: 'Test document' } });
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  doc.fontSize(12).text(text);
  doc.end();
  return done;
}

async function buildPdfAsync(text) {
  return buildPdf(text);
}

function waitForDocReady(app, auth, id, timeoutMs = 60000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const poll = async () => {
      const res = await request(app).get(`/api/documents/${id}`).set(auth);
      if (res.status === 200 && res.body.document && res.body.document.status !== 'processing') {
        return resolve(res.body.document);
      }
      if (Date.now() - started > timeoutMs) return reject(new Error('Document processing timed out'));
      setTimeout(poll, 300);
    };
    poll();
  });
}

describe('Document ingestion', () => {
  let userA;
  let userB;
  const marker = `DOCFACT-${Date.now()}`;

  beforeAll(async () => {
    await setupTestDb();
    userA = await createUser();
    userB = await createUser();
  });
  afterAll(teardownTestDb);

  let docId;

  test('uploads and indexes a text document', async () => {
    const res = await request(app).post('/api/documents')
      .set(authHeader(userA.token))
      .attach('document', Buffer.from(`Alpha report. ${marker} The warehouse opens at 7:30am daily.\n\nSecond paragraph with logistics details for the ${marker} operation.`), 'alpha.txt');
    expect([201, 200]).toContain(res.status);
    expect(res.body.deduped).toBe(false);
    docId = res.body.document._id;
    expect(['processing', 'ready']).toContain(res.body.document.status);

    const doc = await waitForDocReady(app, authHeader(userA.token), docId);
    expect(doc.status).toBe('ready');
    expect(doc.chunkCount).toBeGreaterThan(0);
    expect(doc.charCount).toBeGreaterThan(0);
    expect(doc.embeddingModel).toBeTruthy();
  });

  test('uploads and indexes a PDF document', async () => {
    const pdf = await buildPdf(`Beta contract. ${marker} Payment terms are net-45 days.`);
    const res = await request(app).post('/api/documents')
      .set(authHeader(userA.token))
      .attach('document', pdf, { filename: 'beta.pdf', contentType: 'application/pdf' });
    expect([201, 200]).toContain(res.status);
    const doc = await waitForDocReady(app, authHeader(userA.token), res.body.document._id);
    expect(doc.status).toBe('ready');
    expect(doc.chunkCount).toBeGreaterThan(0);
  });

  test('duplicate content is deduped', async () => {
    const content = `Duplicate content ${marker} store hours are 9 to 5.`;
    const first = await request(app).post('/api/documents').set(authHeader(userA.token)).attach('document', Buffer.from(content), 'dup1.txt');
    const second = await request(app).post('/api/documents').set(authHeader(userA.token)).attach('document', Buffer.from(content), 'dup2.txt');
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.deduped).toBe(true);
  });

  test('rejects oversized files (413) and unsupported types (400)', async () => {
    const big = Buffer.alloc(11 * 1024 * 1024, 'a');
    const tooBig = await request(app).post('/api/documents')
      .set(authHeader(userA.token))
      .attach('document', big, 'big.txt');
    expect(tooBig.status).toBe(413);

    const badType = await request(app).post('/api/documents')
      .set(authHeader(userA.token))
      .attach('document', Buffer.from('MZ...'), 'virus.exe');
    expect(badType.status).toBe(400);

    const none = await request(app).post('/api/documents').set(authHeader(userA.token));
    expect(none.status).toBe(400);
  });

  test('document list, detail and deletion work for the owner', async () => {
    const list = await request(app).get('/api/documents').set(authHeader(userA.token));
    expect(list.status).toBe(200);
    expect(list.body.total).toBeGreaterThanOrEqual(3);
    expect(list.body.documents[0].sha256).toBeUndefined(); // hash never leaks

    const detail = await request(app).get(`/api/documents/${docId}`).set(authHeader(userA.token));
    expect(detail.status).toBe(200);
    expect(detail.body.document.originalName).toBe('alpha.txt');

    const del = await request(app).delete(`/api/documents/${list.body.documents.find((d) => d.originalName === 'dup1.txt')._id}`)
      .set(authHeader(userA.token));
    expect(del.status).toBe(200);
  });

  test('tenant isolation: user B cannot see, read or delete user A documents', async () => {
    const list = await request(app).get('/api/documents').set(authHeader(userB.token));
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(0);

    const direct = await request(app).get(`/api/documents/${docId}`).set(authHeader(userB.token));
    expect(direct.status).toBe(404);

    const del = await request(app).delete(`/api/documents/${docId}`).set(authHeader(userB.token));
    expect(del.status).toBe(404);

    // User A document is untouched
    const own = await request(app).get(`/api/documents/${docId}`).set(authHeader(userA.token));
    expect(own.status).toBe(200);
  });

  test('documents and AI routes are blocked until the account is verified', async () => {
    // Register but never verify
    const payload = {
      name: 'Doc Unverified',
      email: `docunv-${Date.now()}@example.invalid`,
      password: 'TestPass123!',
    };
    const reg = await request(app).post('/api/auth/register').send(payload);
    expect(reg.status).toBe(201);
    // No JWT is issued at registration; unverified users cannot log in either
    const login = await request(app).post('/api/auth/login').send({ email: payload.email, password: payload.password });
    expect(login.status).toBe(403);

    const upload = await request(app).post('/api/documents').set(authHeader('f'.repeat(40)));
    expect([401, 403]).toContain(upload.status);
  });
});
