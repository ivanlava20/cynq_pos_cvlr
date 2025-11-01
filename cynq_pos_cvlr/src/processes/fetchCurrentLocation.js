// Global location state
let currentLocation = null;
let locationListeners = [];

/**
 * Fetch current device location
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number}>}
 */
export const fetchCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        };

        // Update global location state
        currentLocation = locationData;

        // Notify all listeners
        locationListeners.forEach(listener => listener(locationData));

        console.log('=== LOCATION FETCHED ===');
        console.log(JSON.stringify(locationData, null, 2));
        console.log('========================\n');

        resolve(locationData);
      },
      (error) => {
        const errorMessage = `Location error: ${error.message}`;
        console.error(errorMessage);
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};

/**
 * Get cached location (if available)
 * @returns {Object|null} Location data or null
 */
export const getCachedLocation = () => {
  return currentLocation;
};

/**
 * Subscribe to location updates
 * @param {Function} callback - Function to call when location updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToLocation = (callback) => {
  locationListeners.push(callback);
  
  // If location is already available, call callback immediately
  if (currentLocation) {
    callback(currentLocation);
  }

  // Return unsubscribe function
  return () => {
    locationListeners = locationListeners.filter(listener => listener !== callback);
  };
};

/**
 * Clear cached location
 */
export const clearLocation = () => {
  currentLocation = null;
  locationListeners = [];
};

/**
 * Initialize location on app load
 */
export const initializeLocation = async () => {
  try {
    await fetchCurrentLocation();
    console.log('Location initialized successfully');
  } catch (error) {
    console.error('Failed to initialize location:', error);
  }
};