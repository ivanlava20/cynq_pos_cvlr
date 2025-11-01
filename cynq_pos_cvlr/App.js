import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { initializeLocation } from './src/processes/fetchCurrentLocation';
import './App.css';

function App() {

  useEffect(() => {
    // Initialize location on app load
    initializeLocation();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}

export default App;
