import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

// Corporate PWD Colors
const PWD_COLORS = {
  primaryDark: "#004AAD",
  primary: "#2196F3",
  background: "#F5F7FA",
  surface: "#FFFFFF",
  border: "#D9E2EC",
  text: "#333333",
  textLight: "#607D8B",
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

export default function AboutScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={PWD_COLORS.background}
      />

      {/* Background */}
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
          <Text style={styles.title}>About This App</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>VerifyMe</Text>
            <Text style={styles.cardDescription}>
              The VerifyMe application is designed to simplify and modernize the
              process of registration and verification for Persons with Disabilities
              (PWDs). By using this application, both PWDs and partner establishments
              can access services more efficiently and conveniently.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Development Team</Text>
            {[
              { name: "Andrie Miguel Sabio", role: "Project Manager" },
              { name: "Kiah Astrologo", role: "Documentation & Manuscript" },
              { name: "John Loreno", role: "Lead Developer" },
              { name: "Daryl Carl Buenaflor", role: "Systems Analyst" },
            ].map((dev, index) => (
              <View style={styles.developerCard} key={index}>
                <FontAwesome5
                  name="user-tie"
                  size={22}
                  color={PWD_COLORS.primaryDark}
                />
                <View style={styles.developerInfo}>
                  <Text style={styles.developerName}>{dev.name}</Text>
                  <Text style={styles.developerRole}>{dev.role}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Special Thanks</Text>
            <Text style={styles.cardDescription}>
              We sincerely thank everyone who supported and contributed to the
              development of this project. Your guidance, effort, and encouragement
              made this application possible.
            </Text>
          </View>
        </ScrollView>
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
  content: { paddingBottom: 40 },
  card: {
    backgroundColor: PWD_COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: PWD_COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: PWD_COLORS.primaryDark,
    marginBottom: 10,
  },
  cardDescription: {
    fontSize: 15,
    color: PWD_COLORS.textLight,
    lineHeight: 22,
  },
  developerCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  developerInfo: { marginLeft: 12 },
  developerName: { fontSize: 15, fontWeight: "600", color: PWD_COLORS.text },
  developerRole: { fontSize: 13, color: PWD_COLORS.textLight },
});
