import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider } from './src/context/AuthContext';

import SplashScreen from './src/screens/SplashScreen';
import LoginAsScreen from './src/screens/LoginAsScreen';
import LoginAsCompany from './src/screens/LoginAsCompany';
import LoginAsDriver from './src/screens/LoginAsDriver';
import SignUpAsCompany from './src/screens/SignUpAsCompany';
import CompanyDashboard from './src/screens/CompanyDashboard';
import DriversList from './src/screens/DriversList';
import AddDriver from './src/screens/AddDriver';
import Notifications from './src/screens/Notifications';
import DriverProfileScreen from './src/screens/DriverProfileScreen';
import DriverDrivingScreen from './src/screens/DriverDrivingScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="LoginAs" component={LoginAsScreen} />
          <Stack.Screen name="LoginAsCompany" component={LoginAsCompany} />
          <Stack.Screen name="LoginAsDriver" component={LoginAsDriver} />
          <Stack.Screen name="SignUpAsCompany" component={SignUpAsCompany} />
          <Stack.Screen name="Dashboard" component={CompanyDashboard} />
          <Stack.Screen name="DriversList" component={DriversList} />
          <Stack.Screen name="AddDriver" component={AddDriver} />
          <Stack.Screen name="Notifications" component={Notifications} />
          <Stack.Screen name="DriverProfile" component={DriverProfileScreen} />
          <Stack.Screen name="DriverDriving" component={DriverDrivingScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
