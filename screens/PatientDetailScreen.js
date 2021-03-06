import React, { useState, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, TouchableOpacity, FlatList, Button, Dimensions, StyleSheet, Alert, ScrollView } from 'react-native';
import moment from 'moment';
import * as Animatable from 'react-native-animatable';

import Background from '../components/BackgroundHP';
import Card from '../components/StandardCard';
import CondensedCard from '../components/CondensedMedCard';
import MedIconIndex from '../components/MedicationImages';

import MenuIcon from '../assets/images/hp-menu-icon';
import EditIcon from '../assets/images/edit-icon';
import PlusIcon from '../assets/images/plus-icon';
import EnterIcon from '../assets/images/entry-triangle-icon.svg';
import TempAvatar from '../assets/images/temp-avatar';

import { getValueFormatted, dateFromToday } from '../utils/utils';
import { firebase } from '../components/Firebase/config';
import { all } from 'q';

const PatientDetailScreen = ({route, navigation}) => {
    const { item } = route.params;
    const [medications, setMedications] = useState([]);
    const [checklist, setChecklist] = useState();
    useEffect(()=>{
        // Listener for current patient medications
        const subscriber = firebase.firestore().collection("users").doc(item.patientId).collection("medications")
        .onSnapshot(querySnapshot => {
            const meds = [];
            querySnapshot.forEach(documentSnapshot =>{
                let id = documentSnapshot.id;
                let data = documentSnapshot.data();
                // in addition to medication obj, add additional props for AddMedication and EditMedication
                meds.push({
                    'docId' : id, // medication document id (in user collection)
                    'medication': data, // the actual medication object (information and settings)
                    'isPatient': true, // for screens to know if patient or HP (ie Add/Edit medication for HP or patient)
                    'patientId': item.patientId, // id of patient user document
                })
            });
            setMedications(meds);
        });

        // Find most recently submitted symptom checklist
        const symptomSubscriber = firebase.firestore().collection("users").doc(item.patientId).collection("symptomChecklists")
        .onSnapshot(querySnapshot => {
            loadMostRecentSnapshot();
        });

        // Unsubscribe from listeners when no longer in use
        return () => {
            subscriber();
            symptomSubscriber();
        };
    },[item]);


    // Load user's full name and current medications
    async function loadMostRecentSnapshot() {
        firebase.firestore().collection("users").doc(item.patientId).collection("symptomChecklists")
        .get().then(querySnapshot => {
            const allChecklists = [];
            let mostRecentChecklist;
            let comparisonChecklist;
            querySnapshot.forEach(documentSnapshot => {
                let id = documentSnapshot.id;
                let data = documentSnapshot.data();
                allChecklists.push({
                    'docId': id, 
                    'checklist': data
                 })
            });
            allChecklists.forEach(list => {
                if (mostRecentChecklist === undefined){
                    mostRecentChecklist = list;
                } else {
                    comparisonChecklist = list;
                       if (comparisonChecklist.checklist.dateSubmitted.seconds > mostRecentChecklist.checklist.dateSubmitted.seconds){
                         mostRecentChecklist = list;
                     }
                 }
             })
            setChecklist(mostRecentChecklist);
        });
    }

    return (
        
        <KeyboardAvoidingView style={styles.background} behaviour="padding" enabled>
            <Text>{console.log(checklist)}</Text>
            <Background/>
            <TouchableOpacity style={styles.menuButton} onPress={()=> navigation.openDrawer()}>
                <MenuIcon/>
            </TouchableOpacity>
            <Animatable.View style={styles.drawer} animation="fadeInUpBig"> 
            <ScrollView>
                <View style={styles.header}>
                    <Text style={styles.title}>
                        {item.fullName}
                    </Text>
                  {/*   <TouchableOpacity>
                        <EditIcon/>
                    </TouchableOpacity> */}
                </View>
                <View style={{flexDirection: 'row', justifyContent:'center', paddingBottom: 13}}>
                    <TempAvatar/>
                </View>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8}}>
                    <View>
                        <Text style={styles.apptFont}> Next Appointment </Text>
                    </View>
                    <View>
                        <Text style={styles.dateFont}> {item.fullName ? moment(dateFromToday(item.fullName.charCodeAt(0))*1.015).format('dddd MMMM Do YYYY') : ''} </Text>
                    </View>
                </View>
                 <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8}}>
                    <View>
                        <Text style={styles.apptFont}> Last Appointment </Text>
                    </View>
                    <View>
                        <Text style={styles.dateFont}> {item.fullName ? moment(dateFromToday(item.fullName.charCodeAt(0))).format('dddd MMMM Do YYYY') : ''} </Text>
                    </View>
                </View>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingTop: 13}}>
                    <Text style={styles.subheadingfont}>
                        Prescribed Medications
                    </Text>
                    <TouchableOpacity onPress={()=>{navigation.navigate('AddMedication',{item: item})}}>
                        <PlusIcon/>
                    </TouchableOpacity>
                </View>
                {(medications.length > 0) ? <FlatList horizontal
                data={medications} 
                keyExtractor={(item) => item.medication.rxcui.toString()} 
                renderItem={({item}) => (
                    <TouchableOpacity 
                    style={styles.searchButton} 
                    onPress={()=> {
                        navigation.navigate('Medication', {item: item})
                        }}>
                        <CondensedCard>
                            <Text style={{paddingBottom: 10, flex: 1}}> {item.medication.nameDisplay}</Text>
                            <View style={{flexGrow:1}}>
                                {MedIconIndex.index[item.medication.medIcon]}
                            </View>
                            <View style={{justifyContent:'center'}}>
                                <Text> {getValueFormatted(item.medication.intakeTime)} </Text>
                                {/* <Text> {item.alarm ? 'Alarm' : ''}</Text> */}
                            </View>
                        </CondensedCard>
                    </TouchableOpacity>
                )}/> : <View style={{marginTop: '10%', alignItems: 'center'}}><Text>Has no medications</Text></View>}
                
                <View style={{flexDirection: 'row',  paddingTop: 13}}>
                    <Text style={styles.subheadingfont}>
                        Symptom Checklist
                    </Text>
                </View>
                    {checklist ? <TouchableOpacity onPress={() => { navigation.navigate('SymptomChecklistDetail', { item: checklist }) }}>
                        <Card>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                <Text style={styles.dateFont}> Last Complaint: </Text>
                                <Text style={styles.dateFont}> {checklist ? checklist.checklist.additionalDetails : 'placeholder'}</Text>
                            </View>
                        </Card>
                    </TouchableOpacity> : 
                    
                    <View style={{marginTop: '15%', alignItems: 'center'}}><Text>Has no symptom checklists</Text></View>}
             {/*    <TouchableOpacity onPress={()=>Alert.alert("requesting symptom checklist...")}>
                    <View style={{flexDirection: 'row'}}>
                        <Text style={styles.clickableFont}>
                            REQUEST SYMPTOM CHECKLIST
                        </Text>
                        <EnterIcon style={{paddingTop: 30}}/>
                    </View>
                </TouchableOpacity> */}
                </ScrollView>
            </Animatable.View>
        </KeyboardAvoidingView>
    );
}

var screenHeight = Dimensions.get("window").height;
var screenWidth = Dimensions.get("window").width;

const styles = StyleSheet.create({
    background: {
        flex: 1,
        backgroundColor: '#4285C8',
    }, 
    header:{
        flexDirection:'row', 
        justifyContent: 'space-between', 
        paddingBottom: 10
    },
    title: {
        fontFamily: 'roboto-regular',
        fontSize: 24,
        fontWeight: "100",
    }, 
    apptFont: {
        fontFamily: 'roboto-regular', 
        fontSize: 17, 
        color: 'rgba(0, 0, 0, 0.85)', 
    },
    dateFont:{
        fontFamily: 'roboto-regular', 
        fontSize: 14, 
        color: 'rgba(0, 0, 0, 0.7)', 
    },
    subheadingfont: {
        fontFamily: 'roboto-regular', 
        fontSize: 20, 
        color: 'rgba(0, 0, 0, 0.85)'
    },
    timeFont: {
        fontFamily: 'roboto-regular', 
        fontSize: 18, 
        color: 'rgba(0, 0, 0, 0.85)'
    },
    clickableFont: {
        fontFamily: 'roboto-medium',
        fontSize: 16, 
        paddingTop: 5, 
        paddingRight: 5
    },
    medicationInfoView: {
        width: 170,
        paddingHorizontal: 10
    },
    timeView:{
        borderLeftColor: 'rgba(0, 0, 0, 0.33)', 
        borderLeftWidth: 1,
        paddingHorizontal: 15, 
        justifyContent: 'center', 
        width: 100
    },
    menuButton:{
        position: 'absolute',
        right: 30,
        top: 40 
    },
    drawer: {
        flex: 4,
        backgroundColor: '#fff', 
        borderTopLeftRadius: 30, 
        borderTopRightRadius: 30, 
        paddingVertical: 50, 
        paddingHorizontal: 30, 
        position: 'absolute',
        width: screenWidth,
        height: screenHeight * 0.85,
        top: screenHeight * 0.15
    }
});

export default PatientDetailScreen;