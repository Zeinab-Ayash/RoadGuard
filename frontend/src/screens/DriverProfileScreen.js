import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function DriverProfileScreen() {
  const [isTodayOpen, setIsTodayOpen] = useState(true);
  const [driver, setDriver] = useState(null);

  // Dummy data (simulate backend)
  useEffect(() => {
    const dummyDriver = {
      name: "John Doe",
      company: "Secure Transport LLC",
      id: "#327918",
      photo: require("../../assets/images/logo.jpeg"),
      appLogo: require("../../assets/images/logo.jpeg"),
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
    if (score === 0) return '#D1D5DB';
    if (score >= 80) return '#22C55E';
    if (score >= 65) return '#EAB308';
    return '#EF4444';
  };

  const renderHistoryIcon = (item) => {
    if (item.lib === 'Ionicons') {
      return <Ionicons name={item.icon} size={20} color="#F97316" />;
    }
    return <MaterialCommunityIcons name={item.icon} size={20} color="#F97316" />;
  };

  // Confirm Deactivate
  const handleDeactivate = () => {
    Alert.alert(
      "Confirm Deactivation",
      "Are you sure you want to deactivate this driver?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes", onPress: () => Alert.alert("Driver Deactivated") }
      ]
    );
  };

  // Loading protection
  if (!driver) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}
      <View style={styles.headerBar}>
        <TouchableOpacity>
          <Ionicons name="chevron-back" size={26} color="white" />
        </TouchableOpacity>

        <View style={styles.headerTitleRow}>
          <View style={styles.iconCircle}>
            <Image source={driver.appLogo} style={styles.headerLogoImage} resizeMode="contain" />
          </View>
          <Text style={styles.headerTitle}>Driver Safety Monitor</Text>
        </View>

        <View style={{ width: 26 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* PROFILE */}
        <View style={styles.profileCard}>
          <Image source={driver.photo} style={styles.avatar} />

          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driver.name}</Text>
            <Text style={styles.companyText}>{driver.company}</Text>
            <Text style={styles.idText}>{driver.id}</Text>
          </View>

          {/* GAUGE */}
          <View style={styles.gaugeContainer}>
            <View style={styles.gaugeBackground} />

            {driver.safetyScore > 0 && (
              <View
                style={[
                  styles.gaugeFill,
                  {
                    transform: [{ rotate: `${(driver.safetyScore / 100) * 180 - 135}deg` }],
                    borderTopColor: getScoreColor(driver.safetyScore),
                    borderRightColor: getScoreColor(driver.safetyScore),
                    borderLeftColor: getScoreColor(driver.safetyScore),
                  },
                ]}
              />
            )}

            <View style={styles.scoreTextOverlay}>
              <Text style={styles.gaugeValueText}>{driver.safetyScore}</Text>
              <Text style={styles.gaugeLabelText}>Safety Score</Text>
            </View>
          </View>
        </View>

        {/* MISBEHAVIOR */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Misbehavior History</Text>

          <TouchableOpacity
            onPress={() => setIsTodayOpen(!isTodayOpen)}
            style={styles.accordionHeader}
          >
            <Text style={styles.subSectionTitle}>Today</Text>
            <Ionicons name={isTodayOpen ? "chevron-down" : "chevron-forward"} size={18} />
          </TouchableOpacity>

          {isTodayOpen &&
            driver.historyToday.map((item) => (
              <View key={item.id} style={styles.historyItem}>
                <View style={styles.historyIconRow}>
                  {renderHistoryIcon(item)}
                  <Text style={styles.historyText}>{item.type}</Text>
                </View>
                <Text style={styles.historyTime}>
                  {item.time} <Ionicons name="chevron-forward" size={14} color="#CCC" />
                </Text>
              </View>
            ))}

          {['Last 7 Days', 'Last Month', 'January', 'February'].map((title, index) => (
            <TouchableOpacity key={index} style={styles.accordionHeader}>
              <Text style={styles.accordionText}>{title}</Text>
              <Ionicons name="chevron-forward" size={18} color="#1F2937" />
            </TouchableOpacity>
          ))}
        </View>

        {/* MONTHLY SCORES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Scores</Text>

          <View style={styles.monthsRow}>
            {driver.monthlyScores.map((m, index) => (
              <View key={index} style={styles.monthBadge}>
                <View style={[styles.scoreCircleSmall, { borderColor: getScoreColor(m.score) }]}>
                  <Text style={styles.smallScoreText}>
                    {m.score > 0 ? m.score : '--'}
                  </Text>
                </View>
                <Text style={styles.monthLabel}>{m.month}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* BUTTON */}
        <TouchableOpacity
          style={styles.deactivateButton}
          onPress={handleDeactivate}
        >
          <Text style={styles.deactivateText}>Deactivate Driver</Text>
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  headerBar: { backgroundColor: '#1E3A5F', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 20, height: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 10, overflow: 'hidden' },
  headerLogoImage: { width: 40, height: 40 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '600' },
  profileCard: { flexDirection: 'row', padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  avatar: { width: 85, height: 85, borderRadius: 45, backgroundColor: '#EEE' },
  driverInfo: { flex: 1, marginLeft: 15 },
  driverName: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  companyText: { fontSize: 14, color: '#6B7280' },
  idText: { fontSize: 12, color: '#9CA3AF' },

  gaugeContainer: { width: 100, height: 55, overflow: 'hidden', alignItems: 'center' },
  gaugeBackground: { width: 100, height: 100, borderRadius: 50, borderWidth: 8, borderColor: '#E5E7EB', position: 'absolute' },
  gaugeFill: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
    position: 'absolute'
  },
  scoreTextOverlay: { position: 'absolute', bottom: 0, alignItems: 'center', width: '100%' },
  gaugeValueText: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', marginBottom: -2 },
  gaugeLabelText: { fontSize: 9, color: '#9CA3AF', fontWeight: '500' },

  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 15 },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  subSectionTitle: { fontSize: 16, color: '#4B5563', fontWeight: '500' },
  accordionText: { fontSize: 16, color: '#1F2937' },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 10, paddingVertical: 10 },
  historyIconRow: { flexDirection: 'row', alignItems: 'center' },
  historyText: { marginLeft: 10, fontSize: 15, color: '#374151' },
  historyTime: { fontSize: 13, color: '#9CA3AF' },
  monthsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  monthBadge: { alignItems: 'center' },
  scoreCircleSmall: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  smallScoreText: { fontWeight: 'bold', fontSize: 14 },
  monthLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },

  deactivateButton: { backgroundColor: '#F97316', margin: 30, padding: 15, borderRadius: 10, alignItems: 'center' },
  deactivateText: { color: 'white', fontWeight: 'bold' },

  bottomNav: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#EEE', paddingVertical: 10, backgroundColor: '#FFF' },
  navItem: { flex: 1, alignItems: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', borderRadius: 10, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  navText: { fontSize: 12, marginTop: 2 }
});