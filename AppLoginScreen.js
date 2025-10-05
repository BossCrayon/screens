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
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
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

export default function AppLoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert("Error", "Please enter both email and password.");
    }
    setIsLoading(true);

    try {
      // ✅ Firebase Auth login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ✅ Get Firestore user data
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      if (!user.emailVerified) {
        Alert.alert("Email not verified", "Please verify your email before logging in.");
        return;
      }

      signIn({ email: user.email, id: user.uid, ...userData });
    } catch (error) {
      Alert.alert("Login Failed", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={PWD_COLORS.background} />
      <View style={styles.animationContainer}>
        <FloatingShape size={220} color="rgba(33,150,243,0.08)" duration={22000} initialPosition={{ x: -100, y: -120 }} />
        <FloatingShape size={160} color="rgba(0,74,173,0.08)" duration={20000} initialPosition={{ x: width - 150, y: height - 300 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

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
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!isPasswordVisible}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setIsPasswordVisible((s) => !s)}
          >
            <FontAwesome5
              name={isPasswordVisible ? "eye" : "eye-slash"}
              size={20}
              color={PWD_COLORS.textLight}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.button, isLoading && { opacity: 0.9 }]} onPress={handleLogin} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color={PWD_COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Don’t have an account?</Text>
            <Text style={styles.linkText}> Sign Up</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PWD_COLORS.background, justifyContent: "center" },
  animationContainer: { ...StyleSheet.absoluteFillObject, zIndex: 0, overflow: "hidden" },
  shape: { position: "absolute", opacity: 0.6 },
  card: {
    padding: 25,
    backgroundColor: PWD_COLORS.surface,
    marginHorizontal: 20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 1,
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
  passwordContainer: { flexDirection: "row", alignItems: "center", backgroundColor: PWD_COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: PWD_COLORS.border, marginBottom: 15 },
  passwordInput: { flex: 1, height: 50, paddingHorizontal: 15, fontSize: 16, color: PWD_COLORS.text },
  eyeIcon: { padding: 15 },
  button: { backgroundColor: PWD_COLORS.primary, padding: 15, borderRadius: 10, alignItems: "center", marginVertical: 10 },
  buttonText: { color: PWD_COLORS.white, fontSize: 16, fontWeight: "700" },
  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: 14 },
  switchText: { color: PWD_COLORS.textLight, fontSize: 14 },
  linkText: { color: PWD_COLORS.primary, fontWeight: "700" },
});
