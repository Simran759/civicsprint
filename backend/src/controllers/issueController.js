const fs = require('fs');
const path = require('path');
const Issue = require('../models/Issue');
const Verification = require('../models/Verification');
const { analyzeIssue, detectImageFraud, generateActionPlan, runDispatcherAgent, runRepairValidationAgent } = require('../services/geminiService');
const { processDuplicateCheck } = require('../services/duplicateService');
const { runPriorityOptimizer, runKnowledgeBaseAgent, runResourceOptimizer } = require('../services/agentService');
const { calculateDistance } = require('../utils/geo');
const { normalizeDepartment, getDepartmentQueryFilter } = require('../utils/departments');
const { getCurrentSprint } = require('../utils/sprint');
const { useGeminiVision } = require('../utils/aiConfig');
const AuditLog = require('../models/AuditLog');
const RuleEngine = require('../services/ruleEngine');
const SystemEvent = require('../models/SystemEvent');
const { uploadToCloudinary } = require('../utils/cloudinary');
function canAccessDepartment(user, issueDepartment) {
  if (!user || (user.role !== 'supervisor' && user.role !== 'manager')) {
    return true;
  }
  const filter = getDepartmentQueryFilter(user.department);
  if (filter && filter.$in) {
    return filter.$in.includes(issueDepartment);
  }
  return issueDepartment === user.department;
}

const logEvent = async (eventType, ticketId, description, actor, metadata = {}) => {
  try {
    await SystemEvent.create({ eventType, ticketId, description, actor, metadata });
  } catch (err) {
    console.error('SystemEvent logging failed:', err);
  }
};

const logAudit = async (req, action, targetTicket, oldValue, newValue) => {
  try {
    const user = req.user?.name || req.user?.email || 'System';
    const role = req.user?.role || 'system';
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    await AuditLog.create({
      user,
      role,
      action,
      targetTicket,
      oldValue: String(oldValue),
      newValue: String(newValue),
      ipAddress
    });
  } catch (err) {
    console.error('Audit logging failed:', err);
  }
};

const maskIssueForCitizen = (issueObj) => {
  const issue = JSON.parse(JSON.stringify(issueObj));
  delete issue.citizenEmail;
  delete issue.assignedWorker;
  delete issue.fraudAnalysis;
  delete issue.verifications;
  delete issue.estimatedRepairCost;
  delete issue.materialsRequested;
  delete issue.comments;
  delete issue.priorityScore;
  delete issue.priorityHistory;
  delete issue.validationResult;
  delete issue.slaStatus;
  issue.impactScore = calculateImpactScore(issue);
  return issue;
};

const calculateImpactScore = (issueObj) => {
  const severity = issueObj?.severity || 0;
  const verificationCount = issueObj?.verificationCount || 0;
  return Math.min(100, severity * 6 + verificationCount * 4);
};

const maskIssueForWorker = (issueObj) => {
  const issue = JSON.parse(JSON.stringify(issueObj));
  delete issue.citizenEmail;
  if (issue.verifications) {
    issue.verifications = issue.verifications.map(v => {
      delete v.citizenEmail;
      return v;
    });
  }
  issue.impactScore = calculateImpactScore(issue);
  return issue;
};

// File cleanup not needed as multer uploads directly to Cloudinary

const shouldUseCloudinaryUpload = () => {
  return process.env.USE_CLOUDINARY === 'true' &&
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;
};

// Stored image resolution not needed as multer directly yields secure Cloudinary URL

/**
 * POST /api/issues
 * Create a new civic report (with Gemini analysis and duplicate checks)
 */
exports.createIssue = async (req, res, next) => {
  let tempFilePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Report image is required.' });
    }

    tempFilePath = req.file.path;
    const { description, latitude, longitude, citizenEmail } = req.body;

    if (!description || !latitude || !longitude || !citizenEmail) {
      return res.status(400).json({ success: false, error: 'Description, latitude, longitude, and citizen email are required.' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, error: 'Invalid latitude or longitude coordinates.' });
    }

    const relativeImageUrl = req.file.path;
    const coordinates = [lng, lat];

    // 1. Run Gemini Vision Agent to analyze the image and description (Agent 1)
    console.log('Invoking Agent 1: Gemini Vision Infrastructure Analyzer...');
    const analysis = await analyzeIssue(tempFilePath, req.file.mimetype, description);
    analysis.department = normalizeDepartment(analysis.department, analysis.category);

    // 2. Duplicate Detection
    const duplicateResult = await processDuplicateCheck({
      category: analysis.category, description, coordinates, imageUrl: relativeImageUrl, citizenEmail,
    });

    if (duplicateResult) {
      if (duplicateResult.status === 'already_reported') {
        cleanupFile(tempFilePath);
        return res.status(200).json({ success: false, alreadyReported: true, message: 'You have already submitted a report.', issue: duplicateResult.issue });
      }
      if (duplicateResult.status === 'merged') {
        cleanupFile(tempFilePath);
        return res.status(200).json({ success: true, duplicate: true, message: duplicateResult.message || 'Merged with nearby report.', issue: duplicateResult.issue });
      }
    }

    // 3. Rule Engine: Deterministic Business Logic
    const ticketId = await RuleEngine.generateTicketId(analysis.category);
    const rulePriority = RuleEngine.calculatePriority(analysis.severity, 1, 0);
    const dueDate = RuleEngine.calculateDueDate(analysis.severity);
    const assignedWorker = await RuleEngine.assignWorker(analysis.department);
    
    // Fraud Check
    const fraudAnalysis = await detectImageFraud(tempFilePath, req.file.mimetype, description);
    const isFraudFlagged = fraudAnalysis.isAuthentic === false;
    const initialStatus = isFraudFlagged ? 'Pending Review' : (assignedWorker === 'Unassigned' ? 'Backlog' : 'Assigned');

    // Generate Issue
    const newIssue = new Issue({
      ticketId,
      title: `${analysis.category} Damage: ${analysis.summary}`,
      category: analysis.category,
      severity: analysis.severity,
      urgency: rulePriority.urgency, // Rule Engine Source of Truth
      summary: analysis.summary,
      description,
      citizenEmail,
      department: analysis.department,
      assignedWorker: isFraudFlagged ? 'Unassigned' : assignedWorker, // Rule Engine Source of Truth
      dueDate,
      status: initialStatus,
      requiresReview: isFraudFlagged,
      aiSource: 'hybrid',
      estimatedResolutionDays: 3,
      fraudAnalysis: {
        isAuthentic: fraudAnalysis.isAuthentic !== false,
        confidence: fraudAnalysis.confidence || 100,
        fraudNotes: fraudAnalysis.fraudNotes || 'Passed visual scans.',
      },
      location: { type: 'Point', coordinates },
      imageUrl: relativeImageUrl,
      verificationCount: 1,
      verifications: [{ description, imageUrl: relativeImageUrl, citizenEmail, createdAt: new Date() }],
      statusHistory: [
        { status: 'Pending Review', note: 'Issue reported by citizen.', updatedBy: citizenEmail, updatedAt: new Date() },
        { status: initialStatus, note: `Rule Engine assigned worker ${assignedWorker} based on workload.`, updatedBy: 'Rule Engine', updatedAt: new Date() },
      ],
      pendingRecommendations: {}, // Setup empty map
      comments: []
    });

    // Default AI fallbacks for immediate DB save
    newIssue.resolutionPlan = {
      recommendedDepartment: analysis.department,
      recommendedActions: ['Manual review and assessment required'],
      crewRequirement: 'Standard Utility Dispatch Crew',
      estimatedCompletionTime: 'Unknown',
      priorityRanking: 'Medium',
      estimatedResolutionTime: 'TBD'
    };
    newIssue.knowledgeBase = { similarTicketCount: 0 };
    newIssue.resourceEstimate = { workersRequired: 1, equipment: [], materials: [], estimatedDurationHours: 1, estimatedCostUSD: 0, nearbyGrouping: 'None' };
    newIssue.priorityScore = rulePriority.score;
    newIssue.ward = `Ward ${Math.floor(Math.abs(coordinates[1] * 10) % 12) + 1}`;

    const savedIssue = await newIssue.save();
    
    // Log Audit Entry
    await logAudit(req, 'CREATE_TICKET', savedIssue.ticketId, '', savedIssue.status);
    await logEvent('TICKET_CREATED', savedIssue.ticketId, `Citizen reported: ${analysis.category}`, 'Citizen');
    
    if (assignedWorker !== 'Unassigned') {
      await logEvent('WORKER_ASSIGNED', savedIssue.ticketId, `Rule Engine assigned worker ${assignedWorker} based on workload`, 'Rule Engine');
    }

    const initialVerification = new Verification({
      issueId: savedIssue._id, citizenEmail, description, imageUrl: relativeImageUrl,
    });
    await initialVerification.save();

    // Respond immediately - Do not block for AI
    res.status(201).json({
      success: true, duplicate: false, message: 'New issue created via Rule Engine.', issue: savedIssue,
    });

    // No cleanup required since file is directly in Cloudinary

    // 4. Run AI Decision Support Agents asynchronously to populate Recommendations
    process.nextTick(async () => {
      try {
        const [dispatch, actionPlan, kbResult, resourceResult] = await Promise.allSettled([
          runDispatcherAgent(analysis.category, description, analysis.severity, analysis.urgency, analysis.department, analysis.estimatedRepairTime),
          generateActionPlan(analysis.category, description, analysis.severity, analysis.urgency, analysis.department),
          runKnowledgeBaseAgent(analysis.category, description, coordinates),
          runResourceOptimizer(savedIssue, [])
        ]);

        const issueToUpdate = await Issue.findById(savedIssue._id);
        if (!issueToUpdate) return;
        
        let hasUpdates = false;

        if (dispatch.status === 'fulfilled' && dispatch.value && dispatch.value.worker && dispatch.value.worker !== assignedWorker) {
          issueToUpdate.pendingRecommendations.set('Dispatch', {
            type: 'Dispatch',
            suggestion: dispatch.value.worker,
            confidence: dispatch.value.confidence || 85,
            reasoning: dispatch.value.reasoning,
            alternative: dispatch.value.alternative,
            status: 'Pending'
          });
          hasUpdates = true;
          await logEvent('AI_ANALYZED', issueToUpdate.ticketId, `AI Assistant recommends reassigning to ${dispatch.value.worker}`, 'AI Assistant');
        }

        if (actionPlan.status === 'fulfilled' && actionPlan.value) {
          issueToUpdate.resolutionPlan = {
            recommendedDepartment: actionPlan.value.recommendedDepartment || analysis.department,
            recommendedActions: actionPlan.value.resolutionPlan || [],
            crewRequirement: actionPlan.value.crewRequirement,
            estimatedCompletionTime: actionPlan.value.estimatedCompletionTime,
            priorityRanking: actionPlan.value.priorityRanking,
            estimatedResolutionTime: actionPlan.value.estimatedResolutionTime || 'TBD'
          };
          hasUpdates = true;
          await logEvent('AI_ANALYZED', issueToUpdate.ticketId, 'AI Assistant generated a resolution action plan', 'AI Assistant');
        }

        if (kbResult.status === 'fulfilled' && kbResult.value) {
          issueToUpdate.knowledgeBase = kbResult.value;
          hasUpdates = true;
        }

        if (resourceResult.status === 'fulfilled' && resourceResult.value) {
          issueToUpdate.resourceEstimate = resourceResult.value;
          hasUpdates = true;
        }

        if (hasUpdates) {
          await issueToUpdate.save();
        }
      } catch (bgError) {
        console.error('Background AI enrichment failed:', bgError);
      }
    });
  } catch (error) {
    cleanupFile(tempFilePath);
    next(error);
  }
};

/**
 * GET /api/issues
 * Get all issues with filters, search, and pagination
 */
exports.getIssues = async (req, res, next) => {
  try {
    const { status, category, department, severity, search, page = 1, limit = 10, sortBy = 'createdAt' } = req.query;

    const query = {};

    // Apply exact match filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (department) query.department = department;

    // Apply severity filter (e.g. min severity)
    if (severity) {
      query.severity = { $gte: parseInt(severity) };
    }

    // Apply search filter (text search on summary/description/department/category)
    if (search) {
      query.$or = [
        { summary: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    // Apply Role-Based Access Control Filters
    const userRole = req.user?.role || 'citizen';
    if (userRole === 'citizen') {
      if (req.user && req.user.email) {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { citizenEmail: req.user.email },
            { 'verifications.citizenEmail': req.user.email }
          ]
        });
      }
      // If no email, allow them to view all (they will be masked)
    } else if (userRole === 'worker') {
      query.assignedWorker = req.user.name || 'Unassigned';
    } else if (userRole === 'supervisor' || userRole === 'manager') {
      query.department = getDepartmentQueryFilter(req.user.department);
    }

    // Determine pagination values
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skipNum = (pageNum - 1) * limitNum;

    // Sorting
    let sortOptions = {};
    if (sortBy === 'severity') {
      sortOptions = { severity: -1, createdAt: -1 };
    } else {
      sortOptions = { createdAt: -1 };
    }

    // Execute queries
    const issues = await Issue.find(query)
      .sort(sortOptions)
      .skip(skipNum)
      .limit(limitNum);

    const totalIssues = await Issue.countDocuments(query);

    // Apply Privacy Masking on issues returned
    const sanitizedIssues = issues.map(issue => {
      let sanitized;
      if (userRole === 'citizen') {
        sanitized = maskIssueForCitizen(issue);
      } else if (userRole === 'worker') {
        sanitized = maskIssueForWorker(issue);
      } else {
        sanitized = issue.toObject();
      }
      sanitized.impactScore = calculateImpactScore(sanitized);
      return sanitized;
    });

    res.status(200).json({
      success: true,
      count: sanitizedIssues.length,
      totalPages: Math.ceil(totalIssues / limitNum),
      currentPage: pageNum,
      totalIssues,
      issues: sanitizedIssues,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/issues/:id
 * Retrieve a single issue by ID
 */
exports.getIssueById = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const isValidObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isValidObjectId ? { _id: req.params.id } : { ticketId: req.params.id };
    const issue = await Issue.findOne(query);

    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }

    const userRole = req.user?.role || 'citizen';

    // RBAC validation checks
    if (userRole === 'admin') {
      // Admin sees everything
    } else if (userRole === 'supervisor' || userRole === 'manager') {
      if (!canAccessDepartment(req.user, issue.department)) {
        return res.status(403).json({
          success: false,
          error: `Access Denied. You do not manage department [${issue.department}].`,
        });
      }
    } else if (userRole === 'worker') {
      if (issue.assignedWorker !== req.user.name) {
        return res.status(403).json({
          success: false,
          error: `Access Denied. This ticket is not assigned to you. Assigned worker: ${issue.assignedWorker || 'None'}`,
        });
      }
    } else {
      // Citizen check: allow access if they have the ID, they will see a masked version.
    }

    // Apply Privacy Masking
    let sanitizedIssue;
    if (userRole === 'citizen') {
      sanitizedIssue = maskIssueForCitizen(issue);
    } else if (userRole === 'worker') {
      sanitizedIssue = maskIssueForWorker(issue);
    } else {
      sanitizedIssue = issue.toObject();
    }

    sanitizedIssue.impactScore = calculateImpactScore(sanitizedIssue);

    res.status(200).json({
      success: true,
      issue: sanitizedIssue,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/issues/:id/status
 * Update the status of a reported issue
 */
exports.updateIssueStatus = async (req, res, next) => {
  try {
    const { status, note, worker } = req.body;
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    const userRole = req.user?.role || 'citizen';
    if (userRole === 'citizen') {
      return res.status(403).json({ success: false, error: 'Access Denied. Citizens cannot transition ticket statuses.' });
    }
    if (userRole === 'worker' && issue.assignedWorker !== req.user.name) {
      return res.status(403).json({ success: false, error: 'Access Denied. You can only update tickets assigned to you.' });
    }
    if ((userRole === 'supervisor' || userRole === 'manager') && !canAccessDepartment(req.user, issue.department)) {
      return res.status(403).json({ success: false, error: `Access Denied. You do not manage department [${issue.department}].` });
    }

    const oldStatus = issue.status;
    let nextStatus = status || oldStatus;
    let updateNote = note || `Status transitioned from ${oldStatus} to ${nextStatus}`;
    const user = worker || req.user?.name || 'Municipal Operations';

    if (nextStatus === 'Inspection' && !req.file && !issue.afterImageUrl) {
      return res.status(400).json({ success: false, error: 'An after/completion photo is required to move a ticket to Inspection.' });
    }

    if (nextStatus === 'Inspection') {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'An After progress/completion photo is required to request inspection.' });
      }

      issue.afterImageUrl = req.file.path;

      const beforeImagePath = issue.imageUrl.startsWith('http') 
        ? issue.imageUrl 
        : path.join(__dirname, '../../', issue.imageUrl.replace(/^\/+/, ''));
      const afterImagePath = req.file.path;

      console.log('Invoking Agent 5: Repair Validation Agent...');
      const validationResult = await runRepairValidationAgent(beforeImagePath, afterImagePath, issue.category, issue.description);

      // AI acts only as Decision Support. Does not close the ticket.
      issue.pendingRecommendations.set('Validation', {
        type: 'Validation',
        suggestion: validationResult.isSuccessful ? 'Pass' : 'Fail',
        confidence: validationResult.confidence,
        reasoning: validationResult.isSuccessful ? 'Repairs visually match standards.' : `Remaining damage: ${validationResult.remainingDamage}`,
        alternative: validationResult.suggestedRework || 'N/A',
        status: 'Pending'
      });
      
      updateNote = `Ticket moved to Inspection. AI Validation pending review.`;
    }

    issue.status = nextStatus;
    issue.statusHistory.push({
      status: nextStatus,
      note: updateNote,
      updatedBy: user,
      updatedAt: new Date(),
    });

    const updatedIssue = await issue.save({ validateModifiedOnly: true });
    await logAudit(req, 'STATUS_TRANSITION', issue.ticketId, oldStatus, nextStatus);

    // Cloudinary direct upload means no cleanup is required

    res.status(200).json({ success: true, message: `Ticket workflow status transitioned to: ${nextStatus}`, issue: updatedIssue });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/issues/:id/comments
 * Add comment to a ticket
 */
exports.addComment = async (req, res, next) => {
  try {
    const { author, text } = req.body;
    if (!author || !text) {
      return res.status(400).json({ success: false, error: 'Author and text are required.' });
    }
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }
    issue.comments.push({ author, text, createdAt: new Date() });
    const savedIssue = await issue.save({ validateModifiedOnly: true });
    res.status(200).json({ success: true, issue: savedIssue });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/issues/:id/materials
 * Request materials for a ticket
 */
exports.requestMaterials = async (req, res, next) => {
  try {
    const { materials } = req.body;
    if (!materials || !Array.isArray(materials)) {
      return res.status(400).json({ success: false, error: 'Materials array is required.' });
    }
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }
    issue.materialsRequested.push(...materials);
    const savedIssue = await issue.save({ validateModifiedOnly: true });
    res.status(200).json({ success: true, issue: savedIssue });
  } catch (error) {
    next(error);
  }
};

exports.reassignTicket = async (req, res, next) => {
  try {
    const { worker, department } = req.body;
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    const userRole = req.user?.role || 'citizen';
    if (userRole === 'citizen' || userRole === 'worker') {
      return res.status(403).json({ success: false, error: 'Access Denied. You do not have permissions to reassign tickets.' });
    }

    if ((userRole === 'supervisor' || userRole === 'manager') && !canAccessDepartment(req.user, issue.department)) {
      return res.status(403).json({ success: false, error: `Access Denied. You do not manage department [${issue.department}].` });
    }

    const oldWorker = issue.assignedWorker;
    const oldDept = issue.department;
    if (worker) issue.assignedWorker = worker;
    if (department) {
      // Supervisor cannot move tickets to other departments
      const normalizedDept = normalizeDepartment(department, issue.category);
      if ((userRole === 'supervisor' || userRole === 'manager') && normalizedDept !== req.user.department) {
        return res.status(403).json({ success: false, error: 'Access Denied. Supervisors cannot assign tasks outside their department.' });
      }
      issue.department = normalizedDept;
    }

    issue.statusHistory.push({
      status: issue.status,
      note: `Ticket reassigned. Dept: ${oldDept} -> ${issue.department}. Worker: ${oldWorker} -> ${issue.assignedWorker}.`,
      updatedBy: req.user?.name || 'Supervisor Dispatcher',
      updatedAt: new Date()
    });

    // If assigning to a worker and the ticket is currently in a pre-assignment state, move it to Assigned
    if (worker && worker !== 'Unassigned' && ['Backlog', 'Ready', 'Pending Review'].includes(issue.status)) {
      issue.statusHistory.push({
        status: 'Assigned',
        note: `Status auto-updated to Assigned due to worker assignment.`,
        updatedBy: 'System Auto-Dispatch',
        updatedAt: new Date()
      });
      issue.status = 'Assigned';
    }

    const savedIssue = await issue.save({ validateModifiedOnly: true });
    
    // Log Audit Entry
    await logAudit(req, 'REASSIGN_TICKET', issue.ticketId, `${oldDept}/${oldWorker}`, `${issue.department}/${issue.assignedWorker}`);

    res.status(200).json({ success: true, issue: savedIssue });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/issues/:id/escalate
 * Escalate priority or severity
 */
exports.escalateTicket = async (req, res, next) => {
  try {
    const { priority, severity } = req.body;
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    const userRole = req.user?.role || 'citizen';
    if (userRole === 'citizen' || userRole === 'worker') {
      return res.status(403).json({ success: false, error: 'Access Denied. Workers and Citizens cannot escalate tickets.' });
    }

    if ((userRole === 'supervisor' || userRole === 'manager') && !canAccessDepartment(req.user, issue.department)) {
      return res.status(403).json({ success: false, error: `Access Denied. You do not manage department [${issue.department}].` });
    }

    const oldPriority = issue.urgency;
    const oldSeverity = issue.severity;
    if (priority) issue.urgency = priority;
    if (severity) issue.severity = parseInt(severity);
    issue.statusHistory.push({
      status: issue.status,
      note: `Ticket escalated. Priority: ${oldPriority} -> ${issue.urgency}. Severity: ${oldSeverity} -> ${issue.severity}.`,
      updatedBy: req.user?.name || 'Supervisor Escaler',
      updatedAt: new Date()
    });

    const savedIssue = await issue.save({ validateModifiedOnly: true });

    // Log Audit Entry
    await logAudit(req, 'ESCALATE_TICKET', issue.ticketId, `Priority ${oldPriority}, Severity ${oldSeverity}`, `Priority ${issue.urgency}, Severity ${issue.severity}`);

    res.status(200).json({ success: true, issue: savedIssue });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/issues/:id/recommendations/:type
 * Review (Accept/Reject/Modify) an AI Recommendation
 */
exports.reviewRecommendation = async (req, res, next) => {
  try {
    const { id, type } = req.params;
    const { action, modifiedValue } = req.body; // action: 'Accepted', 'Rejected', 'Modified'
    
    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ success: false, error: 'Ticket not found.' });
    
    const userRole = req.user?.role || 'citizen';
    if (userRole !== 'supervisor' && userRole !== 'manager') {
      return res.status(403).json({ success: false, error: 'Only supervisors can review AI recommendations.' });
    }
    
    const recommendation = issue.pendingRecommendations.get(type);
    if (!recommendation) return res.status(404).json({ success: false, error: 'Recommendation not found.' });

    const oldStatus = issue.status;
    let newStatus = oldStatus;

    if (action === 'Accepted' || action === 'Modified') {
      const finalValue = action === 'Modified' ? modifiedValue : recommendation.suggestion;
      
      // Apply the decision deterministically
      if (type === 'Validation') {
        if (finalValue === 'Pass') {
          newStatus = 'Resolved';
          const start = new Date(issue.createdAt);
          issue.resolutionTime = Math.ceil((new Date() - start) / (1000 * 60 * 60));
          issue.resolvedAt = new Date();
          issue.slaStatus = issue.dueDate && issue.dueDate > new Date() ? 'Met' : 'Breached';
        } else {
          newStatus = 'In Progress';
          issue.comments.push({
            author: req.user.name || 'Supervisor',
            text: `Rework requested based on validation: ${recommendation.reasoning}`,
            createdAt: new Date()
          });
        }
      } else if (type === 'Dispatch') {
        issue.assignedWorker = finalValue;
        if (issue.status === 'Backlog' || issue.status === 'Pending Review') {
          newStatus = 'Assigned';
        }
      } else if (type === 'Priority') {
        issue.urgency = finalValue;
      }
    } else if (action === 'Rejected') {
      if (type === 'Validation') {
        newStatus = 'In Progress'; // Fallback
      }
    }
    
    recommendation.status = action;
    issue.pendingRecommendations.delete(type); // Remove it after decision
    
    if (newStatus !== oldStatus) {
      issue.status = newStatus;
      issue.statusHistory.push({
        status: newStatus,
        note: `AI Recommendation (${type}) ${action}.`,
        updatedBy: req.user?.name || 'Supervisor',
        updatedAt: new Date()
      });
    }

    const savedIssue = await issue.save({ validateModifiedOnly: true });
    await logAudit(req, `REVIEW_RECOMMENDATION_${type.toUpperCase()}`, issue.ticketId, 'Pending', action);
    
    res.status(200).json({ success: true, message: `Recommendation ${action}.`, issue: savedIssue });
  } catch (error) {
    next(error);
  }
};
