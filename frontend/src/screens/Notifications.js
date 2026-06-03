import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useNavigation, useRoute } from '@react-navigation/native';
import iconImage from '../../assets/images/icon.png';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function formatNotificationTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;

  const monthDay = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${monthDay}, ${time}`;
}

export default function Notifications() {
  const navigation = useNavigation();
  const route = useRoute();
  const fromScreen = route.params?.from || "DriverDriving";

  const { loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const soundRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) setError('Session expired. Please log in again.');
      else if (status === 403) setError('Only drivers can view notifications.');
      else setError(err.response?.data?.error || err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);
// Inside your Notifications() component function...

useEffect(() => {
  if (authLoading) return;
  
  // Initial manual fetch on load
  fetchNotifications();

  // Establish continuous polling check while focused
  const intervalId = setInterval(async () => {
    try {
      const res = await api.get('/notifications');
      
      // If server list has more items than current local state array list,
      // it means the camera daemon just fired a new alert!
      if (res.data.length > notifications.length && notifications.length > 0) {
        await playAlertSound(); // Trigger alarm chime sound immediately
      }
      setNotifications(res.data);
    } catch (err) {
      console.log("Background synchronization error:", err.message);
    }
  }, 3000);

  return () => clearInterval(intervalId); // Clear loop when closing page view
}, [authLoading, fetchNotifications, notifications.length]);
  const playAlertSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/alert.mp3')
      );
      soundRef.current = sound;
      await sound.playAsync();
      setTimeout(async () => {
        if (soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
      }, 2000);
    } catch (err) {
      console.log('Sound error:', err);
    }
  };

  const markAsRead = async (item) => {
    if (item.isDemo) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === item.notification_id ? { ...n, is_read: true } : n
        )
      );
      return;
    }

    try {
      await api.patch(`/notifications/${item.notification_id}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === item.notification_id ? { ...n, is_read: true } : n
        )
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to mark as read');
    }
  };

  const triggerDemoAlert = async () => {
    const demoNotif = {
      notification_id: 'demo-' + Math.random().toString(36).slice(2, 10),
      is_read: false,
      created_at: new Date().toISOString(),
      behavior_name: 'Drowsiness',
      isDemo: true,
    };
    setNotifications((prev) => [demoNotif, ...prev]);
    await playAlertSound();
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View style={styles.left}>
        <Text style={styles.time}>{formatNotificationTime(item.created_at)}</Text>
        <Text style={styles.type}>{item.behavior_name}</Text>
      </View>

      {!item.is_read ? (
        <TouchableOpacity style={styles.checkBtn} onPress={() => markAsRead(item)}>
          <Text style={styles.checkText}>Check</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.readBtn}>
          <Ionicons name="checkmark" size={14} color="white" />
          <Text style={styles.readText}> Read</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={iconImage} style={styles.headerIcon} />
        <Text style={styles.headerText}>RoadGuard</Text>
      </View>

      <TouchableOpacity style={styles.simBtn} onPress={triggerDemoAlert}>
        <Text style={styles.simText}>Demo: Trigger Alert</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.centeredMsg}>
          <ActivityIndicator size="large" color="#000042" />
        </View>
      ) : error ? (
        <View style={styles.centeredMsg}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchNotifications} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centeredMsg}>
          <Text style={styles.emptyText}>No notifications this month.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.notification_id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
  style={styles.navItem}
  onPress={() => navigation.navigate(fromScreen)}
>
  <Ionicons name="person" size={22} color="#555" />
  <Text style={styles.inactiveTab}>Profile</Text>
</TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="notifications" size={22} color="#f97316" />
          <Text style={styles.activeTab}>Notifications</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
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
  simBtn: {
    backgroundColor: '#2563eb',
    margin: 10,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  simText: {
    color: 'white',
    fontWeight: 'bold',
  },
  item: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 10,
    marginVertical: 5,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    width: 100,
    color: 'gray',
  },
  type: {
    fontWeight: '500',
  },
  checkBtn: {
    backgroundColor: '#1e3a8a',
    width: 80,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: 'white',
  },
  readBtn: {
    flexDirection: 'row',
    backgroundColor: '#f97316',
    width: 80,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readText: {
    color: 'white',
    fontSize: 12,
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
  retryBtnText: {
    color: 'white',
    fontWeight: 'bold',
  },
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
  navItem: {
    alignItems: 'center',
  },
  activeTab: {
    color: '#f97316',
    fontWeight: 'bold',
  },
  inactiveTab: {
    color: '#555',
  },
});
