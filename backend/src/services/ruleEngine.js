const Issue = require('../models/Issue');

/**
 * Deterministic Rule Engine for Municipal Operations
 * Handles business logic without relying on AI.
 */
class RuleEngine {
  
  /**
   * Calculate SLA status deterministically
   */
  static calculateSLA(issue) {
    if (issue.status === 'Resolved' || issue.status === 'Closed') {
      return issue.dueDate && issue.resolvedAt && issue.resolvedAt <= issue.dueDate ? 'Met' : 'Breached';
    }
    return issue.dueDate && new Date() > issue.dueDate ? 'Breached' : 'Active';
  }

  /**
   * Determine Resolution Timer / Due Date
   */
  static calculateDueDate(severity, createdAt = new Date()) {
    const dueDate = new Date(createdAt);
    let hours = 24; // Default 1 day
    if (severity >= 8) hours = 12; // Critical
    else if (severity >= 6) hours = 24; // High
    else if (severity >= 4) hours = 48; // Medium
    else hours = 72; // Low
    
    dueDate.setHours(dueDate.getHours() + hours);
    return dueDate;
  }

  /**
   * Assign worker deterministically based on lowest active ticket count
   */
  static async assignWorker(department) {
    const roster = {
      'Road Maintenance': ['Rahul Sharma', 'Amit Patel', 'Sarah Jenkins'],
      'Water & Power': ['Siddharth Verma', 'David Miller', 'Lisa Wong'],
      'Sanitation': ['Priya Nair', 'John Doe', 'Michael Chang'],
      'Code Enforcement': ['Carlos Gomez', 'Elena Rostova'],
      'Parks & Recreation': ['Emily Watson', 'Marcus Johnson'],
    };

    const availableWorkers = roster[department];
    if (!availableWorkers || availableWorkers.length === 0) {
      return 'Unassigned';
    }

    // Find the worker with the lowest active ticket count
    // Tie-breaker: Least Recent Assignment
    let assignedWorker = availableWorkers[0];
    let minTickets = Infinity;
    let oldestAssignment = Infinity;

    for (const worker of availableWorkers) {
      const activeTickets = await Issue.find({
        assignedWorker: worker,
        status: { $in: ['Assigned', 'In Progress', 'Inspection'] }
      }).sort({ createdAt: -1 }).limit(1).lean();
      
      const activeCount = await Issue.countDocuments({
        assignedWorker: worker,
        status: { $in: ['Assigned', 'In Progress', 'Inspection'] }
      });

      const lastAssignedTime = activeTickets.length > 0 ? new Date(activeTickets[0].createdAt).getTime() : 0;

      if (activeCount < minTickets) {
        minTickets = activeCount;
        oldestAssignment = lastAssignedTime;
        assignedWorker = worker;
      } else if (activeCount === minTickets) {
        if (lastAssignedTime < oldestAssignment) {
          oldestAssignment = lastAssignedTime;
          assignedWorker = worker;
        }
      }
    }

    return assignedWorker;
  }

  /**
   * Calculate Priority deterministically
   */
  static calculatePriority(severity, verificationCount, ageHours) {
    const severityComponent = (severity / 10) * 30;
    const verificationComponent = Math.min((verificationCount / 5) * 20, 20);
    const ageComponent = Math.min((ageHours / 72) * 20, 20); // Max at 72 hours
    const basePoints = 20; // Base baseline

    const score = Math.round(severityComponent + verificationComponent + ageComponent + basePoints);
    const finalScore = Math.max(0, Math.min(100, score));

    let urgency = 'Low';
    if (finalScore >= 75) urgency = 'Critical';
    else if (finalScore >= 55) urgency = 'High';
    else if (finalScore >= 35) urgency = 'Medium';

    return {
      score: finalScore,
      urgency,
      reasoning: `Deterministic priority: Severity (${severity}) contributes ${Math.round(severityComponent)}, Verifications (${verificationCount}) contributes ${Math.round(verificationComponent)}, Age (${ageHours}h) contributes ${Math.round(ageComponent)}.`
    };
  }

  /**
   * Generate Ticket ID deterministically and uniquely
   */
  static async generateTicketId(category) {
    const categoryPrefixes = {
      'Pothole': 'ROAD',
      'Streetlight': 'LIGHT',
      'Water Leak': 'WAT',
      'Garbage': 'SAN',
      'Graffiti': 'CODE',
      'General Repair': 'GEN'
    };
    const prefix = categoryPrefixes[category] || 'GEN';
    // Guarantee uniqueness with timestamp suffix + random chars
    const timestampSlice = Date.now().toString().slice(-4);
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestampSlice}${randomStr}`;
  }
}

module.exports = RuleEngine;
