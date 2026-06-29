const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: String,
      required: true,
      default: 'Unknown User',
    },
    role: {
      type: String,
      required: true,
      default: 'citizen',
    },
    action: {
      type: String,
      required: true,
    },
    targetTicket: {
      type: String,
      default: 'N/A',
    },
    oldValue: {
      type: String,
      default: '',
    },
    newValue: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
