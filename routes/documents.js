const express = require('express');
const multer = require('multer');
const Document = require('../models/Document');
const auth = require('../middleware/auth');
const requireVerified = require('../middleware/requireVerified');
const { ingestDocument, deleteDocument, IngestError, MAX_FILE_BYTES } = require('../services/ingest');

const router = express.Router();

// Reject malformed ObjectIds with 400 instead of an internal CastError 500.
function validObjectId(id) {
  try {
    return Boolean(new (require('mongoose').Types.ObjectId)(String(id)));
  } catch (e) {
    return false;
  }
}

// Upload goes to memory; nothing touches disk before validation.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(txt|md|markdown|csv|json|log|pdf|docx)$/i.test(file.originalname || '');
    if (!ok) {
      const err = new Error('Unsupported file type. Allowed: .txt .md .markdown .csv .json .log .pdf .docx');
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

// List documents for the current tenant
router.get('/', auth, requireVerified, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const query = { userId: req.user._id };
    if (req.query.status && ['processing', 'ready', 'failed'].includes(req.query.status)) {
      query.status = req.query.status;
    }
    const [documents, total] = await Promise.all([
      Document.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-sha256')
        .lean(),
      Document.countDocuments(query),
    ]);
    res.json({
      documents,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List documents error:', error.message);
    res.status(500).json({ message: 'Server error while listing documents' });
  }
});

// Upload + ingest a document (tenant scoped)
router.post('/', auth, requireVerified, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Send multipart/form-data with a "document" field.' });
    }
    const { document, deduped } = await ingestDocument(req.user._id, req.file);
    const safe = { ...document, sha256: undefined };
    res.status(deduped ? 200 : 201).json({
      message: deduped
        ? 'Document already ingested (identical content)'
        : 'Document uploaded and indexed successfully',
      document: safe,
      deduped,
    });
  } catch (error) {
    if (error instanceof IngestError || (error.code === 'LIMIT_FILE_SIZE')) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : (error.status || 400);
      return res.status(status).json({ message: error.message });
    }
    if (error.status && error.status >= 400 && error.status < 500) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error('Upload document error:', error.message);
    res.status(500).json({ message: 'Server error while ingesting document' });
  }
});

// Read one document (own only)
router.get('/:id', auth, requireVerified, async (req, res) => {
  try {
    if (!validObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid document id' });
    }
    const document = await Document.findOne({ _id: req.params.id, userId: req.user._id }).select('-sha256').lean();
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.json({ document });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete one document + its vectors (own only)
router.delete('/:id', auth, requireVerified, async (req, res) => {
  try {
    if (!validObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid document id' });
    }
    const deleted = await deleteDocument(req.user._id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Multer errors (too large / bad field) from the upload route surface here.
router.use((err, req, res, next) => {
  if (err && (err.name === 'MulterError' || err.code === 'LIMIT_FILE_SIZE')) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      message: err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the maximum upload size' : err.message,
    });
  }
  if (err && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ message: err.message });
  }
  next(err);
});

module.exports = router;
