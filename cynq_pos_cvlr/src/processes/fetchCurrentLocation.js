import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../../firebase';
import { store } from '../config/env';

// Global location state
let currentLocation = null;
let locationListeners = [];

const isHardwareLocationError = (error) => {
  const rawMessage = String(error?.message || '').toLowerCase();
  return (
    rawMessage.includes('locationservices.api is not available') ||
    rawMessage.includes('service_invalid') ||
    rawMessage.includes('statuscode=service_invalid') ||
    rawMessage.includes('connectionresult{statuscode=service_invalid') ||
    rawMessage.includes('google play services')
  );
};

const getNavigatorLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator?.geolocation) {
      reject(new Error('Geolocation is not supported by your browser/device'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        });
      },
      (error) => {
        reject(new Error(error?.message || 'Navigator geolocation failed'));
      },
      {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 120000
      }
    );
  });
};

const toLocationDataFromExpo = (position) => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy,
  timestamp: new Date().toISOString()
});

const getExpoLocation = async () => {
  const Location = await import('expo-location');
  const locationModule = Location?.default || Location;
  if (!locationModule?.requestForegroundPermissionsAsync || !locationModule?.getCurrentPositionAsync) {
    throw new Error('Expo location module is unavailable');
  }

  const permission = await locationModule.requestForegroundPermissionsAsync();
  if (permission?.status !== 'granted') {
    throw new Error('Location permission denied');
  }

  const accuracyLevels = [
    locationModule.Accuracy?.Highest,
    locationModule.Accuracy?.Balanced,
    locationModule.Accuracy?.Lowest
  ].filter((value) => value !== undefined);

  let lastError = null;
  for (const accuracy of accuracyLevels) {
    try {
      const position = await locationModule.getCurrentPositionAsync({ accuracy });
      return toLocationDataFromExpo(position);
    } catch (error) {
      lastError = error;
    }
  }

  if (typeof locationModule.getLastKnownPositionAsync === 'function') {
    try {
      const lastKnown = await locationModule.getLastKnownPositionAsync();
      if (lastKnown?.coords) {
        return toLocationDataFromExpo(lastKnown);
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Failed to load location via Expo location');
};

const fetchBranchLocationFallback = async () => {
  const branchCode = String(store.branchCode || '').trim();
  if (!branchCode || !firestore) {
    throw new Error('Branch location fallback is unavailable');
  }

  const branchQuery = query(
    collection(firestore, 'BRANCH_DETAILS'),
    where('branchCode', '==', branchCode)
  );

  const snapshot = await getDocs(branchQuery);
  if (snapshot.empty) {
    throw new Error(`No branch location found for ${branchCode}`);
  }

  const row = snapshot.docs[0]?.data() || {};
  const latitude = Number(row.branchLatExact);
  const longitude = Number(row.branchLongExact);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Branch location coordinates are invalid');
  }

  return {
    latitude,
    longitude,
    accuracy: 5,
    timestamp: new Date().toISOString()
  };
};

const setCurrentLocation = (locationData) => {
  currentLocation = locationData;
  locationListeners.forEach((listener) => listener(locationData));

  console.log('=== LOCATION FETCHED ===');
  console.log(JSON.stringify(locationData, null, 2));
  console.log('========================\n');
};

/**
 * Fetch current device location
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number}>}
 */
export const fetchCurrentLocation = () => {
  return new Promise(async (resolve, reject) => {
    let lastError = null;

    try {
      const locationData = await getExpoLocation();
      setCurrentLocation(locationData);
      resolve(locationData);
      return;
    } catch (error) {
      lastError = error;
    }

    try {
      const locationData = await getNavigatorLocation();
      setCurrentLocation(locationData);
      resolve(locationData);
      return;
    } catch (error) {
      lastError = error;
    }

    try {
      const locationData = await fetchBranchLocationFallback();
      setCurrentLocation(locationData);
      resolve(locationData);
      return;
    } catch (error) {
      lastError = error;
    }

    if (currentLocation) {
      resolve(currentLocation);
      return;
    }

    const errorMessage = `Location error: ${lastError?.message || 'Failed to fetch location'}`;
    console.error(errorMessage);
    reject(new Error(errorMessage));
  });
};

export const getLocationErrorMessage = (error) => {
  if (isHardwareLocationError(error)) {
    return 'Location service is unavailable on this device (Google Play Location Services not supported). Please use a device with Google Play Services, or update/re-enable Google Play Services and try again.';
  }

  const rawMessage = String(error?.message || '').toLowerCase();
  if (
    rawMessage.includes('unsatisfied') ||
    rawMessage.includes('settings') ||
    rawMessage.includes('location services') ||
    rawMessage.includes('provider')
  ) {
    return 'Location request failed because device location settings are not enabled. Turn on Location and set accuracy to High/Balanced, then tap Refresh.';
  }

  return error?.message || 'Failed to load location';
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