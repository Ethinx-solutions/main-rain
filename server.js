const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');
const tasksRoutes = require('./routes/tasks');
const linksRoutes = require('./routes/links');
const dashboardRoutes = require('./routes/dashboard');
const documentsRoutes = require('./routes/documents');
const aiRoutes = require('./routes/ai');

const app = express();

// Behind a reverse proxy (nginx/traefik), trust the proxy chain so rate
// limiting sees the real client IP.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : parseInt(process.env.TRUST_PROXY, 10) || 1);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : [])],
    },
  },
}));

app.use(compression());

// Production safety: refuse to boot with a missing or placeholder JWT secret.
const PLACEHOLDER_SECRETS = new Set([
  'your-super-secret-jwt-key-change-this-in-production',
  'your-super-secret-jwt-key-here',
  'changeme',
]);
function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!secret || PLACEHOLDER_SECRETS.has(secret) || secret.length < 32) {
      throw new Error('Refusing to start: set a strong JWT_SECRET (32+ chars) in production');
    }
    return secret;
  }
  if (!secret || PLACEHOLDER_SECRETS.has(secret)) {
    const fallback = require('crypto').randomBytes(32).toString('hex');
    console.warn('JWT_SECRET missing or placeholder - using an ephemeral development secret (tokens reset on restart)');
    return fallback;
  }
  return secret;
}
const JWT_SECRET = resolveJwtSecret();
process.env.JWT_SECRET = JWT_SECRET;

// Rate limiting: generous API-wide limit, stricter limit for auth endpoints.
// Disabled in test mode so automated suites are deterministic.
const isTest = process.env.NODE_ENV === 'test';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 0 : parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 0 : parseInt(process.env.AUTH_RATE_LIMIT_MAX || '50', 10),
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS: explicit allowlist (comma-separated CLIENT_URL supported).
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000', 'http://localhost:3050', 'http://127.0.0.1:3050');
}
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from React build
app.use(express.static('client/build'));

// Database connection
function connectDatabase(uri) {
  const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/secondbrain';
  return mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: parseInt(process.env.MONGO_TIMEOUT_MS || '10000', 10),
  });
}

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/links', linksRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/ai', aiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'client/build', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ message: 'API server running. Frontend build not found - run "npm run build".' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {},
  });
});

const PORT = process.env.PORT || 5000;

let server;
function start() {
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
  return server;
}

if (require.main === module) {
  connectDatabase()
    .then(() => console.log('MongoDB connected successfully'))
    .catch((err) => console.error('MongoDB connection error:', err.message));
  start();
}

module.exports = { app, connectDatabase, start, server: () => server };
