const mongoose = require('mongoose');

const AICacheSchema = new mongoose.Schema({
  promptHash: {
    type: String,
    required: true,
    index: true,
  },
  imageHash: {
    type: String,
    default: null,
  },
  provider: {
    type: String,
    required: true,
  },
  response: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  latencyMs: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Compound index for fast lookup
AICacheSchema.index({ promptHash: 1, imageHash: 1 });

module.exports = mongoose.model('AICache', AICacheSchema);
