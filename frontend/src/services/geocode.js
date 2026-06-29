const geocodeCache = {};

/**
 * Resolves GPS coordinates (latitude, longitude) into a readable street address using Nominatim.
 * Caches results locally to avoid unnecessary network requests.
 * @param {number|string} lat Latitude
 * @param {number|string} lng Longitude
 * @returns {Promise<string>} The street address or coordinate fallback
 */
export async function getAddressFromCoords(lat, lng) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return 'Invalid coordinates';
  }

  // Round coordinates to 5 decimal places for caching consistency
  const cacheKey = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  if (geocodeCache[cacheKey]) {
    return geocodeCache[cacheKey];
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=17&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'CivicMind-AI-Hyperlocal-Reporter/1.0.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP status: ${response.status}`);
    }

    const data = await response.json();
    
    // Parse response fields to get a clean, human-readable address
    if (data.display_name) {
      // Split the address parts and take the first few relevant parts (street, suburb, city)
      const parts = data.display_name.split(', ');
      let cleanAddress = parts.slice(0, 4).join(', ');
      
      // Cache and return
      geocodeCache[cacheKey] = cleanAddress;
      return cleanAddress;
    }

    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  } catch (error) {
    console.warn('OSM Nominatim Geocode Request Failed:', error.message);
    // Return coordinate fallback
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
}

export default getAddressFromCoords;
