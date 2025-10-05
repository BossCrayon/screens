import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableWithoutFeedback,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useAuth } from "../../App";

const { width, height } = Dimensions.get("window");

// Corporate PWD Colors
const PWD_COLORS = {
  primaryDark: "#004AAD", // Deep corporate blue
  primary: "#2196F3", // Bright accessibility blue
  background: "#F5F7FA", // Light neutral
  surface: "#FFFFFF", // White cards
  border: "#D9E2EC", // Soft border
  text: "#333333", // Default text
  textLight: "#607D8B", // Subtle text
};

// Floating background shapes
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

// Reusable animated button
const AnimatedButton = ({ icon, label, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        <FontAwesome5 name={icon} size={26} color={PWD_COLORS.primaryDark} />
        <Text style={styles.cardText}>{label}</Text>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

export default function DashboardScreen({ navigation }) {
  const { signOut, user } = useAuth();

  const getWelcomeMessage = () => {
    if (user?.firstName && user?.lastName) {
      return `Welcome, ${user.firstName} ${user.lastName}`;
    }
    if (user?.username) return `Welcome, ${user.username}`;
    if (user?.email) {
      const shortEmail =
        user.email.length > 20 ? user.email.split("@")[0] : user.email;
      return `Welcome, ${shortEmail}`;
    }
    return `Welcome, Guest`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={PWD_COLORS.background}
      />

      {/* Background animation */}
      <View style={styles.animationContainer}>
        <FloatingShape
          size={220}
          color="rgba(33, 150, 243, 0.08)" // Bright Blue
          duration={22000}
          initialPosition={{ x: -100, y: -120 }}
        />
        <FloatingShape
          size={160}
          color="rgba(0, 74, 173, 0.08)" // Deep Blue
          duration={20000}
          initialPosition={{ x: width - 150, y: height - 300 }}
        />
        <FloatingShape
          size={140}
          color="rgba(0, 168, 107, 0.08)" // Supportive Green
          duration={18000}
          initialPosition={{ x: width / 2, y: height / 3 }}
        />
      </View>

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>VerifyMe</Text>
          <Text style={styles.subtitle}>PWD Application Philippines</Text>
          <Text style={styles.welcome}>{getWelcomeMessage()}</Text>
        </View>

        {/* Main actions with animation */}
        <View style={styles.mainCardContainer}>
          <AnimatedButton
            icon="wheelchair"
            label="Register PWD"
            onPress={() =>
              navigation.navigate("Register", { email: user?.email })
            }
          />

          <AnimatedButton
            icon="id-card"
            label="Scan & Verify ID"
            onPress={() => navigation.navigate("Scan")}
          />
        </View>

        {/* Footer navigation */}
        <View style={styles.footerNav}>
          <TouchableWithoutFeedback
            onPress={() => navigation.navigate("ProfileSettings")}
          >
            <View style={styles.footerButton}>
              <FontAwesome5 name="user" size={18} color={PWD_COLORS.textLight} />
              <Text style={styles.footerButtonText}>Profile</Text>
            </View>
          </TouchableWithoutFeedback>

          <TouchableWithoutFeedback
            onPress={() => navigation.navigate("AppSettings")}
          >
            <View style={styles.footerButton}>
              <FontAwesome5 name="cog" size={18} color={PWD_COLORS.textLight} />
              <Text style={styles.footerButtonText}>Settings</Text>
            </View>
          </TouchableWithoutFeedback>

          <TouchableWithoutFeedback onPress={signOut}>
            <View style={styles.footerButton}>
              <FontAwesome5
                name="sign-out-alt"
                size={18}
                color={PWD_COLORS.textLight}
              />
              <Text style={styles.footerButtonText}>Logout</Text>
            </View>
          </TouchableWithoutFeedback>
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
  headerContainer: { paddingVertical: 20, alignItems: "center" },
  title: { fontSize: 26, fontWeight: "600", color: PWD_COLORS.primaryDark },
  subtitle: { fontSize: 14, color: PWD_COLORS.textLight, marginTop: 4 },
  welcome: { fontSize: 16, color: PWD_COLORS.primary, marginTop: 10 },

  mainCardContainer: { flex: 1, justifyContent: "center", gap: 14 },
  card: {
    backgroundColor: PWD_COLORS.surface,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: PWD_COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  cardText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "500",
    color: PWD_COLORS.primaryDark,
  },

  footerNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: PWD_COLORS.border,
    backgroundColor: PWD_COLORS.background,
  },
  footerButton: { alignItems: "center", flex: 1 },
  footerButtonText: { marginTop: 4, color: PWD_COLORS.textLight, fontSize: 12 },
});
