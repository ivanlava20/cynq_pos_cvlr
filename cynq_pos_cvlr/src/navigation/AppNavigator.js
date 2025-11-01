import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomePage from '../pages/HomePage';
import EmployeeActionPage from '../pages/EmployeeActionPage';
import LoginPage from '../pages/LoginPage';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerShown: false
        }}
      >
        <Stack.Screen name="Login" component={LoginPage} />
        <Stack.Screen name="Home" component={HomePage} />
        <Stack.Screen name="EmployeeAction" component={EmployeeActionPage} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;