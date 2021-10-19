const functions = require("firebase-functions");

const admin = require("firebase-admin");

const db = admin.firestore();

var express = require('express');
var cors = require('cors');

let notification = express();
notification.use(cors({ origin: true }));

notification.post('/Add', async (req, res) => {
    let name = req.body.Name;
    let notification = req.body.Notification;
    let date = new Date();
    let currentOffset = date.getTimezoneOffset();
    let ISTOffset = 330;
    date = new Date(date.getTime() + (ISTOffset + currentOffset) * 60000);

    let date_day = date.getDate();
    let date_month = date.getMonth() + 1;
    if (Number(date_month) < 10) {
        date_month = '0' + String(date_month);
    }
    let date_year = date.getFullYear();
    let date_string = String(date_day) + '/' + String(date_month) + '/' + String(date_year);

    let index = date.getTime();

    db.collection('Notification').add({
        Name: name,
        Notification: notification,
        Type: 'admin',
        Date: date_string,
        Index: index
    }).then(() => {
        return res.json({
            "message": "success"
        })
    }).catch(e => {
        res.json({
            "message": "failed"
        })
    })

})

notification.post('/List', async (req, res) => {
    let notifications = await db.collection('Notification').where('Type', '==', 'admin').orderBy('Index', 'desc').limit(30).get();
    let data = [];
    let temp = {};
    notifications.forEach(notification => {
        temp = {
            "docid": notification.id,
            "Name": notification.data().Name,
            "Notification": notification.data().Notification,
            "Date": notification.data().Date
        }
        data.push(temp);
    });
    res.json(data);
})

exports.Notification = functions.https.onRequest(notification);


// link : https://console.firebase.google.com/v1/r/project/deliverydebug/firestore/indexes?create_composite=ClJwcm9qZWN0cy9kZWxpdmVyeWRlYnVnL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9Ob3RpZmljYXRpb24vaW5kZXhlcy9fEAEaCAoEVHlwZRABGgkKBUluZGV4EAIaDAoIX19uYW1lX18QAg

