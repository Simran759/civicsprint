const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Base path: /api/dashboard

// Retrieve metrics summary (MongoDB-only, fast)
router.get('/stats', dashboardController.getDashboardStats);

// Retrieve system health status
router.get('/health', dashboardController.getHealthStatus);

// Retrieve live operations feed
router.get('/feed', dashboardController.getLiveFeed);

// On-demand AI insights (copilot + risk zones, no DB mutations)
router.post('/ai-insights', dashboardController.getAiInsights);

// Explicit priority recalculation (Agent 9)
router.post('/recalculate-priorities', dashboardController.recalculatePriorities);

// Retrieve daily AI sprint operations brief
router.get('/sprint-summary', dashboardController.getSprintSummary);

// Generate executive briefing report (Agent 11)
router.get('/executive-briefing', dashboardController.getExecutiveBriefing);

// Retrieve recent AI decision log entries
router.get('/ai-decisions', dashboardController.getAiDecisions);

// Retrieve audit logs trail (Admin only)
router.get('/audit-logs', dashboardController.getAuditLogs);

// Perform AI parameter override (Admin only)
router.post('/override-ai/:ticketId', dashboardController.overrideAiDecision);

module.exports = router;
