import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function MiraLogin() {
  const handleCompany = () => {
    console.log("Company Pressed");
  };

  const handleDriver = () => {
    console.log("Driver Pressed");
  };

  return (
    <View style={styles.container}>
      {/* Invisible Wrapper for Position & Shadow */}
      <View style={styles.logoWrapper}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logoImage}
        />
      </View>

      {/* Title */}
      <Text style={styles.title}>RoadGuard</Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>Login As</Text>

      {/* Company Button */}
      <TouchableOpacity style={styles.companyButton} onPress={handleCompany}>
        <MaterialIcons name="business" size={22} color="#fff" />
        <Text style={styles.buttonText}> Company</Text>
      </TouchableOpacity>

      {/* Driver Button */}
      <TouchableOpacity style={styles.driverButton} onPress={handleDriver}>
        <Ionicons name="person-outline" size={22} color="#fff" />
        <Text style={styles.buttonText}> Driver</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  logoWrapper: {
    marginTop: -60,    // Pulls the image HIGHER up the screen
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 12,     // Android Shadow
    backgroundColor: '#000042',
    borderRadius: 20,
    width: 165,
    height: 165,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoImage: {
    width: 170,
    height: 170,
    borderRadius: 30, 
    backgroundColor: 'transparent', 
    resizeMode: "contain",
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1C2A3A",
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 18,
    color: "#6B7280",
    marginBottom: 30,
  },

  companyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E3A5F",
    paddingVertical: 16,
    borderRadius: 12,
    width: "85%",
    justifyContent: "center",
    marginBottom: 15,
    elevation: 5,
  },

  driverButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F97316",
    paddingVertical: 16,
    borderRadius: 12,
    width: "85%",
    justifyContent: "center",
    elevation: 5,
  },

  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
});