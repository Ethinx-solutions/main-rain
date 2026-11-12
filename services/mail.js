/**
 * Email delivery service.
 *
 * Provider resolution order (unless MAIL_PROVIDER pins it):
 *   1. Resend HTTP API   (RESEND_API_KEY)        - uses the EthinX verified domain
 *   2. SMTP via nodemailer (EMAIL_HOST [+ auth])  - self-hosted/authorised relay
 *   3. none                                      - delivery disabled
 *
 * Security rules:
 *   - Credentials are never logged, returned in responses, or included in errors.
 *   - Failure is always a structured result; callers decide how to proceed.
 *     (No account is auto-verified or auto-reset by this module.)
 */
const nodemailer = require('nodemailer');
const { fetchWithTimeout } = require('./http');

const RESEND_API_URL = process.env.RESEND_API_URL || 'https://api.resend.com/emails';
const MAIL_TIMEOUT_MS = parseInt(process.env.MAIL_TIMEOUT_MS || '15000', 10);

/** Fallback sender identity: must be on a domain verified with the mail provider. */
const DEFAULT_MAIL_FROM = process.env.DEFAULT_MAIL_FROM || 'Second Brain <secondbrain@facelessforge.ethinx.solutions>';

function resolveProvider() {
  const explicit = (process.env.MAIL_PROVIDER || 'auto').toLowerCase();
  if (explicit === 'none') return null;
  if (explicit === 'resend') {
    return process.env.RESEND_API_KEY ? 'resend' : null;
  }
  if (explicit === 'smtp') {
    return process.env.EMAIL_HOST ? 'smtp' : null;
  }
  // auto
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.EMAIL_HOST) return 'smtp';
  return null;
}

function resolveFrom() {
  return process.env.MAIL_FROM || DEFAULT_MAIL_FROM;
}

async function sendViaResend({ to, subject, html, text }) {
  const response = await fetchWithTimeout(
    RESEND_API_URL,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: resolveFrom(), to: [to], subject, html, text }),
    },
    MAIL_TIMEOUT_MS
  );
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const err = new Error(`Mail provider error (resend, status ${response.status})`);
    err.provider = 'resend';
    err.status = response.status;
    err.detail = body.slice(0, 200);
    throw err;
  }
  const data = await response.json().catch(() => ({}));
  return { provider: 'resend', id: data.id || null };
}

async function sendViaSmtp({ to, subject, html, text }) {
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const transportOptions = {
    host: process.env.EMAIL_HOST,
    port,
    secure: port === 465,
    connectionTimeout: MAIL_TIMEOUT_MS,
    greetingTimeout: MAIL_TIMEOUT_MS,
    socketTimeout: MAIL_TIMEOUT_MS,
    tls: { rejectUnauthorized: process.env.MAIL_TLS_REJECT_UNAUTHORIZED !== 'false' },
  };
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transportOptions.auth = { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS };
  }
  const transporter = nodemailer.createTransport(transportOptions);
  const info = await transporter.sendMail({ from: resolveFrom(), to, subject, html, text });
  return { provider: 'smtp', id: info && info.messageId ? info.messageId : null };
}

/**
 * Send one email. Returns a structured result and never throws:
 *   { sent: boolean, provider: 'resend'|'smtp'|null, id?: string, error?: string }
 */
async function sendMail({ to, subject, html, text }) {
  const provider = resolveProvider();
  if (!provider) {
    return { sent: false, provider: null, error: 'No email provider configured' };
  }
  try {
    const result = provider === 'resend'
      ? await sendViaResend({ to, subject, html, text })
      : await sendViaSmtp({ to, subject, html, text });
    return { sent: true, provider: result.provider, id: result.id };
  } catch (err) {
    // Log a minimal, credential-free line only.
    console.error(`Email delivery failed via ${provider}: ${err.message}`);
    return { sent: false, provider, error: err.message };
  }
}

module.exports = { sendMail, resolveProvider, resolveFrom };
