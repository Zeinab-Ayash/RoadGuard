import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image,
  ScrollView, TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function DriverDashboardScreen() {
  const [isTodayOpen, setIsTodayOpen] = useState(true);
  const [driver, setDriver] = useState(null);

  useEffect(() => {
    // 🔥 Replace later with API call
    const dummyDriver = {
      name: "John Doe",
      company: "Secure Transport LLC",
      id: "#3279102",
      photo: require("../../assets/images/logo.jpeg"),
      safetyScore: 82,
      notificationsCount: 2,
      historyToday: [
        { id: 1, type: 'Drowsiness', time: '9:25 AM', icon: 'warning', lib: 'Ionicons' },
        { id: 2, type: 'Phone Usage', time: '9:10 AM', icon: 'cellphone', lib: 'MaterialCommunityIcons' },
        { id: 3, type: 'Speeding', time: '8:45 AM', icon: 'speedometer', lib: 'MaterialCommunityIcons' },
      ],
      monthlyScores: [
        { month: 'Jan', score: 90 },
        { month: 'Feb', score: 88 },
        { month: 'March', score: 84 },
        { month: 'April', score: 79 },
        { month: 'May', score: 0 },
        { month: 'Dec', score: 0 },
      ]
    };

    setDriver(dummyDriver);
  }, []);

  const getScoreColor = (score) => {
    if (score >= 80) return '#22C55E'; // 🟢
    if (score >= 60) return '#EAB308'; // 🟡
    if (score >= 40) return '#F97316'; // 🟠
    return '#EF4444'; // 🔴
  };

  const renderIcon = (item) => {
    if (item.lib === 'Ionicons') {
      return <Ionicons name={item.icon} size={20} color="#F59E0B" />;
    }
    return <MaterialCommunityIcons name={item.icon} size={20} color="#F59E0B" />;
  };

  if (!driver) return null;

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
  <TouchableOpacity>
    <Ionicons name="chevron-back" size={26} color="white" />
  </TouchableOpacity>

  <View style={styles.headerTitleContainer}>
    <Image source={require("../../assets/images/logo.jpeg")} style={styles.headerLogo} />
    <Text style={styles.headerTitle}>RoadGuard</Text>
  </View>

  <View style={{ width: 26 }} /> 
</View>

      <ScrollView>

        {/* PROFILE + SCORE */}
        <View style={styles.profileCard}>
                  <Image source={driver.photo} style={styles.avatar} />
        
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{driver.name}</Text>
                    <Text style={styles.companyText}>{driver.company}</Text>
                    <Text style={styles.idText}>{driver.id}</Text>
                  </View>

          {/* SCORE */}
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>Safety Score</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(driver.safetyScore) }]}>
              {driver.safetyScore}
            </Text>
          </View>
        </View>

        {/* START DRIVING BUTTON */}
        <TouchableOpacity style={styles.startBtn}>
          <Ionicons name="power" size={20} color="white" />
          <Text style={styles.startText}>Start Driving</Text>
        </TouchableOpacity>

        {/* MISBEHAVIOR */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Misbehavior History</Text>

          <TouchableOpacity
  onPress={() => setIsTodayOpen(!isTodayOpen)}
  style={styles.accordion}
>
  <Text style={styles.subTitle}>Today</Text>
  <Ionicons
    name={isTodayOpen ? "chevron-down" : "chevron-forward"}
    size={18}
  />
</TouchableOpacity>

{isTodayOpen &&
  driver.historyToday.map(item => (
    <View key={item.id} style={styles.historyItem}>
      <View style={styles.row}>
        {renderIcon(item)}
        <Text style={styles.historyText}>{item.type}</Text>
      </View>
      <Text style={styles.time}>{item.time}</Text>
    </View>
  ))
}

          {['Last 7 Days', 'April', 'February', 'January'].map((t, i) => (
            <TouchableOpacity key={i} style={styles.accordion}>
              <Text>{t}</Text>
              <Ionicons name="chevron-forward" size={18} />
            </TouchableOpacity>
          ))}
        </View>

        {/* MONTHLY SCORES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Scores</Text>

          <View style={styles.monthsRow}>
  {driver.monthlyScores.map((m, index) => (
    <View key={index} style={styles.monthBadge}>
      <View
        style={[
          styles.scoreCircleSmall,
          { borderColor: getScoreColor(m.score) }
        ]}
      >
        <Text
          style={[
            styles.smallScoreText,
            { color: m.score > 0 ? '#1F2937' : '#9CA3AF' }
          ]}
        >
          {m.score > 0 ? m.score : '--'}
        </Text>
      </View>

      <Text style={styles.monthLabel}>{m.month}</Text>
    </View>
  ))}
</View>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* BOTTOM NAV */}
      <View style={styles.bottomNav}>
              <View style={styles.navItem}>
                <Ionicons name="person" size={26} color="#F97316" />
                <Text style={[styles.navText, { color: '#F97316' }]}>Profile</Text>
              </View>
      
              <View style={styles.navItem}>
                <View>
                  <Ionicons name="notifications" size={26} color="#1E3A5F" />
                  {driver.notificationsCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{driver.notificationsCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.navText}>Notifications</Text>
              </View>
            </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },

 header: {
  backgroundColor: '#1E3A5F',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 20, // keep new taller height
  paddingHorizontal: 15,
},

headerTitleContainer: {
  flex: 1,
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
},

headerLogo: {
  width: 40,
  height: 40,
  marginRight: 8,
},

headerTitle: {
  color: 'white',
  fontSize: 18,
  fontWeight: '600',
},

  profileCard: { flexDirection: 'row', padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  avatar: { width: 85, height: 85, borderRadius: 45, backgroundColor: '#EEE' },
  driverInfo: { flex: 1, marginLeft: 15 },
  driverName: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  companyText: { fontSize: 14, color: '#6B7280' },
  idText: { fontSize: 12, color: '#9CA3AF' },

  name: { fontSize: 18, fontWeight: 'bold' },
  company: { color: '#6B7280' },
  id: { color: '#9CA3AF', fontSize: 12 },

  scoreBox: { alignItems: 'center' },
  scoreLabel: { fontSize: 12, color: '#9CA3AF' },
  scoreValue: { fontSize: 28, fontWeight: 'bold' },

  startBtn: {
    backgroundColor: '#F97316',
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10
  },

  startText: { color: 'white', fontWeight: 'bold' },

  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  subTitle: { marginTop: 10 },

  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10
  },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyText: { marginLeft: 10 },
  time: { color: '#9CA3AF' },

  accordion: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#F3F4F6'
},

 monthsRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 10
},

monthBadge: {
  alignItems: 'center'
},

scoreCircleSmall: {
  width: 48,
  height: 48,
  borderRadius: 24,
  borderWidth: 3,
  alignItems: 'center',
  justifyContent: 'center'
},

smallScoreText: {
  fontWeight: 'bold',
  fontSize: 14
},

monthLabel: {
  fontSize: 12,
  color: '#9CA3AF',
  marginTop: 4
},

  logoutBtn: {
    backgroundColor: '#F97316',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center'
  },

  logoutText: { color: 'white', fontWeight: 'bold' },

  bottomNav: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#EEE', paddingVertical: 10, backgroundColor: '#FFF' },
  navItem: { flex: 1, alignItems: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', borderRadius: 10, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  navText: { fontSize: 12, marginTop: 2 }
});