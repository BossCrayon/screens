import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  ScrollView,
} from "react-native";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { useAuth } from "../../App";
import { FontAwesome5 } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const PWD_COLORS = {
  primaryDark: "#004AAD",
  primary: "#2196F3",
  background: "#F5F7FA",
  surface: "#FFFFFF",
  border: "#D9E2EC",
  text: "#333333",
  textLight: "#607D8B",
  white: "#FFFFFF",
};

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
        {
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: size / 2,
          position: "absolute",
          opacity: 0.6,
        },
        { transform: position.getTranslateTransform() },
      ]}
    />
  );
};

export default function AppSignupScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      return Alert.alert("Error", "All fields are required.");
    }
    if (password !== confirmPassword) {
      return Alert.alert("Error", "Passwords do not match.");
    }

    setIsLoading(true);
    try {
      // ✅ Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // ✅ Send email verification
      await sendEmailVerification(user);

      // ✅ Save Firestore user data (no password)
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        createdAt: new Date().toISOString(),
        emailVerified: false,
      });

      Alert.alert(
        "Verify your email",
        "A verification link has been sent to your email. Please verify before logging in."
      );

      navigation.navigate("Login");
    } catch (error) {
      Alert.alert("Signup Failed", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PWD_COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={PWD_COLORS.background} />
      <View style={{ ...StyleSheet.absoluteFillObject, zIndex: 0 }}>
        <FloatingShape size={220} color="rgba(33,150,243,0.08)" duration={22000} initialPosition={{ x: -100, y: -120 }} />
        <FloatingShape size={160} color="rgba(0,74,173,0.08)" duration={20000} initialPosition={{ x: width - 150, y: height - 300 }} />
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <View style={styles.card}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, isLoading && { opacity: 0.9 }]}
            onPress={handleSignup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={PWD_COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Already have an account?</Text>
              <Text style={styles.linkText}> Log In</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 25,
    backgroundColor: PWD_COLORS.surface,
    marginHorizontal: 20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: PWD_COLORS.border,
  },
  title: { fontSize: 28, fontWeight: "700", color: PWD_COLORS.primaryDark, textAlign: "center" },
  subtitle: { fontSize: 16, color: PWD_COLORS.textLight, textAlign: "center", marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "600", color: PWD_COLORS.text, marginBottom: 8 },
  input: {
    height: 50,
    backgroundColor: PWD_COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: PWD_COLORS.border,
    fontSize: 16,
    marginBottom: 15,
    color: PWD_COLORS.text,
  },
  button: {
    backgroundColor: PWD_COLORS.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 10,
  },
  buttonText: { color: PWD_COLORS.white, fontSize: 16, fontWeight: "700" },
  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: 14 },
  switchText: { color: PWD_COLORS.textLight, fontSize: 14 },
  linkText: { color: PWD_COLORS.primary, fontWeight: "700" },
});
