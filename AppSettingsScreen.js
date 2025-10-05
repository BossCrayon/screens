import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  StatusBar,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

// Corporate PWD Colors (same as Dashboard)
const PWD_COLORS = {
  primaryDark: "#004AAD",
  primary: "#2196F3",
  background: "#F5F7FA",
  surface: "#FFFFFF",
  border: "#D9E2EC",
  text: "#333333",
  textLight: "#607D8B",
};

// Floating background shapes (Dashboard style)
const FloatingShape = ({ size, color, duration, initialPosition }) => {
  const position = useRef(new Animated.ValueXY(initialPosition)).current;

  useEffect(() => {
    const randomX = Math.random() * width - size / 2;
    const randomY = Math.random() * height - size / 2;

    Animated.loop(
      Animated.sequence([
        Animated.timing(position, {
          toValue: { x: randomX, y: randomY },
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(position, {
          toValue: initialPosition,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.shape,
        {
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: size / 2,
        },
        { transform: position.getTranslateTransform() },
      ]}
    />
  );
};

export default function AppSettingsScreen({ navigation }) {
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={PWD_COLORS.background} />

      {/* Background Animation */}
      <View style={styles.animationContainer}>
        <FloatingShape
          size={220}
          color="rgba(33, 150, 243, 0.08)"
          duration={22000}
          initialPosition={{ x: -100, y: -120 }}
        />
        <FloatingShape
          size={160}
          color="rgba(0, 74, 173, 0.08)"
          duration={20000}
          initialPosition={{ x: width - 150, y: height - 300 }}
        />
        <FloatingShape
          size={140}
          color="rgba(0, 168, 107, 0.08)"
          duration={18000}
          initialPosition={{ x: width / 2, y: height / 3 }}
        />
      </View>

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome5 name="chevron-left" size={18} color={PWD_COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>App Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Settings Card */}
        <View style={styles.card}>
          {/* Notifications */}
          <View style={styles.settingRow}>
            <View style={styles.iconRow}>
              <FontAwesome5 name="bell" size={20} color={PWD_COLORS.primaryDark} />
              <Text style={styles.settingLabel}>Push Notifications</Text>
            </View>
            <Switch
              trackColor={{ false: "#767577", true: PWD_COLORS.primary }}
              thumbColor={notificationsEnabled ? PWD_COLORS.surface : "#f4f3f4"}
              onValueChange={() => setNotificationsEnabled((prev) => !prev)}
              value={notificationsEnabled}
            />
          </View>

          {/* Version */}
          <View style={styles.settingRow}>
            <View style={styles.iconRow}>
              <FontAwesome5
                name="info-circle"
                size={20}
                color={PWD_COLORS.primaryDark}
              />
              <Text style={styles.settingLabel}>App Version</Text>
            </View>
            <Text style={styles.versionText}>1.0.0</Text>
          </View>

          {/* About */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate("About")}
          >
            <View style={styles.iconRow}>
              <FontAwesome5
                name="users"
                size={20}
                color={PWD_COLORS.primaryDark}
              />
              <Text style={styles.settingLabel}>About</Text>
            </View>
            <FontAwesome5
              name="chevron-right"
              size={16}
              color={PWD_COLORS.textLight}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PWD_COLORS.background },
  animationContainer: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  shape: { position: "absolute", opacity: 0.6 },
  container: { flex: 1, padding: 20, zIndex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "600", color: PWD_COLORS.primaryDark },
  card: {
    backgroundColor: PWD_COLORS.surface,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: PWD_COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: PWD_COLORS.border,
  },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingLabel: {
    fontSize: 16,
    color: PWD_COLORS.text,
    fontWeight: "500",
  },
  versionText: {
    fontSize: 16,
    color: PWD_COLORS.textLight,
    fontWeight: "500",
  },
});
