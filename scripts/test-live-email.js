/**
 * Live email-provider validation through the real mail service.
 * Sends ONE real verification-style email using the authorised Resend key
 * loaded from ~/ethinx/.env.local. The key value is never printed or logged.
 *
 * Usage: node scripts/test-live-email.js <recipient>
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const recipient = process.argv[2];
if (!recipient) {
  console.error('Usage: node scripts/test-live-email.js <recipient>');
  process.exit(2);
}

// Load the authorised credentials without exposing them.
const envPath = path.join(os.homedir(), 'ethinx', '.env.local');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

if (!process.env.RESEND_API_KEY) {
  console.error('RESEND_API_KEY not found in ~/ethinx/.env.local - cannot test live delivery');
  process.exit(2);
}

const { sendMail, resolveProvider, resolveFrom } = require('../services/mail');

(async () => {
  const provider = resolveProvider();
  console.log(`Provider resolved: ${provider}`);
  console.log(`From identity: ${resolveFrom()}`);
  console.log(`Recipient: ${recipient}`);
  const result = await sendMail({
    to: recipient,
    subject: 'EthinX Second Brain - live delivery check',
    html: '<p>This is a one-off delivery check from the EthinX Second Brain mail service.</p>',
    text: 'Live delivery check from EthinX Second Brain mail service.',
  });
  console.log(JSON.stringify({ sent: result.sent, provider: result.provider, id: result.id || null, error: result.error || null }, null, 2));
  process.exit(result.sent ? 0 : 1);
})();
