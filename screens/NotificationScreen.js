import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { FirebaseAuthContext } from '../components/Firebase/FirebaseAuthContext';
import * as fsFn from '../utils/firestore';

import Background from '../components/background';

import AlarmIcon from '../assets/images/alarm-icon';
import AcceptIcon from '../assets/images/accept-icon';
import DismissIcon from '../assets/images/dismiss-icon';

import GreenMedication from '../assets/images/green-medication-icon';
import IconPicker from '../components/IconPicker';

const NotificationScreen = ({navigation, route}) => {
    // route.params = {
    //         medicationDocID: 123,
    //         scheduledTime: {hour: 2, minute: 3, AM_PM: 'PM'},
    //         medIcon: "4",
    //         nameDisplay: "Monoprul",
    //         medFunction: "high blood function"
    // };
    const notifID = route.params.notifID;
    const { medicationDocID, rxcui, scheduledTime, medIcon, nameDisplay, medFunction } = route.params.notifData;
    const [medicationTaken, setMedicationTaken] = useState('false');
    const { currentUser } = useContext(FirebaseAuthContext);

    useEffect(()=> {

        console.log("NOTIFICATION-SCREEN");
        console.log(notifID, '\n', rxcui)

        let unsubscribe = navigation.addListener('beforeRemove', (e) => {
            console.log('Block screen change')
            e.preventDefault();
        });
        

        return ()=> {
            console.log("UNMOUNT")
            unsubscribe();
        }



    }, [navigation]);

    const medTaken = async (rxcui, notifID) => {
        await fsFn.intakeMedication(currentUser.uid, rxcui, (new Date()).getTime(), 'taken', notifID).then(()=> {
            alert("Medication taken");
            navigation.navigate('Home');
        });
        // setMedicationTaken(true);
    }

    const medDismissed = async (rxcui, notifID) => {
        await fsFn.intakeMedication(currentUser.uid, rxcui, (new Date()).getTime(), 'missed', notifID).then(()=>{
            alert("Medication dismissed");
            navigation.navigate('Home');
        });
        // setMedicationTaken(false);
    }

    const formatMinuteDisplay = (minute) => {
        // format to double digits if minute number is 0 - 9
        if (minute < 10) {
            return `0${minute}`;
        } else {
            return `${minute}`;
        }

    }

    return (
        <View style={styles.container}>
            <Background/>
            <View style={styles.centerCircle}>
                <Text style={styles.alarmText}> {`${scheduledTime.hour}:${formatMinuteDisplay(scheduledTime.minute)}${scheduledTime.AM_PM}`} </Text>
                {/* <GreenMedication /> */}
                <IconPicker disabled selected={medIcon} onSelect={() => { }} />
                <Text style={styles.medicationText}> {nameDisplay} </Text>
                <Text>{medFunction}</Text>
            </View>
            <View style={styles.alarmIconCircle}>
                <AlarmIcon/>    
            </View>
            {/* <TouchableOpacity style={styles.snoozeButton}>
                <Text style={styles.snoozeText}> SNOOZE 10 MINUTE </Text>
            </TouchableOpacity> */}
            <TouchableOpacity onPress={async () => {
                await medTaken(rxcui, notifID);
            }} style={styles.acceptCircle}>
                <AcceptIcon/>
            </TouchableOpacity>
            <TouchableOpacity onPress={async () => { 
                await medDismissed(rxcui, notifID);
            }} style={styles.dismissCircle}>
                <DismissIcon/>
            </TouchableOpacity>
        </View>
    )
}

var screenHeight = Dimensions.get('window').height;
var screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: '#42C86A',
    },
    centerCircle: {
        height: 300,
        width: 300,
        borderRadius: 300 / 2,
        backgroundColor: 'rgba(255, 255, 255, 1)',
        position: 'absolute',
        left: screenWidth / 2 - 150,
        top: screenHeight / 4,
        justifyContent: 'center',
        alignItems: 'center'
    },
    alarmIconCircle: {
        height: 80, 
        width: 80, 
        borderRadius: 80/2, 
        backgroundColor: '#42C86A', 
        position: 'absolute', 
        left: screenWidth / 2 -40,
        top: screenHeight / 5, 
        justifyContent: 'center', 
        alignItems: 'center'
    }, 
    acceptCircle: {
        height: 80, 
        width: 80, 
        borderRadius: 80/2, 
        backgroundColor: '#2D8748', 
        position: 'absolute', 
        left: screenWidth / 2 - 150,
        top: screenHeight / 1.3, 
        justifyContent: 'center', 
        alignItems: 'center'
    }, 
    dismissCircle: {
        height: 80, 
        width: 80, 
        borderRadius: 80/2, 
        backgroundColor: '#2D8748', 
        position: 'absolute', 
        left: screenWidth / 2 + 60,
        top: screenHeight / 1.3, 
        justifyContent: 'center', 
        alignItems: 'center'
    }, 
    alarmText: {
        fontFamily: 'roboto-regular',
        fontSize: 32,
        fontWeight: "100", 
        paddingBottom: 30
    }, 
    medicationText: {
        fontFamily: 'roboto-regular',
        fontSize: 24,
        fontWeight: "100", 
    }, 
    snoozeButton: {
        borderRadius: 30, 
        backgroundColor: '#2D8748',
        color: '#FFFFFF',
        width: 150, 
        height: 30, 
        justifyContent: 'center', 
        alignItems: 'center',
        position: 'absolute',
        top: screenHeight /1.5,
        left: screenWidth /2 - 75,
    },
    snoozeText: {
        fontFamily: 'roboto-medium', 
        color: '#FFFFFF'
    },
    acceptAction:{
        backgroundColor: '#FFFFFF',
        color: '#000000'
    }, 
    textAction:{
        fontFamily: 'roboto-regular',
        fontSize: 12,
        fontWeight: "100", 
    }
})


export default NotificationScreen;