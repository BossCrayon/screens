// <replace your ProfileSettingsScreen.js with this file>
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../../App";
import { FontAwesome5 } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import DigitalIDCard from "./DigitalIDCard";

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

// Options
const genderOptions = [
  { label: "Select Gender...", value: "" },
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
];

const disabilityOptions = [
  { label: "Types of Disability...", value: "" },
  { label: "Deaf or Hard of Hearing", value: "Deaf or Hard of Hearing" },
  { label: "Intellectual Disability", value: "Intellectual Disability" },
  { label: "Learning Disability", value: "Learning Disability" },
  { label: "Mental Disability", value: "Mental Disability" },
  { label: "Physical Disability(Orthopedic)", value: "Physical Disability(Orthopedic)" },
  { label: "Speech and Language Disability", value: "Speech and Language Disability" },
  { label: "Visual Disability", value: "Visual Disability" },
  { label: "Cancer(RA11215)", value: "Cancer(RA11215)" },
  { label: "Rare Disease(RA10747)", value: "Rare Disease(RA10747)" },
];

const barangayOptions = [
  "Bagtic","Balaring","Barangay I (Poblacion)","Barangay II (Poblacion)",
  "Barangay III (Poblacion)","Barangay IV (Poblacion)","Barangay V (Poblacion)",
  "Barangay VI (Poblacion/Hawaiian)","Eustaquio Lopez","Guimbala-on",
  "Guinhalaran","Kapitan Ramon","Lantad","Mambulac","Patag","Rizal",
];

// Floating shapes
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

// Animated button
const AnimatedButton = ({ icon, label, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  return (
    <TouchableWithoutFeedback
      onPressIn={() =>
        Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start()
      }
      onPressOut={() =>
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }).start()
      }
      onPress={onPress}
    >
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        <FontAwesome5 name={icon} size={22} color={PWD_COLORS.primaryDark} />
        <Text style={styles.cardText}>{label}</Text>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

export default function ProfileSettingsScreen({ navigation }) {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState("menu");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Fetch function extracted so we can call it (and re-call) easily
  const fetchProfileData = async () => {
    if (!user?.email && !user?.uid) {
      console.warn("No user email/uid available for fetching profile.");
      return;
    }

    setIsFetching(true);
    try {
      console.log("Fetching EPWD by EmailAddress:", user?.email);
      const q = query(collection(db, "EPWD"), where("EmailAddress", "==", user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const data = userDoc.data();
        setProfileData({ id: userDoc.id, ...data });
        setFormData(data);
        console.log("Fetched EPWD doc id:", userDoc.id);
        return;
      }

      // Fallback: try searching by UID (if EPWD has a 'UID' field)
      if (user?.uid) {
        console.log("Trying fallback: query EPWD by UID:", user.uid);
        const q2 = query(collection(db, "EPWD"), where("UID", "==", user.uid));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) {
          const d = snap2.docs[0];
          setProfileData({ id: d.id, ...d.data() });
          setFormData(d.data());
          console.log("Fetched EPWD doc id by UID:", d.id);
          return;
        }
      }

      console.warn("No EPWD document found for email/uid:", user?.email, user?.uid);
      Alert.alert("Profile not found", "Could not locate your EPWD profile. If this is unexpected, contact an admin.");
      setCurrentView("menu");
    } catch (error) {
      console.error("fetchProfileData error:", error);
      Alert.alert("Error", "Failed to fetch profile data.");
    } finally {
      setIsFetching(false);
    }
  };

  // useEffect to auto-fetch when entering info/digitalID
  useEffect(() => {
    if (currentView === "info" || currentView === "digitalID") {
      fetchProfileData();
    }
  }, [currentView, user]);

  // Change Password
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return Alert.alert("Error", "Please fill all fields.");
    }
    if (newPassword !== confirmNewPassword) {
      return Alert.alert("Error", "New passwords do not match.");
    }
    setIsLoading(true);
    try {
      const userRef = doc(db, "users", user.docId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists() && userDoc.data().password === currentPassword) {
        await updateDoc(userRef, { password: newPassword });
        Alert.alert("Success", "Password updated.");
        setCurrentView("menu");
      } else {
        Alert.alert("Error", "Incorrect current password.");
      }
    } catch (err) {
      console.error("handleChangePassword error:", err);
      Alert.alert("Error", "Could not update password.");
    } finally {
      setIsLoading(false);
    }
  };

  // Update profile info (robustly find docId if missing)
  const handleUpdateInfo = async () => {
    setIsLoading(true);
    try {
      let docId = profileData?.id;

      if (!docId) {
        // try find by EmailAddress (form or user)
        const emailToSearch = formData?.EmailAddress || user?.email;
        if (emailToSearch) {
          const q = query(collection(db, "EPWD"), where("EmailAddress", "==", emailToSearch));
          const snap = await getDocs(q);
          if (!snap.empty) {
            docId = snap.docs[0].id;
            console.log("Found EPWD doc id for update via email:", docId);
          }
        }
      }

      if (!docId) {
        // last-ditch: try UID
        if (user?.uid) {
          const q2 = query(collection(db, "EPWD"), where("UID", "==", user.uid));
          const snap2 = await getDocs(q2);
          if (!snap2.empty) {
            docId = snap2.docs[0].id;
            console.log("Found EPWD doc id for update via UID:", docId);
          }
        }
      }

      if (!docId) {
        Alert.alert("Error", "Could not determine which profile to update.");
        setIsLoading(false);
        return;
      }

      const profileRef = doc(db, "EPWD", docId);
      await updateDoc(profileRef, formData);
      Alert.alert("Success", "Profile updated.");
      // refresh local profileData
      await fetchProfileData();
      setCurrentView("menu");
    } catch (err) {
      console.error("handleUpdateInfo error:", err);
      Alert.alert("Error", "Failed to update profile.");
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic field renderer (with unique keys)
  const renderTextField = (key, placeholder) => {
    if (key === "Gender") {
      return (
        <View key={key} style={{ marginBottom: 15 }}>
          <Text style={styles.label}>{placeholder}</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData[key] || ""}
              onValueChange={(v) => setFormData((prev) => ({ ...prev, [key]: v }))}
            >
              {genderOptions.map((o, idx) => (
                <Picker.Item key={`gender-${idx}`} label={o.label} value={o.value} />
              ))}
            </Picker>
          </View>
        </View>
      );
    }

    if (key === "TypeOfDisability") {
      return (
        <View key={key} style={{ marginBottom: 15 }}>
          <Text style={styles.label}>{placeholder}</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData[key] || ""}
              onValueChange={(v) => setFormData((prev) => ({ ...prev, [key]: v }))}
            >
              {disabilityOptions.map((o, idx) => (
                <Picker.Item key={`dis-${idx}`} label={o.label} value={o.value} />
              ))}
            </Picker>
          </View>
        </View>
      );
    }

    if (key === "Barangay") {
      return (
        <View key={key} style={{ marginBottom: 15 }}>
          <Text style={styles.label}>{placeholder}</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData[key] || ""}
              onValueChange={(v) => setFormData((prev) => ({ ...prev, [key]: v }))}
            >
              <Picker.Item key="brgy-empty" label="Select Barangay..." value="" />
              {barangayOptions.map((b, idx) => (
                <Picker.Item key={`brgy-${idx}`} label={b} value={b} />
              ))}
            </Picker>
          </View>
        </View>
      );
    }

    if (key === "BirthDate") {
      return (
        <View key={key} style={{ marginBottom: 15 }}>
          <Text style={styles.label}>{placeholder}</Text>
          <TouchableOpacity
            style={[styles.input, styles.datePickerButton]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.datePickerText}>
              {formData.BirthDate
                ? new Date(formData.BirthDate).toLocaleDateString()
                : "Select your birth date"}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={formData.BirthDate ? new Date(formData.BirthDate) : new Date()}
              mode="date"
              display="default"
              onChange={(e, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setFormData((prev) => ({
                    ...prev,
                    [key]: selectedDate.toISOString(),
                  }));
                }
              }}
            />
          )}
        </View>
      );
    }

    // Default TextInput
    return (
      <View key={key} style={{ marginBottom: 15 }}>
        <Text style={styles.label}>{placeholder}</Text>
        <TextInput
          style={styles.input}
          value={formData[key] || ""}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, [key]: text }))
          }
          placeholder={placeholder}
        />
      </View>
    );
  };

  // Menu
  const renderMenu = () => (
    <View style={styles.mainCardContainer}>
      <AnimatedButton icon="id-card" label="View Digital ID" onPress={() => setCurrentView("digitalID")} />
      <AnimatedButton icon="key" label="Change Password" onPress={() => setCurrentView("password")} />
      <AnimatedButton icon="user-edit" label="Update Personal Info" onPress={() => setCurrentView("info")} />
    </View>
  );

  // Info form with 6 steps
  const renderInfoForm = () => {
    const fields = [
      { key: "FirstName", placeholder: "First Name" },
      { key: "MiddleName", placeholder: "Middle Name" },
      { key: "LastName", placeholder: "Last Name" },
      { key: "Suffix", placeholder: "Suffix" },
      { key: "BirthDate", placeholder: "Birth Date" },
      { key: "Gender", placeholder: "Gender" },
      { key: "Barangay", placeholder: "Barangay" },
      { key: "CivilStatus", placeholder: "Civil Status" },
      { key: "TypeOfDisability", placeholder: "Type Of Disability" },
      { key: "ResidencyAddress", placeholder: "Residency Address" },
      { key: "LandLineNo", placeholder: "Landline No." },
      { key: "EmailAddress", placeholder: "Email Address" },
      { key: "MobileNo", placeholder: "Mobile No." },
      { key: "EducationAttainment", placeholder: "Education Attainment" },
      { key: "StatusofEmployment", placeholder: "Status of Employment" },
      { key: "TypesofEmployment", placeholder: "Types of Employment" },
      { key: "CategoryofEmployment", placeholder: "Category of Employment" },
      { key: "Occupation", placeholder: "Occupation" },
      { key: "OrganizationAffiliated", placeholder: "Organization Affiliated" },
      { key: "ContactPerson", placeholder: "Contact Person" },
      { key: "OfficeAddress", placeholder: "Office Address" },
      { key: "Telephone", placeholder: "Telephone" },
      { key: "SSSNo", placeholder: "SSS No." },
      { key: "GSISNo", placeholder: "GSIS No." },
      { key: "PAGIBIGNo", placeholder: "PAGIBIG No." },
      { key: "PSNNo", placeholder: "PSN No." },
      { key: "PhilhealthNo", placeholder: "Philhealth No." },
      { key: "FathersName", placeholder: "Father's Name" },
      { key: "MothersName", placeholder: "Mother's Name" },
      { key: "GuardiansName", placeholder: "Guardian's Name" },
    ];

    const totalSteps = 6;
    const fieldsPerStep = Math.ceil(fields.length / totalSteps);
    const startIndex = currentStep * fieldsPerStep;
    const pagedFields = fields.slice(startIndex, startIndex + fieldsPerStep);
    const isLastStep = currentStep === totalSteps - 1;

    return (
      <ScrollView>
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Update Personal Information</Text>
          <Text style={styles.progressText}>
            Step {currentStep + 1} of {totalSteps}
          </Text>

          {pagedFields.map((field, idx) =>
            renderTextField(field.key, field.placeholder)
          )}

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {currentStep > 0 && (
              <TouchableOpacity
                key="back"
                style={[styles.button, { flex: 1, marginRight: 5 }]}
                onPress={() => setCurrentStep(currentStep - 1)}
              >
                <Text style={styles.buttonText}>Back</Text>
              </TouchableOpacity>
            )}
            {!isLastStep ? (
              <TouchableOpacity
                key="next"
                style={[styles.button, { flex: 1, marginLeft: 5 }]}
                onPress={() => setCurrentStep(currentStep + 1)}
              >
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                key="save"
                style={[styles.button, { flex: 1, marginLeft: 5 }]}
                onPress={handleUpdateInfo}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={PWD_COLORS.surface} />
                ) : (
                  <Text style={styles.buttonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  // Header right: refresh button (only show when in info or digitalID)
  const HeaderRight = () => {
    if (currentView !== "info" && currentView !== "digitalID") return <View style={{ width: 40 }} />;
    return (
      <TouchableOpacity style={{ width: 40, alignItems: "center", justifyContent: "center" }} onPress={fetchProfileData}>
        <FontAwesome5 name="sync" size={18} color={PWD_COLORS.primary} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={PWD_COLORS.background} />

      {/* Background */}
      <View style={styles.animationContainer}>
        <FloatingShape size={220} color="rgba(33, 150, 243, 0.08)" duration={22000} initialPosition={{ x: -100, y: -120 }} />
        <FloatingShape size={160} color="rgba(0, 74, 173, 0.08)" duration={20000} initialPosition={{ x: width - 150, y: height - 300 }} />
        <FloatingShape size={140} color="rgba(0, 168, 107, 0.08)" duration={18000} initialPosition={{ x: width / 2, y: height / 3 }} />
      </View>

      {/* Content */}
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              currentView !== "menu" ? setCurrentView("menu") : navigation.goBack()
            }
          >
            <FontAwesome5 name="chevron-left" size={18} color={PWD_COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Profile Settings</Text>
          <HeaderRight />
        </View>

        <View style={styles.content}>
          {currentView === "menu" && renderMenu()}

          {currentView === "password" && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Change Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Current Password"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <TextInput
                style={styles.input}
                placeholder="New Password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                secureTextEntry
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
              />
              <TouchableOpacity style={styles.button} onPress={handleChangePassword}>
                {isLoading ? (
                  <ActivityIndicator color={PWD_COLORS.surface} />
                ) : (
                  <Text style={styles.buttonText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {currentView === "info" && renderInfoForm()}

          {currentView === "digitalID" && profileData && (
            <View style={styles.formCard}>
              {/* show the doc id for debugging so you can confirm it exists */}
              <Text style={{ marginBottom: 8, color: PWD_COLORS.textLight }}>
                Document id: {profileData?.id ?? "(not found)"}
              </Text>
              <DigitalIDCard profileData={profileData} />
            </View>
          )}

          {isFetching && (
            <ActivityIndicator
              style={{ marginTop: 20 }}
              size="large"
              color={PWD_COLORS.primary}
            />
          )}
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
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "600", color: PWD_COLORS.primaryDark },
  content: { flex: 1 },
  mainCardContainer: { flex: 1, justifyContent: "center" },
  card: {
    backgroundColor: PWD_COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: PWD_COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  cardText: { marginTop: 10, fontSize: 15, fontWeight: "500", color: PWD_COLORS.text },
  formCard: {
    backgroundColor: PWD_COLORS.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: PWD_COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
  },
  formTitle: { fontSize: 18, fontWeight: "600", color: PWD_COLORS.primaryDark, marginBottom: 15 },
  label: { fontSize: 14, fontWeight: "500", color: PWD_COLORS.text, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: PWD_COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: PWD_COLORS.surface,
  },
  button: {
    backgroundColor: PWD_COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  pickerContainer: {
    borderWidth: 1,
    borderColor: PWD_COLORS.border,
    borderRadius: 8,
    backgroundColor: PWD_COLORS.surface,
  },
  datePickerButton: { justifyContent: "center" },
  datePickerText: { fontSize: 14, color: PWD_COLORS.text },
  progressText: { textAlign: "center", fontSize: 14, fontWeight: "500", color: PWD_COLORS.textLight, marginBottom: 10 },
});
