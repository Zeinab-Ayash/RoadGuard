import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image,
  ScrollView, TouchableOpacity,
  SafeAreaView, Alert, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import iconImage from '../../assets/images/icon.png';

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function DriverProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, role } = useAuth();
  const driverId = route.params?.driverId || (role === 'driver' ? user?.driver_id : null);
  const isViewingOwnProfile = role === 'driver' && !route.params?.driverId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openSection, setOpenSection] = useState('Today');

  const fetchProfile = useCallback(async () => {
    if (!driverId) {
      setError('No driver ID provided');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/profile/driver/${driverId}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load driver profile');
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const getScoreColor = (score) => {
    if (score >= 80) return '#22C55E';
    if (score >= 60) return '#EAB308';
    if (score >= 40) return '#F97316';
    return '#EF4444';
  };

  const confirmDeactivate = async () => {
    try {
      await api.patch(`/driver/deactivate/${driverId}`);
      if (Platform.OS === 'web') {
        window.alert('Driver has been deactivated');
      } else {
        Alert.alert('Success', 'Driver has been deactivated');
      }
      navigation.goBack();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to deactivate driver';
      if (Platform.OS === 'web') {
        window.alert('Failed: ' + msg);
      } else {
        Alert.alert('Failed', msg);
      }
    }
  };

  const handleDeactivate = () => {
    console.log('[Deactivate] button clicked, Platform:', Platform.OS, 'driverId:', driverId);
    if (Platform.OS === 'web') {
      const ok = window.confirm('Are you sure you want to deactivate this driver?');
      console.log('[Deactivate] confirm result:', ok);
      if (ok) {
        confirmDeactivate();
      }
      return;
    }
    Alert.alert(
      'Confirm Deactivation',
      'Are you sure you want to deactivate this driver?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', style: 'destructive', onPress: confirmDeactivate }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#1E3A5F" />
        <Text style={{ marginTop: 10 }}>Loading driver profile...</Text>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error || 'No data'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchProfile}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { driver, history, monthlyScores } = data;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image source={iconImage} style={styles.headerIcon} />
        <Text style={styles.headerText}>RoadGuard</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.profileCard}>
          {driver.profile_image ? (
            <Image source={{ uri: driver.profile_image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarLetters}>
                {driver.driver_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driver.driver_name}</Text>
            <Text style={styles.companyText}>{driver.company_name}</Text>
            <Text style={styles.idText}>{driver.driver_code}</Text>
          </View>

          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>Safety Score</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(driver.current_score) }]}>
              {driver.current_score}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Misbehavior History</Text>

          <TouchableOpacity
            style={styles.accordion}
            onPress={() => setOpenSection(openSection === 'Today' ? null : 'Today')}
          >
            <Text style={styles.subTitle}>Today</Text>
            <Ionicons name={openSection === 'Today' ? 'chevron-down' : 'chevron-forward'} size={18} />
          </TouchableOpacity>

          {openSection === 'Today' && (
            history.today.length > 0 ? (
              history.today.map((item) => (
                <View key={item.id} style={styles.historyItem}>
                  <View style={styles.row}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#F59E0B" />
                    <Text style={styles.historyText}>{item.behavior_name}</Text>
                  </View>
                  <Text style={styles.time}>{item.time}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No incidents today</Text>
            )
          )}

          {Object.keys(history.monthlyHistory || {}).map((month) => (
            <View key={month}>
              <TouchableOpacity
                style={styles.accordion}
                onPress={() => setOpenSection(openSection === month ? null : month)}
              >
                <Text>{month}</Text>
                <Ionicons name={openSection === month ? 'chevron-down' : 'chevron-forward'} size={18} />
              </TouchableOpacity>

              {openSection === month && history.monthlyHistory[month].map((item) => (
                <View key={item.id} style={styles.historyItem}>
                  <View style={styles.row}>
                    <MaterialCommunityIcons name="history" size={20} color="#F59E0B" />
                    <Text style={styles.historyText}>{item.behavior_name}</Text>
                  </View>
                  <Text style={styles.time}>{item.time}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Scores</Text>
          <View style={styles.monthsRow}>
            {monthlyScores && monthlyScores.length > 0 ? (
              monthlyScores.map((m, i) => (
                <View key={i} style={styles.monthBadge}>
                  <View style={[styles.scoreCircleSmall, { borderColor: getScoreColor(m.score) }]}>
                    <Text style={[styles.smallScoreText, { color: m.score > 0 ? '#1F2937' : '#9CA3AF' }]}>
                      {m.score > 0 ? m.score : '--'}
                    </Text>
                  </View>
                  <Text style={styles.monthLabel}>{MONTH_NAMES[m.month - 1]}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No monthly scores yet</Text>
            )}
          </View>
        </View>

        {!isViewingOwnProfile && (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleDeactivate}>
            <Text style={styles.logoutText}>Deactivate Driver</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#EF4444', textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 },
  retryBtn: { backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 30, borderRadius: 10 },
  retryText: { color: 'white', fontWeight: 'bold' },

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

  profileCard: { flexDirection: 'row', padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  avatar: { width: 85, height: 85, borderRadius: 45, backgroundColor: '#EEE' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#000042' },
  avatarLetters: { color: 'white', fontSize: 26, fontWeight: 'bold' },
  driverInfo: { flex: 1, marginLeft: 15 },
  driverName: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  companyText: { fontSize: 14, color: '#6B7280' },
  idText: { fontSize: 12, color: '#9CA3AF' },

  scoreBox: { alignItems: 'center' },
  scoreLabel: { fontSize: 12, color: '#9CA3AF' },
  scoreValue: { fontSize: 28, fontWeight: 'bold' },

  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  subTitle: { marginTop: 10 },

  historyItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyText: { marginLeft: 10 },
  time: { color: '#9CA3AF' },
  emptyText: { color: '#9CA3AF', paddingVertical: 10, fontStyle: 'italic' },

  accordion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },

  monthsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap' },
  monthBadge: { alignItems: 'center', marginHorizontal: 4, marginVertical: 6 },
  scoreCircleSmall: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  smallScoreText: { fontWeight: 'bold', fontSize: 14 },
  monthLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },

  logoutBtn: { backgroundColor: '#F97316', margin: 20, padding: 15, borderRadius: 10, alignItems: 'center' },
  logoutText: { color: 'white', fontWeight: 'bold' },

  bottomNav: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#EEE', paddingVertical: 10, backgroundColor: '#FFF' },
  navItem: { flex: 1, alignItems: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', borderRadius: 10, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  navText: { fontSize: 12, marginTop: 2 }
});
