import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image,
  ScrollView, TouchableOpacity,
  SafeAreaView, Alert, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import iconImage from '../../assets/images/icon.png';

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DEMO_BEHAVIORS = ['Drowsiness', 'Phone Usage', 'Eyes Off Road', 'No Seatbelt', 'Eating While Driving'];

export default function DriverDrivingScreen() {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const driverId = user?.driver_id;
  const [triggering, setTriggering] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigation.replace('LoginAs');
  };

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openSection, setOpenSection] = useState('Today');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionBusy, setSessionBusy] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!driverId) {
      setError('Not logged in as a driver');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/profile/driver/${driverId}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  // FIXED: Adjusted endpoint path to hit your active session model definition router path properly
  const fetchActiveSession = useCallback(async () => {
    try {
      const res = await api.get('/driving-sessions/active');
      setActiveSession(res.data);
    } catch (err) {
      // Silent fallback
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      fetchActiveSession();
    }, [fetchProfile, fetchActiveSession])
  );

  const getScoreColor = (score) => {
    if (score >= 80) return '#22C55E';
    if (score >= 60) return '#EAB308';
    if (score >= 40) return '#F97316';
    return '#EF4444';
  };

  // FIXED: Hooked completely into your sessionBusy loading flags state definitions
 const handleStartDriving = async () => {
  setSessionBusy(true);
  try {
    const res = await api.post('/driving-sessions'); 
    
    if (res.data && res.data.session_id) {
      // FIX: Standardize the session schema shape explicitly
      setActiveSession({
        session_id: res.data.session_id,
        start_time: res.data.start_time || new Date().toISOString(),
        is_active: true
      });

      if (Platform.OS === 'web') {
        window.alert("Journey Started: Laptop monitor webcam is now active.");
      } else {
        Alert.alert("Journey Started", "The laptop safety monitor is now tracking your drive.");
      }
    }
  } catch (err) {
    console.error("Error starting driving session:", err);
    // ... remaining error handlers
  } finally {
    setSessionBusy(false);
  }
};
  // FIXED: Correctly tracking endpoint configurations and resetting local view data states
  const handleFinishDriving = async () => {
    if (!activeSession) return;
    setSessionBusy(true);
    try {
      await api.patch(`/driving-sessions/${activeSession.session_id}/end`);
      
      setActiveSession(null);
      if (Platform.OS === 'web') {
        window.alert("Journey Completed: Laptop safety tracker pipeline stopped.");
      } else {
        Alert.alert("Journey Completed", "Tracking stopped. You can view your session history now.");
      }
      
      // Refresh user view values to automatically populate new score data values instantly
      await fetchProfile();
    } catch (err) {
      console.error("Error ending driving session:", err);
      if (Platform.OS === 'web') {
        window.alert("Error: Failed to close the running session gracefully.");
      } else {
        Alert.alert("Error", "Failed to close the session properly.");
      }
    } finally {
      setSessionBusy(false);
    }
  };

  const handleAvatarPress = async () => {
    if (uploadingPhoto) return;

    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photos.');
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
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const blob = await (await fetch(asset.uri)).blob();
        formData.append('photo', blob, asset.fileName || 'profile.jpg');
      } else {
        formData.append('photo', {
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || 'profile.jpg',
        });
      }
      await api.patch('/driver/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: (d) => d,
      });
      await fetchProfile();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Upload failed';
      if (Platform.OS === 'web') window.alert('Upload failed: ' + msg);
      else Alert.alert('Upload failed', msg);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const triggerDemoMisbehavior = async () => {
    if (triggering) return;
    setTriggering(true);
    try {
      const behavior_name = DEMO_BEHAVIORS[Math.floor(Math.random() * DEMO_BEHAVIORS.length)];
      // Include fallback targeting injection context
      const res = await api.post('/misbehavior', { 
        behavior_name,
        session_id: activeSession ? activeSession.session_id : null 
      });
      await fetchProfile();
      if (Platform.OS === 'web') {
        window.alert(`Triggered: ${res.data.behavior_name} (-${res.data.severity_score}). Score: ${res.data.new_score}`);
      } else {
        Alert.alert('Misbehavior recorded', `${res.data.behavior_name} (-${res.data.severity_score})\nNew score: ${res.data.new_score}`);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to trigger misbehavior';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#1E3A5F" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
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

  const { driver, notificationsCount, history, monthlyScores } = data;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image source={iconImage} style={styles.headerIcon} />
        <Text style={styles.headerText}>RoadGuard</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8} style={styles.avatarContainer}>
            {driver.profile_image ? (
              <Image source={{ uri: driver.profile_image }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetters}>
                  {driver.driver_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              {uploadingPhoto
                ? <ActivityIndicator size={14} color="white" />
                : <Ionicons name="camera" size={16} color="white" />}
            </View>
          </TouchableOpacity>
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

        <TouchableOpacity
          style={[
            styles.startBtn,
            activeSession && styles.finishBtn,
            sessionBusy && { opacity: 0.6 },
          ]}
          onPress={activeSession ? handleFinishDriving : handleStartDriving}
          disabled={sessionBusy}
        >
          <Ionicons
            name={activeSession ? 'stop-circle' : 'play-circle'}
            size={22}
            color="white"
          />
          <Text style={styles.startText}>
            {sessionBusy
              ? '...'
              : activeSession
                ? 'Finish Driving'
                : 'Start Driving'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.demoBtn, triggering && { opacity: 0.6 }]}
          onPress={triggerDemoMisbehavior}
          disabled={triggering}
        >
          <Ionicons name="alert-circle-outline" size={18} color="#2563eb" />
          <Text style={styles.demoText}>{triggering ? 'Recording...' : 'Demo: Trigger Misbehavior'}</Text>
        </TouchableOpacity>

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

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="white" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* STRICT BOTTOM MENU LAYER - REMAINING EXCLUSIVELY PROFILE & NOTIFICATIONS ONLY */}
      <View style={styles.bottomNav}>
        <View style={styles.navItem}>
          <Ionicons name="person" size={26} color="#F97316" />
          <Text style={[styles.navText, { color: '#F97316' }]}>Profile</Text>
        </View>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Notifications', { from: 'DriverDriving' })}
        >
          <View>
            <Ionicons name="notifications" size={26} color="#1E3A5F" />
            {notificationsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notificationsCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.navText}>Notifications</Text>
        </TouchableOpacity>
      </View>
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
  avatarContainer: { position: 'relative' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#F97316', width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
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

  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#16a34a', marginHorizontal: 20, marginTop: 20, padding: 15, borderRadius: 12, gap: 8 },
  finishBtn: { backgroundColor: '#dc2626' },
  startText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  demoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#2563eb', marginHorizontal: 20, marginTop: 10, padding: 10, borderRadius: 8, gap: 6 },
  demoText: { color: '#2563eb', fontWeight: '600', fontSize: 13 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F97316', marginHorizontal: 20, marginTop: 10, marginBottom: 20, padding: 15, borderRadius: 12, gap: 8 },
  logoutText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

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

  bottomNav: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 30 : 20, backgroundColor: '#FFF' },
  navItem: { flex: 1, alignItems: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', borderRadius: 10, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  navText: { fontSize: 12, marginTop: 2 }
});