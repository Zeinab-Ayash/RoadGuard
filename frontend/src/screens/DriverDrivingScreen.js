import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function DriverDrivingScreen() {
  const navigation = useNavigation();

  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openSection, setOpenSection] = useState('Today');
  const [selectedMisbehavior, setSelectedMisbehavior] = useState(null);

  useEffect(() => {
    const fetchDriverProfile = async () => {
      try {
        const response = await fetch(
          "http://localhost:3000/profile/driver/4e564faf-bb6f-43d5-856c-e5c57b091eb8"
        );

        const data = await response.json();

        setDriver({
          name: data.driver.driver_name,
          company: data.driver.company_name,
          id: data.driver.driver_code,

          photo: data.driver.profile_image
            ? { uri: data.driver.profile_image }
            : null,

          safetyScore: data.driver.current_score,

          notificationsCount: data.notificationsCount,

          history: data.history,

          monthlyScores: data.monthlyScores,
        });

      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Failed to load driver data");
      } finally {
        setLoading(false);
      }
    };

    fetchDriverProfile();
  }, []);

  const getScoreColor = (score) => {
    if (score >= 80) return '#22C55E';
    if (score >= 60) return '#EAB308';
    if (score >= 40) return '#F97316';
    return '#EF4444';
  };

  const getMonthName = (monthNumber) => {
    const months = [
      "Jan","Feb","Mar","Apr","May","Jun",
      "Jul","Aug","Sep","Oct","Nov","Dec"
    ];

    return months[monthNumber - 1] || "N/A";
  };

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  if (loading || !driver) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1E3A5F" />
        <Text style={{ marginTop: 10 }}>
          Loading Driver...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color="white" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Image
            source={require("../../assets/images/logo.jpeg")}
            style={styles.headerLogo}
          />

          <Text style={styles.headerTitle}>
            RoadGuard
          </Text>
        </View>

        <View style={{ width: 26 }} />
      </View>

      <ScrollView>

        {/* PROFILE + SCORE */}
        <View style={styles.profileCard}>

          <View style={styles.avatarContainer}>
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarLetters}>
                {driver.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </Text>
            </View>

            <TouchableOpacity style={styles.cameraIcon}>
              <Ionicons name="camera" size={16} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>
              {driver.name}
            </Text>

            <Text style={styles.companyText}>
              {driver.company}
            </Text>

            <Text style={styles.idText}>
              ID: {driver.id}
            </Text>
          </View>

          {/* SCORE */}
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>
              Safety Score
            </Text>

            <Text
              style={[
                styles.scoreValue,
                { color: getScoreColor(driver.safetyScore) }
              ]}
            >
              {driver.safetyScore || '--'}
            </Text>
          </View>
        </View>

        {/* START DRIVING BUTTON */}
        <TouchableOpacity style={styles.startBtn}>
          <Ionicons name="power" size={20} color="white" />
          <Text style={styles.startText}>
            Start Driving
          </Text>
        </TouchableOpacity>

        {/* MISBEHAVIOR */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Misbehavior History
          </Text>

          {/* TODAY */}
          <TouchableOpacity
            onPress={() => toggleSection('Today')}
            style={styles.accordion}
          >
            <Text style={styles.subTitle}>
              Today
            </Text>

            <Ionicons
              name={
                openSection === 'Today'
                  ? "chevron-down"
                  : "chevron-forward"
              }
              size={18}
            />
          </TouchableOpacity>

          {openSection === 'Today' && (
            <View style={styles.accordionContent}>

              {driver.history.today.length > 0 ? (
                driver.history.today.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.historyItem}
                    onPress={() => setSelectedMisbehavior(item)}
                  >
                    <View style={styles.row}>
                      <MaterialCommunityIcons
                        name="alert-circle-outline"
                        size={20}
                        color="#F59E0B"
                      />

                      <Text style={styles.historyText}>
                        {item.behavior_name}
                      </Text>
                    </View>

                    <Text style={styles.time}>
                      {item.time}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyText}>
                  No incidents today
                </Text>
              )}

            </View>
          )}

          {/* MONTHLY HISTORY */}
          {Object.keys(driver.history.monthlyHistory || {}).map((month) => (
            <View key={month}>

              <TouchableOpacity
                style={styles.accordion}
                onPress={() => toggleSection(month)}
              >
                <Text>{month}</Text>

                <Ionicons
                  name={
                    openSection === month
                      ? "chevron-down"
                      : "chevron-forward"
                  }
                  size={18}
                />
              </TouchableOpacity>

              {openSection === month && (
                <View style={styles.accordionContent}>

                  {driver.history.monthlyHistory[month].map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.historyItem}
                      onPress={() => setSelectedMisbehavior(item)}
                    >
                      <View style={styles.row}>
                        <MaterialCommunityIcons
                          name="history"
                          size={20}
                          color="#F59E0B"
                        />

                        <Text style={styles.historyText}>
                          {item.behavior_name}
                        </Text>
                      </View>

                      <Text style={styles.time}>
                        {item.time}
                      </Text>
                    </TouchableOpacity>
                  ))}

                </View>
              )}

            </View>
          ))}
        </View>

        {/* MONTHLY SCORES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Monthly Scores
          </Text>

          <View style={styles.monthsRow}>
            {driver.monthlyScores.map((item, index) => (
              <View key={index} style={styles.monthBadge}>

                <View
                  style={[
                    styles.scoreCircleSmall,
                    { borderColor: getScoreColor(item.score) }
                  ]}
                >
                  <Text style={styles.smallScoreText}>
                    {item.score}
                  </Text>
                </View>

                <Text style={styles.monthLabel}>
                  {getMonthName(item.month)}
                </Text>

              </View>
            ))}
          </View>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity style={styles.logoutBtn}>
          <Text style={styles.logoutText}>
            Logout
          </Text>
        </TouchableOpacity>

        {/* MODAL */}
        {selectedMisbehavior && (
          <View style={styles.modalOverlay}>

            <View style={styles.modalCard}>

              <Text style={styles.modalTitle}>
                {selectedMisbehavior.behavior_name}
              </Text>

              <Text style={styles.modalText}>
                Severity: {selectedMisbehavior.severity}
              </Text>

              <Text style={styles.modalText}>
                Time: {selectedMisbehavior.time}
              </Text>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedMisbehavior(null)}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  Close
                </Text>
              </TouchableOpacity>

            </View>
          </View>
        )}

      </ScrollView>

      {/* BOTTOM NAV */}
      <View style={styles.bottomNav}>

        <View style={styles.navItem}>
          <Ionicons name="person" size={26} color="#F97316" />

          <Text style={[styles.navText, { color: '#F97316' }]}>
            Profile
          </Text>
        </View>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("Notifications")}
        >
          <View>
            <Ionicons
              name="notifications"
              size={26}
              color="#1E3A5F"
            />

            {driver.notificationsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {driver.notificationsCount}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.navText}>
            Notifications
          </Text>
        </TouchableOpacity>

      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF'
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },

  header: {
    backgroundColor: '#1E3A5F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
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

  profileCard: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },

  avatarContainer: {
    position: 'relative'
  },

  avatarFallback: {
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor: '#000042',
    alignItems: 'center',
    justifyContent: 'center'
  },

  avatarLetters: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold'
  },

  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#F97316',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white'
  },

  driverInfo: {
    flex: 1,
    marginLeft: 15
  },

  driverName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937'
  },

  companyText: {
    fontSize: 14,
    color: '#6B7280'
  },

  idText: {
    fontSize: 12,
    color: '#9CA3AF'
  },

  scoreBox: {
    alignItems: 'center'
  },

  scoreLabel: {
    fontSize: 12,
    color: '#9CA3AF'
  },

  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold'
  },

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

  startText: {
    color: 'white',
    fontWeight: 'bold'
  },

  section: {
    padding: 20
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold'
  },

  subTitle: {
    marginTop: 10
  },

  accordion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },

  accordionContent: {
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginTop: 5
  },

  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },

  historyText: {
    marginLeft: 10
  },

  time: {
    color: '#9CA3AF'
  },

  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    paddingVertical: 10
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

  logoutText: {
    color: 'white',
    fontWeight: 'bold'
  },

  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingVertical: 10,
    backgroundColor: '#FFF'
  },

  navItem: {
    flex: 1,
    alignItems: 'center'
  },

  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },

  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold'
  },

  navText: {
    fontSize: 12,
    marginTop: 2
  },

  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },

  modalCard: {
    width: '80%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center'
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10
  },

  modalText: {
    fontSize: 14,
    marginVertical: 2,
    color: '#374151'
  },

  closeBtn: {
    marginTop: 15,
    backgroundColor: '#1E3A5F',
    padding: 10,
    borderRadius: 8
  }
});