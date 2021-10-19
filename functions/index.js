const functions = require("firebase-functions");

const admin = require("firebase-admin");

const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 1. app side

//user
let user = require('./user');
exports.User = user.User;


// 2. admin side

//Analysis
let analysis = require('./analysis');
exports.Analysis = analysis.Analysis;

//authentication
let auth = require('./authentication');
exports.Authentication = auth.Authentication;

//orders
let order = require('./order');
exports.Order = order.Order;

//bannner
let banner = require('./banner');
exports.Banner = banner.Banner;

//notification
let notification = require('./notification');
exports.Notification = notification.Notification;


// 3. triggers
let triggers = require('./trigger');
//search keyword
exports.ProductKeyword = triggers.ProductKeyword;
exports.CategoryKeywordUpdate = triggers.CategoryKeywordUpdate;
//payment success => my orders and stock update
exports.PaymentSuccess = triggers.PaymentSuccess;
//order cancel
exports.OrderCancel = triggers.OrderCancel;
//category delete
exports.CategoryDelete = triggers.CategoryDelete;
//Order Status Update
exports.OrderStatusUpdate = triggers.OrderStatusUpdate;
//push notification
exports.pushNotification = triggers.pushNotification;


// 4. common apis

//search
let common = require('./common');
exports.Search = common.Search;

//payment
let payment = require('./payment');
exports.Payment = payment.Payment;

// 5. Tests
let test = require('./test');
exports.Test = test.Test;


//duyoof
// exports.TodayDealsFull = functions.https.onRequest(async (req, res) => {
//     let TodaysDeals = await db.doc('TodayDeals/productID').get();
//     let productIds = TodaysDeals.data().proId;

//     let promises = [];
//     productIds.forEach(id => {
//         promises.push(db.collection('Products').doc(id).get());
//     })

//     let Products = await Promise.all(promises);
//     let Product = [];
//     let CategoryIds = [];
//     Products.forEach(product => {
//         let temp = {
//             "Name": product.data().Name,
//             "ImgUrl": product.data().ImgUrl,
//         }
//         Product.push(temp);
//         if (!CategoryIds.includes(product.data().CategoryId)) {
//             CategoryIds.push(product.data().CategoryId);
//         }
//     })
//     let promises2 = []
//     CategoryIds.forEach(id => {
//         promises2.push(db.collection('Category').doc(id).get());
//     })
//     let Categories = await Promise.all(promises2);
//     let Category = [];
//     Categories.forEach(category => {
//         let temp = {
//             "Name": category.data().Name,
//             "ImgUrl": category.data().ImgUrl,
//         }
//         Category.push(temp);
//     })
//     res.json({
//         "product": Product,
//         "category": Category
//     })


// });


//my test
// exports.Test = functions.https.onRequest(async (req, res) => {
//     let Image = req.body.Image
//     db.collection('Test_Values').doc('Info').set({
//         Image: Image
//     }).then(() => {
//         return res.json({
//             "message": "success"
//         }).catch(e => {
//             res.json({
//                 "message": "failed"
//             })
//         })
//     })
// })

//duyoof
//multiple imageupload
// const { Storage } = require('@google-cloud/storage');
// const storage = new Storage();

// const path = require('path');
// const os = require('os');
// const fs = require('fs');
// exports.multi_image = functions.https.onRequest(async (req, res) => {
//     let Name = req.body.Name;
//     let base64 = req.body.Image;

//     db.collection("Products").add({ Name: Name }).then(async doc => {
//         console.log(doc.id);
//         // base64.forEach(image => {
//         //     single_image(image, doc.id);
//         // });
//         urls = [];
//         for (i = 0; i < base64.length; i++) {
//             let t = new Date().getTime();
//             let profile_url = `https://firebasestorage.googleapis.com/v0/b/deliverydebug.appspot.com/o/Product%2F${doc.id}%2FImage${t}.png?alt=media`;
//             urls.push(profile_url);
//             single_image(base64[i], doc.id, t);
//         }
//         db.collection('Products').doc(doc.id).set({
//             Images: urls
//         }, { merge: true }).then(() => {
//             return res.json({ "message": "success" })
//         }).catch(e => {
//             res.json({ "message": "failed", "error": e })
//         })
//         return console.log(doc.id);
//     });

// });

// async function single_image(Image, ProductId, time) {
//     const tmpdir = os.tmpdir();
//     const filepath = path.join(tmpdir, `file${time}`);
//     const bucket = "gs://deliverydebug.appspot.com/";
//     //for base 64
//     fs.writeFile(filepath, Image, "base64", async function (err) {
//         console.log('File created', err);
//         console.log(Image.length);
//         var folder = `Product/${ProductId}`;

//         await storage.bucket(bucket).upload(filepath, {
//             destination: `${folder}/Image${time}.png`,
//         })
//     });
// }