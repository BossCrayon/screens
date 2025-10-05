import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { collection, addDoc } from "firebase/firestore";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";

import { db } from "../firebase/firebaseConfig";

// Cloudinary configs
const CLOUDINARY_CLOUD_NAME = "dqnwa85z5";
const CLOUDINARY_UPLOAD_PRESET = "PWDIDPICTURE";

const { width, height } = Dimensions.get("window");

// Consistent color palette adopted from DashboardScreen
const PWD_COLORS = {
  primaryDark: "#004AAD", // Deep corporate blue
  primary: "#2196F3", // Bright accessibility blue
  background: "#F5F7FA", // Light neutral
  surface: "#FFFFFF", // White cards
  border: "#D9E2EC", // Soft border
  text: "#333333", // Default text
  textLight: "#607D8B", // Subtle text
  success: "#4CAF50", // Added for submit button
  danger: "#D32F2F", // For errors and remove buttons
};

// FloatingShape to match DashboardScreen's background animation
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

// --- Form Data and Options (No changes in logic) ---
const initialFormData = {
  FirstName: "",
  MiddleName: "",
  LastName: "",
  Suffix: "",
  BirthDate: null,
  Gender: "",
  Barangay: "",
  TypeofDisability: "",
  EmailAddress: "",
  MobileNo: "",
  profilePictureUri: null,
  profilePictureMimeType: null,
};

const initialCheckboxState = {
  Autism: false,
  ADHD: false,
  "Cerebral Palsy": false,
  "Down Syndrome": false,
  "Chronic Illness": false,
  Injury: false,
  "Other Acquired": false,
};

const genderOptions = [
  { label: "Select Gender...", value: "" },
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
];

const disabilityOptions = [
    { label: 'Types of Disability...', value: '' },
    { label: 'Deaf or Hard of Hearing', value: 'Deaf or Hard of Hearing' },
    { label: 'Intellectual Disability', value: 'Intellectual Disability' },
    { label: 'Learning Disability', value: 'Learning Disability' },
    { label: 'Mental Disability', value: 'Mental Disability' },
    { label: 'Physical Disability(Orthopedic)', value: 'Physical Disability(Orthopedic)' },
    { label: 'Physical Disability', value: 'Physical Disability' },
    { label: 'Speech and Language Disability', value: 'Speech and Language Disability' },
    { label: 'Visual Disability', value: 'Visual Disability' },
    { label: 'Cancer(RA11215)', value: 'Cancer(RA11215)' },
    { label: 'Rare Disease(RA10747)', value: 'Rare Disease(RA10747)' }
];

const causeOfDisabilityStructure = {
  "Congenital/Inborn": ["Autism", "ADHD", "Cerebral Palsy", "Down Syndrome"],
  Acquired: ["Chronic Illness", "Injury", "Other Acquired"],
};

const barangayOptions = [
  "Bagtic", "Balaring", "Barangay I (Poblacion)", "Barangay II (Poblacion)",
  "Barangay III (Poblacion)", "Barangay IV (Poblacion)", "Barangay V (Poblacion)",
  "Barangay VI (Poblacion/Hawaiian)", "Eustaquio Lopez", "Guimbala-on",
  "Guinhalaran", "Kapitan Ramon", "Lantad", "Mambulac", "Patag", "Rizal",
];

const renderError = (errors, fieldName) =>
  errors[fieldName] ? (
    <Text style={styles.errorText}>{errors[fieldName]}</Text>
  ) : null;

// --- Step components ---
const Step1 = ({ formData, errors, handleChange, setShowDatePicker }) => (
  <>
    <Text style={styles.sectionHeader}>Step 1: Personal Information</Text>
    <Text style={styles.label}>First Name<Text style={styles.requiredAsterisk}>*</Text></Text>
    <TextInput
      style={[styles.input, errors.FirstName && styles.inputError]}
      placeholder="Enter your first name"
      value={formData.FirstName}
      onChangeText={(v) => handleChange("FirstName", v)}
      placeholderTextColor={PWD_COLORS.textLight}
    />
    {renderError(errors, "FirstName")}
    <Text style={styles.label}>Middle Name</Text>
    <TextInput
      style={styles.input}
      placeholder="Enter your middle name"
      value={formData.MiddleName}
      onChangeText={(v) => handleChange("MiddleName", v)}
      placeholderTextColor={PWD_COLORS.textLight}
    />
    <Text style={styles.label}>Last Name<Text style={styles.requiredAsterisk}>*</Text></Text>
    <TextInput
      style={[styles.input, errors.LastName && styles.inputError]}
      placeholder="Enter your last name"
      value={formData.LastName}
      onChangeText={(v) => handleChange("LastName", v)}
      placeholderTextColor={PWD_COLORS.textLight}
    />
    {renderError(errors, "LastName")}
    <Text style={styles.label}>Suffix</Text>
    <TextInput
      style={styles.input}
      placeholder="e.g., Jr., III"
      value={formData.Suffix}
      onChangeText={(v) => handleChange("Suffix", v)}
      placeholderTextColor={PWD_COLORS.textLight}
    />
    <Text style={styles.label}>Birth Date<Text style={styles.requiredAsterisk}>*</Text></Text>
    <TouchableOpacity
      style={[
        styles.input,
        styles.datePickerButton,
        errors.BirthDate && styles.inputError,
      ]}
      onPress={() => setShowDatePicker(true)}
    >
      <Text style={styles.datePickerText}>
        {formData.BirthDate
          ? formData.BirthDate.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "Select your birth date"}
      </Text>
    </TouchableOpacity>
    {renderError(errors, "BirthDate")}
    <Text style={styles.label}>Gender<Text style={styles.requiredAsterisk}>*</Text></Text>
    <View style={[styles.pickerContainer, errors.Gender && styles.inputError]}>
      <Picker
        selectedValue={formData.Gender}
        onValueChange={(v) => handleChange("Gender", v)}
        style={styles.picker}
      >
        {genderOptions.map((o) => (
          <Picker.Item key={o.value} label={o.label} value={o.value} />
        ))}
      </Picker>
    </View>
    {renderError(errors, "Gender")}
  </>
);

const Step2 = ({ formData, errors, handleChange, causeCheckboxes, handleCheckboxChange }) => (
  <>
    <Text style={styles.sectionHeader}>Step 2: Disability & Contact</Text>
    <Text style={styles.label}>Address</Text>
    <Text style={[styles.input, styles.disabledInput]}>
      {formData.Barangay ? `${formData.Barangay}, Silay City` : "Silay City"}
    </Text>
    <Text style={styles.label}>Barangay <Text style={styles.requiredAsterisk}>*</Text></Text>
    <View style={[styles.pickerContainer, errors.Barangay && styles.inputError]}>
      <Picker
        selectedValue={formData.Barangay}
        onValueChange={(v) => handleChange('Barangay', v)}
        style={styles.picker}
      >
        <Picker.Item label="Select Barangay..." value="" />
        {barangayOptions.map((brgy) => (
          <Picker.Item key={brgy} label={brgy} value={brgy} />
        ))}
      </Picker>
    </View>
    {renderError(errors, 'Barangay')}
    <Text style={styles.label}>Type of Disability<Text style={styles.requiredAsterisk}>*</Text></Text>
    <View style={[styles.pickerContainer, errors.TypeofDisability && styles.inputError]}>
      <Picker
        selectedValue={formData.TypeofDisability}
        onValueChange={(v) => handleChange("TypeofDisability", v)}
        style={styles.picker}
      >
        {disabilityOptions.map((o) => (
          <Picker.Item key={o.value} label={o.label} value={o.value} />
        ))}
      </Picker>
    </View>
    {renderError(errors, "TypeofDisability")}
    <Text style={styles.label}>Cause of Disability (Select all that apply)</Text>
    {Object.entries(causeOfDisabilityStructure).map(([category, causes]) => (
      <View key={category} style={styles.checkboxGroup}>
        <Text style={styles.checkboxCategory}>{category}</Text>
        {causes.map((cause) => (
          <TouchableOpacity
            key={cause}
            onPress={() => handleCheckboxChange(cause)}
            style={styles.checkboxContainer}
          >
            <View style={[ styles.checkbox, causeCheckboxes[cause] && styles.checkboxChecked, ]}>
              {causeCheckboxes[cause] && (
                <Text style={styles.checkboxCheckmark}>✓</Text>
              )}
            </View>
            <Text style={styles.checkboxLabel}>{cause}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ))}
    <Text style={styles.label}>Contact Number<Text style={styles.requiredAsterisk}>*</Text></Text>
    <TextInput
      style={[styles.input, errors.MobileNo && styles.inputError]}
      placeholder="e.g., 09123456789"
      value={formData.MobileNo}
      onChangeText={(v) => handleChange("MobileNo", v)}
      keyboardType="phone-pad"
      maxLength={11}
      placeholderTextColor={PWD_COLORS.textLight}
    />
    {renderError(errors, "MobileNo")}
    <Text style={styles.label}>Email Address<Text style={styles.requiredAsterisk}>*</Text></Text>
    <Text style={[styles.input, styles.disabledInput]}>
      {formData.EmailAddress || "Fetching email..."}
    </Text>
  </>
);

const Step3 = ({ formData, documents, handleTakePhoto, handleChooseDocument, handleRemoveDocument }) => (
  <>
    <Text style={styles.sectionHeader}>Step 3: Uploads & Review</Text>
    
    <Text style={styles.subHeader}>Profile Picture</Text>
    <Text style={styles.reviewText}>
      Please take a clear, well-lit selfie. The overlay in the camera will help you frame your face.
    </Text>
    <TouchableOpacity onPress={handleTakePhoto} style={styles.uploadButton}>
      <FontAwesome5 name="camera" size={18} color="#fff" />
      <Text style={styles.uploadButtonText}>Open Camera</Text>
    </TouchableOpacity>
    {formData.profilePictureUri && (
      <View style={styles.imagePreviewContainer}>
        <Image source={{ uri: formData.profilePictureUri }} style={styles.profileImagePreview} />
      </View>
    )}

    <Text style={styles.subHeader}>Proof of Disability<Text style={styles.requiredAsterisk}>*</Text></Text>
    <Text style={styles.reviewText}>
        Upload photos of medical certificates or any official document that can verify your disability.
    </Text>
    <TouchableOpacity onPress={handleChooseDocument} style={styles.uploadButton}>
        <FontAwesome5 name="file-upload" size={18} color="#fff" />
        <Text style={styles.uploadButtonText}>Upload Document</Text>
    </TouchableOpacity>

    {documents.length > 0 && (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.docPreviewScrollView}>
        {documents.map((doc, index) => (
            <View key={index} style={styles.docThumbnailWrapper}>
                <Image source={{ uri: doc.uri }} style={styles.docThumbnail} />
                <TouchableOpacity onPress={() => handleRemoveDocument(index)} style={styles.removeDocButton}>
                    <Text style={styles.removeDocButtonText}>✕</Text>
                </TouchableOpacity>
            </View>
        ))}
      </ScrollView>
    )}
  </>
);

// --- Main component ---
export default function RegisterScreen({ navigation, route }) {
  const [step, setStep] = useState(1);
  const [causeCheckboxes, setCauseCheckboxes] = useState(initialCheckboxState);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [documents, setDocuments] = useState([]);
  
  const { email } = route?.params || {};

  const [formData, setFormData] = useState({
    ...initialFormData,
    EmailAddress: email || "",
  });

  // MODIFIED: useEffect to listen for the picture from CameraScreen
  useEffect(() => {
  if (route.params?.newProfilePictureUri) {
    const uri = route.params.newProfilePictureUri;
    handleChange("profilePictureUri", uri);
    handleChange("profilePictureMimeType", "image/jpeg");

    // ✅ Go back to the previous step (Step 3 typically)
    if (route.params?.returnStep) {
      setStep(route.params.returnStep);
    }

    // Clean up params so this effect doesn’t trigger repeatedly
    navigation.setParams({
      newProfilePictureUri: undefined,
      returnStep: undefined,
    });
  }
}, [route.params?.newProfilePictureUri]);



  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleCheckboxChange = (name) => {
    setCauseCheckboxes((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      handleChange("BirthDate", selectedDate);
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.FirstName.trim()) newErrors.FirstName = 'First Name is required.';
    if (!formData.LastName.trim()) newErrors.LastName = 'Last Name is required.';
    if (!formData.BirthDate) newErrors.BirthDate = 'Birth Date is required.';
    if (!formData.Gender) newErrors.Gender = 'Gender is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.Barangay) newErrors.Barangay = 'Barangay is required.';
    if (!formData.TypeofDisability) newErrors.TypeofDisability = 'Type of Disability is required.';
    if (!formData.MobileNo.trim() || formData.MobileNo.length < 11) newErrors.MobileNo = 'A valid 11-digit contact number is required.';
    if (!formData.EmailAddress.trim()) newErrors.EmailAddress = 'Email Address is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    }
  };

  const handleBack = () => {
    setErrors({});
    setStep(step - 1);
  };

  // MODIFIED: This function now navigates to the custom CameraScreen
  const handleTakePhoto = () => {
    navigation.navigate('Camera');
  };

  const handleChooseDocument = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, 
        quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setDocuments(prev => [...prev, { uri: asset.uri, mimeType: asset.mimeType || 'image/jpeg' }]);
    }
  };

  const handleRemoveDocument = (indexToRemove) => {
    setDocuments(prev => prev.filter((_, index) => index !== indexToRemove));
  };


  const register = async () => {
    if (!formData.profilePictureUri) {
        Alert.alert('Missing Picture', 'A profile picture is required for submission.');
        return;
    }
    if (documents.length === 0) {
        Alert.alert('Missing Documents', 'Please upload at least one document as proof of disability.');
        return;
    }
    if (isLoading) return;
    setIsLoading(true);

    try {
        const dataToSend = { ...formData };
        delete dataToSend.profilePictureUri;
        delete dataToSend.profilePictureMimeType;
        dataToSend.CauseOfDisability = Object.entries(causeCheckboxes)
            .filter(([, isChecked]) => isChecked)
            .map(([cause]) => cause);

        let formattedBirthDate = formData.BirthDate;
        if (formData.BirthDate instanceof Date) {
            formattedBirthDate = formData.BirthDate.toISOString().split("T")[0];
        }

        const applicationData = {
            ...dataToSend,
            BirthDate: formattedBirthDate,
            applicationDate: new Date().toISOString(),
        };

        const uploadToCloudinary = async (file) => {
            const { uri, mimeType } = file;
            const filename = uri.split("/").pop();
            const cloudinaryFormData = new FormData();
            cloudinaryFormData.append("file", { uri, type: mimeType, name: filename });
            cloudinaryFormData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
                { method: "POST", body: cloudinaryFormData }
            );
            const data = await response.json();
            if (!response.ok || !data.secure_url) {
                throw new Error(data.error?.message || "Cloudinary upload failed.");
            }
            return data.secure_url;
        }

        applicationData.profilePictureURL = await uploadToCloudinary({ uri: formData.profilePictureUri, mimeType: formData.profilePictureMimeType });

        const documentURLs = await Promise.all(documents.map(doc => uploadToCloudinary(doc)));
        applicationData.documentURLs = documentURLs;
        
        await addDoc(collection(db, "Applicant"), applicationData);
        Alert.alert("Success", "Application submitted successfully! It is now pending review.");
        
        setFormData(initialFormData);
        setCauseCheckboxes(initialCheckboxState);
        setDocuments([]);
        setStep(1);
        navigation.navigate("Dashboard");

    } catch (error) {
        console.error("Registration Error:", error);
        Alert.alert("Error", `Registration failed: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={PWD_COLORS.background} />

      <View style={styles.animationContainer}>
        <FloatingShape size={220} color="rgba(33, 150, 243, 0.08)" duration={22000} initialPosition={{ x: -100, y: -120 }} />
        <FloatingShape size={160} color="rgba(0, 74, 173, 0.08)" duration={20000} initialPosition={{ x: width - 150, y: height - 300 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.formContainer}>
          <View style={styles.headerContainer}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <FontAwesome5 name="arrow-left" size={16} color={PWD_COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.mainTitle}>PWD Registration</Text>
            <View style={{ width: 20 }} /> 
          </View>
          
          {step === 1 && <Step1 formData={formData} errors={errors} handleChange={handleChange} setShowDatePicker={setShowDatePicker} />}
          {step === 2 && <Step2 formData={formData} errors={errors} handleChange={handleChange} causeCheckboxes={causeCheckboxes} handleCheckboxChange={handleCheckboxChange} />}
          {step === 3 && <Step3 formData={formData} documents={documents} handleTakePhoto={handleTakePhoto} handleChooseDocument={handleChooseDocument} handleRemoveDocument={handleRemoveDocument} />}
          
          {showDatePicker && (
            <DateTimePicker value={formData.BirthDate || new Date()} mode="date" display="default" onChange={onDateChange} />
          )}

          <View style={styles.buttonRow}>
            {step > 1 && (
              <TouchableOpacity style={[styles.navButton, styles.backNavButton]} onPress={handleBack}>
                <Text style={[styles.buttonText, styles.backNavButtonText]}>Back</Text>
              </TouchableOpacity>
            )}
            {step < 3 ? (
              <TouchableOpacity style={styles.navButton} onPress={handleNext}>
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.navButton, styles.submitButton]} onPress={register} disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Submit Application</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Stylesheet
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PWD_COLORS.background },
  animationContainer: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  shape: { position: "absolute", opacity: 0.6 },
  scrollContainer: { flexGrow: 1, paddingVertical: 20, paddingHorizontal: 16, zIndex: 1 },
  formContainer: {
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
    marginBottom: 30,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  mainTitle: {
    textAlign: "center",
    fontWeight: "600",
    fontSize: 24,
    color: PWD_COLORS.primaryDark,
    flex: 1,
  },
  sectionHeader: { fontSize: 18, fontWeight: "600", marginBottom: 20, color: PWD_COLORS.primary, borderBottomWidth: 1, borderBottomColor: PWD_COLORS.border, paddingBottom: 8 },
  subHeader: { fontSize: 16, fontWeight: '500', color: PWD_COLORS.text, marginBottom: 8, marginTop: 10 },
  label: { fontSize: 14, marginBottom: 8, color: PWD_COLORS.text, fontWeight: "500" },
  requiredAsterisk: { color: PWD_COLORS.danger },
  input: {
    borderWidth: 1,
    borderColor: PWD_COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: PWD_COLORS.background,
    color: PWD_COLORS.text,
  },
  inputError: { borderColor: PWD_COLORS.danger },
  disabledInput: { backgroundColor: "#ECEFF1", color: PWD_COLORS.textLight },
  datePickerButton: { justifyContent: "center" },
  datePickerText: { fontSize: 16, color: PWD_COLORS.text },
  pickerContainer: {
    borderWidth: 1,
    borderColor: PWD_COLORS.border,
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: PWD_COLORS.background,
  },
  picker: { height: 50, width: "100%" },
  checkboxGroup: { marginBottom: 15 },
  checkboxCategory: { fontWeight: "bold", marginBottom: 10, color: PWD_COLORS.text },
  checkboxContainer: { flexDirection: "row", alignItems: "center", marginBottom: 10, marginLeft: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: PWD_COLORS.border,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: { backgroundColor: PWD_COLORS.primary, borderColor: PWD_COLORS.primary },
  checkboxCheckmark: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  checkboxLabel: { fontSize: 16, color: PWD_COLORS.text },
  reviewText: { fontSize: 14, marginBottom: 12, color: PWD_COLORS.textLight, lineHeight: 20 },
  uploadButton: {
    backgroundColor: PWD_COLORS.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  uploadButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  imagePreviewContainer: { alignItems: "center", marginVertical: 10 },
  profileImagePreview: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: PWD_COLORS.primary },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, gap: 10 },
  navButton: {
    flex: 1,
    backgroundColor: PWD_COLORS.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  backNavButton: {
    backgroundColor: PWD_COLORS.surface,
    borderWidth: 1,
    borderColor: PWD_COLORS.border,
  },
  backNavButtonText: {
    color: PWD_COLORS.primary,
  },
  submitButton: {
    backgroundColor: PWD_COLORS.success,
  },
  buttonText: { color: PWD_COLORS.surface, fontWeight: "bold", fontSize: 16, textAlign: "center" },
  errorText: { color: PWD_COLORS.danger, marginBottom: 10, marginTop: -10, fontSize: 12 },
  // Styles for document preview
  docPreviewScrollView: {
    paddingVertical: 10,
  },
  docThumbnailWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  docThumbnail: {
    width: 80,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PWD_COLORS.border,
    backgroundColor: '#f0f0f0',
  },
  removeDocButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: PWD_COLORS.danger,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
  },
  removeDocButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    lineHeight: 20,
  },
});