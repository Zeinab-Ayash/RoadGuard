import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import iconImage from '../../assets/images/icon.png';

const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <Image 
        source={iconImage} 
        style={styles.icon} 
      />
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000042', // your background color
    justifyContent: 'center',   // center vertically
    alignItems: 'center',       // center horizontally
  },
  icon: {
    width: 150,
    height: 150,
  },
});