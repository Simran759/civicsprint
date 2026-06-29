const Issue = require('../models/Issue');
const aiFactory = require('./ai/AIProviderFactory');
const { isAiEnabled } = require('../utils/aiConfig');

/**
 * Helper to get the primary AI provider
 */
function getAiProvider() {
  if (!isAiEnabled()) return null;
  return aiFactory.getPrimaryProvider();
}

// ═══════════════════════════════════════════════════════════════
// AGENT 8 — MUNICIPAL OPERATIONS COPILOT
// ═══════════════════════════════════════════════════════════════
async function runCopilotAgent(systemState) {
  const provider = getAiProvider();
  if (!provider) {
    const mock = getMockCopilotInsights(systemState);
    mock.dataSource = 'mock';
    return mock;
  }

  try {
    const prompt = `Analyze the current system state and generate actionable operational insights:
${JSON.stringify(systemState, null, 2)}

Generate 5-8 specific, actionable insights. Each insight must include:
- insight (string)
- severity ('info', 'warning', 'critical')
- category (string)
- explanation (string)`;

    const result = await provider.generateContent(prompt, {
      responseFormat: 'json',
      schema: {
        type: 'OBJECT',
        properties: {
          insights: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                insight: { type: 'STRING' },
                severity: { type: 'STRING', enum: ['info', 'warning', 'critical'] },
                category: { type: 'STRING' },
                explanation: { type: 'STRING' }
              },
              required: ['insight', 'severity', 'category', 'explanation']
            }
          }
        },
        required: ['insights'],
      }
    });

    const parsed = result.parsed;
    parsed.dataSource = result.provider;
    return parsed;
  } catch (error) {
    console.error('Error with Copilot Agent:', error);
    const mock = getMockCopilotInsights(systemState);
    mock.dataSource = 'mock';
    return mock;
  }
}

// ═══════════════════════════════════════════════════════════════
// AGENT 9 — PRIORITY OPTIMIZER (Recommendation Only)
// ═══════════════════════════════════════════════════════════════
async function runPriorityOptimizer(ticket, nearbyTicketCount = 0) {
  const provider = getAiProvider();
  if (!provider) {
    const formulaResult = getMockPriorityScore(ticket, nearbyTicketCount);
    formulaResult.dataSource = 'mock';
    return formulaResult;
  }

  try {
    const ageHours = Math.ceil((Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60));
    
    const prompt = `Review this ticket and suggest a priority level (Recommendation only):
Ticket: ${ticket.ticketId || 'UNKNOWN'}
Category: ${ticket.category}
Severity: ${ticket.severity}/10
Urgency: ${ticket.urgency}
Verification Count: ${ticket.verificationCount}
Age: ${ageHours} hours since reported
Nearby Unresolved Tickets: ${nearbyTicketCount}

Calculate:
1. priorityScore: 0-100
2. newUrgency: Low/Medium/High/Critical
3. explanation: Why this priority is suggested.
4. alternative: Alternative urgency if conditions change.`;

    const result = await provider.generateContent(prompt, {
      responseFormat: 'json',
      schema: {
        type: 'OBJECT',
        properties: {
          priorityScore: { type: 'INTEGER' },
          newUrgency: { type: 'STRING', enum: ['Low', 'Medium', 'High', 'Critical'] },
          explanation: { type: 'STRING' },
          alternative: { type: 'STRING' }
        },
        required: ['priorityScore', 'newUrgency', 'explanation', 'alternative'],
      }
    });

    const parsed = result.parsed;
    parsed.dataSource = result.provider;
    return parsed;
  } catch (error) {
    console.error('Error with Priority Optimizer Agent:', error);
    const formulaResult = getMockPriorityScore(ticket, nearbyTicketCount);
    formulaResult.dataSource = 'mock';
    return formulaResult;
  }
}

// ═══════════════════════════════════════════════════════════════
// AGENT 10 — MUNICIPAL KNOWLEDGE BASE
// ═══════════════════════════════════════════════════════════════
async function runKnowledgeBaseAgent(category, description, coordinates) {
  try {
    const historicalTickets = await Issue.find({
      category: category,
      status: { $in: ['Resolved', 'Closed'] },
    }).limit(50).lean();

    if (historicalTickets.length === 0) {
      return {
        avgRepairTimeHours: null,
        avgCostUSD: null,
        commonRootCause: 'No historical data available for this category yet.',
        successfulStrategy: 'Apply standard municipal repair protocol.',
        pastDepartment: 'Unknown',
        similarTicketCount: 0,
      };
    }

    const repairTimes = historicalTickets.map(t => t.resolutionTime).filter(t => t && t > 0);
    const avgRepairTimeHours = repairTimes.length > 0 ? Math.round(repairTimes.reduce((a, b) => a + b, 0) / repairTimes.length) : null;

    const costs = historicalTickets.map(t => {
      if (!t.estimatedRepairCost) return null;
      const match = t.estimatedRepairCost.replace(/[^0-9.]/g, '');
      return match ? parseFloat(match) : null;
    }).filter(c => c && c > 0);
    const avgCostUSD = costs.length > 0 ? Math.round(costs.reduce((a, b) => a + b, 0) / costs.length) : null;

    const deptCounts = {};
    historicalTickets.forEach(t => {
      deptCounts[t.department] = (deptCounts[t.department] || 0) + 1;
    });
    const pastDepartment = Object.entries(deptCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

    // If we have plenty of historical data, just use mock descriptions to save AI calls (Rule Engine first)
    // Only call AI if we want a nuanced summarization. Let's call it for summarization if enabled.
    const provider = getAiProvider();
    if (provider) {
      try {
        const historySummary = historicalTickets.slice(0, 5).map(t => ({
          description: t.description?.substring(0, 100),
          resolutionTime: t.resolutionTime,
        }));
        
        const prompt = `Based on these past resolved tickets for "${category}":
${JSON.stringify(historySummary, null, 2)}
New issue: "${description}"

Provide: commonRootCause and successfulStrategy.`;

        const result = await provider.generateContent(prompt, {
          responseFormat: 'json',
          schema: {
            type: 'OBJECT',
            properties: {
              commonRootCause: { type: 'STRING' },
              successfulStrategy: { type: 'STRING' }
            },
            required: ['commonRootCause', 'successfulStrategy'],
          }
        });

        return {
          avgRepairTimeHours,
          avgCostUSD,
          commonRootCause: result.parsed.commonRootCause,
          successfulStrategy: result.parsed.successfulStrategy,
          pastDepartment,
          similarTicketCount: historicalTickets.length,
        };
      } catch (err) {
        console.error('KB AI analysis failed, using fallback:', err.message);
      }
    }

    return {
      avgRepairTimeHours,
      avgCostUSD,
      commonRootCause: 'Infrastructure wear and environmental degradation.',
      successfulStrategy: 'Apply standard municipal repair procedures with quality inspection.',
      pastDepartment,
      similarTicketCount: historicalTickets.length,
    };
  } catch (error) {
    console.error('Error with Knowledge Base Agent:', error);
    return {
      avgRepairTimeHours: null, avgCostUSD: null,
      commonRootCause: 'Knowledge base query failed.', successfulStrategy: 'Apply standard repair protocol.',
      pastDepartment: 'Unknown', similarTicketCount: 0,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// AGENT 11 — EXECUTIVE BRIEFING GENERATOR
// ═══════════════════════════════════════════════════════════════
async function runExecutiveBriefingAgent(dashboardData, allTickets, riskZones) {
  const provider = getAiProvider();
  if (!provider) {
    return getMockExecutiveBriefing(dashboardData, allTickets, riskZones);
  }

  try {
    const ticketsSummary = allTickets.slice(0, 30).map(t => ({
      ticketId: t.ticketId, category: t.category, severity: t.severity, status: t.status, department: t.department
    }));

    const prompt = `Generate an executive briefing report in Markdown format.
Dashboard Data: ${JSON.stringify(dashboardData)}
Active Tickets: ${JSON.stringify(ticketsSummary)}
Risk Zones: ${JSON.stringify(riskZones || [])}

Provide: report (markdown), criticalCount, slaCompliancePercent, topRecommendation.`;

    const result = await provider.generateContent(prompt, {
      responseFormat: 'json',
      schema: {
        type: 'OBJECT',
        properties: {
          report: { type: 'STRING' },
          criticalCount: { type: 'INTEGER' },
          slaCompliancePercent: { type: 'INTEGER' },
          topRecommendation: { type: 'STRING' }
        },
        required: ['report', 'criticalCount', 'slaCompliancePercent', 'topRecommendation'],
      }
    });

    const parsed = result.parsed;
    parsed.generatedAt = new Date().toISOString();
    return parsed;
  } catch (error) {
    console.error('Error with Executive Briefing Agent:', error);
    return getMockExecutiveBriefing(dashboardData, allTickets, riskZones);
  }
}

// ═══════════════════════════════════════════════════════════════
// AGENT 12 — RESOURCE OPTIMIZER (Recommendation Only)
// ═══════════════════════════════════════════════════════════════
async function runResourceOptimizer(ticket, nearbyTickets = []) {
  const provider = getAiProvider();
  if (!provider) {
    return getMockResourceEstimate(ticket, nearbyTickets);
  }

  try {
    const prompt = `Estimate resources required for this civic repair ticket:
Ticket: ${ticket.ticketId || 'NEW'}
Category: ${ticket.category}
Severity: ${ticket.severity}/10
Description: ${ticket.description?.substring(0, 200)}

Calculate: workersRequired, equipment, materials, estimatedDurationHours, estimatedCostUSD, nearbyGrouping.`;

    const result = await provider.generateContent(prompt, {
      responseFormat: 'json',
      schema: {
        type: 'OBJECT',
        properties: {
          workersRequired: { type: 'INTEGER' },
          equipment: { type: 'ARRAY', items: { type: 'STRING' } },
          materials: { type: 'ARRAY', items: { type: 'STRING' } },
          estimatedDurationHours: { type: 'INTEGER' },
          estimatedCostUSD: { type: 'INTEGER' },
          nearbyGrouping: { type: 'STRING' }
        },
        required: ['workersRequired', 'equipment', 'materials', 'estimatedDurationHours', 'estimatedCostUSD', 'nearbyGrouping'],
      }
    });

    return result.parsed;
  } catch (error) {
    console.error('Error with Resource Optimizer Agent:', error);
    return getMockResourceEstimate(ticket, nearbyTickets);
  }
}

// -----------------------------------------------------------------------------
// MOCK GENERATORS
// -----------------------------------------------------------------------------
function getMockCopilotInsights(state) {
  return { insights: [{ insight: 'System operating normally.', severity: 'info', category: 'efficiency', explanation: 'Mock insight fallback.' }] };
}

function getMockPriorityScore(ticket, nearbyTicketCount = 0) {
  return { priorityScore: 50, newUrgency: 'Medium', explanation: 'Mock Priority based on basic rule.', alternative: 'High' };
}

function getMockExecutiveBriefing(data, tickets, riskZones) {
  return {
    report: `# Executive Briefing\n\nAI is currently unavailable. Displaying basic metrics.\nTotal Issues: ${data?.totalIssues || 0}`,
    generatedAt: new Date().toISOString(),
    criticalCount: 0,
    slaCompliancePercent: 100,
    topRecommendation: 'Restore AI services for full briefing.'
  };
}

function getMockResourceEstimate(ticket, nearbyTickets = []) {
  return {
    workersRequired: 2,
    equipment: ['Standard Tools'],
    materials: ['Standard Supplies'],
    estimatedDurationHours: 4,
    estimatedCostUSD: 500,
    nearbyGrouping: 'None'
  };
}

module.exports = {
  runCopilotAgent,
  runPriorityOptimizer,
  runKnowledgeBaseAgent,
  runExecutiveBriefingAgent,
  runResourceOptimizer
};
