import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const { height: screenHeight } = Dimensions.get("window");

export default function App() {
  const navigation = useNavigation();

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");

  const [errors, setErrors] = useState({
    companyName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });

  /* ================= VALIDATION ================= */
  const validate = () => {
    let valid = true;

    let newErrors = {
      companyName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    const phoneRegex = /^[0-9]{7,15}$/;

    if (!companyName.trim()) {
      newErrors.companyName = "Company name is required";
      valid = false;
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
      valid = false;
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Invalid email";
      valid = false;
    }

    if (!password) {
      newErrors.password = "Password is required";
      valid = false;
    } else if (!passwordRegex.test(password)) {
      newErrors.password = "Min 8 chars, include upper, lower & number";
      valid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirm your password";
      valid = false;
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = "Passwords do not match";
      valid = false;
    }

    if (!phone) {
      newErrors.phone = "Phone is required";
      valid = false;
    } else if (!phoneRegex.test(phone)) {
      newErrors.phone = "Invalid phone number";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSignUp = () => {
    if (validate()) {
      alert("Signup Successful ✅");
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.phoneFrame}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <SafeAreaView style={styles.safeArea}>

          {/* HEADER */}
          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Image
                source={require("../../assets/images/logo.png")}
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
              source={require("../../assets/images/network.png")}
              style={styles.networkGraphic}
            />
          </View>

          {/* CARD */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Sign Up as a Company</Text>

            {/* Company */}
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="office-building" size={20} color="#aaa" />
              <TextInput
                placeholder="Company Name"
                value={companyName}
                onChangeText={(text) => {
                  setCompanyName(text);
                  setErrors({ ...errors, companyName: "" });
                }}
                style={styles.textInput}
                placeholderTextColor="#aaa"
              />
            </View>
            {errors.companyName ? <Text style={styles.error}>{errors.companyName}</Text> : null}

            {/* Email */}
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#aaa" />
              <TextInput
                placeholder="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrors({ ...errors, email: "" });
                }}
                style={styles.textInput}
                keyboardType="email-address"
                placeholderTextColor="#aaa"
              />
            </View>
            {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}

            {/* Password */}
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#aaa" />
              <TextInput
                placeholder="Password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrors({ ...errors, password: "" });
                }}
                style={styles.textInput}
                secureTextEntry
                placeholderTextColor="#aaa"
              />
            </View>
            {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}

            {/* Confirm Password */}
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="lock-check-outline" size={20} color="#aaa" />
              <TextInput
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setErrors({ ...errors, confirmPassword: "" });
                }}
                style={styles.textInput}
                secureTextEntry
                placeholderTextColor="#aaa"
              />
            </View>
            {errors.confirmPassword ? <Text style={styles.error}>{errors.confirmPassword}</Text> : null}

            {/* Phone */}
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color="#aaa" />
              <TextInput
                placeholder="Phone Number"
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  setErrors({ ...errors, phone: "" });
                }}
                style={styles.textInput}
                keyboardType="phone-pad"
                placeholderTextColor="#aaa"
              />
            </View>
            {errors.phone ? <Text style={styles.error}>{errors.phone}</Text> : null}

            {/* BUTTON */}
            <TouchableOpacity style={styles.signUpBtn} onPress={handleSignUp}>
              <Text style={styles.signUpBtnText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

        </SafeAreaView>
      </View>
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#002244",
    alignItems: "center",
    justifyContent: "center",
  },

  phoneFrame: {
    width: 420,
    maxWidth: "100%",
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

  networkGraphic: { width: "100%", height: "100%" },

  card: {
    flex: 1,
    backgroundColor: "white",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  cardHeading: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1a2b48",
    marginBottom: 10,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 5,
  },

  textInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#000",
  },

  error: {
    color: "red",
    fontSize: 12,
    marginBottom: 5,
  },

  signUpBtn: {
    backgroundColor: "#1a2b48",
    height: 52,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  signUpBtnText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});