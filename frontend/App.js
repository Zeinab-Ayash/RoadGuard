import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DriverDrivingScreen from './src/screens/DriverDrivingScreen';
import Notifications from './src/screens/Notifications'; // 👈 add this
import DriverProfileScreen from './src/screens/DriverProfileScreen';
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        
        <Stack.Screen 
          name="DriverProfile" 
          component={DriverProfileScreen} 
        />

        {/* 👇 THIS IS REQUIRED */}
        <Stack.Screen 
          name="Notifications" 
          component={Notifications} 
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}