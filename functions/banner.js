const functions = require("firebase-functions");

const admin = require("firebase-admin");

//admin verifcation
async function adminVerification(req, res, next) {
    if (req.path == '/List') {
        return next();
    }
    let admin_data = await db.collection('Admin').doc('Admin_Info').get();
    let Uid = `${admin_data.data().User}:${admin_data.data().Password}`

    const BeareridToken = req.get('Authorization');
    if (BeareridToken === undefined || BeareridToken === null) {
        res.status(401).json({ "message": "token not verified", "error": 'token undefined' });
    }
    let idToken = BeareridToken.replace('Bearer ', '');
    console.log(idToken);
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log(decodedToken.uid);
        if (decodedToken.uid === Uid) {
            return next();
        } else {
            res.status(401).json({ "message": "token not verified" });
        }
    } catch (err) {
        console.log(err);
        res.status(401).json({ "message": "token not verified", "error": err });
    }
    return console.log('Decode Completed');
}

const db = admin.firestore();

var express = require('express');
var cors = require('cors');

let banner = express();
banner.use(cors({ origin: true }));
banner.use(adminVerification);

// storage access
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

const path = require('path');
const os = require('os');
const fs = require('fs');
const resizeImage = require('resize-img');
const gm = require('gm').subClass({ imageMagick: true });


// banner.post('/Add', async (req, res) => {
//     let Base64Image = req.body.Image;
//     let Description = req.body.Description;
//     let Name = req.body.Name;
//     let BannerId;

//     db.collection('Banners').add({
//         Name: Name,
//         Description: Description
//     }).then(async doc => {
//         let image_url = `https://firebasestorage.googleapis.com/v0/b/deliverydebug.appspot.com/o/Banner%2F${doc.id}%2FImage.png?alt=media`;
//         BannerId = doc.id;
//         const tmpdir = os.tmpdir();
//         const filepath = path.join(tmpdir, "file");
//         const bucket = "gs://deliverydebug.appspot.com/";
//         //for base 64
//         fs.writeFile(filepath, Base64Image, "base64", async function (err) {
//             if (!err) {
//                 const resized_image = await resizeImage(fs.readFileSync(filepath), {
//                     width: 700,
//                     height: 300
//                 });
//                 const resizedfilepath = path.join(tmpdir, "resizedfile");
//                 fs.writeFileSync(resizedfilepath, resized_image);

//                 let folder = `Banner/${doc.id}`;

//                 storage.bucket(bucket).upload(resizedfilepath, {
//                     destination: `${folder}/Image.png`
//                 }).then(async sna => {
//                     await db.collection("Banners").doc(doc.id).set({ "ImgUrl": image_url }, { "merge": true })
//                     return res.json({ "message": "success" });
//                 }).catch(async err => {
//                     console.log(err);
//                     await db.collection('Banners').doc(BannerId).delete();
//                     return res.status(400).json({ "message": "failed" })
//                 })
//             } else {
//                 await db.collection('Banners').doc(doc.id).delete();
//                 res.status(400).json({ "message": "failed" })
//             }
//         });

//     });


// });



// banner.post('/Update', async (req, res) => {
//     let BannerId = req.body.BannerId;
//     let Base64Image = req.body.Image;
//     let Description = req.body.Description;
//     let Name = req.body.Name;

//     db.collection('Banners').doc(BannerId).update({
//         Name: Name,
//         Description: Description
//     }).then(async doc => {
//         if (Base64Image !== null && Base64Image !== undefined) {
//             let time = new Date().getTime();
//             let image_url = `https://firebasestorage.googleapis.com/v0/b/deliverydebug.appspot.com/o/Banner%2F${BannerId}%2FImage${time}.png?alt=media`;

//             const tmpdir = os.tmpdir();
//             const filepath = path.join(tmpdir, "file");
//             const bucket = "gs://deliverydebug.appspot.com/";
//             //for base 64
//             fs.writeFile(filepath, Base64Image, "base64", async function (err) {
//                 if (!err) {
//                     const resized_image = await resizeImage(fs.readFileSync(filepath), {
//                         width: 700,
//                         height: 300
//                     });
//                     const resizedfilepath = path.join(tmpdir, "resizedfile");
//                     fs.writeFileSync(resizedfilepath, resized_image);

//                     let folder = `Banner/${BannerId}`;

//                     storage.bucket(bucket).upload(resizedfilepath, {
//                         destination: `${folder}/Image${time}.png`
//                     }).then(async sna => {
//                         await db.collection("Banners").doc(BannerId).set({ "ImgUrl": image_url }, { "merge": true })
//                         return res.json({ "message": "success" });
//                     }).catch(err => {
//                         console.log(err);
//                         return res.status(400).json({ "message": "failed" })
//                     })
//                 } else {
//                     res.status(400).json({ "message": "failed" })
//                 }
//             });
//         } else {
//             res.json({ "message": "success" });
//         }
//     }).catch(e => {
//         res.json({ "message": "failed", "error": e })
//     });
// });


banner.post('/Add', async (req, res) => {
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


banner.post('/Update', async (req, res) => {
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

banner.post('/Delete', async (req, res) => {
    let BannerId = req.body.BannerId;

    db.collection('Banners').doc(BannerId).delete().then(async doc => {
        res.json({ "message": "success" })
    }).catch(e => {
        res.json({ "message": "failed", "error": e })
    });
});

banner.post('/List', async (req, res) => {
    let data = [];
    let temp = {};
    let banners = await db.collection('Banners').get();
    banners.forEach(banner => {
        temp = {
            BannerId: banner.id,
            Name: banner.data().Name,
            Description: banner.data().Description,
            ImgUrl: banner.data().ImgUrl
        }
        data.push(temp);
    });
    res.json(data);
})

exports.Banner = functions.https.onRequest(banner);




// const gm = require('gm').subClass({ imageMagick: true });

// //--------------------function--------------------
// function convertImage(source, path_to) {
//     return new Promise((resolve, reject) => {
//         gm(source)
//             .resize(700, 700)
//             .write(path_to,
//                 function (err) {
//                     if (err) {
//                         reject(err)
//                     }
//                     resolve(true);
//                 });
//     })
// }

// //----------------------code-----------------
// adproducts.post("/addProducts", async (req, res) => {
//     const Name = req.body.Name;
//     let base64 = req.body.ImgUrls;
//     const Description = req.body.Description;
//     const OfferPrice = req.body.Price;
//     const Price = req.body.Mrp;
//     const PriceType = req.body.Unit;
//     const Stock = Number(req.body.Stock);
//     const CategoryId = req.body.catid;
//     const active = req.body.IsActive;
//     const qnt = req.body.Quantity;
//     // let j= new Date();
//     let index = Date.now();
//     const gimg = [];
//     const promi = [];


//     const tmpdir = os.tmpdir();
//     const filepath = path.join(tmpdir, "file");
//     const bucket = "gs://deliverydebug.appspot.com";
//     let d = new Date();
//     let t = d.getTime();
//     try {

//         if (req.body.ImgUrls[0] === req.body.ImgUrls[1]) {
//             console.log("___________________")
//         }
//         base64.forEach((imgs, imageIndex) => {
//             console.log(imgs.length)
//             const image_url = `https://firebasestorage.googleapis.com/v0/b/deliverydebug.appspot.com/o/Products%2F${t}(${imageIndex}).png?alt=media`;
//             gimg.push(image_url);
//             fs.writeFileSync(`${filepath}(${imageIndex})`, imgs, "base64");
//         });
//         const resizePromise = [];

//         base64.forEach((imgs, imageIndex) => {
//             resizePromise.push(convertImage(`${filepath}(${imageIndex})`, `${filepath}(${imageIndex})`))
//         });
//         await Promise.all(resizePromise);
//         const storagePromise = [];
//         gimg.forEach((elem, index) => {

//             storagePromise.push(storage.bucket(bucket).upload(`${filepath}(${index})`, {
//                 destination: `Products/${t}(${index}).png`
//             }))

//         })
//         await Promise.all(storagePromise)
//         await db.collection("Products")
//             .add({
//                 Name: Name,
//                 Description: Description,
//                 Price: Number(Price),
//                 OfferPrice: Number(OfferPrice),
//                 Stock: Number(Stock),
//                 CategoryId: CategoryId,
//                 PriceType: PriceType,
//                 IsActive: active,
//                 Quantity: qnt,
//                 Index: index,
//                 ImgUrl: gimg
//             })
//         return res.json({ message: "success" });

//     } catch (error) {
//         functions.logger.error(error);
//         return res.status(400).json({ message: "failed" });

//     }
// });