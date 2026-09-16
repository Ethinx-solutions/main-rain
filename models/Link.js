const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['articles', 'tools', 'resources', 'inspiration', 'learning', 'work', 'personal', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  favicon: {
    type: String
  },
  screenshot: {
    type: String
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  clickCount: {
    type: Number,
    default: 0
  },
  lastClicked: {
    type: Date
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metadata: {
    domain: String,
    ogTitle: String,
    ogDescription: String,
    ogImage: String
  }
}, {
  timestamps: true
});

// Extract domain from URL before saving
linkSchema.pre('save', function(next) {
  try {
    const url = new URL(this.url);
    this.metadata.domain = url.hostname;
  } catch (error) {
    // Invalid URL, but we'll still save it
  }
  next();
});

// Index for better search performance
linkSchema.index({ userId: 1, createdAt: -1 });
linkSchema.index({ userId: 1, category: 1 });
linkSchema.index({ userId: 1, tags: 1 });
linkSchema.index({ title: 'text', description: 'text', url: 'text' });

// Method to increment click count
linkSchema.methods.recordClick = function() {
  this.clickCount += 1;
  this.lastClicked = new Date();
  return this.save();
};

module.exports = mongoose.model('Link', linkSchema);