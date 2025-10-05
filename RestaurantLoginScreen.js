import React, {useState} from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Alert,
    SafeAreaView,
    StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {collection, query, where, getDocs} from 'firebase/firestore';

// Import the shared db instance and colors
import {db} from '../firebase/firebaseConfig';
import {COLORS} from '../constants/colors';

export default function RestaurantLoginScreen({navigation, route}) {
    const [loginCodeInput, setLoginCodeInput] = useState('');
    const fromScan = route.params ?. fromScan;

    const loginManager = async () => {
        if (!loginCodeInput || loginCodeInput.length !== 9 || !/^\d{9}$/.test(loginCodeInput)) {
            Alert.alert('Error', 'Please enter a valid 9-digit Restaurant Login Code.');
            setLoginCodeInput('');
            return;
        }

        try {
            const q = query(collection(db, "Restaurants"), where("loginCode", "==", loginCodeInput));
            const querySnapshot = await getDocs(q);

            if (! querySnapshot.empty) {
                const restaurantDoc = querySnapshot.docs[0];
                const restaurantData = restaurantDoc.data();
                const restaurantInfo = {
                    code: loginCodeInput,
                    name: restaurantData.name,
                    id: restaurantDoc.id
                };
                await AsyncStorage.setItem('loggedInRestaurantData', JSON.stringify(restaurantInfo));
                Alert.alert('Success', `Logged in as ${
                    restaurantData.name
                }.`);
                setLoginCodeInput('');
                if (fromScan) { // Navigate back to the Scan screen with the success parameter
                    navigation.navigate('Scan', {restaurantLoginSuccessful: true});
                } else {
                    navigation.navigate('Dashboard');
                }
            } else {
                Alert.alert('Error', 'Invalid Restaurant Login Code. Please try again.');
                setLoginCodeInput('');
                await AsyncStorage.removeItem('loggedInRestaurantData');
            }
        } catch (error) {
            console.error("Firestore login error: ", error);
            Alert.alert('Error', 'Could not verify login code. Please try again.');
            setLoginCodeInput('');
            await AsyncStorage.removeItem('loggedInRestaurantData');
        }
    };

    return (
        <SafeAreaView style={
            styles.safeArea
        }>
            <StatusBar barStyle="dark-content"/>
            <View style={
                styles.pageContainer
            }>
                <View style={
                    styles.container
                }>
                    <TouchableOpacity style={
                            styles.backButton
                        }
                        onPress={
                            () => navigation.goBack()
                    }>
                        <Text style={
                            styles.backButtonText
                        }>Back</Text>
                    </TouchableOpacity>
                    <Text style={
                        styles.titleText
                    }>Restaurant Login</Text>
                    <Text style={
                        styles.label
                    }>Restaurant Login Code (9 digits)</Text>
                    <TextInput style={
                            styles.input
                        }
                        placeholder="Enter 9-digit code"
                        value={loginCodeInput}
                        onChangeText={setLoginCodeInput}
                        keyboardType="numeric"
                        maxLength={9}/>
                    <TouchableOpacity style={
                            styles.btn
                        }
                        onPress={loginManager}>
                        <Text style={
                            styles.btnText
                        }>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background
    },
    pageContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24
    },
    container: {
        padding: 24,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5
    },
    input: {
        width: '100%',
        height: 50,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        fontSize: 16,
        color: COLORS.textDark
    },
    titleText: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.primaryDark,
        marginBottom: 40,
        marginTop: 20
    },
    btn: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        paddingVertical: 14,
        paddingHorizontal: 20,
        backgroundColor: COLORS.primary,
        marginTop: 25,
        width: '100%',
        elevation: 2
    },
    btnText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600'
    },
    label: {
        alignSelf: 'flex-start',
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textDark,
        marginBottom: 8
    },
    backButton: {
        alignSelf: 'flex-start',
        backgroundColor: '#E0E6EB',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        marginBottom: 20
    },
    backButtonText: {
        color: COLORS.textDark,
        fontSize: 16,
        fontWeight: '500'
    }
});
