const functions = require("firebase-functions");

const admin = require("firebase-admin");
const { firebaseConfig } = require("firebase-functions");
const { Notification } = require("./notification");

const db = admin.firestore();

// notification 
exports.pushNotification = functions.firestore
    .document('Notification/{docid}')
    .onCreate((snap, context) => {
        console.log('Push notification event triggered');

        //  Get the current value of what was written to the Realtime Database.
        const newValue = snap.data();

        if (newValue.Type === 'admin') {
            // Create a notification
            const payload = {
                notification: {
                    title: newValue.Name,
                    body: newValue.Notification,
                    sound: "default"
                }
            };

            //Create an options object that contains the time to live for the notification and the priority
            const options = {
                priority: "high",
                timeToLive: 60 * 60 * 24
            };

            return admin.messaging().sendToTopic("pushNotifications", payload, options);
        } else if (newValue.Type === 'user') {
            // Create a notification
            const payload = {
                notification: {
                    title: `Order Status Updated`,
                    body: newValue.Notification,
                    sound: "default"
                }
            };

            //Create an options object that contains the time to live for the notification and the priority
            const options = {
                priority: "high",
                timeToLive: 60 * 60 * 24
            };

            return admin.messaging().sendToTopic(`${newValue.UserId}`, payload, options);
        } else if (newValue.Type === 'newOrder') {
            // Create a notification
            const payload = {
                notification: {
                    title: `New Order Received`,
                    body: newValue.Notification,
                    sound: "default"
                }
            };

            //Create an options object that contains the time to live for the notification and the priority
            const options = {
                priority: "high",
                timeToLive: 60 * 60 * 24
            };

            return admin.messaging().sendToTopic(`AdminSide`, payload, options);
        }

    });

// category delete then product delete
exports.CategoryDelete = functions.firestore.document('Category/{docid}').onWrite(async (change, context) => {
    const data = change.after.data();
    const PreviousData = change.before.data();

    let catId = context.params.docid;

    if (PreviousData !== undefined && data === undefined) { // delete situation
        let Products = await db.collection('Products').where('CategoryId', '==', catId).get();
        Products.forEach(product => {
            db.collection('Products').doc(product.id).delete();
        });
    }

});

// search keyword generation
exports.ProductKeyword = functions.firestore.document('Products/{docid}').onWrite(async (change, context) => {
    const data = change.after.data();
    const previousData = change.before.data();
    console.log(data);
    console.log(previousData);

    if (previousData === undefined) {
        let category = await db.collection('Category').doc(data.CategoryId).get();
        let name_keys = createKeywords(data.Name);
        let category_keys = createKeywords(category.data().Name);
        category_keys.forEach(key => {
            name_keys.push(key);
        })
        name_keys.push('');
        db.collection('Products').doc(context.params.docid).update({
            "Keywords": name_keys
        });
    } else if (data === undefined) {
        console.log("delete")
    }
    else if (data.Name !== previousData.Name) {
        let category = await db.collection('Category').doc(data.CategoryId).get();
        let name_keys = createKeywords(data.Name);
        let category_keys = createKeywords(category.data().Name);
        category_keys.forEach(key => {
            name_keys.push(key);
        })
        name_keys.push('');
        db.collection('Products').doc(context.params.docid).update({
            "Keywords": name_keys
        });
    }
});

exports.CategoryKeywordUpdate = functions.firestore.document('Category/{docid}').onWrite(async (change, context) => {
    const data = change.after.data();
    const previousData = change.before.data();
    console.log(data);
    console.log(previousData);

    if (previousData === undefined) {
        console.log("new");
    } else if (data === undefined) {
        console.log("delete");
    }
    else if (data.Name !== previousData.Name) {
        let category_keys = createKeywords(data.Name);

        let products = await db.collection('Products').where('CategoryId', '==', context.params.docid).get();
        products.forEach(product => {
            let name_keys = createKeywords(product.data().Name);
            category_keys.forEach(key => {
                name_keys.push(key);
            })
            db.collection('Products').doc(product.id).update({
                "Keywords": name_keys
            });
        })

    }
});

const createKeywords = name => {
    const arrName = [];
    let curName = '';
    let temp = name;
    let len = name.split(' ').length;
    for (let i = 0; i < len; i++) {
        console.log(temp)
        for (k = 0; k < temp.split('').length; k++) {
            letter = temp[k]
            curName += letter.toLowerCase();
            arrName.push(curName);
        }
        console.log(temp.split(' '))
        temp = temp.split(' ')
        temp.splice(0, 1);
        console.log(temp)
        temp = temp.join(" ")
        console.log(temp)
        curName = '';
    }
    return arrName;
}
//Order Status Update
exports.OrderStatusUpdate = functions.firestore.document('Orders/{docid}').onWrite(async (change, context) => {
    const NewData = change.after.data();
    const PreviousData = change.before.data();

    let OrderId = context.params.docid;
    let status = '';

    if ((PreviousData.Status !== NewData.Status) && (NewData.Status !== 'issued' || NewData.Status !== 'Paid' || NewData.Status !== 'cancelled')) {
        if (NewData.Status === 'acknowledged') {
            db.collection('Notification').add({
                Notification: `Your Order for ${NameGenerate(NewData.Products)} has been Acknowledged`,
                UserId: NewData.User.UserId,
                OrderId: OrderId,
                Type: 'user',
                Date: nowDate(),
                Index: new Date().getTime()
            })
            status = 'Order Acknowledged';
        } else if (NewData.Status === 'processed') {
            db.collection('Notification').add({
                Notification: `Your Order for ${NameGenerate(NewData.Products)} has been Processed`,
                UserId: NewData.User.UserId,
                OrderId: OrderId,
                Type: 'user',
                Date: nowDate(),
                Index: new Date().getTime()
            })
            status = 'Order Processed';
        } else if (NewData.Status === 'delivered') {
            db.collection('Notification').add({
                Notification: `Your Order for ${NameGenerate(NewData.Products)} has been Delivered`,
                UserId: NewData.User.UserId,
                OrderId: OrderId,
                Type: 'user',
                Date: nowDate(),
                Index: new Date().getTime()
            })
            status = 'Order Delivered';
        } else if (NewData.Status === 'cancelled') {
            db.collection('Notification').add({
                Notification: `Your Order for ${NameGenerate(NewData.Products)} has been Cancelled`,
                UserId: NewData.User.UserId,
                OrderId: OrderId,
                Type: 'user',
                Date: nowDate(),
                Index: new Date().getTime()
            })
        }
        db.collection('Users').doc(NewData.User.UserId).collection('MyOrders').doc(OrderId).update({
            Status: status
        }).then(() => {
            return console.log('Status Updated');
        }).catch(e => {
            return console.log('Status Updation Failed');
        })
    }


});


//payment success trigger for my orders and cash on delivery
exports.PaymentSuccess = functions.firestore.document('Orders/{docid}').onWrite(async (change, context) => {
    let PreviousData = change.before.data();
    NewData = change.after.data();
    let payFlag = 0;

    if (PreviousData === undefined) {

        if (NewData.Payment_Type === "Offline") { // COD
            payFlag = 1;
        }

    } else {

        if (PreviousData.Status === 'issued' && NewData.Status === 'Paid' && NewData.Payment_Type !== "Offline") { //Online Payment
            payFlag = 1;
        } else if (PreviousData.Status === 'error' && NewData.Status === 'Paid' && NewData.Payment_Type !== "Offline") {
            payFlag = 1;
        }

    }


    if (payFlag === 1) {
        //My Orders, Stock Update
        let count = 0;
        let UserId = NewData.User.UserId;
        let Order = {};
        Order.Index = NewData.Index;
        Order.Order_Id = context.params.docid;
        Order.Status = 'Order Placed';
        Order.Date = NewData.Date;
        Order.Time = NewData.Time;
        Order.Amount = NewData.Amount;
        Order.MinAmount = NewData.MinAmount;
        Order.DeliveryCharge = NewData.DeliveryCharge;
        Order.Tax = NewData.Tax;
        Order.TaxedTotal = NewData.TaxedTotal;
        Order.User = NewData.User;
        Order.Payment_Type = NewData.Payment_Type;
        Order.Products = NewData.Products;
        Order.Products.forEach(product => {
            Order.Products[count].Amount = Number(product.OfferPrice) * Number(product.Count);
            count += 1;
            //stock update
            db.collection('Products').doc(product.ProductId).update({ Stock: admin.firestore.FieldValue.increment(-Number(product.Count)) });
        })
        //Notification
        db.collection('Notification').add({
            Type: 'newOrder',
            Notification: `${NameGenerate(Order.Products)} of Rs ${Math.round(Order.TaxedTotal * 100) / 100} `,
            Index: new Date().getTime()
        })
        //my orders
        db.collection('Users').doc(UserId).collection('MyOrders').doc(Order.Order_Id).set(Order);
        //clear cart
        let cart = await db.collection('Users').doc(UserId).collection('MyCart').get();
        cart.forEach(doc => {
            db.collection('Users').doc(UserId).collection('MyCart').doc(doc.id).delete();
        })
    }

    //for instant update app side
    db.collection('ModifyDocOnOrderAdded').doc('Data').update({ Order: admin.firestore.FieldValue.increment(1) });

    TotalRevenue();
})

//Order Cancel Trigger
exports.OrderCancel = functions.firestore.document('Orders/{docid}').onWrite(async (change, context) => {
    let PreviousData = change.before.data();
    let NewData = change.after.data();
    let payFlag = 0;

    if (PreviousData === undefined) {

        return;

    } else {

        if (NewData.Status === 'cancelled' && NewData.Payment_Type === "Offline") {
            console.log("If part");
            payFlag = 1;
        } else if (NewData.Payment_Type === 'Online') {
            console.log("Else part");
            if (PreviousData.OrderDetails.status === 'paid' && PreviousData.Status !== 'cancelled' && NewData.Status === 'cancelled') { //Online Payment
                payFlag = 1;
            }

        }

        if (payFlag === 1) {
            console.log("Cancel detected")
            //My Orders, Stock Update
            let UserId = NewData.User.UserId;
            let Products = NewData.Products;
            Products.forEach(product => {
                //stock update
                db.collection('Products').doc(product.ProductId).update({ Stock: admin.firestore.FieldValue.increment(Number(product.Count)) });
            })

            //my orders
            db.collection('Users').doc(UserId).collection('MyOrders').doc(context.params.docid).update({
                'Status': 'Order Cancelled'
            });
        }
    }
    TotalRevenue();
})

async function TotalRevenue() {
    let Total_Orders = await db.collection('Orders').get();
    let Data = {};
    Data.Total_Orders = 0;
    Data.Total_Revenue = 0;
    Total_Orders.forEach(order => {
        if ((order.data().Payment_Type === 'Online' && order.data().Status !== 'error' && order.data().Status !== 'cancelled' && order.data().Status !== 'issued') || (order.data().Payment_Type === 'Offline' && order.data().Status === 'delivered')) {
            console.log(order.id);
            Data.Total_Orders += 1;
            Data.Total_Revenue += order.data().TaxedTotal;
        }
    })
    db.collection('Orders').doc('Order_Info').update({
        SuccessfulOrders: Data.Total_Orders,
        TotalRevenue: Data.Total_Revenue
    })
}

//product update cart reflect for duyoof

// exports.onProductUpdateCart = functions.firestore
//     .document('Products/{docid}')
//     .onWrite(async (snapshot, context) => {
//         docid = context.params.docid;
//         let data = snapshot.after.data();
//         let arr = {
//             "Name": data.Name,
//             "Price": data.Price,
//             "OfferPrice": data.OfferPrice,
//             "ImgUrl": data.ImgUrl,
//             "Description": data.Description,
//             "PriceType": data.PriceType
//         }

//         let userDocs = await db.collection("Users").get();
//         let promises = [];
//         let userIds = [];
//         userDocs.forEach(user => {
//             promises.push(db.collection("Users").doc(user.id).collection("MyCart").doc(docid).get());
//             userIds.push(user.id);
//         })
//         let carts = await Promise.all(promises);
//         let count = 0;
//         carts.forEach(cart => {
//             if (cart.data() !== undefined) {
//                 {
//                     db.collection("Users").doc(userIds[count]).collection("MyCart").doc(docid).update(arr)
//                 }
//             }
//             count += 1;
//         })
//     })


//other functions

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



// name generate function
function NameGenerate(Data) {
    let string = '';
    let count = 0;
    if (Data.length > 3) {
        string = `${Data[0].Name}, ${Data[1].Name}, ${Data[2].Name} & ${Data.length - 3} more`;
    } else {
        Data.forEach(element => {
            if (count === 0) {
                string += `${element.Name} `;
            } else if (count === Data.length - 2) {
                string += `, ${element.Name} `;
            } else if (count === Data.length - 1) {
                string += `& ${element.Name} `;
            } else {
                string += `, ${element.Name} `;
            }
            count += 1;
        });
    }
    return string;
}