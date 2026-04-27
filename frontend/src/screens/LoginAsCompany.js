import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const { height: screenHeight } = Dimensions.get("window");

export default function App() {
  const navigation = useNavigation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  /* ================= VALIDATION ================= */
  const validate = () => {
    let valid = true;
    let newErrors = {
      email: "",
      password: "",
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;

    if (!email.trim()) {
      newErrors.email = "Email is required";
      valid = false;
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Invalid email format";
      valid = false;
    }

    if (!password) {
      newErrors.password = "Password is required";
      valid = false;
    } else if (!passwordRegex.test(password)) {
      newErrors.password =
        "Min 8 chars, include uppercase, lowercase & number";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleLogin = () => {
    if (validate()) {
      alert("Company Login Successful 🏢");
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

            {/* BACK BUTTON */}
            <TouchableOpacity onPress={handleBack}>
              <Text style={styles.back}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* IMAGE */}
          <View style={styles.imageContainer}>
            <Image
              source={require("../assets/images/network.png")}
              style={styles.networkGraphic}
            />
          </View>

          {/* CARD */}
          <View style={styles.card}>
            <ScrollView showsVerticalScrollIndicator={false}>

              <Text style={styles.cardHeading}>Login as Company</Text>

              {/* EMAIL */}
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="email-outline" size={20} color="#aaa" />
                <TextInput
                  placeholder="Email"
                  placeholderTextColor="#aaa"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setErrors({ ...errors, email: "" });
                  }}
                  style={styles.textInput}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}

              {/* PASSWORD */}
              <View style={styles.inputWrapper}>
                <FontAwesome5 name="lock" size={16} color="#aaa" />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#aaa"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setErrors({ ...errors, password: "" });
                  }}
                  style={styles.textInput}
                  secureTextEntry
                />
              </View>

              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}

              {/* BUTTON */}
              <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
                <Text style={styles.loginBtnText}>Login</Text>
              </TouchableOpacity>

              {/* SIGN UP */}
              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>Don’t have an account? </Text>
                <TouchableOpacity>
                  <Text style={styles.signupLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>

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
    backgroundColor: "#e7f2fc",
    alignItems: "center",
  },

  mobileWrapper: {
    width: "100%",
    maxWidth: 450,
    height: "100%",
    backgroundColor: "#002244",
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

  networkGraphic: {
    width: "100%",
    height: "100%",
  },

  card: {
    flex: 1,
    backgroundColor: "#f8f9fb",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -40,
    paddingHorizontal: 25,
    paddingTop: 25,
  },

  cardHeading: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1a2b48",
    marginBottom: 30,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
    marginBottom: 8,
  },

  textInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },

  errorText: {
    color: "red",
    fontSize: 12,
    marginBottom: 10,
  },

  loginBtn: {
    backgroundColor: "#0b2c4d",
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  loginBtnText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },

  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },

  signupText: {
    color: "#777",
  },

  signupLink: {
    color: "#0b2c4d",
    fontWeight: "bold",
  },
});