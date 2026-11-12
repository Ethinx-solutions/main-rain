const {
  request, app, setupTestDb, teardownTestDb, createUser, authHeader,
} = require('./helpers');

describe('CRUD: notes, tasks, links + dashboard', () => {
  let userA;
  let userB;
  const marker = `XMARK-${Date.now()}`;

  beforeAll(async () => {
    await setupTestDb();
    userA = await createUser();
    userB = await createUser();
  });
  afterAll(teardownTestDb);

  let noteId;
  let taskId;
  let linkId;

  test('notes: create, read, list, search, update, delete', async () => {
    const create = await request(app).post('/api/notes')
      .set(authHeader(userA.token))
      .send({ title: `Meeting ${marker}`, content: `The test dealership opens at 8:17am. Marker ${marker}`, tags: ['test'], category: 'work' });
    expect(create.status).toBe(201);
    noteId = create.body._id;

    const read = await request(app).get(`/api/notes/${noteId}`).set(authHeader(userA.token));
    expect(read.status).toBe(200);
    expect(read.body.title).toContain(marker);

    const list = await request(app).get('/api/notes').set(authHeader(userA.token));
    expect(list.status).toBe(200);
    expect(list.body.total).toBeGreaterThanOrEqual(1);

    const search = await request(app).get(`/api/notes?search=${marker}`).set(authHeader(userA.token));
    expect(search.status).toBe(200);
    expect(search.body.total).toBe(1);

    const update = await request(app).put(`/api/notes/${noteId}`)
      .set(authHeader(userA.token))
      .send({ title: `Updated ${marker}`, isFavorite: true });
    expect(update.status).toBe(200);
    expect(update.body.isFavorite).toBe(true);

    const del = await request(app).delete(`/api/notes/${noteId}`).set(authHeader(userA.token));
    expect(del.status).toBe(200);
    const gone = await request(app).get(`/api/notes/${noteId}`).set(authHeader(userA.token));
    expect(gone.status).toBe(404);

    // Recreate for isolation tests
    const recreate = await request(app).post('/api/notes')
      .set(authHeader(userA.token))
      .send({ title: `Isolation ${marker}`, content: `Secret fact ${marker}` });
    noteId = recreate.body._id;
  });

  test('tasks: create, read, update status, delete', async () => {
    const create = await request(app).post('/api/tasks')
      .set(authHeader(userA.token))
      .send({ title: `Task ${marker}`, description: `Do the thing ${marker}`, priority: 'high' });
    expect(create.status).toBe(201);
    taskId = create.body._id;

    const read = await request(app).get(`/api/tasks/${taskId}`).set(authHeader(userA.token));
    expect(read.status).toBe(200);
    expect(read.body.priority).toBe('high');

    const update = await request(app).put(`/api/tasks/${taskId}`)
      .set(authHeader(userA.token))
      .send({ title: `Task ${marker} v2`, priority: 'urgent' });
    expect(update.status).toBe(200);
    expect(update.body.priority).toBe('urgent');

    const statusPatch = await request(app).patch(`/api/tasks/${taskId}/status`)
      .set(authHeader(userA.token))
      .send({ status: 'completed' });
    expect(statusPatch.status).toBe(200);

    const del = await request(app).delete(`/api/tasks/${taskId}`).set(authHeader(userA.token));
    expect(del.status).toBe(200);
    const gone = await request(app).get(`/api/tasks/${taskId}`).set(authHeader(userA.token));
    expect(gone.status).toBe(404);

    const recreate = await request(app).post('/api/tasks')
      .set(authHeader(userA.token))
      .send({ title: `Isolation task ${marker}`, description: `Secret task ${marker}` });
    taskId = recreate.body._id;
  });

  test('links: create, read, click, update, delete', async () => {
    const create = await request(app).post('/api/links')
      .set(authHeader(userA.token))
      .send({ title: `Link ${marker}`, url: `https://example.invalid/${marker}`, description: `Ref ${marker}` });
    expect(create.status).toBe(201);
    linkId = create.body._id;
    expect(create.body.metadata.domain).toBe('example.invalid');

    const read = await request(app).get(`/api/links/${linkId}`).set(authHeader(userA.token));
    expect(read.status).toBe(200);

    const click = await request(app).post(`/api/links/${linkId}/click`).set(authHeader(userA.token));
    expect(click.status).toBe(200);

    const update = await request(app).put(`/api/links/${linkId}`)
      .set(authHeader(userA.token))
      .send({ title: `Link ${marker} v2`, isFavorite: true });
    expect(update.status).toBe(200);

    const del = await request(app).delete(`/api/links/${linkId}`).set(authHeader(userA.token));
    expect(del.status).toBe(200);
    const gone = await request(app).get(`/api/links/${linkId}`).set(authHeader(userA.token));
    expect(gone.status).toBe(404);

    const recreate = await request(app).post('/api/links')
      .set(authHeader(userA.token))
      .send({ title: `Isolation link ${marker}`, url: `https://example.invalid/secret-${marker}` });
    linkId = recreate.body._id;
  });

  test('dashboard overview and analytics reflect user A data', async () => {
    const overview = await request(app).get('/api/dashboard/overview').set(authHeader(userA.token));
    expect(overview.status).toBe(200);
    expect(overview.body.summary.totalNotes).toBeGreaterThanOrEqual(1);
    expect(overview.body.summary.totalTasks).toBeGreaterThanOrEqual(1);
    expect(overview.body.summary.totalLinks).toBeGreaterThanOrEqual(1);

    const daily = await request(app).get('/api/dashboard/daily').set(authHeader(userA.token));
    expect(daily.status).toBe(200);

    const weekly = await request(app).get('/api/dashboard/analytics/weekly').set(authHeader(userA.token));
    expect(weekly.status).toBe(200);
  });

  test('tenant isolation: user B sees nothing of user A', async () => {
    const lists = await Promise.all([
      request(app).get('/api/notes').set(authHeader(userB.token)),
      request(app).get('/api/tasks').set(authHeader(userB.token)),
      request(app).get('/api/links').set(authHeader(userB.token)),
    ]);
    lists.forEach((res) => {
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
    });

    const searches = await Promise.all([
      request(app).get(`/api/notes?search=${marker}`).set(authHeader(userB.token)),
      request(app).get(`/api/tasks?search=${marker}`).set(authHeader(userB.token)),
      request(app).get(`/api/links?search=${marker}`).set(authHeader(userB.token)),
    ]);
    searches.forEach((res) => expect(res.body.total).toBe(0));

    const overview = await request(app).get('/api/dashboard/overview').set(authHeader(userB.token));
    expect(overview.body.summary.totalNotes).toBe(0);
    expect(overview.body.summary.totalTasks).toBe(0);
    expect(overview.body.summary.totalLinks).toBe(0);
  });

  test('tenant isolation: direct-ID access across tenants returns 404 and does not mutate', async () => {
    const attempts = [
      request(app).get(`/api/notes/${noteId}`).set(authHeader(userB.token)),
      request(app).put(`/api/notes/${noteId}`).set(authHeader(userB.token)).send({ title: 'hijack' }),
      request(app).delete(`/api/notes/${noteId}`).set(authHeader(userB.token)),
      request(app).get(`/api/tasks/${taskId}`).set(authHeader(userB.token)),
      request(app).patch(`/api/tasks/${taskId}/status`).set(authHeader(userB.token)).send({ status: 'completed' }),
      request(app).delete(`/api/tasks/${taskId}`).set(authHeader(userB.token)),
      request(app).get(`/api/links/${linkId}`).set(authHeader(userB.token)),
      request(app).post(`/api/links/${linkId}/click`).set(authHeader(userB.token)),
      request(app).delete(`/api/links/${linkId}`).set(authHeader(userB.token)),
    ];
    const results = await Promise.all(attempts);
    results.forEach((res, i) => {
      expect([404, 400]).toContain(res.status);
    });

    // User A fixtures untouched by user B attempts
    const [note, task, link] = await Promise.all([
      request(app).get(`/api/notes/${noteId}`).set(authHeader(userA.token)),
      request(app).get(`/api/tasks/${taskId}`).set(authHeader(userA.token)),
      request(app).get(`/api/links/${linkId}`).set(authHeader(userA.token)),
    ]);
    expect(note.status).toBe(200);
    expect(task.status).toBe(200);
    expect(link.status).toBe(200);

    // Cleanup
    await Promise.all([
      request(app).delete(`/api/notes/${noteId}`).set(authHeader(userA.token)),
      request(app).delete(`/api/tasks/${taskId}`).set(authHeader(userA.token)),
      request(app).delete(`/api/links/${linkId}`).set(authHeader(userA.token)),
    ]);
  });

  test('unauthenticated CRUD access is rejected', async () => {
    const res = await request(app).get('/api/notes');
    expect(res.status).toBe(401);
  });
});
