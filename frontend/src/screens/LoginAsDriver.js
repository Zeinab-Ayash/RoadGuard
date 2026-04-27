import React, { useState } from "react";
import {
  Dimensions,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const { height: screenHeight } = Dimensions.get("window");

export default function LoginScreen() {
  const navigation = useNavigation();

  const [driverId, setDriverId] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");

  const [errors, setErrors] = useState({
    driverId: "",
    password: "",
  });

  const validate = () => {
    let valid = true;
    let newErrors = { driverId: "", password: "" };

    if (!driverId.trim()) {
      newErrors.driverId = "Driver ID is required";
      valid = false;
    }

    if (!password.trim()) {
      newErrors.password = "Password is required";
      valid = false;
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleLogin = () => {
    if (validate()) {
      setSuccessMessage("Login successful 🎉");
    } else {
      setSuccessMessage("");
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

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

            <TouchableOpacity onPress={handleBack}>
              <Text style={styles.back}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* IMAGE */}
          <View style={styles.imageContainer}>
            <Image
              source={require("../assets/images/driver.png")}
              style={styles.image}
            />
          </View>

          {/* CARD */}
          <View style={styles.card}>
            <ScrollView showsVerticalScrollIndicator={false}>

              <Text style={styles.subtitle}>
                Please enter your credentials
              </Text>

              {/* DRIVER ID */}
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#888" />
                <TextInput
                  placeholder="Driver ID"
                  placeholderTextColor="#aaa"
                  value={driverId}
                  onChangeText={(text) => {
                    setDriverId(text);
                    setErrors({ ...errors, driverId: "" });
                  }}
                  style={styles.input}
                />
              </View>
              {errors.driverId ? (
                <Text style={styles.error}>{errors.driverId}</Text>
              ) : null}

              {/* PASSWORD */}
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#888" />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#aaa"
                  secureTextEntry={secure}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setErrors({ ...errors, password: "" });
                  }}
                  style={styles.input}
                />
                <TouchableOpacity onPress={() => setSecure(!secure)}>
                  <Ionicons
                    name={secure ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#888"
                  />
                </TouchableOpacity>
              </View>
              {errors.password ? (
                <Text style={styles.error}>{errors.password}</Text>
              ) : null}

              {/* SUCCESS */}
              {successMessage ? (
                <View style={styles.successCard}>
                  <Ionicons name="checkmark-circle" size={50} color="green" />
                  <Text style={styles.successText}>{successMessage}</Text>
                </View>
              ) : null}

              {/* BUTTON */}
              <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Log In</Text>
              </TouchableOpacity>

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
    paddingHorizontal: 25,
    paddingTop: 25,
  },

  subtitle: {
    color: "#555",
    marginBottom: 15,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 15,
    marginBottom: 8,
  },

  input: {
    flex: 1,
    marginLeft: 10,
    fontSize:16,
    color:"#333",
  },

  error: {
    color: "red",
    fontSize: 12,
    marginBottom: 10,
    marginTop: 5,
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
    alignItems: "center",
    elevation: 5,
    marginTop: 10,
  },

  successText: {
    fontSize: 16,
    marginVertical: 10,
    fontWeight: "600",
  },
});