import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import iconImage from '../../assets/images/icon.png';
import { useAuth } from '../context/AuthContext';

const MIN_DISPLAY_MS = 1500;

const SplashScreen = () => {
  const navigation = useNavigation();
  const { role, loading } = useAuth();
  const [timerDone, setTimerDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTimerDone(true), MIN_DISPLAY_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loading || !timerDone) return;

    let nextScreen;
    if (role === 'company') nextScreen = 'Dashboard';
    else if (role === 'driver') nextScreen = 'DriverProfile';
    else nextScreen = 'LoginAs';

    navigation.replace(nextScreen);
  }, [loading, timerDone, role, navigation]);

  return (
    <View style={styles.container}>
      <Image source={iconImage} style={styles.icon} />
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000042',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 150,
    height: 150,
  },
});
