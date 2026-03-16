import React, { createContext, useContext, useState, useEffect } from 'react';

const defaultUserContextValue = {
  userData: {
    employeeId: null,
    name: null,
    latitude: null,
    longitude: null
  },
  setUser: () => {},
  clearUser: () => {}
};

const UserContext = createContext(defaultUserContextValue);

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState({
    employeeId: null,
    name: null,
    latitude: null,
    longitude: null
  });

  useEffect(() => {
    const hasBrowserGeolocation =
      typeof navigator !== 'undefined' &&
      navigator?.geolocation &&
      typeof navigator.geolocation.getCurrentPosition === 'function';

    if (hasBrowserGeolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserData((prev) => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  const setUser = (employeeId, name) => {
    setUserData((prev) => ({
      ...prev,
      employeeId,
      name
    }));
  };

  const clearUser = () => {
    setUserData({
      employeeId: null,
      name: null,
      latitude: null,
      longitude: null
    });
  };

  return <UserContext.Provider value={{ userData, setUser, clearUser }}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  return useContext(UserContext) || defaultUserContextValue;
};
