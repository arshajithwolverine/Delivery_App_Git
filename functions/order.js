const functions = require("firebase-functions");

const admin = require("firebase-admin");

const db = admin.firestore();

//admin verifcation
async function adminVerification(req, res, next) {
    let admin_data = await db.collection('Admin').doc('Admin_Info').get();
    let Uid = `${admin_data.data().User}:${admin_data.data().Password}`

    const BeareridToken = req.get('Authorization');
    if (BeareridToken === undefined || BeareridToken === null) {
        return res.status(401).json({ "message": "token not verified", "error": 'token undefined' });
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

var express = require('express');
var cors = require('cors');

let order = express();
order.use(cors({ origin: true }));
order.use(adminVerification);

order.post('/StatusUpdate', async (req, res) => {
    let order = req.body.OrderId;
    let status = req.body.Status;

    db.collection('Orders').doc(order).update({
        "Status": status
    }).then(doc => {
        return res.json({
            "message": "success"
        });
    }).catch(e => {
        res.json({
            "message": "failed",
            "error": e
        })
    })
})


order.post('/All', async (req, res) => {
    let index = req.body.Index;

    let Orders = [];

    if (Number(index) === 0) {
        let count = 0;
        console.log("If part");
        let orders = await db.collection('Orders').orderBy('Index', 'desc').get();
        orders.forEach(order => {
            if (count < 10) {
                let Data = {};
                let Name = NameGenerate(order.data().Products);
                let mode;
                if (order.data().Payment_Type === 'Offline') {
                    mode = 'Cash On Delivery';
                } else {
                    mode = 'Online Payment';
                }
                let status = '';
                if ((order.data().Payment_Type === 'Offline' && order.data().Status === 'issued') || (order.data().Payment_Type === 'Online' && order.data().Status === 'Paid')) {
                    status = 'NEW'
                } else if (order.data().Payment_Type === 'Online' && order.data().Status === 'issued') {
                    return;
                } else {
                    status = order.data().Status.toUpperCase();
                }
                Data = {
                    "docid": order.id,
                    "Name": Name,
                    "ImgUrl": order.data().Products[0].ImgUrl[0],
                    "Date": order.data().Date,
                    "Time": order.data().Time,
                    "PaymentMode": mode,
                    "Status": status
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
                count += 1;
            }
        })
    } else {
        let count = 0;
        let flag = 0;
        console.log("Else Part");
        let orders = await db.collection('Orders').orderBy('Index', 'desc').get();
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
                let status = '';
                if ((order.data().Payment_Type === 'Offline' && order.data().Status === 'issued') || (order.data().Payment_Type === 'Online' && order.data().Status === 'Paid')) {
                    status = 'NEW'
                } else {
                    status = order.data().Status.toUpperCase();
                }
                Data = {
                    "docid": order.id,
                    "Name": Name,
                    "ImgUrl": order.data().Products[0].ImgUrl[0],
                    "Date": order.data().Date,
                    "Time": order.data().Time,
                    "PaymentMode": mode,
                    "Status": status
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
                count += 1;
            }
            if (order.id === index) {
                flag = 1;
            }

        })
    }
    res.json(Orders);
})

order.post('/NewList', async (req, res) => {
    let index = req.body.Index;

    let Orders = [];

    if (Number(index) === 0) {
        let count = 0;
        console.log("If part");
        let orders = await db.collection('Orders').orderBy('Index', 'desc').get();
        orders.forEach(order => {
            if ((order.data().Payment_Type === 'Offline' && order.data().Status === 'issued') || (order.data().Payment_Type === 'Online' && order.data().Status === 'Paid')) {
                if (count < 10) {
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
                        "ImgUrl": order.data().Products[0].ImgUrl[0],
                        "Date": order.data().Date,
                        "Time": order.data().Time,
                        "PaymentMode": mode,
                        "Status": 'NEW'
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
                    count += 1;
                }
            }
        })
    } else {
        let count = 0;
        let flag = 0;
        console.log("Else Part");
        let orders = await db.collection('Orders').orderBy('Index', 'desc').get();
        orders.forEach(order => {
            if ((order.data().Payment_Type === 'Offline' && order.data().Status === 'issued') || (order.data().Payment_Type === 'Online' && order.data().Status === 'Paid')) {
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
                        "ImgUrl": order.data().Products[0].ImgUrl[0],
                        "Date": order.data().Date,
                        "Time": order.data().Time,
                        "PaymentMode": mode,
                        "Status": 'NEW'
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
                    count += 1;
                }
            }
            if (order.id === index) {
                flag = 1;
            }

        })
    }
    res.json(Orders);
})

order.post('/List', async (req, res) => {
    let index = req.body.Index;
    let status = req.body.status;

    let Orders = [];

    if (Number(index) === 0) {
        let count = 0;
        console.log("If part");
        let orders = await db.collection('Orders').where('Status', '==', status).orderBy('Index', 'desc').get();
        orders.forEach(order => {
            if (count < 10) {
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
                    "ImgUrl": order.data().Products[0].ImgUrl[0],
                    "Date": order.data().Date,
                    "Time": order.data().Time,
                    "PaymentMode": mode,
                    "Status": status.toUpperCase()
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
                count += 1;
            }
        })
    } else {
        let count = 0;
        let flag = 0;
        console.log("Else Part");
        let orders = await db.collection('Orders').where('Status', '==', status).orderBy('Index', 'desc').get();
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
                    "ImgUrl": order.data().Products[0].ImgUrl[0],
                    "Date": order.data().Date,
                    "Time": order.data().Time,
                    "PaymentMode": mode,
                    "Status": status.toUpperCase()
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
                count += 1;
            }
            if (order.id === index) {
                flag = 1;
            }
        })
    }
    res.json(Orders);
})

// link : https://console.firebase.google.com/v1/r/project/deliverydebug/firestore/indexes?create_composite=Ckxwcm9qZWN0cy9kZWxpdmVyeWRlYnVnL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9PcmRlcnMvaW5kZXhlcy9fEAEaCgoGU3RhdHVzEAEaCQoFSW5kZXgQAhoMCghfX25hbWVfXxAC


exports.Order = functions.https.onRequest(order);


//other functions 

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
        let type = product.PriceType;
        if (type === 'g') {
            type = '100 g';
        } else if (type === 'kg') {
            type = '1 kg';
        }
        let temp = {
            "ProductId": product.ProductId,
            "Name": product.Name,
            "ImgUrls": product.ImgUrl,
            "Type": type,
            "Price": product.OfferPrice,
            "Quantity": Number(product.Count),
            "TotalPrice": product.Amount
        }
        products.push(temp);
    });
    return products;
}