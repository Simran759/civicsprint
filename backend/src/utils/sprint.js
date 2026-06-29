/** Derive active sprint label from calendar week (replaces hardcoded "Sprint 12") */

function getCurrentSprint(referenceDate = new Date()) {
  const startOfYear = new Date(referenceDate.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((referenceDate - startOfYear) / (24 * 60 * 60 * 1000)) + 1;
  const sprintNumber = Math.ceil(dayOfYear / 14);
  return `Sprint ${sprintNumber}`;
}

module.exports = { getCurrentSprint };
