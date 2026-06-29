const express = require('express');
const router = express.Router();
const issueController = require('../controllers/issueController');
const upload = require('../middleware/upload');

// Base path: /api/issues

// Create issue - handles single image upload in the 'image' form-data key
router.post('/', upload.single('image'), issueController.createIssue);

// Get all issues (supports sorting, filters, search, pagination)
router.get('/', issueController.getIssues);

// Get issue by ID
router.get('/:id', issueController.getIssueById);

// Update issue status (allows upload of 'afterImage' completion photo)
router.patch('/:id/status', upload.single('afterImage'), issueController.updateIssueStatus);

// Reassign ticket worker/department
router.patch('/:id/reassign', issueController.reassignTicket);

// Escalate ticket priority/severity
router.patch('/:id/escalate', issueController.escalateTicket);

// Add comment to ticket
router.post('/:id/comments', issueController.addComment);

// Request materials for ticket
router.post('/:id/materials', issueController.requestMaterials);

// Review AI Recommendation
router.patch('/:id/recommendations/:type', issueController.reviewRecommendation);

module.exports = router;
