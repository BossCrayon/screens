import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { FontAwesome5 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const PWD_COLORS = { primary: "#2196F3", surface: "#FFFFFF", danger: "#D32F2F" };
const overlayWidth = width * 0.8;
const overlayHeight = overlayWidth * 1.25;

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [type, setType] = useState('front');
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    } else if (!permission.granted) {
      Alert.alert(
        'Permission Denied',
        'Camera access is required to take a profile picture.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [permission]);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      // ✅ Return directly to Step 3 of registration
      navigation.navigate('Register', {
        newProfilePictureUri: photo.uri,
        returnStep: 3,
      });
    }
  };

  const toggleCameraType = () => {
    setType(current => (current === 'back' ? 'front' : 'back'));
  };

  if (!permission) return <View />;
  if (!permission.granted) return <Text>No access to camera</Text>;

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={type} ref={cameraRef}>
        {/* Overlay */}
        <View style={styles.overlayContainer}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.overlayCenter} />
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom}>
            <Text style={styles.overlayText}>Position your face within the circle</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <FontAwesome5 name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.flipButton} onPress={toggleCameraType}>
            <FontAwesome5 name="sync-alt" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1, justifyContent: 'space-between' },
  overlayContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayMiddle: { height: overlayHeight, flexDirection: 'row' },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayCenter: {
    width: overlayWidth,
    height: overlayHeight,
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: overlayWidth / 2,
  },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  overlayText: { color: '#fff', fontSize: 18, marginTop: 20, fontWeight: 'bold' },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 120,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingBottom: 20,
  },
  backButton: { padding: 20 },
  flipButton: { padding: 20 },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: PWD_COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: PWD_COLORS.surface,
    borderWidth: 2,
    borderColor: '#000',
  },
});
