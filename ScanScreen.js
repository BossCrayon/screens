import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
  ScrollView,
  Modal,
  StatusBar,
  SafeAreaView,
  Animated,
  Dimensions,
  Easing,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import * as ImageManipulator from 'expo-image-manipulator';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// --- CONFIGURATION & CONSTANTS (Unchanged) ---
const { width, height } = Dimensions.get('window');
const SCAN_LOG_STORAGE_KEY = 'establishmentScanLogs';
const COLORS = { /* ... your colors ... */
    primary: '#00695C',
    primaryDark: '#004D40',
    background: '#F0F4F8',
    surface: '#FFFFFF',
    textDark: '#102A43',
    textLight: '#627D98',
    white: '#FFFFFF',
    border: '#CFD8DC',
    error: '#D32F2F',
    success: '#2E7D32',
};

// --- ANIMATED BACKGROUND COMPONENT (Unchanged) ---
const DriftingShape = ({ size, color, duration, initialPosition }) => { /* ... unchanged ... */
    const position = useRef(new Animated.ValueXY(initialPosition)).current;

    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(position, {
            toValue: { x: Math.random() * width - size / 2, y: Math.random() * height - size / 2 },
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
        ]),
      ).start();
    }, []);
  
    return (
      <Animated.View
        style={[
          styles.shape,
          { width: size, height: size, backgroundColor: color, borderRadius: size / 2 },
          { transform: position.getTranslateTransform() },
        ]}
      />
    );
};

// --- OCR AND VERIFICATION LOGIC (Unchanged) ---
const extractSilayIdDetails = (rawText) => { /* ... unchanged ... */
    if (!rawText || typeof rawText !== 'string') {
        return { fullText: rawText || '', id: '', isSilay: false, message: 'No text could be extracted from the image.', firstName: '', middleName: '', lastName: '' };
      }
      const textLower = rawText.toLowerCase();
      const isSilayDocument = textLower.includes('silay');
      if (!isSilayDocument) {
        return { fullText: rawText, id: '', isSilay: false, message: 'The document does not appear to be a PWD ID from Silay City.', firstName: '', middleName: '', lastName: '' };
      }
      let foundId = '';
      const keywordPattern = /(?:ID\s*(?:No\.?|Number)?\s*[:\-]?|PWD\s*ID\s*[:\-]?|Control\s*No\.?\s*[:\-]?|Card\s*No\.?\s*[:\-]?|PhilSys\s*Card\s*No\.?\s*[:\-]?|PCN\s*:?\s*)\s*([\d\s\-]{13,20})/gi;
      let matches = rawText.matchAll(keywordPattern);
      for (const match of matches) {
        const potentialId = match[1]?.replace(/[\s\-]/g, '');
        if (potentialId && /^\d{13}$/.test(potentialId)) {
          foundId = potentialId;
          break;
        }
      }
      if (!foundId) {
        const potentialStandaloneIds = rawText.match(/\b[\d\s\-]{13,20}\b/g) || [];
        for (const standaloneMatch of potentialStandaloneIds) {
          const cleanedId = standaloneMatch.replace(/[\s\-]/g, '');
          if (/^\d{13}$/.test(cleanedId)) {
            foundId = cleanedId;
            break;
          }
        }
      }
      let extractedFirstName = '', extractedLastName = '', extractedMiddleName = '', fullNameFromLabel = '';
      const lines = rawText.split('\n').map(line => line.trim());
      const nameLabelPatterns = [
        { label: /^(?:NAME|PANGALAN)\s*[:\-\s_]+/i, type: 'full' }, 
        { label: /^(?:SURNAME|APELYIDO|LAST\s*NAME)\s*[:\-\s_]+/i, type: 'last' },
        { label: /^(?:FIRST\s*NAME|GIVEN\s*NAME|UNANG\s*PANGALAN)\s*[:\-\s_]+/i, type: 'first' },
        { label: /^(?:MIDDLE\s*NAME|GITNANG\s*PANGALAN|M\.?\s*I\.?)\s*[:\-\s_]+/i, type: 'middle' },
      ];
      let tempFirstName = '', tempLastName = '', tempMiddleName = '';
      for (const line of lines) {
        if (/^\s*(republic\s+of\s+the\s+philippines|kagawaran\s+ng|department\s+of|city\s+of\s+silay|province\s+of|national\s+id|philhealth)\s*$/i.test(line)) continue;
        for (const pattern of nameLabelPatterns) {
          const match = line.match(pattern.label);
          if (match) {
            let nameValue = line.substring(match[0].length).trim().replace(/\s*(SEX|DATE\s*OF\s*BIRTH|CITIZENSHIP|BLOOD\s*TYPE|ADDRESS|PWD\s*ID\s*NO).*$/i, '').trim().replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '').trim().replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
            if (nameValue.length > 1 && nameValue.length < 60 && /^[a-zA-Z\s\-\'\.]+$/.test(nameValue)) {
                if (pattern.type === 'full') { fullNameFromLabel = nameValue; break; }
                else if (pattern.type === 'first' && !tempFirstName) tempFirstName = nameValue;
                else if (pattern.type === 'last' && !tempLastName) tempLastName = nameValue;
                else if (pattern.type === 'middle' && !tempMiddleName) tempMiddleName = nameValue;
            }
          }
        }
        if (fullNameFromLabel) break; 
      }
      if (fullNameFromLabel) {
        const nameParts = fullNameFromLabel.split(' ').filter(part => part.length > 0);
        if (nameParts.length > 1) {
          extractedLastName = nameParts.pop(); 
          if (nameParts.length > 1) extractedMiddleName = nameParts.pop();
          extractedFirstName = nameParts.join(' ');
        } else if (nameParts.length === 1) extractedFirstName = nameParts[0];
      } else if (tempFirstName || tempMiddleName || tempLastName) {
        extractedFirstName = tempFirstName || ''; 
        extractedMiddleName = tempMiddleName || '';
        extractedLastName = tempLastName || '';
      }
      if (extractedFirstName && extractedLastName && !extractedMiddleName && extractedFirstName.includes(' ')) {
        const firstNameParts = extractedFirstName.split(' ');
        if (firstNameParts.length > 1) {
            extractedMiddleName = firstNameParts.pop(); 
            extractedFirstName = firstNameParts.join(' ');
        }
      }
      extractedFirstName = (extractedFirstName || '').replace(/[^a-zA-Z\s\-\']/g, ' ').replace(/\s+/g, ' ').trim();
      extractedMiddleName = (extractedMiddleName || '').replace(/[^a-zA-Z\s\-\'\.]/g, ' ').replace(/\s+/g, ' ').trim();
      extractedLastName = (extractedLastName || '').replace(/[^a-zA-Z\s\-\']/g, ' ').replace(/\s+/g, ' ').trim();
      if (foundId) {
        return { fullText: rawText, id: foundId, isSilay: true, message: `Silay City PWD ID Found: ${foundId}`, firstName: extractedFirstName, middleName: extractedMiddleName, lastName: extractedLastName };
      } else {
        return { fullText: rawText, id: '', isSilay: true, message: 'Silay City document detected. PWD ID number was not clearly identified.', firstName: extractedFirstName, middleName: extractedMiddleName, lastName: extractedLastName };
      }
};
const firebaseConfig = { /* ... unchanged ... */
    apiKey: "AIzaSyD2_FL1N1o2owRimd7VvCQCnMRAf-Al6Pg",
    authDomain: "epwd-5fd94.firebaseapp.com",
    projectId: "epwd-5fd94",
    storageBucket: "epwd-5fd94.appspot.com",
    messagingSenderId: "159084985431",
    appId: "1:159084985431:web:903efbbb472b2258c67712",
    measurementId: "G-Q4R163MSNY"
};
let firebaseApp;
if (!getApps().length) { firebaseApp = initializeApp(firebaseConfig); } else { firebaseApp = getApp(); }
const db = getFirestore(firebaseApp);

const OCR_SPACE_API_KEY = 'K86158464588957';
const FACE_VERIFICATION_API_ENDPOINT = 'https://api-us.faceplusplus.com/facepp/v3/compare';
const FACE_VERIFICATION_API_KEY = 'Qjc3B8eERzs7XvFyRtJ-T7tnIDS_L7GS';
const FACE_VERIFICATION_API_SECRET = 'fcYdK9pJ_vxGIKeXHkJmOAIyhX2OIlW3';


// --- MAIN COMPONENT ---
export default function ScanScreen({ navigation, route }) {
    // --- States ---
    const [imageUri, setImageUri] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState('Ready to Scan');
    const [scanMode, setScanMode] = useState(null);
    const [loggedInRestaurant, setLoggedInRestaurant] = useState(null);
    const [verifiedData, setVerifiedData] = useState(null);
    const [isScanTypeModalVisible, setIsScanTypeModalVisible] = useState(false);
    // const [pendingAction, setPendingAction] = useState(null); // --- FIX: Removed. We will use route params instead.
    const [isFaceVerificationModalVisible, setIsFaceVerificationModalVisible] = useState(false);
    const [pendingVerificationData, setPendingVerificationData] = useState(null);
    const [isVerifyingFace, setIsVerifyingFace] = useState(false);
    const [faceVerificationStatus, setFaceVerificationStatus] = useState('');
    const [isDiscountModalVisible, setIsDiscountModalVisible] = useState(false);
    const [discountDetails, setDiscountDetails] = useState(null);
    const [isLogModalVisible, setIsLogModalVisible] = useState(false);
    const [scanLogs, setScanLogs] = useState([]);

    // --- Effects ---
    useEffect(() => {
        (async () => {
            if (Platform.OS !== 'web') {
                await ImagePicker.requestCameraPermissionsAsync();
                await ImagePicker.requestMediaLibraryPermissionsAsync();
            }
            const restaurantDataString = await AsyncStorage.getItem('loggedInRestaurantData');
            if (restaurantDataString) {
                setLoggedInRestaurant(JSON.parse(restaurantDataString));
            }
        })();
    }, []);
    
    // --- FIX: Reworked this effect to use route params for reliability ---
    useEffect(() => {
        // This effect runs when we return from the login screen successfully
        if (route.params?.restaurantLoginSuccessful && route.params?.scanSource) {
            (async () => {
                const restaurantDataString = await AsyncStorage.getItem('loggedInRestaurantData');
                if (restaurantDataString) {
                    setLoggedInRestaurant(JSON.parse(restaurantDataString));
                    setScanMode('restaurant');
                    
                    // Immediately initiate the scan that was pending before login
                    initiateScan(route.params.scanSource, 'restaurant');
                }
            })();
            // Clear the params so this doesn't run again on re-renders
            navigation.setParams({ restaurantLoginSuccessful: undefined, scanSource: undefined });
        }
    }, [route.params?.restaurantLoginSuccessful, route.params?.scanSource]);


    // --- New Logging and PDF Functions (Unchanged) ---
    const logScanRecord = async (recordData) => { /* ... unchanged ... */
        const newRecord = {
            ...recordData,
            id: Date.now().toString(),
            date: new Date().toISOString(),
        };
        try {
            const existingLogs = await AsyncStorage.getItem(SCAN_LOG_STORAGE_KEY);
            const logs = existingLogs ? JSON.parse(existingLogs) : [];
            logs.unshift(newRecord); // Add new record to the top
            await AsyncStorage.setItem(SCAN_LOG_STORAGE_KEY, JSON.stringify(logs));
        } catch (error) {
            console.error("Failed to save scan log:", error);
        }
    };
    const showScanLogs = async () => { /* ... unchanged ... */
        try {
            const existingLogs = await AsyncStorage.getItem(SCAN_LOG_STORAGE_KEY);
            const logs = existingLogs ? JSON.parse(existingLogs) : [];
            setScanLogs(logs);
            setIsLogModalVisible(true);
          } catch (error) {
            console.error("Failed to load scan logs:", error);
            Alert.alert("Error", "Could not load scan logs.");
          }
    };
    const handleDownloadPdf = async () => { /* ... unchanged ... */
        if (scanLogs.length === 0) {
            Alert.alert("No Logs", "There are no scan records to export.");
            return;
          }
      
          const establishmentName = loggedInRestaurant?.name || "Establishment";
          const reportDate = new Date().toLocaleDateString("en-US", {
            year: 'numeric', month: 'long', day: 'numeric'
          });
      
          const rows = scanLogs.map(log => `
                <tr>
                    <td>${log.name}</td>
                    <td>${log.pwdId}</td>
                    <td>${new Date(log.date).toLocaleString()}</td>
                    <td>${log.status}</td>
                </tr>
            `).join('');
      
          const htmlContent = `
                <html>
                    <head>
                        <style>
                            body { font-family: Helvetica, sans-serif; }
                            h1 { font-size: 24px; color: #004D40; }
                            h2 { font-size: 16px; color: #627D98; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th, td { border: 1px solid #CFD8DC; padding: 8px; text-align: left; }
                            th { background-color: #F0F4F8; color: #102A43; }
                        </style>
                    </head>
                    <body>
                        <h1>Scan Verification Log</h1>
                        <h2>${establishmentName} - Report as of ${reportDate}</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>PWD ID Number</th>
                                    <th>Date & Time</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    </body>
                </html>
            `;
      
          try {
            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Scan Log PDF' });
          } catch (error) {
            console.error('Failed to generate or share PDF:', error);
            Alert.alert("Error", "Could not create or share the PDF file.");
          }
    };

    // --- Core Functions (with logging calls added) ---
    const resetScanner = () => { /* ... unchanged ... */
        setImageUri(null);
        setIsProcessing(false);
        setStatus('Ready to Scan');
        setVerifiedData(null);
        setPendingVerificationData(null);
        setFaceVerificationStatus('');
        setDiscountDetails(null);
    };

    // --- FIX: Added explicit permission checks ---
    const initiateScan = async (source, mode) => {
        resetScanner();
        let result;
        const options = { mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1.0, allowsEditing: false };

        try {
            if (source === 'camera') {
                const { status } = await ImagePicker.getCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Required', 'Camera access is needed to take a photo.');
                    return;
                }
                result = await ImagePicker.launchCameraAsync(options);
            } else {
                const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Required', 'Media Library access is needed to choose a file.');
                    return;
                }
                result = await ImagePicker.launchImageLibraryAsync(options);
            }
            
            if (result.canceled || !result.assets || result.assets.length === 0) {
                setStatus('Scan Cancelled');
                return;
            }
            const uri = result.assets[0].uri;
            setImageUri(uri);
            processImage(uri, mode);
        } catch (error) {
            Alert.alert('Error', `Could not open image source: ${error.message}`);
            setStatus('Error');
        }
    };

    const handleScanAction = (source) => {
        if (loggedInRestaurant) {
            setScanMode('restaurant');
            initiateScan(source, 'restaurant');
        } else {
            // We store the intended source in a local variable before opening the modal.
            // This source will be passed to handleModeSelect.
            setIsScanTypeModalVisible(true);
            // We pass the source to the modal handler, not component state
            setPendingSource(source); 
        }
    };

    // A temporary state to hold the source while the modal is open
    const [pendingSource, setPendingSource] = useState(null);
    
    // --- FIX: Modified to pass the scan source to the login screen ---
    const handleModeSelect = (mode) => {
        setIsScanTypeModalVisible(false);
        setScanMode(mode);
        
        if (mode === 'restaurant') {
            // Pass the pending source to the login screen so it can be passed back
            navigation.navigate('RestaurantLogin', { fromScan: true, pendingScanSource: pendingSource });
        } else {
            if (pendingSource) {
                initiateScan(pendingSource, 'normal');
            }
        }
        setPendingSource(null); // Clear the temporary source
    };

    const processImage = async (uri, processingScanMode) => { /* ... unchanged ... */
        setIsProcessing(true);
        setStatus('Processing Image...');
        try {
          const manipResult = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1200 } }], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
          const ocrFormData = new FormData();
          ocrFormData.append('apikey', OCR_SPACE_API_KEY);
          ocrFormData.append('OCREngine', '2');
          ocrFormData.append('file', { uri: manipResult.uri, type: 'image/jpeg', name: 'scan.jpg' });
  
          const response = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: ocrFormData });
          const result = await response.json();
          
          if (result.IsErroredOnProcessing || !result.ParsedResults || result.ParsedResults.length === 0) {
            throw new Error(result.ErrorMessage?.join(', ') || 'OCR failed to extract text.');
          }
  
          const extractedText = result.ParsedResults[0].ParsedText;
          const idDetails = extractSilayIdDetails(extractedText);
          setStatus(idDetails.message);
  
          if (idDetails.isSilay && idDetails.id) {
            setStatus(`Searching database for ID: ${idDetails.id}...`);
            const q = query(collection(db, "EPWD"), where("PWD_ID_NO", "==", idDetails.id));
            const querySnapshot = await getDocs(q);
  
            if (!querySnapshot.empty) {
                const memberData = querySnapshot.docs[0].data();
                const verificationData = { idDetails, memberData, idImageUri: manipResult.uri };
                setPendingVerificationData(verificationData);
  
                if (memberData.profilePictureURL) {
                    if (processingScanMode === 'restaurant') {
                        setIsFaceVerificationModalVisible(true);
                    } else {
                        setStatus(`Record found for ${memberData.FirstName}.`);
                         setVerifiedData({
                            name: `${memberData.FirstName || ''} ${memberData.LastName || ''}`.trim(),
                            pwdId: memberData.PWD_ID_NO,
                            status: 'Record Found',
                        });
                    }
                } else {
                    setStatus(`Record found. No profile picture for verification.`);
                    setVerifiedData({
                        name: `${memberData.FirstName || ''} ${memberData.LastName || ''}`.trim(),
                        pwdId: memberData.PWD_ID_NO,
                        status: 'Record Found (No Profile Pic)',
                    });
                    Alert.alert("Verification Incomplete", "PWD record found, but no profile picture is available in the database for face verification.");
                    
                    if (processingScanMode === 'restaurant') {
                        logScanRecord({
                            name: `${memberData.FirstName || ''} ${memberData.LastName || ''}`.trim(),
                            pwdId: memberData.PWD_ID_NO,
                            status: 'Record Found (No Profile Pic)'
                        });
                    }
                }
            } else {
                setStatus(`ID ${idDetails.id} not found in database.`);
                Alert.alert("Verification Failed", `The PWD ID number '${idDetails.id}' was not found in the database.`);
            }
          } else {
            Alert.alert('ID Not Found', idDetails.message);
          }
        } catch (error) {
          setStatus('Error processing image');
          Alert.alert('Processing Error', error.message);
        } finally {
          setIsProcessing(false);
        }
    };
    
    // --- FIX: Added check for successful image download ---
    const handleStartFaceVerification = async (dataToUse) => {
        setIsFaceVerificationModalVisible(false);
        setIsVerifyingFace(true);
        setFaceVerificationStatus('Starting face verification...');
        let logStatus = 'Verification Error'; // Default log status
        try {
            const { memberData } = dataToUse;

            setFaceVerificationStatus('Capturing selfie...');
            const cameraResult = await ImagePicker.launchCameraAsync({ quality: 0.7, cameraType: ImagePicker.CameraType.front, allowsEditing: true, aspect: [1, 1] });
            if (cameraResult.canceled || !cameraResult.assets) {
                throw new Error('Selfie capture cancelled.');
            }
            const imageToVerifyUri = cameraResult.assets[0].uri;

            setFaceVerificationStatus('Preparing images...');
            const imageToVerifyBase64 = await FileSystem.readAsStringAsync(imageToVerifyUri, { encoding: FileSystem.EncodingType.Base64 });
            
            const downloadResult = await FileSystem.downloadAsync(memberData.profilePictureURL, FileSystem.documentDirectory + 'temp.jpg');
            // --- ADDED CHECK HERE ---
            if (!downloadResult || downloadResult.status !== 200) {
                throw new Error('Failed to download the profile picture from the database.');
            }
            const databaseImageBase64 = await FileSystem.readAsStringAsync(downloadResult.uri, { encoding: FileSystem.EncodingType.Base64 });

            setFaceVerificationStatus('Calling verification API...');
            const faceApiForm = new FormData();
            faceApiForm.append('api_key', FACE_VERIFICATION_API_KEY);
            faceApiForm.append('api_secret', FACE_VERIFICATION_API_SECRET);
            faceApiForm.append('image_base64_1', imageToVerifyBase64);
            faceApiForm.append('image_base64_2', databaseImageBase64);

            const apiResponse = await fetch(FACE_VERIFICATION_API_ENDPOINT, { method: 'POST', body: faceApiForm });
            const resultData = await apiResponse.json();

            if (!apiResponse.ok) throw new Error(resultData.error_message || 'Face API request failed');
            
            if (resultData.faces1 && resultData.faces1.length === 0) {
                throw new Error(`No face was detected in the selfie. Please use a clearer image.`);
            }
            if (resultData.faces2 && resultData.faces2.length === 0) {
                throw new Error("No face was detected in the PWD's database profile picture.");
            }
            
            const confidence = resultData.confidence;
            if (typeof confidence === 'undefined') {
                throw new Error("API did not return a confidence score.");
            }
            
            const threshold = resultData.thresholds?.['1e-5'] || 75;
            const isMatch = confidence >= threshold;

            setFaceVerificationStatus(`Verification complete. Score: ${confidence.toFixed(2)}`);

            if (isMatch) {
                logStatus = `Verified (Score: ${confidence.toFixed(2)})`;
                if (loggedInRestaurant) {
                    setDiscountDetails({
                        pwdId: dataToUse.idDetails.id,
                        pwdName: `${dataToUse.idDetails.firstName} ${dataToUse.idDetails.lastName}`,
                        restaurantName: loggedInRestaurant.name,
                        discountInfo: "20% Discount (Verified)",
                        status: `Verified (Face Match Score: ${confidence.toFixed(2)})`
                    });
                    setIsDiscountModalVisible(true);
                }
                setVerifiedData({
                    name: `${memberData.FirstName} ${memberData.LastName}`,
                    pwdId: memberData.PWD_ID_NO,
                    status: 'Face Verified',
                    score: confidence.toFixed(2)
                });
                setStatus('Verification Successful!');
            } else {
                logStatus = `Failed: Mismatch (Score: ${confidence.toFixed(2)})`;
                setStatus('Verification Failed: Face Mismatch');
                Alert.alert("Face Verification Failed", `Faces do not match. (Confidence Score: ${confidence.toFixed(2)})`);
            }
        } catch (error) {
            setFaceVerificationStatus(`Error: ${error.message}`);
            Alert.alert('Face Verification Error', error.message);
        } finally {
            logScanRecord({
                name: `${dataToUse.memberData.FirstName} ${dataToUse.memberData.LastName}`.trim(),
                pwdId: dataToUse.memberData.PWD_ID_NO,
                status: logStatus
            });
            setIsVerifyingFace(false);
        }
    };
    
    const handleLogout = async () => { /* ... unchanged ... */
        await AsyncStorage.removeItem('loggedInRestaurantData');
        setLoggedInRestaurant(null);
        setScanMode(null);
        resetScanner();
        Alert.alert("Logged Out", "You have been successfully logged out.");
    };

    const getStatusStyle = () => { /* ... unchanged ... */
        const currentStatus = (faceVerificationStatus || status).toLowerCase();
        if (currentStatus.includes('verified') || currentStatus.includes('successful')) {
          return { backgroundColor: COLORS.success, color: COLORS.white };
        }
        if (currentStatus.includes('error') || currentStatus.includes('failed') || currentStatus.includes('mismatch')) {
          return { backgroundColor: COLORS.error, color: COLORS.white };
        }
        return { backgroundColor: 'rgba(255, 255, 255, 0.7)', color: COLORS.textDark };
    };

    // --- JSX (Unchanged, but now wired to the corrected functions) ---
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
            <View style={styles.animationContainer}>
                <DriftingShape size={400} color="rgba(0, 105, 92, 0.1)" duration={20000} initialPosition={{ x: -200, y: -100 }} />
                <DriftingShape size={300} color="rgba(160, 210, 219, 0.1)" duration={25000} initialPosition={{ x: width - 100, y: height - 200 }} />
                <DriftingShape size={250} color="rgba(0, 77, 64, 0.1)" duration={18000} initialPosition={{ x: width / 3, y: height / 2 }} />
            </View>
            

            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Dashboard')}>
                        <FontAwesome5 name="chevron-left" size={20} color={COLORS.primaryDark} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Scan & Verify</Text>
                    <View style={{ width: 40 }} />
                </View>
            
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <View style={[styles.statusBanner, { backgroundColor: getStatusStyle().backgroundColor }]}>
                        <Text style={[styles.statusText, { color: getStatusStyle().color }]}>{faceVerificationStatus || status}</Text>
                    </View>

                    {loggedInRestaurant && loggedInRestaurant.name && (
                        <View style={styles.loggedInBar}>
                            <FontAwesome5 name="store" size={16} color={COLORS.primary} />
                            <Text style={styles.loggedInText}>Logged in: {loggedInRestaurant.name}</Text>
                            <TouchableOpacity onPress={handleLogout}>
                                <FontAwesome5 name="sign-out-alt" size={18} color={COLORS.error} />
                            </TouchableOpacity>
                        </View>
                    )}
                    
                    <View style={styles.scanCard}>
                        {isProcessing || isVerifyingFace ? (
                            <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.loadingText}>{isVerifyingFace ? 'Verifying Face...' : 'Analyzing Document...'}</Text></View>
                        ) : verifiedData ? (
                            <View style={styles.resultsCard}><FontAwesome5 name="check-circle" size={60} color={COLORS.success} /><Text style={styles.resultTitle}>{verifiedData.name}</Text><Text style={styles.resultSubtitle}>{verifiedData.pwdId}</Text><View style={styles.divider} /><Text style={styles.resultStatus}>{verifiedData.status}</Text>{verifiedData.score && <Text style={styles.resultDetails}>Confidence Score: {verifiedData.score}</Text>}</View>
                        ) : (
                            <View style={styles.placeholder}><FontAwesome5 name="id-card" size={80} color={COLORS.border} /><Text style={styles.placeholderText}>Scan or select an ID to begin</Text></View>
                        )}
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => handleScanAction('camera')} disabled={isProcessing || isVerifyingFace}><FontAwesome5 name="camera" size={20} color={COLORS.white} /><Text style={styles.actionButtonText}>Take Photo</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]} onPress={() => handleScanAction('library')} disabled={isProcessing || isVerifyingFace}><FontAwesome5 name="images" size={20} color={COLORS.primary} /><Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>Choose File</Text></TouchableOpacity>
                    </View>
                    
                    {(verifiedData || (status !== 'Ready to Scan' && !isProcessing)) && (
                        <TouchableOpacity style={styles.resetButton} onPress={resetScanner}><FontAwesome5 name="redo" size={14} color={COLORS.textLight} /><Text style={styles.resetButtonText}>Scan Another</Text></TouchableOpacity>
                    )}

                    {loggedInRestaurant && (
                        <TouchableOpacity style={styles.logButton} onPress={showScanLogs}>
                            <FontAwesome5 name="history" size={16} color={COLORS.textLight} />
                            <Text style={styles.logButtonText}>View Scan Log</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </View>

            {/* --- Modals (Unchanged) --- */}
            <Modal transparent visible={isScanTypeModalVisible} onRequestClose={() => setIsScanTypeModalVisible(false)}>
                 <View style={styles.modalOverlay}><View style={styles.modalContent}><Text style={styles.modalTitle}>Select Scan Type</Text><TouchableOpacity style={styles.modalButton} onPress={() => handleModeSelect('restaurant')}><Text style={styles.modalButtonText}>Establishment Scan</Text></TouchableOpacity><TouchableOpacity style={styles.modalButton} onPress={() => handleModeSelect('normal')}><Text style={styles.modalButtonText}>Normal Verification</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={() => setIsScanTypeModalVisible(false)}><Text style={styles.modalCancelButtonText}>Cancel</Text></TouchableOpacity></View></View>
            </Modal>
            {/* ... other modals ... */}
             <Modal transparent visible={isDiscountModalVisible} onRequestClose={() => setIsDiscountModalVisible(false)}>
                <View style={styles.modalOverlay}><View style={styles.modalContent}><Text style={styles.modalTitle}>Discount Verified</Text><FontAwesome5 name="tags" size={40} color={COLORS.success} style={{marginBottom: 15}} /><Text style={styles.modalText}>Name: {discountDetails?.pwdName}</Text><Text style={styles.modalText}>ID: {discountDetails?.pwdId}</Text><Text style={styles.modalHighlight}>{discountDetails?.discountInfo}</Text><TouchableOpacity style={styles.modalButton} onPress={() => setIsDiscountModalVisible(false)}><Text style={styles.modalButtonText}>Acknowledge</Text></TouchableOpacity></View></View>
             </Modal>
             <Modal transparent visible={isFaceVerificationModalVisible} onRequestClose={() => setIsFaceVerificationModalVisible(false)}>
                <View style={styles.modalOverlay}><View style={styles.modalContent}><Text style={styles.modalTitle}>Face Verification</Text><Image source={{uri: pendingVerificationData?.memberData?.profilePictureURL}} style={styles.profilePicPreview} /><Text style={styles.modalText}>To verify, please take a selfie of the PWD member.</Text><TouchableOpacity style={styles.modalButton} onPress={() => handleStartFaceVerification(pendingVerificationData)}><Text style={styles.modalButtonText}>Open Camera</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={() => {setIsFaceVerificationModalVisible(false); resetScanner();}}><Text style={styles.modalCancelButtonText}>Cancel</Text></TouchableOpacity></View></View>
             </Modal>
             <Modal visible={isLogModalVisible} onRequestClose={() => setIsLogModalVisible(false)} animationType="slide">
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.logHeader}>
                        <Text style={styles.logTitle}>Scan History</Text>
                        <TouchableOpacity onPress={() => setIsLogModalVisible(false)}>
                            <FontAwesome5 name="times" size={24} color={COLORS.primaryDark} />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={scanLogs}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.logItem}>
                                <Text style={styles.logItemName}>{item.name}</Text>
                                <Text style={styles.logItemDetails}>ID: {item.pwdId}</Text>
                                <Text style={styles.logItemDetails}>Date: {new Date(item.date).toLocaleString()}</Text>
                                <Text style={[styles.logItemStatus, {
                                    color: item.status.includes('Verified') ? COLORS.success : COLORS.error
                                }]}>
                                    Status: {item.status}
                                </Text>
                            </View>
                        )}
                        ListEmptyComponent={<Text style={styles.logEmptyText}>No scan records found.</Text>}
                    />
                    <View style={styles.logFooter}>
                        <TouchableOpacity style={styles.pdfButton} onPress={handleDownloadPdf}>
                            <FontAwesome5 name="file-pdf" size={20} color={COLORS.white} />
                            <Text style={styles.pdfButtonText}>Download PDF</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
      );
}

// --- STYLES (Unchanged) ---
const styles = StyleSheet.create({
    /* ... all your styles ... */
    safeArea: { flex: 1, backgroundColor: COLORS.background },
  animationContainer: { ...StyleSheet.absoluteFillObject, zIndex: 0, overflow: 'hidden' },
  shape: { position: 'absolute', opacity: 0.7 },
  container: { flex: 1, zIndex: 1 },
  scrollContainer: { flexGrow: 1, alignItems: 'center', padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 15, paddingBottom: 5, },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.primaryDark },
  statusBanner: { width: '100%', padding: 12, borderRadius: 12, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(207, 216, 220, 0.5)'},
  statusText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  loggedInBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', backgroundColor: 'rgba(224, 242, 241, 0.8)', padding: 12, borderRadius: 12, marginBottom: 20 },
  loggedInText: { fontSize: 15, color: COLORS.primary, fontWeight: '600', marginLeft: 10, flex: 1 },
  scanCard: { width: '100%', aspectRatio: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 20, marginBottom: 25, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 8, borderWidth: 1, borderColor: 'rgba(207, 216, 220, 0.5)', padding: 15, },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontSize: 16, color: COLORS.textDark, fontWeight: '500' },
  placeholder: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  placeholderText: { marginTop: 20, color: COLORS.textLight, fontSize: 18, fontWeight: '500', textAlign: 'center' },
  resultsCard: { width: '100%', padding: 20, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 26, fontWeight: 'bold', color: COLORS.textDark, marginTop: 15, textAlign: 'center' },
  resultSubtitle: { fontSize: 18, color: COLORS.textLight, marginBottom: 15, marginTop: 4 },
  divider: { width: '80%', height: 1, backgroundColor: COLORS.border, marginVertical: 15 },
  resultStatus: { fontSize: 20, fontWeight: '600', color: COLORS.primary, marginTop: 10 },
  resultDetails: { fontSize: 14, color: COLORS.textLight, marginTop: 8 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 15 },
  actionButton: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flex: 1, marginHorizontal: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  actionButtonSecondary: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.primary },
  actionButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  actionButtonTextSecondary: { color: COLORS.primary },
  resetButton: { flexDirection: 'row', marginTop: 10, alignItems: 'center', padding: 10 },
  resetButtonText: { color: COLORS.textLight, fontSize: 15, marginLeft: 8, fontWeight: '500' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { width: '85%', backgroundColor: COLORS.surface, borderRadius: 20, padding: 25, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.primaryDark, marginBottom: 15 },
  modalText: { fontSize: 16, color: COLORS.textLight, textAlign: 'center', marginBottom: 10 },
  modalHighlight: { fontSize: 18, fontWeight: 'bold', color: COLORS.success, textAlign: 'center', marginVertical: 10 },
  modalButton: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center', marginTop: 10 },
  modalButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
  modalCancelButton: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  modalCancelButtonText: { color: COLORS.textDark, fontWeight: 'bold', fontSize: 16 },
  profilePicPreview: { width: 150, height: 150, borderRadius: 75, marginBottom: 15, borderWidth: 3, borderColor: COLORS.primary },
  logButton: {
      flexDirection: 'row',
      marginTop: 20,
      alignItems: 'center',
      padding: 10,
      backgroundColor: COLORS.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
  },
  logButtonText: {
      color: COLORS.textLight,
      fontSize: 15,
      marginLeft: 8,
      fontWeight: '600',
  },
  logHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      backgroundColor: COLORS.surface,
  },
  logTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: COLORS.primaryDark,
  },
  logItem: {
      backgroundColor: COLORS.surface,
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
  },
  logItemName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: COLORS.textDark,
  },
  logItemDetails: {
      fontSize: 14,
      color: COLORS.textLight,
      marginTop: 4,
  },
  logItemStatus: {
      fontSize: 14,
      fontWeight: 'bold',
      marginTop: 4,
  },
  logEmptyText: {
      textAlign: 'center',
      marginTop: 50,
      fontSize: 16,
      color: COLORS.textLight,
  },
  logFooter: {
      padding: 20,
      backgroundColor: COLORS.surface,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
  },
  pdfButton: {
      flexDirection: 'row',
      backgroundColor: COLORS.primary,
      paddingVertical: 15,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
  },
  pdfButtonText: {
      color: COLORS.white,
      fontWeight: 'bold',
      fontSize: 16,
      marginLeft: 10,
  },
});