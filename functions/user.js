const functions = require("firebase-functions");

const admin = require("firebase-admin");

const db = admin.firestore();

//token verifcation
async function decodeIDToken(req, res, next) {
    const idToken = req.get('Authorization').replace('Bearer ', '');
    console.log(idToken);
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log(decodedToken.uid);
        req.body.Userid = decodedToken.uid;
        return next();
    } catch (err) {
        console.log(err);
        res.status(401).json({ "message": "token not verified", "error": err });
    }
    return console.log('Decode Completed');
}

var express = require('express');
var cors = require('cors');

let user = express();
user.use(cors({ origin: true }));
user.use(decodeIDToken);

//add,update user details
user.post('/SignUp', async (req, res) => {
    let userid = req.body.Userid;
    let name = req.body.Name;
    let phone = req.body.Phone;
    let email = req.body.Email;

    let user = await db.collection('Users').doc(userid).get();
    if (user.data() === undefined) {
        db.collection('Users').doc(userid).set({
            Name: name,
            Phone: phone,
            Email: email
        }).then(() => {
            return res.json({
                "message": "success"
            })
        }).catch(e => {
            res.json({
                "message": "failed"
            })
        })
    } else {
        db.collection('Users').doc(userid).update({
            Name: name,
            Phone: phone,
            Email: email
        }).then(() => {
            return res.json({
                "message": "success"
            })
        }).catch(e => {
            res.json({
                "message": "failed"
            })
        })
    }

})

//add address
user.post('/Address_Add', async (req, res) => {
    let userid = req.body.Userid;
    let name = req.body.Name;
    let phone = req.body.Phone;
    let pin = req.body.Pin;
    let state = req.body.State;
    let city = req.body.City;
    let area = req.body.Area;
    let house = req.body.House;
    let landmark = req.body.Landmark;

    let user = await db.collection('Users').doc(userid).get();
    let address = [];
    if (user.data() === undefined) {
        let temp = {};
        if (landmark === undefined) {
            temp = {
                Name: name,
                Phone: phone,
                Pin: pin,
                State: state,
                City: city,
                Area: area,
                House: house,
            };
        } else {
            temp = {
                Name: name,
                Phone: phone,
                Pin: pin,
                State: state,
                City: city,
                Area: area,
                House: house,
                Landmark: landmark
            };
        }
        address.push(temp);
        db.collection('Users').doc(userid).set({
            Address: address
        }).then(() => {
            return res.json({
                "message": "success"
            })
        }).catch(e => {
            res.json({
                "message": "failed"
            })
        })
    } else {
        if (user.data().Address !== undefined) {
            address = user.data().Address;
        }
        let temp = {};
        if (landmark === undefined) {
            temp = {
                Name: name,
                Phone: phone,
                Pin: pin,
                State: state,
                City: city,
                Area: area,
                House: house,
            };
        } else {
            temp = {
                Name: name,
                Phone: phone,
                Pin: pin,
                State: state,
                City: city,
                Area: area,
                House: house,
                Landmark: landmark
            };
        }
        address.push(temp);
        db.collection('Users').doc(userid).update({
            Address: address
        }).then(() => {
            return res.json({
                "message": "success"
            })
        }).catch(e => {
            res.json({
                "message": "failed"
            })
        })
    }
})

//show user details
user.post('/Show', async (req, res) => {
    let userid = req.body.Userid;
    let user = await db.collection('Users').doc(userid).get();

    res.json(user.data());
})

user.post('/Address_View', async (req, res) => {
    let userid = req.body.Userid;
    let user = await db.collection('Users').doc(userid).get();
    let data = [];

    if (user.data() === undefined) {
        return res.json(data);
    }
    let address = user.data().Address;

    if (address === undefined) {
        return res.json(data);
    }
    let count = 0;
    address.forEach(element => {
        let temp = element;
        temp.Index = count;
        data.push(temp);
        count += 1;
    });
    return res.json(data);
})

user.post('/Address_Delete', async (req, res) => {
    let userid = req.body.Userid;
    let index = req.body.Index;


    let user = await db.collection('Users').doc(userid).get();
    let address = user.data().Address;
    address.splice(index, 1);

    db.collection('Users').doc(userid).update({
        Address: address
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

user.post('/Address_Edit', async (req, res) => {
    let userid = req.body.Userid;
    let index = req.body.Index;
    let name = req.body.Name;
    let phone = req.body.Phone;
    let pin = req.body.Pin;
    let state = req.body.State;
    let city = req.body.City;
    let area = req.body.Area;
    let house = req.body.House;
    let landmark = req.body.Landmark;

    let user = await db.collection('Users').doc(userid).get();

    let temp = {};
    if (landmark === undefined) {
        temp = {
            Name: name,
            Phone: phone,
            Pin: pin,
            State: state,
            City: city,
            Area: area,
            House: house,
        };
    } else {
        temp = {
            Name: name,
            Phone: phone,
            Pin: pin,
            State: state,
            City: city,
            Area: area,
            House: house,
            Landmark: landmark
        };
    }

    let address = user.data().Address;
    address.splice(index, 1, temp);

    db.collection('Users').doc(userid).update({
        Address: address
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

user.post('/MyOrders', async (req, res) => {
    let userid = req.body.Userid;
    let index = req.body.Index;

    let Orders = [];

    if (Number(index) === 0) {
        let orders = await db.collection('Users').doc(userid).collection('MyOrders').orderBy('Index', 'desc').limit(10).get();
        orders.forEach(order => {
            let Name = NameGenerate(order.data().Products);
            let mode;
            if (order.data().Payment_Type === 'Offline') {
                mode = 'Cash On Delivery';
            } else {
                mode = 'Online Payment';
            }
            let Data = {
                "docid": order.id,
                "Name": Name,
                "ImgUrls": order.data().Products[0].ImgUrl,
                "Date": order.data().Date,
                "Time": order.data().Time,
                "PaymentMode": mode,
                "Status": order.data().Status
            }
            let Products = ProductGenerate(order.data().Products);
            Data.Details = {
                "Address": order.data().User.Address,
                "Price": order.data().Amount,
                "TaxedTotal": order.data().TaxedTotal,
                "MinAmount": order.data().MinAmount,
                "DeliveryCharge": order.data().DeliveryCharge,
                "Tax": order.data().Tax,
                "Orders": Products
            }
            Orders.push(Data);
        })
    } else {
        let count = 0;
        let flag = 0;
        console.log("Else Part");
        let orders = await db.collection('Users').doc(userid).collection('MyOrders').orderBy('Index', 'desc').get();
        orders.forEach(order => {
            if (flag === 1 && count < 10) {
                let Data = {};
                let Name = NameGenerate(order.data().Products);
                let mode;
                if (order.data().Payment_Type === 'Offline') {
                    mode = 'Cash On Delivery';
                } else {
                    mode = 'Online Payment';
                }
                Data = {
                    "docid": order.id,
                    "Name": Name,
                    "ImgUrls": order.data().Products[0].ImgUrl,
                    "Date": order.data().Date,
                    "Time": order.data().Time,
                    "PaymentMode": mode,
                    "Status": order.data().Status
                }
                let Products = ProductGenerate(order.data().Products);
                Data.Details = {
                    "Address": order.data().User.Address,
                    "Price": order.data().Amount,
                    "Orders": Products
                }
                Orders.push(Data);
                count += 1;
            }
            if (order.id === index) {
                flag = 1;
            }

        })
    }
    res.json(Orders);



})

//imageupload
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

const path = require('path');
const os = require('os');
const fs = require('fs');

user.post('/ProfilePic', async (req, res) => {

    let Image = req.body.Image;


    let t = Date.now();
    // postinsertdata.index=t;  

    let profile_url = `https://firebasestorage.googleapis.com/v0/b/deliverydebug.appspot.com/o/User%2F${req.body.Userid}%2Fprofile_url.png?alt=media`;




    const tmpdir = os.tmpdir();
    const filepath = path.join(tmpdir, "afile");
    const bucket = "gs://deliverydebug.appspot.com/";
    //for base 64
    await fs.writeFile(filepath, Image, "base64", function (err) {
        console.log('File created', err);
    });

    //for byte array
    // let base64 = ArrayBufferToBase64(Image);
    // await fs.writeFile(filepath, base64, "base64", function (err) {
    //     console.log('File created', err);
    // });



    //var folder=`Posts/req.body.userid/${t}`
    var folder = `User/${req.body.Userid}`;


    storage.bucket(bucket).upload(filepath, {
        destination: `${folder}/profile_url.png`,

    })
        .then(sna => {
            return db.collection("Users").doc(req.body.Userid).set({ "ProfileUrl": profile_url }, { "merge": true })
        })
        .then(sna => {
            return res.json({ "message": "success" });
        })
        .catch(err => {
            console.log(err);
            return res.status(400).json({ "message": "failed" })
        })


});

exports.User = functions.https.onRequest(user);


// byte array to base 64
function ArrayBufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// name generate function
function NameGenerate(Data) {
    let string = '';
    let count = 0;
    if (Data.length > 3) {
        string = `${Data[0].Name}, ${Data[1].Name}, ${Data[2].Name} & ${Data.length - 3} more`;
    } else {
        Data.forEach(element => {
            if (count === 0) {
                string += `${element.Name}`;
            } else if (count === Data.length - 2) {
                string += `, ${element.Name} `;
            } else if (count === Data.length - 1) {
                string += `& ${element.Name}`;
            } else {
                string += `, ${element.Name}`;
            }
            count += 1;
        });
    }
    return string;
}

//product generate function
function ProductGenerate(Data) {
    let products = [];
    Data.forEach(product => {
        let discount = (100 * (product.Price - product.OfferPrice)) / product.Price;
        let temp = {
            "ProductId": product.ProductId,
            "Name": product.Name,
            "ImgUrls": product.ImgUrl,
            "Type": product.PriceType,
            "Price": product.OfferPrice,
            "Unit": product.PriceType,
            "Mrp": product.Price,
            "Discount": discount,
            "Description": product.Description,
            "Quantity": Number(product.Count),
            "TotalPrice": product.Amount
        }
        products.push(temp);
    });
    return products;
}