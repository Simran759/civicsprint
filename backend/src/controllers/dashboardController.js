const Issue = require('../models/Issue');
const { predictCivicRisks, runSprintSummaryAgent } = require('../services/geminiService');
const { runCopilotAgent, runPriorityOptimizer, runExecutiveBriefingAgent } = require('../services/agentService');
const { calculateDistance } = require('../utils/geo');
const { normalizeDepartment, getDepartmentQueryFilter } = require('../utils/departments');
const { getCurrentSprint } = require('../utils/sprint');
const { AI_MODE } = require('../utils/aiConfig');
const AuditLog = require('../models/AuditLog');

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
      ipAddress,
    });
  } catch (err) {
    console.error('Audit logging failed:', err);
  }
};

function getDepartmentFilter(req) {
  if (req.user?.role === 'supervisor' || req.user?.role === 'manager') {
    return getDepartmentQueryFilter(req.user.department);
  }
  return null;
}

async function runStatsAggregation(departmentFilter) {
  const matchStage = {};
  if (departmentFilter) {
    matchStage.department = departmentFilter;
  }

  const pipeline = [];
  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  pipeline.push({
    $facet: {
      generalStats: [
        {
          $group: {
            _id: null,
            totalIssues: { $sum: 1 },
            avgSeverity: { $avg: '$severity' },
            resolvedIssues: {
              $sum: { $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0] },
            },
            criticalIssues: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $gte: ['$severity', 7] },
                      { $eq: ['$urgency', 'Critical'] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            avgResolutionTime: { $avg: '$resolutionTime' },
            breachedSla: {
              $sum: { $cond: [{ $eq: ['$slaStatus', 'Breached'] }, 1, 0] },
            },
            delayedIssues: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lt: ['$dueDate', new Date()] },
                      { $not: [{ $in: ['$status', ['Resolved', 'Closed']] }] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            pendingReview: {
              $sum: { $cond: [{ $eq: ['$requiresReview', true] }, 1, 0] },
            },
            totalStoryPoints: { $sum: '$storyPoints' },
            completedStoryPoints: {
              $sum: { $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, '$storyPoints', 0] },
            },
          },
        },
      ],
      byDepartment: [
        {
          $group: {
            _id: '$department',
            count: { $sum: 1 },
            activeCount: {
              $sum: { $cond: [{ $not: [{ $in: ['$status', ['Resolved', 'Closed']] }] }, 1, 0] },
            },
          },
        },
        { $sort: { count: -1 } },
      ],
      byStatus: [
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ],
      byWorker: [
        {
          $match: {
            $expr: {
              $not: [{ $in: ['$status', ['Resolved', 'Closed']] }],
            },
          },
        },
        {
          $group: {
            _id: '$assignedWorker',
            activeTickets: { $sum: 1 },
            totalStoryPoints: { $sum: '$storyPoints' },
          },
        },
        { $sort: { activeTickets: -1 } },
      ],
      recentIssues: [
        { $sort: { createdAt: -1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 1,
            ticketId: 1,
            title: 1,
            summary: 1,
            category: 1,
            severity: 1,
            urgency: 1,
            status: 1,
            createdAt: 1,
            priorityScore: 1,
            requiresReview: 1,
          },
        },
      ],
      recentAiDecisions: [
        { $unwind: '$aiDecisions' },
        { $sort: { 'aiDecisions.createdAt': -1 } },
        { $limit: 15 },
        {
          $project: {
            ticketId: 1,
            decision: '$aiDecisions',
          },
        },
      ],
      recentActivity: [
        { $unwind: '$statusHistory' },
        { $sort: { 'statusHistory.updatedAt': -1 } },
        { $limit: 10 },
        {
          $project: {
            ticketId: 1,
            title: 1,
            activity: '$statusHistory',
          },
        },
      ],
    },
  });

  const statsResult = await Issue.aggregate(pipeline);
  return statsResult[0];
}

function formatStatsResponse(results) {
  const summary = results.generalStats[0] || {
    totalIssues: 0,
    avgSeverity: 0,
    resolvedIssues: 0,
    criticalIssues: 0,
    avgResolutionTime: 0,
    breachedSla: 0,
    delayedIssues: 0,
    pendingReview: 0,
    totalStoryPoints: 0,
    completedStoryPoints: 0,
  };

  const defaultStatuses = {
    Backlog: 0,
    Ready: 0,
    Assigned: 0,
    'In Progress': 0,
    Inspection: 0,
    Resolved: 0,
    Closed: 0,
  };

  return {
    totalIssues: summary.totalIssues,
    criticalIssues: summary.criticalIssues,
    resolvedIssues: summary.resolvedIssues,
    avgSeverity: parseFloat((summary.avgSeverity || 0).toFixed(1)),
    avgResolutionTime: parseFloat((summary.avgResolutionTime || 0).toFixed(1)) || 0,
    breachedSlaCount: summary.breachedSla || 0,
    delayedCount: summary.delayedIssues || 0,
    pendingReviewCount: summary.pendingReview || 0,
    totalStoryPoints: summary.totalStoryPoints || 0,
    completedStoryPoints: summary.completedStoryPoints || 0,
    currentSprint: getCurrentSprint(),
    dataSource: 'mongodb',
    byDepartment: results.byDepartment.map((d) => ({
      department: d._id || 'Unknown',
      count: d.count,
      activeCount: d.activeCount || 0,
    })),
    byStatus: results.byStatus.reduce((acc, current) => {
      acc[current._id] = current.count;
      return acc;
    }, defaultStatuses),
    recentIssues: results.recentIssues,
    workerCapacity: results.byWorker.map((w) => ({
      worker: w._id || 'Unassigned',
      activeTickets: w.activeTickets,
      totalStoryPoints: w.totalStoryPoints,
    })),
    departmentCapacity: results.byDepartment.map((d) => ({
      department: d._id || 'Unknown',
      total: d.count,
      active: d.activeCount || 0,
    })),
    recentActivity: (results.recentActivity || []).map((a) => ({
      ticketId: a.ticketId,
      title: a.title,
      status: a.activity?.status,
      note: a.activity?.note,
      updatedBy: a.activity?.updatedBy,
      updatedAt: a.activity?.updatedAt,
    })),
    recentAiDecisions: (results.recentAiDecisions || []).map((d) => ({
      ticketId: d.ticketId,
      agent: d.decision?.agent,
      action: d.decision?.action,
      explanation: d.decision?.explanation,
      createdAt: d.decision?.createdAt,
    })),
  };
}

async function fetchActiveIssues(departmentFilter) {
  const activeQuery = {
    status: { $in: ['Backlog', 'Ready', 'Assigned', 'In Progress', 'Inspection'] },
  };
  if (departmentFilter) {
    activeQuery.department = departmentFilter;
  }
  return Issue.find(activeQuery);
}

function clusterActiveIssues(activeIssues) {
  const clusters = [];
  const visited = new Set();

  for (let i = 0; i < activeIssues.length; i++) {
    const issueId = activeIssues[i]._id.toString();
    if (visited.has(issueId)) continue;

    const cluster = [activeIssues[i]];
    visited.add(issueId);

    const [lon1, lat1] = activeIssues[i].location.coordinates;

    for (let j = i + 1; j < activeIssues.length; j++) {
      const otherId = activeIssues[j]._id.toString();
      if (visited.has(otherId)) continue;

      const [lon2, lat2] = activeIssues[j].location.coordinates;
      const distance = calculateDistance(lat1, lon1, lat2, lon2);

      if (distance <= 500) {
        cluster.push(activeIssues[j]);
        visited.add(otherId);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

async function computeRiskZones(activeIssues) {
  const clusters = clusterActiveIssues(activeIssues);
  const riskZones = [];

  for (const cluster of clusters) {
    if (cluster.length < 2) continue;

    const clusterDetails = cluster.map((issue) => ({
      id: issue._id,
      category: issue.category,
      description: issue.description,
      severity: issue.severity,
      urgency: issue.urgency,
      location: issue.location.coordinates,
    }));

    try {
      const riskProfile = await predictCivicRisks(clusterDetails);

      const avgLat = cluster.reduce((sum, issue) => sum + issue.location.coordinates[1], 0) / cluster.length;
      const avgLng = cluster.reduce((sum, issue) => sum + issue.location.coordinates[0], 0) / cluster.length;

      riskZones.push({
        zoneName: riskProfile.zoneName,
        failureProbability: riskProfile.failureProbability,
        riskLevel: riskProfile.riskLevel,
        narrativeSummary: riskProfile.narrativeSummary,
        recommendedPreventativeAction: riskProfile.recommendedPreventativeAction,
        coordinates: [avgLng, avgLat],
        radius: 150,
        affectedIssuesCount: cluster.length,
        issueIds: cluster.map((issue) => issue._id),
        dataSource: riskProfile.dataSource || 'ai-estimate',
      });
    } catch (err) {
      console.error('Error generating risk zone for cluster:', err);
    }
  }

  return riskZones;
}

/**
 * GET /api/dashboard/stats
 * MongoDB-only metrics — no AI mutations on refresh
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const departmentFilter = getDepartmentFilter(req);
    const results = await runStatsAggregation(departmentFilter);
    const formattedStats = formatStatsResponse(results);

    res.status(200).json({
      success: true,
      data: formattedStats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/dashboard/ai-insights
 * On-demand AI: copilot insights + geospatial risk zones (does not mutate ticket data)
 */
exports.getAiInsights = async (req, res, next) => {
  try {
    const departmentFilter = getDepartmentFilter(req);
    const results = await runStatsAggregation(departmentFilter);
    const summary = results.generalStats[0] || {};
    const activeIssues = await fetchActiveIssues(departmentFilter);

    const departmentCounts = {};
    const workerCounts = {};
    results.byDepartment.forEach((d) => { departmentCounts[d._id || 'Unknown'] = d.activeCount || 0; });
    results.byWorker.forEach((w) => { workerCounts[w._id || 'Unassigned'] = w.activeTickets || 0; });

    const copilotState = {
      departmentCounts,
      workerCounts,
      breachedSlaCount: summary.breachedSla || 0,
      criticalCount: summary.criticalIssues || 0,
      overdueCount: summary.delayedIssues || 0,
      totalActive: activeIssues.length,
      resolvedCount: summary.resolvedIssues || 0,
    };

    let copilotResult = { insights: [], dataSource: 'mock' };
    try {
      copilotResult = await runCopilotAgent(copilotState) || { insights: [] };
    } catch (copilotError) {
      console.warn('Copilot insights unavailable:', copilotError.message);
    }

    const riskZones = await computeRiskZones(activeIssues);

    res.status(200).json({
      success: true,
      data: {
        aiInsights: copilotResult.insights || [],
        riskZones,
        aiMode: AI_MODE,
        dataSource: copilotResult.dataSource || 'hybrid',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/dashboard/recalculate-priorities
 * Explicit Agent 9 batch run — respects priorityLocked tickets
 */
exports.recalculatePriorities = async (req, res, next) => {
  try {
    const departmentFilter = getDepartmentFilter(req);
    const activeIssues = await fetchActiveIssues(departmentFilter);

    let priorityUpdated = 0;
    let skippedLocked = 0;

    for (const ticket of activeIssues) {
      if (ticket.priorityLocked) {
        skippedLocked++;
        continue;
      }

      try {
        const nearbyCount = activeIssues.filter((other) => {
          if (other._id.toString() === ticket._id.toString()) return false;
          const [lon1, lat1] = ticket.location.coordinates;
          const [lon2, lat2] = other.location.coordinates;
          return calculateDistance(lat1, lon1, lat2, lon2) <= 500;
        }).length;

        const result = await runPriorityOptimizer(ticket, nearbyCount);
        const oldScore = ticket.priorityScore || 50;
        const oldUrgency = ticket.urgency;

        if (Math.abs(result.priorityScore - oldScore) > 5 || result.newUrgency !== oldUrgency) {
          ticket.priorityScore = result.priorityScore;
          ticket.urgency = result.newUrgency;
          ticket.priorityHistory.push({
            oldScore,
            newScore: result.priorityScore,
            oldUrgency,
            newUrgency: result.newUrgency,
            reason: result.explanation,
            updatedBy: 'Agent 9: Priority Optimizer',
            updatedAt: new Date(),
          });
          ticket.aiDecisions.push({
            agent: 'Agent 9: Priority Optimizer',
            action: `Priority ${oldScore} → ${result.priorityScore}, Urgency ${oldUrgency} → ${result.newUrgency}`,
            explanation: result.explanation,
            confidence: 92,
            createdAt: new Date(),
          });
          await ticket.save({ validateModifiedOnly: true });
          priorityUpdated++;
        }
      } catch (err) {
        console.error(`Priority recalc failed for ${ticket.ticketId}:`, err.message);
      }
    }

    res.status(200).json({
      success: true,
      data: { priorityUpdated, skippedLocked, totalActive: activeIssues.length },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/sprint-summary
 * Triggers Agent 6 (Sprint Summary Agent) on active tickets
 */
exports.getSprintSummary = async (req, res, next) => {
  try {
    const departmentFilter = getDepartmentFilter(req);
    const query = { status: { $ne: 'Closed' } };
    if (departmentFilter) {
      query.department = departmentFilter;
    }

    const tickets = await Issue.find(query);

    const ticketsData = tickets.map((t) => ({
      ticketId: t.ticketId,
      title: t.title,
      category: t.category,
      department: t.department,
      status: t.status,
      assignedWorker: t.assignedWorker,
      storyPoints: t.storyPoints,
      priority: t.urgency,
      slaStatus: t.slaStatus,
      isDelayed: t.dueDate ? (new Date() > new Date(t.dueDate)) : false,
    }));

    const summaryResult = await runSprintSummaryAgent(ticketsData);

    res.status(200).json({
      success: true,
      data: {
        ...summaryResult,
        currentSprint: getCurrentSprint(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/executive-briefing
 * Triggers Agent 11 (Executive Briefing Generator) for admin reports
 */
exports.getExecutiveBriefing = async (req, res, next) => {
  try {
    const allTickets = await Issue.find({}).lean();
    const activeIssues = allTickets.filter((t) => !['Resolved', 'Closed'].includes(t.status));

    const dashboardData = {
      totalIssues: allTickets.length,
      resolvedIssues: allTickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length,
      criticalIssues: allTickets.filter((t) => t.severity >= 7 || t.urgency === 'Critical').length,
      breachedSlaCount: allTickets.filter((t) => t.slaStatus === 'Breached').length,
      delayedCount: activeIssues.filter((t) => t.dueDate && new Date() > new Date(t.dueDate)).length,
      avgSeverity: allTickets.length > 0
        ? (allTickets.reduce((s, t) => s + t.severity, 0) / allTickets.length).toFixed(1)
        : 0,
      currentSprint: getCurrentSprint(),
    };

    const activeForRisk = await Issue.find({
      status: { $in: ['Backlog', 'Ready', 'Assigned', 'In Progress', 'Inspection'] },
    });
    const riskZones = await computeRiskZones(activeForRisk);

    const briefing = await runExecutiveBriefingAgent(dashboardData, allTickets, riskZones);

    res.status(200).json({
      success: true,
      data: briefing,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/ai-decisions
 * Returns recent AI decision log entries across all tickets
 */
exports.getAiDecisions = async (req, res, next) => {
  try {
    const tickets = await Issue.aggregate([
      { $unwind: '$aiDecisions' },
      { $sort: { 'aiDecisions.createdAt': -1 } },
      { $limit: 50 },
      {
        $project: {
          ticketId: 1,
          title: 1,
          category: 1,
          decision: '$aiDecisions',
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: tickets.map((t) => ({
        ticketId: t.ticketId,
        title: t.title,
        category: t.category,
        agent: t.decision?.agent,
        action: t.decision?.action,
        explanation: t.decision?.explanation,
        confidence: t.decision?.confidence,
        createdAt: t.decision?.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/audit-logs
 * Fetch recent audit trail logs (Admin only)
 */
exports.getAuditLogs = async (req, res, next) => {
  try {
    const userRole = req.user?.role || 'citizen';
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Access Denied. Admin privilege required.' });
    }

    const logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(100);
    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/dashboard/override-ai/:ticketId
 * Manually override AI parameters (Admin only)
 */
exports.overrideAiDecision = async (req, res, next) => {
  try {
    const userRole = req.user?.role || 'citizen';
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Access Denied. Admin privilege required.' });
    }

    const { ticketId } = req.params;
    const { storyPoints, urgency, department, assignedWorker, lockPriority } = req.body;

    const issue = await Issue.findOne({ ticketId });
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    const oldValues = [];
    const newValues = [];

    if (storyPoints !== undefined) {
      oldValues.push(`StoryPoints:${issue.storyPoints}`);
      issue.storyPoints = parseInt(storyPoints, 10);
      newValues.push(`StoryPoints:${storyPoints}`);
    }

    if (urgency) {
      oldValues.push(`Urgency:${issue.urgency}`);
      issue.urgency = urgency;
      newValues.push(`Urgency:${urgency}`);
    }

    if (department) {
      oldValues.push(`Dept:${issue.department}`);
      issue.department = normalizeDepartment(department, issue.category);
      newValues.push(`Dept:${issue.department}`);
    }

    if (assignedWorker !== undefined) {
      oldValues.push(`Worker:${issue.assignedWorker}`);
      issue.assignedWorker = assignedWorker;
      newValues.push(`Worker:${assignedWorker}`);
    }

    if (lockPriority !== undefined) {
      issue.priorityLocked = Boolean(lockPriority);
      newValues.push(`PriorityLocked:${issue.priorityLocked}`);
    } else if (urgency) {
      issue.priorityLocked = true;
    }

    issue.aiSource = 'manual';
    issue.aiDecisions.push({
      agent: 'Admin Override',
      action: 'Administrative AI override applied.',
      explanation: `Manual override: changed fields [${oldValues.join(', ')}] -> [${newValues.join(', ')}]`,
      confidence: 100,
      createdAt: new Date(),
    });

    issue.statusHistory.push({
      status: issue.status,
      note: `Administrative AI override applied. Changed: ${newValues.join(', ')}`,
      updatedBy: req.user?.name || 'Admin',
      updatedAt: new Date(),
    });

    await issue.save({ validateModifiedOnly: true });

    await logAudit(req, 'AI_OVERRIDE', ticketId, oldValues.join(' | '), newValues.join(' | '));

    res.status(200).json({
      success: true,
      message: 'AI decision successfully overridden.',
      issue,
    });
  } catch (error) {
    next(error);
  }
};

const mongoose = require('mongoose');
const SystemEvent = require('../models/SystemEvent');

/**
 * GET /api/dashboard/health
 * Returns the health status of core infrastructure components
 */
exports.getHealthStatus = async (req, res, next) => {
  try {
    const health = {
      ruleEngine: { status: 'Operational', latency: '0ms' },
      mongoDB: { status: mongoose.connection.readyState === 1 ? 'Connected' : 'Offline' },
      ollama: { status: 'Unknown' },
      gemini: { status: 'Unknown' },
      aiCache: { status: 'Operational', entries: 0 }
    };

    try {
      const AICache = require('../models/AICache');
      health.aiCache.entries = await AICache.countDocuments();
    } catch (e) {}

    // Check Ollama
    try {
      const { OLLAMA_BASE_URL } = require('../utils/aiConfig');
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { method: 'GET', signal: AbortSignal.timeout(2000) });
      health.ollama.status = response.ok ? 'Online' : 'Degraded';
    } catch (e) {
      health.ollama.status = 'Offline';
    }

    // Check Gemini (Mock simple check based on env var)
    health.gemini.status = process.env.GEMINI_API_KEY ? 'Available' : 'Unconfigured';

    res.status(200).json({ success: true, data: health });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/feed
 * Returns recent system events for the Operations Feed
 */
exports.getLiveFeed = async (req, res, next) => {
  try {
    const events = await SystemEvent.find({}).sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
};
