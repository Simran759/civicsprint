const mongoose = require('mongoose');

const SystemEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: [
      'TICKET_CREATED',
      'AI_ANALYZED',
      'WORKER_ASSIGNED',
      'WORKER_STARTED',
      'REPAIR_UPLOADED',
      'REPAIR_VALIDATED',
      'SUPERVISOR_APPROVED',
      'TICKET_CLOSED',
      'SYSTEM_ERROR',
      'AI_FALLBACK',
      'ESCALATED',
      'MATERIAL_REQUESTED',
      'COMMENT_ADDED'
    ]
  },
  ticketId: {
    type: String,
    index: true, // Optional, can be null for system-wide events
  },
  description: {
    type: String,
    required: true,
  },
  actor: {
    type: String, // 'Citizen', 'Rule Engine', 'Gemini', 'Ollama', 'Supervisor', etc.
    default: 'System',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed, // Storing confidence scores, provider names, etc.
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  }
});

module.exports = mongoose.model('SystemEvent', SystemEventSchema);
