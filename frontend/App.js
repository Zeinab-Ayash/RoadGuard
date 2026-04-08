import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CompanyDashboard from './src/screens/CompanyDashboard';
import DriversList from './src/screens/DriversList';
import Notifications from './src/screens/Notifications';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>

        {/* Start here */}
        <Stack.Screen name="Dashboard" component={CompanyDashboard} />

        {/* Company navigation test */}
        <Stack.Screen name="DriversList" component={DriversList} />

        {/* Driver page (separate but included for testing) */}
        <Stack.Screen name="Notifications" component={Notifications} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}