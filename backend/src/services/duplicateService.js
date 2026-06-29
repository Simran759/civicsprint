const Issue = require('../models/Issue');
const Verification = require('../models/Verification');
const { calculateTextSimilarity } = require('../utils/geo');

/**
 * Searches for duplicates and merges if found, otherwise returns null.
 * @param {Object} reportDetails Details of the reported issue
 * @param {string} reportDetails.category Issue category from Gemini analysis
 * @param {string} reportDetails.description Citizen description
 * @param {Array<number>} reportDetails.coordinates GPS coordinates [longitude, latitude]
 * @param {string} reportDetails.imageUrl Image file URL
 * @param {string} reportDetails.citizenEmail Reporter's email
 * @returns {Promise<Object|null>} The merged issue object if duplicate, or null if unique.
 */
async function processDuplicateCheck({
  category,
  description,
  coordinates,
  imageUrl,
  citizenEmail,
}) {
  // 1. Search for existing issues in the same category that are not yet resolved,
  // and lie within a 100-meter radius of the reported location using MongoDB 2dsphere index.
  const candidateIssues = await Issue.find({
    category,
    status: { $in: ['Backlog', 'Ready', 'Assigned', 'In Progress', 'Inspection'] },
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates, // [lng, lat]
        },
        $maxDistance: 100, // MongoDB $near uses meters for 2dsphere index
      },
    },
  });

  // 2. Perform text similarity assessment for each candidate issue
  for (const issue of candidateIssues) {
    const similarity = calculateTextSimilarity(description, issue.description);

    if (similarity > 80) {
      // Security Check: Same person duplicate prevention.
      // Scan verification timeline records to check if this citizen email has already filed a report here.
      const alreadyReported = issue.verifications.some(
        (v) => v.citizenEmail.toLowerCase() === citizenEmail.toLowerCase()
      );

      if (alreadyReported) {
        console.log(`Duplicate report blocked: citizen ${citizenEmail} has already reported this issue.`);
        return { status: 'already_reported', issue };
      }

      const duplicateMessage = `Duplicate detected! Similarity: ${similarity.toFixed(2)}%. Merging report with Issue ID: ${issue._id} from different citizen.`;
      console.log(duplicateMessage);

      // Create a verification audit record
      const verificationRecord = new Verification({
        issueId: issue._id,
        citizenEmail,
        description,
        imageUrl,
      });
      await verificationRecord.save();

      // Append verification to the issue's historical array
      issue.verifications.push({
        description,
        imageUrl,
        citizenEmail,
        createdAt: new Date(),
      });

      // Escalation Rule: Increment verification count, scale severity by +1, and adjust urgency
      issue.verificationCount += 1;
      issue.severity = Math.min(10, issue.severity + 1);

      // Dynamically adjust urgency tier based on escalated severity
      if (issue.severity >= 8) {
        issue.urgency = 'Critical';
      } else if (issue.severity >= 6) {
        issue.urgency = 'High';
      } else if (issue.severity >= 4) {
        issue.urgency = 'Medium';
      }
      issue.statusHistory.push({
        status: issue.status,
        note: `Duplicate report merged from citizen ${citizenEmail}. Severity escalated to ${issue.severity}.`,
        updatedBy: 'Agent 3: Duplicate Merge Agent',
        updatedAt: new Date()
      });

      await issue.save();

      return { status: 'merged', issue, message: duplicateMessage };
    }
  }

  // No duplicates found
  return null;
}

module.exports = {
  processDuplicateCheck,
};
