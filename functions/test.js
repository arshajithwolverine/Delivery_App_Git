const functions = require("firebase-functions");

const admin = require("firebase-admin");
const db = admin.firestore();

var express = require('express');
var cors = require('cors');

let test = express();
test.use(cors({ origin: true }));

//banner image resize using gm tool
// storage access
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

const path = require('path');
const os = require('os');
const fs = require('fs');
const gm = require('gm').subClass({ imageMagick: true });

test.post('/AddTest', async (req, res) => {
    let Base64Image = req.body.Image;
    let Description = req.body.Description;
    let Name = req.body.Name;
    let t = new Date().getTime();


    let image_url = `https://firebasestorage.googleapis.com/v0/b/deliverydebug.appspot.com/o/Banner%2FImage${t}.png?alt=media`;
    const tmpdir = os.tmpdir();
    const filepath = path.join(tmpdir, "file");
    const bucket = "gs://deliverydebug.appspot.com/";

    //Using GM

    //for base 64
    fs.writeFile(filepath, Base64Image, "base64", async function (err) {
        if (!err) {
            const resizedfilepath = path.join(tmpdir, "resizedfile");
            gm(`${filepath}`).resize(700, 300).write(`${resizedfilepath}`, async function (err) {
                if (!err) {
                    let folder = `Banner`;

                    storage.bucket(bucket).upload(resizedfilepath, {
                        destination: `${folder}/Image${t}.png`
                    }).then(async sna => {
                        await db.collection("Banners").add({
                            "Name": Name,
                            "Description": Description,
                            "ImgUrl": image_url
                        })
                        return res.json({ "message": "success" });
                    }).catch(async err => {
                        console.log(err);
                        return res.status(400).json({ "message": "failed" })
                    })
                } else {
                    console.log(err)
                    res.status(400).json({ "message": "failed inside gm" })
                }
            })
        } else {
            res.status(400).json({ "message": "failed" })
        }
    });


});


test.post('/UpdateTest', async (req, res) => {
    let BannerId = req.body.BannerId;
    let Base64Image = req.body.Image;
    let Description = req.body.Description;
    let Name = req.body.Name;

    db.collection('Banners').doc(BannerId).update({
        Name: Name,
        Description: Description
    }).then(async doc => {
        if (Base64Image !== null && Base64Image !== undefined) {
            let time = new Date().getTime();
            let image_url = `https://firebasestorage.googleapis.com/v0/b/deliverydebug.appspot.com/o/Banner%2F${BannerId}%2FImage${time}.png?alt=media`;

            const tmpdir = os.tmpdir();
            const filepath = path.join(tmpdir, "file");
            const bucket = "gs://deliverydebug.appspot.com/";
            //for base 64
            fs.writeFile(filepath, Base64Image, "base64", async function (err) {
                if (!err) {
                    const resizedfilepath = path.join(tmpdir, "resizedfile");
                    gm(`${filepath}`).resize(700, 300).write(`${resizedfilepath}`, async function (err) {
                        if (!err) {
                            let folder = `Banner/${BannerId}`;

                            storage.bucket(bucket).upload(resizedfilepath, {
                                destination: `${folder}/Image${time}.png`
                            }).then(async sna => {
                                await db.collection("Banners").doc(BannerId).set({ "ImgUrl": image_url }, { "merge": true })
                                return res.json({ "message": "success" });
                            }).catch(async err => {
                                console.log(err);
                                await db.collection('Banners').doc(BannerId).delete();
                                return res.status(400).json({ "message": "failed" })
                            })
                        } else {
                            console.log(err)
                            res.status(400).json({ "message": "failed inside gm" })
                        }
                    })
                } else {
                    res.status(400).json({ "message": "failed" })
                }
            });
        } else {
            res.json({ "message": "success" });
        }
    }).catch(e => {
        res.json({ "message": "failed", "error": e })
    });
});


//analysis test
test.post('/Details', async (req, res) => {
    let Date = nowDate();
    let Total_Orders = await db.collection('Orders').get();
    let Todays_Orders = await db.collection('Orders').where('Date', '==', Date).get();
    let Data = {};
    Data.Total_Orders = 0;
    Data.Total_Revenue = 0;
    Data.Todays_Orders = 0;
    Data.Todays_Revenue = 0;
    Todays_Orders.forEach(order => {
        if ((order.data().Payment_Type === 'Online' && order.data().Status !== 'error' && order.data().Status !== 'cancelled' && order.data().Status !== 'issued') || (order.data().Payment_Type === 'Offline' && order.data().Status === 'delivered')) {
            Data.Todays_Orders += 1;
            Data.Todays_Revenue += order.data().TaxedTotal;
        }
    })
    Total_Orders.forEach(order => {
        if ((order.data().Payment_Type === 'Online' && order.data().Status !== 'error' && order.data().Status !== 'cancelled' && order.data().Status !== 'issued') || (order.data().Payment_Type === 'Offline' && order.data().Status === 'delivered')) {
            console.log(order.id);
            Data.Total_Orders += 1;
            Data.Total_Revenue += order.data().TaxedTotal;
        }
    })
    res.json(Data);
})
exports.Test = functions.https.onRequest(test);





function nowDate() {
    let date = new Date();
    let currentOffset = date.getTimezoneOffset();
    let ISTOffset = 330;
    date = new Date(date.getTime() + (ISTOffset + currentOffset) * 60000);


    let date_day = date.getDate();
    let date_month = date.getMonth() + 1;
    if (Number(date_month) < 10) {
        date_month = '0' + String(date_month);
    }
    if (Number(date_day) < 10) {
        date_day = '0' + String(date_day);
    }
    let date_year = date.getFullYear();
    let date_string = String(date_day) + '/' + String(date_month) + '/' + String(date_year);
    return date_string;
}