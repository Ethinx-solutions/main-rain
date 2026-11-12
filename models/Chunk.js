const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true,
  },
  chunkIndex: { type: Number, required: true, min: 0 },
  text: { type: String, required: true },
  embedding: { type: [Number], required: true },
  embeddingModel: { type: String, required: true },
  charCount: { type: Number, default: 0 },
}, {
  timestamps: true,
});

chunkSchema.index({ userId: 1, documentId: 1, chunkIndex: 1 });

module.exports = mongoose.model('Chunk', chunkSchema);
