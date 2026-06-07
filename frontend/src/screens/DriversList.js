import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import iconImage from '../../assets/images/icon.png';
import InitialsAvatar from '../components/InitialsAvatar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const getScoreColor = (score) => {
  if (score >= 80) return '#16a34a';
  if (score >= 60) return '#eab308';
  if (score >= 50) return '#f97316';
  return '#ef4444';
};

const DriverCard = ({ driver, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {driver.profile_image ? (
        <Image source={{ uri: driver.profile_image }} style={styles.avatar} />
      ) : (
        <InitialsAvatar name={driver.driver_name} size={50} fontSize={18} style={{ marginRight: 10 }} />
      )}

      <View style={styles.info}>
        <Text style={styles.name}>{driver.driver_name}</Text>
        <Text style={styles.id}>Code: {driver.driver_code}</Text>
      </View>

      <View style={styles.rightSection}>
        <View
          style={[
            styles.scoreBox,
            { backgroundColor: getScoreColor(driver.current_score) },
          ]}
        >
          <Text style={styles.scoreText}>{driver.current_score}</Text>
        </View>

        <Text style={styles.mis}>
          Misbehaviors this month: {driver.current_month_misbehaviors}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function DriversList({ navigation }) {
  const { loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sortType, setSortType] = useState('high');
  const [showSort, setShowSort] = useState(false);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/driver');
      setDrivers(res.data);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) setError('Session expired. Please log in again.');
      else setError(err.response?.data?.error || err.message || 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    fetchDrivers();
  }, [authLoading, fetchDrivers]);

  useFocusEffect(
    useCallback(() => {
      if (authLoading) return;
      fetchDrivers();
    }, [authLoading, fetchDrivers])
  );

  const handleDriverPress = (driver) => {
    navigation.navigate('DriverProfile', { driverId: driver.driver_id });
  };

  const filteredDrivers = drivers
    .filter(
      (d) =>
        d.driver_name.toLowerCase().includes(search.toLowerCase()) ||
        d.driver_code.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) =>
      sortType === 'high' ? b.current_score - a.current_score : a.current_score - b.current_score
    );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 15 }]}>
        <Image source={iconImage} style={styles.headerIcon} />
        <Text style={styles.headerText}>RoadGuard</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="gray" />
          <TextInput
            placeholder="Search by driver name or code"
            value={search}
            onChangeText={setSearch}
            style={styles.input}
            numberOfLines={1}
          />
        </View>

        <TouchableOpacity
          style={styles.sortMainBtn}
          onPress={() => setShowSort(!showSort)}
        >
          <Ionicons name="swap-vertical" size={16} color="#000" />
          <Text style={{ marginLeft: 5 }}>Sort by score</Text>
        </TouchableOpacity>
      </View>

      {showSort && (
        <View style={styles.sortDropdown}>
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => {
              setSortType('low');
              setShowSort(false);
            }}
          >
            <Ionicons name="arrow-up" size={16} color="black" />
            <Text style={[styles.optionText, sortType === 'low' && styles.activeText]}>
              Low → High
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => {
              setSortType('high');
              setShowSort(false);
            }}
          >
            <Ionicons name="arrow-down" size={16} color="black" />
            <Text style={[styles.optionText, sortType === 'high' && styles.activeText]}>
              High → Low
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.centeredMsg}>
          <ActivityIndicator size="large" color="#000042" />
        </View>
      ) : error ? (
        <View style={styles.centeredMsg}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchDrivers} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : drivers.length === 0 ? (
        <View style={styles.centeredMsg}>
          <Text style={styles.emptyText}>No drivers yet.</Text>
        </View>
      ) : filteredDrivers.length === 0 ? (
        <View style={styles.centeredMsg}>
          <Text style={styles.emptyText}>No drivers match your search.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDrivers}
          keyExtractor={(item) => item.driver_id}
          renderItem={({ item }) => (
            <DriverCard driver={item} onPress={() => handleDriverPress(item)} />
          )}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Ionicons name="home" size={20} color="#555" />
          <Text>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="list" size={20} color="#f97316" />
          <Text style={{ color: '#f97316' }}>Drivers List</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f4f7' },

  header: {
    backgroundColor: '#000042',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  headerIcon: { width: 30, height: 30, marginRight: 10 },
  headerText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 10,
    height: 45,
    borderRadius: 10,
  },
  input: { marginLeft: 10, flex: 1, fontSize: 13 },

  sortMainBtn: {
    marginLeft: 10,
    backgroundColor: 'white',
    paddingHorizontal: 14,
    height: 45,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortDropdown: {
    position: 'absolute',
    right: 10,
    top: 105,
    width: 180,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    elevation: 5,
    zIndex: 10,
  },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  optionText: { marginLeft: 10 },
  activeText: { color: '#f97316', fontWeight: 'bold' },

  card: {
    flexDirection: 'row',
    backgroundColor: 'white',
    margin: 8,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 10 },
  info: { flex: 1 },
  name: { fontWeight: 'bold' },
  id: { color: 'gray', fontSize: 12, marginTop: 2 },

  rightSection: { alignItems: 'flex-end' },
  mis: { fontSize: 11, color: 'gray', marginTop: 3, textAlign: 'right' },

  scoreBox: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  scoreText: { color: 'white', fontWeight: 'bold' },

  centeredMsg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 80,
  },
  errorText: { color: '#ef4444', textAlign: 'center', marginBottom: 15, fontSize: 14 },
  emptyText: { color: '#555', textAlign: 'center', fontSize: 14 },
  retryBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  retryBtnText: { color: 'white', fontWeight: 'bold' },

  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  navItem: { alignItems: 'center', justifyContent: 'center' },
});
