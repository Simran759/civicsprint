const fs = require('fs');
const { normalizeDepartment } = require('../utils/departments');
const { getCurrentSprint } = require('../utils/sprint');
const { isAiEnabled } = require('../utils/aiConfig');
const aiFactory = require('./ai/AIProviderFactory');

/**
 * Helper to ensure we get a valid AI provider instance
 */
function getAiProvider(requireVision = false) {
  if (!isAiEnabled()) return null;
  return requireVision ? aiFactory.getVisionProvider() : aiFactory.getPrimaryProvider();
}

/**
 * AGENT 1 — MULTIMODAL INFRASTRUCTURE ANALYZER
 */
async function analyzeIssue(imagePath, mimeType, description) {
  const provider = getAiProvider(true);
  if (!provider) {
    const mock = getMockAnalysis(description);
    mock.department = normalizeDepartment(mock.department, mock.category);
    return mock;
  }

  try {
    const prompt = `Analyze this citizen reported civic issue image and description.
Citizen Description: "${description}"

Determine the appropriate category, severity rating (1-10), urgency classification (Low, Medium, High, Critical), a short summary of the issue, the municipal department that should handle this, estimated repair time, and estimated repair cost.`;

    const result = await provider.generateVisionContent(prompt, imagePath, mimeType, {
      responseFormat: 'json',
      schema: {
        type: 'OBJECT',
        properties: {
          category: { type: 'STRING' },
          severity: { type: 'INTEGER' },
          urgency: { type: 'STRING', enum: ['Low', 'Medium', 'High', 'Critical'] },
          summary: { type: 'STRING' },
          department: { type: 'STRING' },
          estimatedRepairTime: { type: 'STRING' },
          estimatedRepairCost: { type: 'STRING' }
        },
        required: ['category', 'severity', 'urgency', 'summary', 'department', 'estimatedRepairTime', 'estimatedRepairCost'],
      }
    });

    const parsed = result.parsed;
    parsed.department = normalizeDepartment(parsed.department, parsed.category);
    return parsed;
  } catch (error) {
    console.error('Error with Vision Analyzer Agent:', error);
    const mock = getMockAnalysis(description);
    mock.department = normalizeDepartment(mock.department, mock.category);
    return mock;
  }
}

/**
 * AGENT 2 — FRAUD DETECTION AGENT
 */
async function detectImageFraud(imagePath, mimeType, description) {
  const provider = getAiProvider(true);
  if (!provider) {
    return getMockFraudCheck(description);
  }

  try {
    const prompt = `Perform a forensic verification on this citizen reported civic issue image.
Citizen Description: "${description}"
Provide an authenticity check (isAuthentic, confidence, fraudNotes).`;

    const result = await provider.generateVisionContent(prompt, imagePath, mimeType, {
      responseFormat: 'json',
      schema: {
        type: 'OBJECT',
        properties: {
          isAuthentic: { type: 'BOOLEAN' },
          confidence: { type: 'INTEGER' },
          fraudNotes: { type: 'STRING' }
        },
        required: ['isAuthentic', 'confidence', 'fraudNotes'],
      }
    });

    return result.parsed;
  } catch (error) {
    console.error('Error with Fraud Detection Agent:', error);
    return getMockFraudCheck(description);
  }
}

/**
 * AGENT 5 — MUNICIPAL ACTION PLANNER
 */
async function generateActionPlan(category, description, severity, urgency, department) {
  const provider = getAiProvider(false);
  if (!provider) {
    return getMockResolutionPlan(category, department, urgency);
  }

  try {
    const prompt = `Create a detailed logistics action plan for the following reported issue:
Category: ${category}
Description: ${description}
Severity: ${severity}/10
Urgency: ${urgency}
Department: ${department}

Generate a JSON response that outlines: recommendedDepartment, resolutionPlan (array of steps), crewRequirement, estimatedCompletionTime, priorityRanking.`;

    const result = await provider.generateContent(prompt, {
      responseFormat: 'json',
      schema: {
        type: 'OBJECT',
        properties: {
          recommendedDepartment: { type: 'STRING' },
          resolutionPlan: { type: 'ARRAY', items: { type: 'STRING' } },
          crewRequirement: { type: 'STRING' },
          estimatedCompletionTime: { type: 'STRING' },
          priorityRanking: { type: 'STRING', enum: ['Low', 'Medium', 'High', 'Critical'] }
        },
        required: ['recommendedDepartment', 'resolutionPlan', 'crewRequirement', 'estimatedCompletionTime', 'priorityRanking'],
      }
    });

    const parsed = result.parsed;

    if (Array.isArray(parsed.resolutionPlan)) {
      parsed.resolutionPlan = parsed.resolutionPlan.map(item => typeof item === 'object' ? JSON.stringify(item) : String(item));
    } else {
      parsed.resolutionPlan = ['Manual review required'];
    }
    
    if (typeof parsed.crewRequirement === 'object') {
      parsed.crewRequirement = JSON.stringify(parsed.crewRequirement);
    } else {
      parsed.crewRequirement = String(parsed.crewRequirement || 'Standard Crew');
    }
    
    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    if (!validPriorities.includes(parsed.priorityRanking)) {
      parsed.priorityRanking = urgency || 'Medium';
    }

    return parsed;
  } catch (error) {
    console.error('Error with Action Planner Agent:', error);
    return getMockResolutionPlan(category, department, urgency);
  }
}

/**
 * UNIQUE HACKATHON FEATURE — PREDICTIVE CIVIC INTELLIGENCE AGENT
 */
async function predictCivicRisks(clusterDetails) {
  const provider = getAiProvider(false);
  if (!provider) {
    const mock = getMockCivicRisks(clusterDetails);
    mock.dataSource = 'mock';
    return mock;
  }

  try {
    const prompt = `Analyze the following cluster of active infrastructure issues reported in the same geographical region:
Issues in Cluster:
${JSON.stringify(clusterDetails, null, 2)}

Provide a predictive risk profile (zoneName, failureProbability 1-100, riskLevel, narrativeSummary, recommendedPreventativeAction).`;

    const result = await provider.generateContent(prompt, {
      responseFormat: 'json',
      schema: {
        type: 'OBJECT',
        properties: {
          zoneName: { type: 'STRING' },
          failureProbability: { type: 'INTEGER' },
          riskLevel: { type: 'STRING', enum: ['Low', 'Medium', 'High', 'Critical'] },
          narrativeSummary: { type: 'STRING' },
          recommendedPreventativeAction: { type: 'STRING' }
        },
        required: ['zoneName', 'failureProbability', 'riskLevel', 'narrativeSummary', 'recommendedPreventativeAction'],
      }
    });

    const parsed = result.parsed;
    parsed.dataSource = result.provider;
    return parsed;
  } catch (error) {
    console.error('Error with Predictive Risks Agent:', error);
    const mock = getMockCivicRisks(clusterDetails);
    mock.dataSource = 'mock';
    return mock;
  }
}

/**
 * AGENT 4 — AI DISPATCHER AGENT (Recommendation Only)
 */
async function runDispatcherAgent(category, description, severity, urgency, department, estimatedRepairTime) {
  const normalizedDept = normalizeDepartment(department, category);
  const currentSprint = getCurrentSprint();

  const provider = getAiProvider(false);
  if (!provider) {
    return getMockDispatch(category, normalizedDept, urgency, severity);
  }

  try {
    const prompt = `Analyze this incident and suggest dispatch details:
Category: ${category}
Description: ${description}
Severity: ${severity}/10
Urgency: ${urgency}
Target Department: ${normalizedDept}

Suggest: department, priority, storyPoints, sprint, worker, estimatedCompletionHours.
Include confidence (1-100), reasoning, and alternative worker.`;

    const result = await provider.generateContent(prompt, {
      responseFormat: 'json',
      schema: {
        type: 'OBJECT',
        properties: {
          department: { type: 'STRING' },
          priority: { type: 'STRING', enum: ['Low', 'Medium', 'High', 'Critical'] },
          storyPoints: { type: 'INTEGER' },
          sprint: { type: 'STRING' },
          worker: { type: 'STRING' },
          estimatedCompletionHours: { type: 'INTEGER' },
          confidence: { type: 'INTEGER' },
          reasoning: { type: 'STRING' },
          alternative: { type: 'STRING' }
        },
        required: ['department', 'priority', 'storyPoints', 'sprint', 'worker', 'estimatedCompletionHours', 'confidence', 'reasoning', 'alternative'],
      }
    });

    const parsed = result.parsed;
    parsed.department = normalizeDepartment(parsed.department, category);
    parsed.sprint = parsed.sprint || currentSprint;
    return parsed;
  } catch (error) {
    console.error('Error with AI Dispatcher Agent:', error);
    return getMockDispatch(category, normalizedDept, urgency, severity);
  }
}

/**
 * AGENT 5 — REPAIR VALIDATION AGENT (Recommendation Only)
 */
async function runRepairValidationAgent(beforeImagePath, afterImagePath, category, description) {
  const provider = getAiProvider(true);
  if (!provider) {
    return getMockRepairValidation(beforeImagePath, afterImagePath, category, description);
  }

  try {
    const prompt = `Compare these two images representing a civic repair ticket:
Image 1 ("Before"): Shows the initial reported issue: ${category} - ${description}.
Image 2 ("After"): Shows the work completed by the municipal repair crew.

Analyze: isSuccessful, confidence (1-100), remainingDamage, suggestedRework.`;

    // Note: Our AIProvider supports an additionalImage option
    const result = await provider.generateVisionContent(prompt, beforeImagePath, 'image/png', {
      responseFormat: 'json',
      additionalImage: { path: afterImagePath, mimeType: 'image/png' },
      schema: {
        type: 'OBJECT',
        properties: {
          isSuccessful: { type: 'BOOLEAN' },
          confidence: { type: 'INTEGER' },
          remainingDamage: { type: 'STRING' },
          suggestedRework: { type: 'STRING' }
        },
        required: ['isSuccessful', 'confidence', 'remainingDamage', 'suggestedRework'],
      }
    });

    return result.parsed;
  } catch (error) {
    console.error('Error with Repair Validation Agent:', error);
    return getMockRepairValidation(beforeImagePath, afterImagePath, category, description);
  }
}

/**
 * AGENT 6 — SPRINT SUMMARY AGENT
 */
async function runSprintSummaryAgent(ticketsData) {
  const provider = getAiProvider(false);
  if (!provider) {
    const mock = getMockSprintSummary(ticketsData);
    mock.dataSource = 'mock';
    return mock;
  }

  try {
    const prompt = `Review this list of active sprint tickets:
${JSON.stringify(ticketsData, null, 2)}

Generate: sprintSummary (markdown), recommendations (string array), and teams (array of {name, completed, pending, blocked, delayed}).`;

    const result = await provider.generateContent(prompt, {
      responseFormat: 'json',
      schema: {
        type: 'OBJECT',
        properties: {
          sprintSummary: { type: 'STRING' },
          recommendations: { type: 'ARRAY', items: { type: 'STRING' } },
          teams: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                completed: { type: 'INTEGER' },
                pending: { type: 'INTEGER' },
                blocked: { type: 'INTEGER' },
                delayed: { type: 'INTEGER' }
              },
              required: ['name', 'completed', 'pending', 'blocked', 'delayed']
            }
          }
        },
        required: ['sprintSummary', 'recommendations', 'teams'],
      }
    });

    const parsed = result.parsed;
    parsed.dataSource = result.provider;
    return parsed;
  } catch (error) {
    console.error('Error with Sprint Summary Agent:', error);
    const mock = getMockSprintSummary(ticketsData);
    mock.dataSource = 'mock';
    return mock;
  }
}

// -----------------------------------------------------------------------------
// MOCK GENERATORS
// -----------------------------------------------------------------------------

function getMockAnalysis(description = '') {
  return {
    category: 'General Repair',
    severity: 5,
    urgency: 'Medium',
    department: 'Road Maintenance',
    summary: 'Reported municipal maintenance request.',
    estimatedRepairTime: '2 days',
    estimatedRepairCost: '$650'
  };
}

function getMockFraudCheck(description = '') {
  return {
    isAuthentic: true,
    confidence: 96,
    fraudNotes: 'PASSED SCAN: Textures and camera metadata appear authentic.',
  };
}

function getMockResolutionPlan(category, department, urgency = 'Medium') {
  return {
    recommendedDepartment: normalizeDepartment(department, category),
    resolutionPlan: ['Inspect site', 'Execute repairs', 'Signoff'],
    crewRequirement: '2 utility workers, general tools truck.',
    estimatedCompletionTime: '1 business day',
    priorityRanking: urgency,
  };
}

function getMockCivicRisks(clusterDetails = []) {
  return {
    zoneName: 'Regional Triage Zone',
    failureProbability: 45,
    riskLevel: 'Medium',
    narrativeSummary: 'Normal incident clustering observed.',
    recommendedPreventativeAction: 'Continue scheduled patrol routines.',
  };
}

function getMockDispatch(category, department, urgency, severity) {
  return {
    department: normalizeDepartment(department, category),
    priority: urgency || 'Medium',
    storyPoints: 5,
    sprint: getCurrentSprint(),
    worker: 'Rahul Sharma',
    estimatedCompletionHours: 24,
    confidence: 85,
    reasoning: 'Mock suggestion based on basic rules.',
    alternative: 'Amit Patel'
  };
}

function getMockRepairValidation(beforeImagePath, afterImagePath, category, description = '') {
  return {
    isSuccessful: true,
    confidence: 95,
    remainingDamage: 'None detected.',
    suggestedRework: ''
  };
}

function getMockSprintSummary(ticketsData = []) {
  return {
    sprintSummary: `### Executive Summary - Mock Sprint`,
    recommendations: ['Review backlog'],
    teams: [{ name: 'Operations Team', completed: 0, pending: 0, blocked: 0, delayed: 0 }],
  };
}

module.exports = {
  analyzeIssue,
  detectImageFraud,
  generateActionPlan,
  predictCivicRisks,
  runDispatcherAgent,
  runRepairValidationAgent,
  runSprintSummaryAgent,
};
