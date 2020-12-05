// firestore.js - firestore functions for medications
import { take } from 'lodash';
import { firebase } from '../components/Firebase/config';
import { usersRef, alarmsRef } from './databaseRefs.js';
import * as Notifications from 'expo-notifications';

// Adds a medication to user collection
const addMedication =  async (userId, medObj) => {
    // Check if drug object valid (has rxcui from rxnorm)
    let medHasRxcui = medObj.hasOwnProperty('rxcui');
    // Checks before adding medication to DB
    if(medHasRxcui) {
        // Check if medication already added to user collection
        try {
            await usersRef.doc(userId).collection("medications")
                .where("rxcui", "==", medObj.rxcui)
                .get()
                .then(async querySnapshot => {
                    if (!querySnapshot.empty) {
                        throw Error('Medication already in user collection');
                    }
            });
        } catch (error) {
            throw error;
        }
    } else {
        throw Error('Cannot add medication, object does not contain "rxcui" property');
    }
    // Checks passed, ready to add medication to user collection
    return await usersRef.doc(userId).collection("medications").add(medObj)
        .then(docRef => {
            return docRef.id;
        }).catch(error => {
            alert("Failed to add medication!");
        });
}

// get all medication documents for a user
const getAllMedications = async (userId) => {
    var medications = [];
    await usersRef.doc(userId).collection("medications").get(
    ).then(async querySnapshot => {
        querySnapshot.forEach( doc => {
            medications.push(doc.data());
        })
    }).catch(error => {
        console.log(error)
    });
    return medications;
}

// get all today's medications  for a user
const getCurrentMedications = async (userId) => {
    let medications = [];
    let match = false;
    // Current date without time
    var today = new Date();
    today.setHours(0,0,0,0);
    // retrieve medications where today lies within their startDate, endDate, and daysOfWeek
    await usersRef.doc(userId).collection("medications"
    ).where(
        'startDate', '<=', today
    ).get(
    ).then(async querySnapshot => {
        querySnapshot.forEach( doc => {
            medications.push(doc.data());
            match = true;
        })
        // check day of week
        if (match) {
            match = false;
            //filter array by day index. sun=0...sat=6
            const date = new Date();
            const day = date.getDay();
            // filter array further if medication end dates are >= today
            medications = medications.filter( function(item ) {
                return item.daysOfWeek.includes(day);
            })
            if (medications.length > 0) match = true;
        }
        // check medication end date
        if (match) {
            match = false;
            medications = medications.filter( function(item) {
                return item.endDate.toDate() >= today;
            });
        }
    }).catch(error => {
        console.log(error);
    });
     return medications; 
}

// get medication by docid
const getMedication = async (userId,medId) => {
    const doc = await usersRef.doc(userId).collection("medications").doc(medId).get();
    if (!doc.exists) {
        console.log('No such document!');
      } else {
        return doc.data();
      }
}

// Removes a medication from user
const removeMedication = async (userId, medId) => {
    await usersRef.doc(userId).collection("medications").doc(medId).delete(
    ).catch(error => {
        console.log("Could not delete medication document "+ medId + error);
    })
}

// Update medication for user
const updateMedication = async (userId, medId, medObj) => {
    await usersRef.doc(userId).collection("medications").doc(medId).update(
        medObj
    ).catch(error => {
        console.log("Could not update medication document" + medId + error);
    })
}

// Return array of patients with their medications
const getallPatients = async (hpUserId) => {
    var hpUser;
    var hpUserLinks = []
    var patients = [];
    try {
    // get health professionals user document
    await usersRef.doc(hpUserId).get().then(async doc => {
        if (doc.data()) 
            hpUser= doc.data();
            hpUserLinks = hpUser.userLinks;
    });
    // get all patients with matching health professional userLink codes
    for (const connCode of hpUserLinks) {
        var userObj = {};
        await usersRef
        .where('userLinks', 'array-contains', connCode).get()
        .then(async querySnapshot => {
            if (!querySnapshot.empty) {
                querySnapshot.forEach( async doc => {
                    if (doc.id != hpUserId){
                        userObj = doc.data();
                        userObj['patientId'] = userObj['id'];
                        userObj.isPatient = 'true';
                        patients.push(userObj);
                    }
                })
                // 
            }
        });
    }
    return patients;
    } catch (error) {
        throw error;
    }
}

// Retrieve todays medications from users medicationAlarms collection of Expo notifications
const getDailyMedications = async (uid) => {
    /* 
    medNotif:
    {
        notification: 
        {
            id: <expo notfication id>
            medicationId: <document id of medication in users medications collection
            rxcui: <rxNorm unique identifier for drug. property in medication>
            trigger: <millisecond UTC timestamp of intake time of notification>
        }
        medication:  // the medication object (see medication.js for complete fields)
        {
            nameDisplay:,
            route:,
            rxcui:,
            endDate:,
            intakeTime:,
            ...
            strength:,
            tty:,
        }
        medId: '' // the doc id of medication in user's collection
    }
    */

    let medNotifMatches = []   // medications that still need to be taken today
    let medNotif = {            // Stores both notification and medication info (see above comments)
        'notification': {},
        'medication' : {},
        'medID' : '', 
    }
    const MS_TO_DAYS = 86400000.0;
    // get todays date in UTC epoch time
    let todayDate = new Date();
    let todayMs = todayDate.getTime();
    let todayDays = Math.floor(todayMs /MS_TO_DAYS);

    // An alarm document corresponds to one user. It's document id matches it's user's document id
    // A medicationAlarm document corresponds to single mediction and has array of all daily notifications for that medication

    // Find medications notifications that need to be taken today
    await alarmsRef.doc(uid).collection("medicationAlarms").get(     
    ).then(async querySnapshot => {
        // Check all medication alarms
        querySnapshot.forEach( medAlarm => {
            // check single medication's notifications if scheduled for today
            let dailyNotifications = medAlarm.data().notifications;
            dailyNotifications.forEach( notification => {
                // Determine if notification UTC days matches todays UTC days
                let triggerDays = Math.floor(notification.trigger / MS_TO_DAYS);
                if ( triggerDays == todayDays) {
                    let matchMedNotif = {};
                    // console.log('matched notif: ' + notification.medicationID);
                    matchMedNotif.notification = notification;
                    medNotifMatches.push(matchMedNotif);
                }
            })
        })
    }).catch(error => {
        console.log(error)
    });

    const medRef = usersRef.doc(uid).collection("medications");
    // Add the medication object (has info & settings) from user collection to each medication notification
    for (medNotif of medNotifMatches) {
        let medId = medNotif.notification.medicationID;
        // console.log('searching for med info for: ' + medId);
        await medRef.doc(medId).get().then(querySnapshot => {
            medNotif.medication = querySnapshot.data();
            medNotif.medID = querySnapshot.id;

        })
    }
    return medNotifMatches;
}

// Records intake for medication scheduled for today. Checks if intake already recorded for medication
// dayOverride is for generating dummy data with generateIntakeDummyData
const intakeMedication = async (
    uid, // userId
    rxcui, // unique drug identifer in each medication document
    timestamp, // current time when time swipped. (new Date()).getTime()
    status, // string of 'taken' or 'missed'
    notifID = null, // Expo notification ID of notification to be removed after intake successful
    dayOverride = null // for use only with generateIntakeDummyData()
    ) => { 
        
    console.log('entered intake');    
    var medIntakeExists = false;
    // get todays date in UTC epoch time
    const MS_TO_DAYS = 86400000.0;
    let todayMs = (new Date()).getTime();
    let todayDays = dayOverride == null? Math.floor(todayMs / MS_TO_DAYS) : dayOverride;
    // Create intake object for intake history
    let intakeDoc = {
        'dayStatus': todayDays,  // # days calculated from UTC milliseconds
        'rxcui': rxcui,         // user independent unique identifier for each medication.
        'status': status,       // medication taken or not. 'taken'||'missed'
        'timestampStatus': timestamp, // UTC time in milliseconds
    }
    usersRef.doc(uid).collection("medicationIntakes");
    // Check if medicationIntake of medication alreay exists for today
    await usersRef.doc(uid).collection("medicationIntakes")
        .where("rxcui", "==", rxcui)
        .where("dayStatus", "==", todayDays)
        .get()
        .then(async querySnapshot => {
            if (!querySnapshot.empty) {
                medIntakeExists = true;
                // console.log('Medication already has intake status for today!');
            }}
        ).catch(error => {
            console.log(error);
        });
    // If medication not taken today, add intake and delete notification
    if (!medIntakeExists) {
        var alarmID, filteredNotifications, notificationIDFound;
        await usersRef.doc(uid).collection("medicationIntakes").add(intakeDoc)
        .then(async docRef => {
            if (notifID!=null){
                // Delete Expo Notification for taken/missed medication
                await Notifications.cancelScheduledNotificationAsync(notifID).then(()=> {
                }).catch(error => { throw error; });
                // Delete medicationAlarms notification for taken/missed medication
                await alarmsRef.doc(uid).collection("medicationAlarms").get(
                    ).then(querySnapshot => {
                        // find id of alarm document that contains notification to be removed
                        querySnapshot.forEach(alarm => {
                            alarm.data().notifications.forEach(notification => {
                                if(notification.id == notifID) {
                                    notificationIDFound = true;
                                    alarmID = alarm.id;
                                    filteredNotifications = alarm.data().notifications.filter(n=> n.id != notifID);
                                }})
                        })
                    });
                // Delete take/missed medication's notification from alarm
                if (notificationIDFound == true) { 
                    alarmsRef.doc(uid).collection("medicationAlarms").doc(alarmID).update({ notifications: filteredNotifications});
                }
                return;
            }
        }).catch(error => {
            console.log("Failed to add intake!");
            console.log(error);
        });
    } else {

    }
}

// Inserts # Days of intake dummy data including today
const generateIntakeDummyData = async (uid) => {
    console.log('generating dummy data');
    const NUM_DAYS = 8;     // specify # days to generate dummy data for, 
    var days = [], timestamps = [], rxcuis = [], takenMissed =[];

    // get unique rxcuis scheduled for user for today (generate dummy data based on rxcui retreived)
    const dailyMeds = await getDailyMedications(uid);
    rxcuis = dailyMeds.map(med =>{return med.medication.rxcui;});
    // const dailyMeds = await getAllMedications(uid);
    // rxcuis = dailyMeds.map(med =>{return med.rxcui;});

    // get todays date in UTC epoch time
    const MS_TO_DAYS = 86400000.0;
    let todayMs = (new Date()).getTime();
    let todayDays = Math.floor(todayMs / MS_TO_DAYS);

    // get last NUM_DAYS as UTC milliseconds and days
    for (let day = 0; day < NUM_DAYS; day++) {
        days.push(todayDays - day);
        timestamps.push( (todayDays - day) * MS_TO_DAYS);
    }
    console.log('generateDummy(): ' + days);
    console.log('generateDummy(): ' + timestamps);

    // Fill takenMissed randomly with 1 (taken) or 0 (missed)
    for (let i = 0; i < rxcuis.length; i++) {
        takenMissed.push(Math.round(Math.random()));
    }
    // console.log('generateDummy(): takenMissed = ' + takenMissed);

    console.log('num rxcuis ' + rxcuis.length);
    // Create dummy intake for each medication for last NUM_DAYS days
    for (let day = 1; day < NUM_DAYS; day++) {
        console.log('day ' + day);
        // Set random status for each medication (rxcui)
        for (let rx = 0; rx < rxcuis.length; rx++) {
            console.log(rx);
            let status = takenMissed[rx] == 0 ? 'missed' : 'taken';
            intakeMedication(uid, rxcuis[rx], timestamps[day], status, null, days[day]);
        }
    }
}


/*
    // label == taken
    { day: 'Sat', taken: 3, , missed: 0, total: 2, label: "3"},

const data = [
    { day: 'Sun', taken: 2, total: 2, label: "2"}, 
    { day: 'Mon', taken: 3, total: 3, label: "3"}, 
] 
*/

// Retrieve intake statistics for: last 7 days, yesterday, today, tomorrow
const getWeekIntakeStats = async (uid) => {
    /*
    last7Days : {
        { day: 'Sat', taken: 3, , missed: 0, total: 2, label: "3"}
        ....
        { day: 'Sat', taken: 3, , missed: 0, total: 2, label: "3"}
    }
    yesterdayStatus : 'Completed / # missed'
    todayStatus: 'Completed / # missed'
    tomorrowStatus: # medications
    generalStatus: 90% Excellent, Needs Improvement
    */

    // get medication intake stats for last 7 days, today
    // {rxcui: 2139234, missed: 2, taken:4, total:6 }
    const intake = await usersRef.doc(uid).collection("medicationIntakes").get().then()


    // get week stats
    // get alarms for user -> go into medicationAlarms  ->
    const stats = await alarmsRef.doc(uid).collection("medicationAlarms").get()
        .then( async querySnapshot => {
            // for each alarm/medication get medication intake for last 7, today
            
        })

    // User -> medicationIntake -> intake docs
    // Get last 8 days of status of medication intakes (taken, missed, both)


    // Get today's and tomorrows number of notifications - 


    // 
    return null;
}

// Get days status
// { day: 'Sat', taken: 3, , missed: 0, total: 2, label: "3"}
const getDayStats= (uid, day) => {
    // get alarms for user -> go into medicationAlarms  ->

    // 

}

export {
    addMedication,
    getAllMedications,
    getCurrentMedications,
    getMedication,
    removeMedication,
    updateMedication,
    getallPatients,
    getDailyMedications,
    intakeMedication,
    generateIntakeDummyData,
    getWeekIntakeStats,
}