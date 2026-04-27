import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import iconImage from '../../assets/images/icon.png';

/* =========================
   DUMMY DATA (READY FOR API)
========================= */
const initialDrivers = [
  { id: 'DRV19002', name: 'Ahmad Hassan', score: 92, misbehaviors: 2 },
  { id: 'DRV19007', name: 'Sara Khalil', score: 76, misbehaviors: 5 },
  { id: 'DRV19003', name: 'Rami Ali', score: 58, misbehaviors: 8 },
  { id: 'DRV19013', name: 'Sara Sami', score: 44, misbehaviors: 12 },
  { id: 'DRV19012', name: 'Wael Ahmad', score: 88, misbehaviors: 1 },
];

/* =========================
   SCORE COLOR LOGIC
========================= */
const getScoreColor = (score) => {
  if (score >= 80) return '#16a34a';
  if (score >= 60) return '#eab308';
  if (score >= 50) return '#f97316';
  return '#ef4444';
};

/* =========================
   DRIVER CARD
========================= */
const DriverCard = ({ driver }) => {
  return (
    <View style={styles.card}>
      <Image source={iconImage} style={styles.avatar} />

      <View style={styles.info}>
        <Text style={styles.name}>{driver.name}</Text>
        <Text style={styles.id}>{driver.id}</Text>
      </View>

      <View style={styles.rightSection}>
        <View
          style={[
            styles.scoreBox,
            { backgroundColor: getScoreColor(driver.score) },
          ]}
        >
          <Text style={styles.scoreText}>{driver.score}</Text>
        </View>

        <Text style={styles.mis}>
          Misbehaviors this month: {driver.misbehaviors}
        </Text>
      </View>
    </View>
  );
};

/* =========================
   MAIN SCREEN
========================= */
export default function DriversList({ navigation }) {
  const [drivers] = useState(initialDrivers);
  const [search, setSearch] = useState('');
  const [sortType, setSortType] = useState('high');
  const [showSort, setShowSort] = useState(false);

  const filteredDrivers = drivers
    .filter(
      (d) =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.id.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) =>
      sortType === 'high' ? b.score - a.score : a.score - b.score
    );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Image source={iconImage} style={styles.headerIcon} />
        <Text style={styles.headerText}>RoadGuard</Text>
      </View>

      {/* SEARCH + SORT */}
      <View style={styles.searchRow}>
        
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="gray" />
          <TextInput
            placeholder="Search by driver name or ID"
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

      {/* SORT OPTIONS */}
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
            <Text
              style={[
                styles.optionText,
                sortType === 'low' && styles.activeText,
              ]}
            >
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
            <Text
              style={[
                styles.optionText,
                sortType === 'high' && styles.activeText,
              ]}
            >
              High → Low
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* LIST */}
      <FlatList
        data={filteredDrivers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DriverCard driver={item} />}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      {/* FOOTER */}
      <View style={styles.footer}>
        {/* ✅ ADDED NAVIGATION HERE */}
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

/* =========================
   STYLES
========================= */
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

  input: {
    marginLeft: 10,
    flex: 1,
    fontSize: 13,
  },

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

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },

  optionText: {
    marginLeft: 10,
  },

  activeText: {
    color: '#f97316',
    fontWeight: 'bold',
  },

  card: {
    flexDirection: 'row',
    backgroundColor: 'white',
    margin: 8,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
  },

  avatar: { width: 50, height: 50, marginRight: 10 },

  info: { flex: 1 },

  name: { fontWeight: 'bold' },
  id: { color: 'gray' },

  rightSection: { alignItems: 'flex-end' },

  mis: {
    fontSize: 11,
    color: 'gray',
    marginTop: 3,
    textAlign: 'right',
  },

  scoreBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },

  scoreText: { color: 'white', fontWeight: 'bold' },

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
    justifyContent: 'center',
  },
});