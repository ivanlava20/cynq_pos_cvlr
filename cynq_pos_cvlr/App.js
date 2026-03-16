import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { initializeLocation } from './src/processes/fetchCurrentLocation';
import { UserProvider } from './src/context/UserContext';
import './App.css';

function App() {

  useEffect(() => {
    // Initialize location on app load
    initializeLocation();
  }, []);

  return (
    <UserProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </UserProvider>
  );
}

export default App;
