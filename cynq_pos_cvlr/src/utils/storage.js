import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getStoredItem = async (key) => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }

  return AsyncStorage.getItem(key);
};

export const setStoredItem = async (key, value) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }

  await AsyncStorage.setItem(key, value);
};

export const removeStoredItem = async (key) => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }

  await AsyncStorage.removeItem(key);
};
