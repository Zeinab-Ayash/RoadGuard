import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
} from 'react-native';

// ✅ Icons
import { Ionicons } from '@expo/vector-icons';

// ✅ Correct image import
import iconImage from '../../assets/images/icon.png';

// ✅ Dummy Data
const drivers = [
  { id: 'DRV19002', name: 'Ahmad Hassan' },
  { id: 'DRV19007', name: 'Sara Khalil' },
  { id: 'DRV19003', name: 'Rami Ali' },
  { id: 'DRV19013', name: 'Sara Sami' },
  { id: 'DRV19012', name: 'Wael Ahmad' },
  { id: 'DRV19014', name: 'Sam Ali' },
  { id: 'DRV19015', name: 'Samar Khalil' },
  { id: 'DRV19016', name: 'Maryam Ahmad' },
];

// ✅ Driver Card Component
const DriverCard = ({ driver }) => {
  return (
    <View style={styles.card}>
      <Image source={iconImage} style={styles.avatar} />
      <View style={styles.textContainer}>
        <Text style={styles.driverName}>{driver.name}</Text>
        <Text style={styles.driverId}>ID: {driver.id}</Text>
      </View>
    </View>
  );
};

// ✅ ADDED navigation HERE
export default function CompanyDashboard({ navigation }) {
  const handleDashboardPress = () => console.log('Dashboard pressed');

  // ✅ UPDATED THIS
  const handleDriversListPress = () => {
    navigation.navigate('DriversList');
  };

  return (
    <View style={styles.container}>
      
      {/* 🔷 HEADER */}
      <View style={styles.header}>
        <Image source={iconImage} style={styles.headerIcon} />
        <Text style={styles.headerText}>RoadGuard</Text>
      </View>

      {/* COMPANY INFO */}
      <View style={styles.companyBox}>
        <Image source={iconImage} style={styles.companyAvatar} />
        <View style={styles.textContainer}>
          <Text style={styles.companyName}>Company Name</Text>
        </View>
      </View>

      {/* BUTTONS */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={18} color="white" />
          <Text style={styles.btnText}> Log Out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.addBtn}>
          <Text style={styles.btnText}>+ Add Driver</Text>
        </TouchableOpacity>
      </View>

      {/* DRIVER LIST */}
      <FlatList
        data={drivers}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item }) => <DriverCard driver={item} />}
        contentContainerStyle={styles.list}
      />

      {/* 🔷 BOTTOM NAV */}
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

  companyAvatar: {
    width: 70,
    height: 70,
    marginRight: 15,
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
    paddingBottom: 80,
  },

  card: {
    backgroundColor: 'white',
    flex: 1,
    margin: 8,
    borderRadius: 15,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    height: 80,
  },

  avatar: {
    width: 50,
    height: 50,
    marginRight: 10,
  },

  textContainer: {
    flex: 1,
  },

  driverName: {
    fontWeight: 'bold',
  },

  driverId: {
    color: 'gray',
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