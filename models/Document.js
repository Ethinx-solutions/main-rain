const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  originalName: { type: String, required: true, maxlength: 255 },
  filename: { type: String, required: true }, // server-generated unique name
  mimeType: { type: String, default: '' },
  extension: { type: String, default: '' },
  sizeBytes: { type: Number, required: true, min: 0 },
  sha256: { type: String, required: true },
  status: {
    type: String,
    enum: ['processing', 'ready', 'failed'],
    default: 'processing',
    index: true,
  },
  statusError: { type: String, default: null },
  chunkCount: { type: Number, default: 0 },
  charCount: { type: Number, default: 0 },
  embeddingModel: { type: String, default: null },
  truncated: { type: Boolean, default: false },
  processedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

documentSchema.index({ userId: 1, createdAt: -1 });
documentSchema.index({ userId: 1, sha256: 1 });

module.exports = mongoose.model('Document', documentSchema);
