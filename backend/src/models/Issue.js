const mongoose = require('mongoose');

const verificationHistorySchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  citizenEmail: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const resolutionPlanSchema = new mongoose.Schema({
  recommendedDepartment: {
    type: String,
    required: true,
  },
  recommendedActions: [
    {
      type: String,
      required: true,
    },
  ],
  estimatedResolutionTime: {
    type: String,
    required: true,
  },
  crewRequirement: {
    type: String,
    default: 'Standard Utility Dispatch Crew',
  },
  estimatedCompletionTime: {
    type: String,
  },
  priorityRanking: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
  },
  planGeneratedAt: {
    type: Date,
    default: Date.now,
  },
});

const issueSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      index: true,
    },
    severity: {
      type: Number,
      required: [true, 'Severity (1-10) is required'],
      min: 1,
      max: 10,
    },
    urgency: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      required: [true, 'Urgency is required'],
    },
    summary: {
      type: String,
      required: [true, 'Summary is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    citizenEmail: {
      type: String,
      required: [true, 'Citizen email is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      index: true,
      enum: [
        'Road Maintenance',
        'Water & Power',
        'Sanitation',
        'Code Enforcement',
        'Parks & Recreation',
      ],
    },
    resolutionTime: {
      type: Number,
    },
    resolvedAt: {
      type: Date,
    },
    aiSource: {
      type: String,
      enum: ['gemini', 'ollama', 'manual', 'mock', 'hybrid'],
      default: 'manual',
    },
    priorityLocked: {
      type: Boolean,
      default: false,
    },
    requiresReview: {
      type: Boolean,
      default: false,
    },
    estimatedResolutionDays: {
      type: Number,
      required: [true, 'Estimated resolution days is required'],
      default: 3,
    },
    storyPoints: {
      type: Number,
      default: 1,
    },
    sprint: {
      type: String,
      default: 'Backlog',
    },
    assignedWorker: {
      type: String,
      default: 'Unassigned',
    },
    dueDate: {
      type: Date,
    },
    slaStatus: {
      type: String,
      enum: ['Met', 'Breached', 'Active'],
      default: 'Active',
    },
    // Agent 1: Vision Estimates
    estimatedRepairTime: {
      type: String,
      default: 'Unknown',
    },
    estimatedRepairCost: {
      type: String,
      default: 'TBD',
    },
    // Agent 2: Fraud Analysis Verification
    fraudAnalysis: {
      isAuthentic: {
        type: Boolean,
        default: true,
      },
      confidence: {
        type: Number,
        default: 100,
      },
      fraudNotes: {
        type: String,
        default: 'Passed image security scan.',
      },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    imageUrl: {
      type: String,
      required: [true, 'Image URL is required'],
    },
    afterImageUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: ['Pending Review', 'Backlog', 'Ready', 'Assigned', 'In Progress', 'Inspection', 'Resolved', 'Closed'],
      default: 'Backlog',
      index: true,
    },
    verificationCount: {
      type: Number,
      default: 1,
    },
    verifications: [verificationHistorySchema],
    resolutionPlan: resolutionPlanSchema,
    statusHistory: [
      {
        status: String,
        note: String,
        updatedBy: String,
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    materialsRequested: [
      {
        type: String,
      },
    ],
    comments: [
      {
        author: {
          type: String,
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    validationResult: {
      isSuccessful: { type: Boolean },
      confidence: { type: Number },
      remainingDamage: { type: String },
      suggestedRework: { type: String },
    },
    pendingRecommendations: {
      type: Map,
      of: new mongoose.Schema({
        type: { type: String, enum: ['Priority', 'Routing', 'Validation', 'Resource', 'Dispatch'] },
        suggestion: { type: mongoose.Schema.Types.Mixed },
        confidence: { type: Number },
        reasoning: { type: String },
        alternative: { type: String },
        status: { type: String, enum: ['Pending', 'Accepted', 'Modified', 'Rejected'], default: 'Pending' }
      }),
      default: {}
    },
    // Agent 9: Dynamic Priority Score
    priorityScore: {
      type: Number,
      default: 50,
    },
    priorityHistory: [
      {
        oldScore: Number,
        newScore: Number,
        oldUrgency: String,
        newUrgency: String,
        reason: String,
        updatedBy: { type: String, default: 'Agent 9: Priority Optimizer' },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    // AI Decision Explainability Log
    aiDecisions: [
      {
        agent: String,
        action: String,
        explanation: String,
        confidence: Number,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    // Agent 12: Resource Estimate
    resourceEstimate: {
      workersRequired: { type: Number, default: 2 },
      equipment: [String],
      materials: [String],
      estimatedDurationHours: { type: Number, default: 4 },
      estimatedCostUSD: { type: Number, default: 500 },
      nearbyGrouping: { type: String, default: '' },
    },
    // Agent 10: Knowledge Base Historical Match
    knowledgeBase: {
      avgRepairTimeHours: { type: Number },
      avgCostUSD: { type: Number },
      commonRootCause: { type: String },
      successfulStrategy: { type: String },
      pastDepartment: { type: String },
      similarTicketCount: { type: Number, default: 0 },
    },
    // Ward/Zone identifier
    ward: {
      type: String,
      default: 'Unassigned',
    },
  },
  {
    timestamps: true,
  }
);

// Enable geospatial queries on coordinates
issueSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Issue', issueSchema);
