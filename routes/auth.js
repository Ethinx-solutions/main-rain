const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendMail, resolveProvider, resolveFrom } = require('../services/mail');

const router = express.Router();

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Tokens are only ever stored as SHA-256 hashes; the raw value lives solely
// inside the emailed link.
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

const newToken = () => crypto.randomBytes(32).toString('hex');

function appUrl() {
  return (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function verificationEmailHtml({ name, url }) {
  return `
    <h2>Welcome to Second Brain${name ? `, ${name}` : ''}!</h2>
    <p>Please confirm your email address by clicking the link below. The link expires in 24 hours.</p>
    <p><a href="${url}" style="background:#007bff;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Verify Email</a></p>
    <p>Or paste this URL into your browser: ${url}</p>
    <p>If you didn't create this account, you can ignore this email.</p>
  `;
}

function resetEmailHtml({ name, url }) {
  return `
    <h2>Password Reset Request</h2>
    <p>Hi${name ? ` ${name}` : ''}, click the link below to choose a new password. The link expires in 1 hour.</p>
    <p><a href="${url}" style="background:#007bff;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Reset Password</a></p>
    <p>Or paste this URL into your browser: ${url}</p>
    <p>If you didn't request this, you can ignore this email and your password will stay unchanged.</p>
  `;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Register: creates an UNVERIFIED account and emails a verification link.
// There is deliberately no fallback that marks the account verified.
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (!EMAIL_REGEX.test(String(email))) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email: String(email).toLowerCase() });
    if (existingUser) {
      // Same response shape for existing/unverified users (no enumeration),
      // but never send a token for an account the caller doesn't control.
      return res.status(400).json({ message: 'User already exists' });
    }

    const verificationToken = newToken();
    const user = new User({
      email: String(email).toLowerCase(),
      password,
      name,
      isVerified: false,
      verificationToken: hashToken(verificationToken),
      verificationTokenExpires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    });
    await user.save();

    const verificationUrl = `${appUrl()}/verify-email?token=${verificationToken}`;
    const mailResult = await sendMail({
      to: user.email,
      subject: 'Verify Your Email - Second Brain',
      html: verificationEmailHtml({ name: user.name, url: verificationUrl }),
      text: `Welcome to Second Brain! Verify your email: ${verificationUrl} (expires in 24 hours)`,
    });

    res.status(201).json({
      message: mailResult.sent
        ? 'Account created. Check your email for the verification link.'
        : 'Account created, but the verification email could not be sent. Please use "Resend verification" once email delivery is configured.',
      requiresVerification: true,
      emailSent: mailResult.sent,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login: blocked until the email address is verified.
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase() });
    const isMatch = user ? await user.comparePassword(password) : false;
    if (!user || !isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Please verify your email address before logging in. Check your inbox for the verification link.',
        requiresVerification: true,
        canResend: true,
      });
    }

    const token = generateToken(user._id);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        isVerified: req.user.isVerified,
        preferences: req.user.preferences,
      },
    });
  } catch (error) {
    console.error('Get user error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const { theme, dailyGoal, notifications } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (theme) user.preferences.theme = theme;
    if (dailyGoal !== undefined) user.preferences.dailyGoal = dailyGoal;
    if (notifications) user.preferences.notifications = { ...user.preferences.notifications, ...notifications };
    await user.save();
    res.json({ message: 'Preferences updated successfully', preferences: user.preferences });
  } catch (error) {
    console.error('Update preferences error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Confirm email address with the token from the verification link
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }
    const user = await User.findOne({ verificationToken: hashToken(token) });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or already used verification token' });
    }
    if (user.verificationTokenExpires && user.verificationTokenExpires.getTime() < Date.now()) {
      return res.status(400).json({
        message: 'Verification token has expired. Please request a new verification email.',
        expired: true,
      });
    }
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();
    res.json({ message: 'Email verified successfully', user: { id: user._id, email: user.email, isVerified: true } });
  } catch (error) {
    console.error('Email verification error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Resend the verification email. Response never reveals whether the email
// belongs to an existing or already-verified account (no enumeration).
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const generic = { message: 'If an unverified account exists for that email, a new verification email has been sent.' };
    if (!email || !EMAIL_REGEX.test(String(email))) {
      return res.json({ ...generic, emailSent: false });
    }
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user || user.isVerified) {
      return res.json({ ...generic, emailSent: false });
    }
    const verificationToken = newToken();
    user.verificationToken = hashToken(verificationToken);
    user.verificationTokenExpires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
    await user.save();

    const verificationUrl = `${appUrl()}/verify-email?token=${verificationToken}`;
    const mailResult = await sendMail({
      to: user.email,
      subject: 'Verify Your Email - Second Brain',
      html: verificationEmailHtml({ name: user.name, url: verificationUrl }),
      text: `Verify your Second Brain account: ${verificationUrl} (expires in 24 hours)`,
    });
    return res.json({ ...generic, emailSent: mailResult.sent });
  } catch (error) {
    console.error('Resend verification error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot password: always the same response (no enumeration).
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const generic = { message: 'If an account exists for that email, a password reset link has been sent.' };
    if (!email || !EMAIL_REGEX.test(String(email))) {
      return res.json({ ...generic, emailSent: false });
    }
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) {
      return res.json({ ...generic, emailSent: false });
    }
    const resetToken = newToken();
    user.resetPasswordToken = hashToken(resetToken);
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const resetUrl = `${appUrl()}/reset-password?token=${resetToken}`;
    const mailResult = await sendMail({
      to: user.email,
      subject: 'Password Reset - Second Brain',
      html: resetEmailHtml({ name: user.name, url: resetUrl }),
      text: `Reset your Second Brain password: ${resetUrl} (expires in 1 hour)`,
    });
    return res.json({ ...generic, emailSent: mailResult.sent });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password with a valid, unexpired token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Reset token is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const user = await User.findOne({
      resetPasswordToken: hashToken(token),
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Diagnostics for operators: which email path is active (no secrets).
router.get('/mail-status', (req, res) => {
  const provider = resolveProvider();
  res.json({ provider: provider || null, from: provider ? resolveFrom() : null });
});

module.exports = router;
