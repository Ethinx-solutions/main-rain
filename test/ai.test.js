const {
  request, app, setupTestDb, teardownTestDb, createUser, authHeader,
} = require('./helpers');

const AI_ENABLED = process.env.EMBED_PROVIDER !== 'none' && process.env.LLM_PROVIDER !== 'none';

function waitForDocReady(app_, auth, id, timeoutMs = 90000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const poll = async () => {
      const res = await request(app_).get(`/api/documents/${id}`).set(auth);
      if (res.status === 200 && res.body.document && res.body.document.status !== 'processing') {
        return resolve(res.body.document);
      }
      if (Date.now() - started > timeoutMs) return reject(new Error('Document processing timed out'));
      setTimeout(poll, 500);
    };
    poll();
  });
}

describe('AI Second Brain (RAG)', () => {
  let userA;
  let userB;
  const fact = `The Aurora project deadline is March 14, 2027 and the budget is 42,000 dollars. FactCode-${Date.now()}`;

  beforeAll(async () => {
    await setupTestDb();
    userA = await createUser();
    userB = await createUser();
  }, 240000);
  afterAll(teardownTestDb);

  let docId;

  test('ai/status reports provider configuration', async () => {
    const res = await request(app).get('/api/ai/status').set(authHeader(userA.token));
    expect(res.status).toBe(200);
    expect(res.body.embeddings).toBeDefined();
    expect(res.body.llm).toBeDefined();
    expect(res.body.documents).toBeDefined();
  });

  (AI_ENABLED ? test : test.skip)('ingested document becomes retrievable and RAG answers with citations', async () => {
    const content = [
      'Aurora Project Brief',
      '',
      fact,
      '',
      'The Aurora project team consists of four engineers and one designer. Weekly reviews happen on Tuesdays at 10am.',
      'The preferred vendor for cloud infrastructure is Hetzner, and invoices are handled by the finance team in Berlin.',
    ].join('\n');

    const up = await request(app).post('/api/documents')
      .set(authHeader(userA.token))
      .attach('document', Buffer.from(content), 'aurora-brief.txt');
    expect([201, 200]).toContain(up.status);
    docId = up.body.document._id;

    const doc = await waitForDocReady(app, authHeader(userA.token), docId);
    expect(doc.status).toBe('ready');
    expect(doc.chunkCount).toBeGreaterThan(0);

    // Ask a question whose answer only exists in the ingested document
    const query = await request(app).post('/api/ai/query')
      .set(authHeader(userA.token))
      .send({ question: 'When is the Aurora project deadline and what is its budget?' });
    expect(query.status).toBe(200);
    expect(query.body.answer).toBeTruthy();
    expect(typeof query.body.answer).toBe('string');
    expect(query.body.tookMs).toBeGreaterThan(0);

    // Retrieval must find the source and cite it
    expect(query.body.sources.length).toBeGreaterThan(0);
    expect(query.body.sources[0].document).toBe('aurora-brief.txt');
    expect(query.body.sources[0].documentId).toBe(docId);
    expect(query.body.sources[0].score).toBeGreaterThan(0.2);
    const citedRefs = query.body.sources.filter((s) => s.cited);
    expect(citedRefs.length).toBeGreaterThan(0);
    // The answer must reference the citation marker of a real source
    const marker = citedRefs[0].ref;
    expect(query.body.answer).toContain(`[${marker}]`);

    // The unique fact string should appear in the source excerpt
    const factCode = /FactCode-\d+/.exec(content)[0];
    expect(query.body.sources.some((s) => s.excerpt.includes(factCode))).toBe(true);
  }, 240000);

  (AI_ENABLED ? test : test.skip)('another user cannot retrieve user A content (tenant-isolated RAG)', async () => {
    const query = await request(app).post('/api/ai/query')
      .set(authHeader(userB.token))
      .send({ question: 'When is the Aurora project deadline and what is its budget?' });
    expect(query.status).toBe(200);
    expect(query.body.sources).toHaveLength(0);
    expect(query.body.answer.toLowerCase()).toContain('could not find');

    // Direct-ID probing with B's token must 404
    const scoped = await request(app).post('/api/ai/query')
      .set(authHeader(userB.token))
      .send({ question: 'Aurora deadline?', documentId: docId });
    expect(scoped.status).toBe(404);
  }, 240000);

  test('query validation', async () => {
    const empty = await request(app).post('/api/ai/query').set(authHeader(userA.token)).send({ question: '' });
    expect(empty.status).toBe(400);
    const missing = await request(app).post('/api/ai/query').set(authHeader(userA.token)).send({});
    expect(missing.status).toBe(400);
    const unauth = await request(app).post('/api/ai/query').send({ question: 'hi' });
    expect(unauth.status).toBe(401);
  });
});
