import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { Ionicons } from '@expo/vector-icons';
import iconImage from '../../assets/images/icon.png';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import InitialsAvatar from '../components/InitialsAvatar';

const DriverCard = ({ driver, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {driver.profile_image ? (
        <Image source={{ uri: driver.profile_image }} style={styles.avatar} />
      ) : (
        <InitialsAvatar name={driver.driver_name} size={50} fontSize={18} style={{ marginRight: 12 }} />
      )}
      <View style={styles.textContainer}>
        <Text style={styles.driverName} numberOfLines={1}>{driver.driver_name}</Text>
        <Text style={styles.driverId}>Code: {driver.driver_code}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function CompanyDashboard({ navigation }) {
  const { user, loading: authLoading, logout, updateUser } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/drivers');
      setDrivers(res.data);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        setError('Session expired. Please log in again.');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load drivers');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    fetchDrivers();
  }, [authLoading, fetchDrivers]);

  const handleLogout = async () => {
    await logout();
    navigation.replace('LoginAs');
  };

  const handleAvatarPress = async () => {
    if (uploadingLogo) return;

    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photos to upload a logo.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const blob = await (await fetch(asset.uri)).blob();
        formData.append('logo', blob, asset.fileName || 'logo.jpg');
      } else {
        formData.append('logo', {
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || 'logo.jpg',
        });
      }

      const res = await api.patch('/companies/me', formData);
      updateUser(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Upload failed';
      Alert.alert('Upload failed', msg);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleAddDriver = () => navigation.navigate('AddDriver');
  const handleDashboardPress = () => {};
  const handleDriversListPress = () => navigation.navigate('DriversList');
  const handleDriverPress = (driver) => navigation.navigate('DriverProfile', { driverId: driver.driver_id });

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <Image source={iconImage} style={styles.headerIcon} />
        <Text style={styles.headerText}>RoadGuard</Text>
      </View>

      <View style={styles.companyBox}>
        <TouchableOpacity onPress={handleAvatarPress} disabled={uploadingLogo} style={styles.avatarWrap}>
          {user?.logo_path ? (
            <Image source={{ uri: user.logo_path }} style={styles.companyAvatar} />
          ) : (
            <InitialsAvatar name={user?.company_name} size={70} fontSize={26} />
          )}
          {uploadingLogo && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color="white" />
            </View>
          )}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={12} color="white" />
          </View>
        </TouchableOpacity>
        <View style={styles.textContainer}>
          <Text style={styles.companyName}>{user?.company_name || 'Company Name'}</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="white" />
          <Text style={styles.btnText}> Log Out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.addBtn} onPress={handleAddDriver}>
          <Text style={styles.btnText}>+ Add Driver</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centeredMsg}>
          <ActivityIndicator size="large" color="#000042" />
        </View>
      ) : error ? (
        <View style={styles.centeredMsg}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchDrivers} style={styles.retryBtn}>
            <Text style={styles.btnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : drivers.length === 0 ? (
        <View style={styles.centeredMsg}>
          <Text style={styles.emptyText}>No drivers yet.{'\n'}Tap "+ Add Driver" to add your first one.</Text>
        </View>
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={(item) => item.driver_id}
          numColumns={2}
          renderItem={({ item }) => <DriverCard driver={item} onPress={() => handleDriverPress(item)} />}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={handleDashboardPress}>
          <Ionicons name="home" size={20} color="#f97316" />
          <Text style={styles.activeTab}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={handleDriversListPress}>
          <Ionicons name="list" size={20} color="#555" />
          <Text style={styles.inactiveTab}>Drivers List</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f4f7',
  },

  header: {
    backgroundColor: '#000042',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerIcon: {
    width: 30,
    height: 30,
    marginRight: 10,
  },

  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },

  companyBox: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
  },

  avatarWrap: {
    marginRight: 15,
    position: 'relative',
  },

  companyAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e5e7eb',
  },

  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 70,
    height: 70,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#000042',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },

  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 15,
  },

  logoutBtn: {
    backgroundColor: '#f97316',
    padding: 12,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },

  addBtn: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
  },

  btnText: {
    color: 'white',
    fontWeight: 'bold',
  },

  list: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 80,
  },

  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  card: {
    backgroundColor: 'white',
    width: '48%',
    borderRadius: 15,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },

  textContainer: {
    flex: 1,
  },

  driverName: {
    fontWeight: 'bold',
    fontSize: 13,
  },

  driverId: {
    color: 'gray',
    fontSize: 11,
    marginTop: 2,
  },

  centeredMsg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 80,
  },

  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
  },

  emptyText: {
    color: '#555',
    textAlign: 'center',
    fontSize: 14,
  },

  retryBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
  },

  bottomNav: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: 'white',
  },

  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeTab: {
    color: '#f97316',
    fontWeight: 'bold',
    marginTop: 4,
  },

  inactiveTab: {
    color: '#555',
    marginTop: 4,
  },
});
