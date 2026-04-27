import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  StatusBar,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const { height: screenHeight } = Dimensions.get("window");

export default function AddDriverScreen({ navigation, onBack }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // ✅ selectable country code
  const [countryCode, setCountryCode] = useState("+974");
  const [showCodes, setShowCodes] = useState(false);

  const [errors, setErrors] = useState({
    name: "",
    phone: "",
  });

  const [showSuccess, setShowSuccess] = useState(false);

  /* ================= VALIDATION ================= */
  const validate = () => {
    let valid = true;

    let newErrors = {
      name: "",
      phone: "",
    };

    if (!name.trim()) {
      newErrors.name = "Driver name is required";
      valid = false;
    }

    if (!phone.trim()) {
      newErrors.phone = "Phone number is required";
      valid = false;
    } else if (phone.length < 8) {
      newErrors.phone = "Invalid phone number";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleAddDriver = () => {
    if (validate()) {
      setShowSuccess(true);
    }
  };

  const handleBack = () => {
    if (onBack) onBack();
    else if (navigation) navigation.goBack();
  };

  const countryOptions = ["+974", "+961", "+1", "+44", "+33"];

  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.mobileWrapper}>
        <SafeAreaView style={styles.safeArea}>

          {/* HEADER */}
          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Image
                source={require("../assets/images/logo.png")}
                style={styles.headerIcon}
              />
              <Text style={styles.headerText}>RoadGuard</Text>
            </View>

            {/* ✅ CLICKABLE BACK BUTTON */}
            <TouchableOpacity onPress={handleBack}>
              <Text style={styles.back}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* IMAGE */}
          <View style={styles.imageContainer}>
            <Image
              source={require("../assets/images/AddDriver.png")}
              style={styles.image}
            />
          </View>

          {/* CARD */}
          <View style={styles.card}>
            <ScrollView showsVerticalScrollIndicator={false}>

              

              {/* NAME */}
              <TextInput
                placeholder="Driver's Name"
                placeholderTextColor="#aaa"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setErrors({ ...errors, name: "" });
                }}
                style={styles.input}
              />
              {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}

              {/* COUNTRY CODE SELECTOR */}
              <View style={{ marginTop: 10 }}>
                <TouchableOpacity
                  style={styles.phoneContainer}
                  onPress={() => setShowCodes(!showCodes)}
                >
                  <Text style={{ marginRight: 10 }}>{countryCode}</Text>

                  <TextInput
                    placeholder="phone number"
                    placeholderTextColor="#aaa"
                    keyboardType="numeric"
                    value={phone}
                    onChangeText={(text) => {
                      setPhone(text);
                      setErrors({ ...errors, phone: "" });
                    }}
                    style={styles.phoneInput}
                  />

                  <Ionicons name="chevron-down" size={18} color="#777" />
                </TouchableOpacity>

                {/* DROPDOWN */}
                {showCodes && (
                  <View style={styles.dropdown}>
                    {countryOptions.map((code) => (
                      <TouchableOpacity
                        key={code}
                        onPress={() => {
                          setCountryCode(code);
                          setShowCodes(false);
                        }}
                        style={styles.dropdownItem}
                      >
                        <Text>{code}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {errors.phone ? (
                <Text style={styles.error}>{errors.phone}</Text>
              ) : null}

              {/* BUTTON */}
              <TouchableOpacity style={styles.button} onPress={handleAddDriver}>
                <Text style={styles.buttonText}>Add Driver</Text>
              </TouchableOpacity>

              {/* SUCCESS */}
              {showSuccess && (
                <View style={styles.successCard}>
                  <Ionicons name="checkmark-circle" size={50} color="green" />
                  <Text style={styles.successText}>
                    Driver added successfully
                  </Text>

                  <View style={styles.credentialRow}>
                    <Text style={styles.label}>Driver ID</Text>
                    <Text style={styles.value}>DRV19002</Text>
                  </View>

                  <View style={styles.credentialRow}>
                    <Text style={styles.label}>Password</Text>
                    <Text style={styles.value}>4Tm8d!4x</Text>
                  </View>

                  <Text style={styles.note}>
                    Please share these credentials with the driver.
                  </Text>

                  <TouchableOpacity
                    style={styles.okButton}
                    onPress={() => setShowSuccess(false)}
                  >
                    <Text style={styles.okText}>OK</Text>
                  </TouchableOpacity>
                </View>
              )}

            </ScrollView>
          </View>

        </SafeAreaView>
      </View>
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: "#eee",
    alignItems: "center",
  },

  mobileWrapper: {
    width: "100%",
    maxWidth: 450,
    height: "100%",
    backgroundColor: "#000042",
  },

  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },

  header: {
    backgroundColor: "#000042",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
  },

  headerIcon: { width: 30, height: 30 },
  headerText: { color: "white", fontSize: 18, fontWeight: "bold" },

  back: {
    color: "#fff",
    fontWeight: "bold",
  },

  imageContainer: {
    height: screenHeight * 0.30,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -40,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
  },

  subtitle: {
    color: "#555",
    marginBottom: 15,
  },

  input: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 10,
  },

  error: {
    color: "red",
    fontSize: 12,
    marginBottom: 10,
    marginTop: 5,
  },

  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },

  phoneInput: {
    flex: 1,
  },

  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginTop: 5,
    padding: 10,
    elevation: 3,
  },

  dropdownItem: {
    padding: 10,
  },

  button: {
    backgroundColor: "#FF6A00",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 15,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
successCard: {
  width: "100%",
  padding: 20,
  backgroundColor: "#fff",
  borderRadius: 20,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.25,
  shadowRadius: 10,
  alignItems: "center",
  elevation: 10,
},
  successText: {
    fontSize: 16,
    marginVertical: 10,
    fontWeight: "600",
  },

  credentialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    backgroundColor: "#eee",
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },

  label: {
    color: "#555",
  },

  value: {
    fontWeight: "bold",
  },

  note: {
    marginTop: 10,
    textAlign: "center",
    color: "#666",
    fontSize: 12,
  },

  okButton: {
    marginTop: 15,
    backgroundColor: "#3b5998",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
  },

  okText: {
    color: "#fff",
    fontWeight: "bold",
  },
  
});