const {
  request, app, setupTestDb, teardownTestDb, createUser, createUnverifiedUser,
  authHeader, startSmtpCapture, extractToken, User,
} = require('./helpers');

describe('Authentication & session handling', () => {
  beforeAll(setupTestDb);
  afterAll(teardownTestDb);

  test('health endpoint responds', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.mongo).toBe('connected');
  });

  test('registration creates an unverified account and sends a real verification email', async () => {
    startSmtpCapture().clear();
    const payload = { name: 'Registrar', email: `registrar-${Date.now()}@example.invalid`, password: 'SecretPass1' };
    const res = await request(app).post('/api/auth/register').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.requiresVerification).toBe(true);
    expect(res.body.emailSent).toBe(true);
    expect(res.body.user.isVerified).toBe(false);
    // Registration must NOT hand out a session token before verification.
    expect(res.body.token).toBeUndefined();

    const user = await User.findOne({ email: payload.email });
    expect(user.isVerified).toBe(false);
    // Token must be stored hashed (64 hex), never in plaintext.
    expect(user.verificationToken).toMatch(/^[a-f0-9]{64}$/);
    expect(user.verificationTokenExpires).toBeTruthy();

    const msg = await startSmtpCapture().waitFor(new RegExp(payload.email.replace(/[.\\]/g, '\\$&')));
    expect(msg.raw).toContain('Subject: Verify Your Email - Second Brain');
    expect(extractToken(msg.raw)).toBeTruthy();
  });

  test('unverified user cannot log in', async () => {
    const payload = await createUnverifiedUser();
    const res = await request(app).post('/api/auth/login').send({ email: payload.email, password: payload.password });
    expect(res.status).toBe(403);
    expect(res.body.requiresVerification).toBe(true);
    expect(res.body.token).toBeUndefined();
  });

  test('verify-email confirms the account; then login issues a JWT session', async () => {
    startSmtpCapture().clear();
    const payload = await createUnverifiedUser();
    const msg = await startSmtpCapture().waitFor(new RegExp(payload.email.replace(/[.\\]/g, '\\$&')));
    const token = extractToken(msg.raw);

    const verify = await request(app).post('/api/auth/verify-email').send({ token });
    expect(verify.status).toBe(200);
    expect(verify.body.user.isVerified).toBe(true);

    const dbUser = await User.findOne({ email: payload.email });
    expect(dbUser.isVerified).toBe(true);
    expect(dbUser.verificationToken).toBeUndefined(); // cleared after use

    const login = await request(app).post('/api/auth/login').send({ email: payload.email, password: payload.password });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeDefined();
    expect(login.body.user.isVerified).toBe(true);

    // Session works on /auth/me
    const me = await request(app).get('/api/auth/me').set(authHeader(login.body.token));
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(payload.email);
  });

  test('verify-email rejects invalid and already-used tokens', async () => {
    const res = await request(app).post('/api/auth/verify-email').send({ token: 'f'.repeat(64) });
    expect(res.status).toBe(400);

    // Reuse of the same token from the previous flow must fail
    const payload = await createUnverifiedUser();
    const msg = await startSmtpCapture().waitFor(new RegExp(payload.email.replace(/[.\\]/g, '\\$&')));
    const token = extractToken(msg.raw);
    await request(app).post('/api/auth/verify-email').send({ token });
    const reuse = await request(app).post('/api/auth/verify-email').send({ token });
    expect(reuse.status).toBe(400);
  });

  test('expired verification token is rejected', async () => {
    const payload = await createUnverifiedUser();
    const user = await User.findOne({ email: payload.email });
    user.verificationTokenExpires = new Date(Date.now() - 1000);
    await user.save();
    const rawToken = await startSmtpCapture().waitFor(new RegExp(payload.email.replace(/[.\\]/g, '\\$&')));
    const token = extractToken(rawToken.raw);
    const res = await request(app).post('/api/auth/verify-email').send({ token });
    expect(res.status).toBe(400);
    expect(res.body.expired).toBe(true);
  });

  test('resend-verification issues a fresh working token and never enumerates accounts', async () => {
    const payload = await createUnverifiedUser();
    // Consume the registration email, then isolate the resend email
    await startSmtpCapture().waitFor(new RegExp(payload.email.replace(/[.\\]/g, '\\$&')));
    startSmtpCapture().clear();

    // Existing unverified account: generic 200 + working email
    const res = await request(app).post('/api/auth/resend-verification').send({ email: payload.email });
    expect(res.status).toBe(200);
    expect(res.body.emailSent).toBe(true);
    const msg = await startSmtpCapture().waitFor(new RegExp(payload.email.replace(/[.\\]/g, '\\$&')));
    const token = extractToken(msg.raw);
    const verify = await request(app).post('/api/auth/verify-email').send({ token });
    expect(verify.status).toBe(200);

    // Unknown account: same generic 200, no email, no leak
    startSmtpCapture().clear();
    const unknown = await request(app).post('/api/auth/resend-verification').send({ email: 'ghost@example.invalid' });
    expect(unknown.status).toBe(200);
    expect(unknown.body.message).toBe(res.body.message);
    // Verified account: same generic 200, no email
    const verifiedAgain = await request(app).post('/api/auth/resend-verification').send({ email: payload.email });
    expect(verifiedAgain.status).toBe(200);
    expect(startSmtpCapture().messages.length).toBe(0);
  });

  test('password reset: full flow via captured email', async () => {
    const user = await createUser();
    startSmtpCapture().clear(); // drop the registration email; isolate reset mail
    const oldPassword = user.password;
    const newPassword = 'NewSecretPass9';

    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: user.email });
    expect(forgot.status).toBe(200);
    expect(forgot.body.emailSent).toBe(true);

    const msg = await startSmtpCapture().waitFor(new RegExp(user.email.replace(/[.\\]/g, '\\$&')));
    expect(msg.raw).toContain('Subject: Password Reset - Second Brain');
    const resetToken = extractToken(msg.raw);
    expect(resetToken).toBeTruthy();

    const reset = await request(app).post('/api/auth/reset-password').send({ token: resetToken, password: newPassword });
    expect(reset.status).toBe(200);

    // Old password no longer works, new one does
    const oldLogin = await request(app).post('/api/auth/login').send({ email: user.email, password: oldPassword });
    expect(oldLogin.status).toBe(400);
    const newLogin = await request(app).post('/api/auth/login').send({ email: user.email, password: newPassword });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.token).toBeDefined();

    // Token cannot be reused
    const reuse = await request(app).post('/api/auth/reset-password').send({ token: resetToken, password: 'Another1' });
    expect(reuse.status).toBe(400);
  });

  test('forgot-password never reveals whether an account exists', async () => {
    const known = await request(app).post('/api/auth/forgot-password').send({ email: (await createUser()).email });
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: `ghost-${Date.now()}@example.invalid` });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body.message).toBe(unknown.body.message);
  });

  test('weak passwords and duplicate emails are rejected', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Weak', email: `weak-${Date.now()}@example.invalid`, password: '123' });
    expect(res.status).toBe(400);

    const existing = await createUser();
    const dup = await request(app).post('/api/auth/register').send({ name: 'Dup', email: existing.email, password: 'ValidPass1' });
    expect(dup.status).toBe(400);
    expect(dup.body.token).toBeUndefined();
  });

  test('login with wrong password fails without leaking account state', async () => {
    const user = await createUser();
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'WrongPassword1' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid credentials');
  });

  test('auth/me rejects missing, malformed and bogus tokens', async () => {
    const noToken = await request(app).get('/api/auth/me');
    expect(noToken.status).toBe(401);
    const badToken = await request(app).get('/api/auth/me').set({ Authorization: 'Bearer not.a.jwt' });
    expect(badToken.status).toBe(401);
  });

  test('preferences update requires auth and persists', async () => {
    const user = await createUser();
    const res = await request(app).put('/api/auth/preferences')
      .set(authHeader(user.token))
      .send({ theme: 'dark', dailyGoal: 5 });
    expect(res.status).toBe(200);
    expect(res.body.preferences.theme).toBe('dark');
    expect(res.body.preferences.dailyGoal).toBe(5);

    const noAuth = await request(app).put('/api/auth/preferences').send({ theme: 'light' });
    expect(noAuth.status).toBe(401);
  });
});
