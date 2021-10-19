const functions = require("firebase-functions");

const admin = require("firebase-admin");
const db = admin.firestore();

var express = require('express');
var cors = require('cors');

let authentication = express();
authentication.use(cors({ origin: true }));

authentication.post('/Token', async (req, res) => {
    let User = req.body.User;
    let Password = req.body.Password;
    console.log(`${User} : ${Password}`);
    let Flag = req.body.Flag;
    if (Number(Flag) === 0) {
        let Admin_User = await db.collection('Admin').doc('Admin_Info').get();
        let Admin_UserName = Admin_User.data().User;
        let Admin_Password = Admin_User.data().Password;
        console.log(`${Admin_UserName} : ${Admin_Password}`);
        if (User !== Admin_UserName || Password !== Admin_Password) {
            return res.status(500).json({
                "message": "failed",
                "error": "Authentication Failed"
            });
        }
    }

    let UserId = `${User}:${Password}`;
    admin.auth().createCustomToken(UserId).then(token => {
        console.log(token);
        return res.json({
            "message": "success",
            "token": token
        });
    }).catch(e => {
        res.json({
            "message": "failed",
            "error": e
        });
    })
});

// authentication.post('/TokenVerification', async (req, res) => {
//     const idToken = req.get('Authorization').replace('Bearer ', '');
//     console.log(idToken);
//     try {
//         const decodedToken = await admin.auth().verifyIdToken(idToken);
//         console.log(decodedToken.uid);
//         req.body.Userid = decodedToken.uid;
//         return next();
//     } catch (err) {
//         console.log(err);
//         res.status(401).json({ "message": "token not verified", "error": err });
//     }
//     return console.log('Decode Completed');
// });


exports.Authentication = functions.https.onRequest(authentication);