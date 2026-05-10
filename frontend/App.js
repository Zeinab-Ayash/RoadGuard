import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DriverDrivingScreen from './src/screens/DriverDrivingScreen';
import Notifications from './src/screens/Notifications';
import DriverProfileScreen from './src/screens/DriverProfileScreen';
import LoginAsDriver from './src/screens/LoginAsDriver';
import { AuthProvider } from './src/context/AuthContext'; // 👈 ADD THIS

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AuthProvider>   {/* 👈 THIS IS THE FIX */}
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>

          <Stack.Screen 
            name="DriverDriving" 
            component={DriverDrivingScreen} 
          />

          <Stack.Screen 
            name="Notifications" 
            component={Notifications} 
          />

          {/* 👇 ADD LOGIN SCREEN */}
          <Stack.Screen 
            name="LoginAsDriver" 
            component={LoginAsDriver} 
          />

        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}