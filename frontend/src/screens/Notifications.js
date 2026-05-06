import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import iconImage from '../../assets/images/icon.png';

/* =========================
   DUMMY DATA
========================= */
const initialNotifications = [
  {
    id: '1',
    type: 'Drowsiness',
    time: '10:45 AM',
    read: false,
  },
  {
    id: '2',
    type: 'Phone Usage',
    time: '9:22 AM',
    read: false,
  },
  {
    id: '3',
    type: 'Not Looking at Road',
    time: '8:30 AM',
    read: false,
  },
  {
    id: '4',
    type: 'Drowsiness',
    time: 'Apr 25, 7:40 PM',
    read: true,
  },
];

/* =========================
   COMPONENT
========================= */
export default function Notifications() {
  const [notifications, setNotifications] = useState(initialNotifications);

  const soundRef = useRef(null);

  /* 🔊 PLAY SOUND */
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
      }, 5000);
    } catch (error) {
      console.log('Sound error:', error);
    }
  };

  /* MARK AS READ */
  const markAsRead = (id) => {
    const updated = notifications.map((item) =>
      item.id === id ? { ...item, read: true } : item
    );
    setNotifications(updated);
  };

  /* ⏰ GET CURRENT TIME */
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /* SIMULATE ALERT */
  const simulateAlert = async () => {
    const newNotification = {
      id: Math.random().toString(),
      type: 'Drowsiness',
      time: getCurrentTime(), // ✅ FIXED
      read: false,
    };

    setNotifications([newNotification, ...notifications]);

    await playAlertSound();
  };

  /* RENDER ITEM */
  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View style={styles.left}>
        <Text style={styles.time}>{item.time}</Text>
        <Text style={styles.type}>{item.type}</Text>
      </View>

      {!item.read ? (
        <TouchableOpacity
          style={styles.checkBtn}
          onPress={() => markAsRead(item.id)}
        >
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
      {/* HEADER */}
      <View style={styles.header}>
        <Image source={iconImage} style={styles.headerIcon} />
        <Text style={styles.headerText}>RoadGuard</Text>
      </View>

      {/* SIMULATE BUTTON */}
      <TouchableOpacity style={styles.simBtn} onPress={simulateAlert}>
        <Text style={styles.simText}>Simulate Alert</Text>
      </TouchableOpacity>

      {/* LIST */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="notifications" size={22} color="#f97316" />
          <Text style={styles.activeTab}>Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person" size={22} color="#555" />
          <Text style={styles.inactiveTab}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* =========================
   STYLES
========================= */
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

  /* ✅ SAME SIZE BUTTONS */
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

  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    padding: 10,
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