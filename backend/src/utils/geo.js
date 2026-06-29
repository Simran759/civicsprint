/**
 * Calculates the geodetic distance between two coordinates in meters using the Haversine formula.
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius of the Earth in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Calculates string similarity using Jaccard Similarity of character bigrams.
 * Highly robust against minor spelling errors, typos, and phrasing orders.
 * @param {string} str1 First description
 * @param {string} str2 Second description
 * @returns {number} Percentage similarity (0 to 100)
 */
function calculateTextSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const clean1 = str1.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const clean2 = str2.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  if (clean1 === clean2) return 100;
  if (clean1.length < 2 || clean2.length < 2) return 0;

  const getBigrams = (str) => {
    const bigrams = new Set();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const bigrams1 = getBigrams(clean1);
  const bigrams2 = getBigrams(clean2);

  const intersection = new Set([...bigrams1].filter((x) => bigrams2.has(x)));
  const union = new Set([...bigrams1, ...bigrams2]);

  if (union.size === 0) return 0;
  return (intersection.size / union.size) * 100;
}

module.exports = {
  calculateDistance,
  calculateTextSimilarity,
};
