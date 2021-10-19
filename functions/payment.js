const functions = require("firebase-functions");

const admin = require("firebase-admin");

const db = admin.firestore();

//token verifcation
async function decodeIDToken(req, res, next) {

  if (req.path === '/Complete') return next();

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

//RazorPay Payment
Razorpay = require('razorpay');
const razorPayAccount = require('./razorPayAccount.json');
var instance = new Razorpay(razorPayAccount);

let payment = express();
payment.use(cors({ origin: true }));
payment.use(decodeIDToken);

payment.post('/OrderGeneration', async (req, res) => {
  let userid = req.body.Userid;
  let selectedAddress = Number(req.body.Address);
  let products = req.body.Products;

  let Order = {};
  //payment method
  Order.Payment_Type = 'Online';

  //user details
  Order.User = {};
  let user = await db.collection('Users').doc(userid).get();
  Order.User.UserId = userid;
  if (req.body.Name !== undefined) {
    Order.User.Name = req.body.Name;
  } else {
    Order.User.Name = '';
  }
  if (req.body.Phone !== undefined) {
    Order.User.Phone = req.body.Phone;
  } else {
    Order.User.Phone = '';
  }
  if (req.body.Email !== undefined) {
    Order.User.Email = req.body.Email;
  } else {
    Order.User.Email = '';
  }
  Order.User.Address = user.data().Address[selectedAddress];

  //product details
  Order.Products = [];
  let promises = [];
  products.forEach(product => {
    promises.push(db.collection('Products').doc(product.productid).get());
  });
  let product_data = await Promise.all(promises);
  let count = 0;
  product_data.forEach(doc => {
    Order.Products[count] = {
      ProductId: doc.id,
      IsActive: doc.data().IsActive,
      ImgUrl: doc.data().ImgUrl,
      Name: doc.data().Name,
      PriceType: doc.data().PriceType,
      Price: doc.data().Price,
      OfferPrice: doc.data().OfferPrice,
      Count: products[count].Count,
      Stock: doc.data().Stock
    }
    count += 1;
  })

  //product stock validation and active validation
  let outofstock = [];
  let stockflag = 0;
  Order.Products.forEach(product => {
    if (product.Count > product.Stock || product.IsActive === false) {
      stockflag = 1;
      outofstock.push(product);
    }
  })
  if (stockflag === 1) {
    return res.json({
      "message": "failed",
      "error": "outofstock",
      "products": outofstock
    });
  }


  //amount detais
  let amount = 0;
  Order.Products.forEach(product => {
    amount += Number(product.OfferPrice) * Number(product.Count);
  })
  Order.Amount = amount;

  //tax adding
  let tax_details = await db.collection('TermsAndTaxes').doc('data').get();
  Order.TaxedTotal = Order.Amount + ((Number(tax_details.data().Tax) * Order.Amount) / 100);
  Order.TaxedTotal = Math.round(Order.TaxedTotal * 100) / 100;
  Order.Tax = tax_details.data().Tax;
  Order.MinAmount = Number(tax_details.data().MinAmount)
  if (Number(tax_details.data().MinAmount) > Order.TaxedTotal) {
    Order.DeliveryCharge = tax_details.data().DeliveryCharge;
    Order.TaxedTotal += Number(Order.DeliveryCharge);
  } else {
    Order.DeliveryCharge = 'FREE';

  }

  let OrderNo;
  //order number
  let Order_Info = await db.collection('Orders').doc('Order_Info').get();
  if (Order_Info.data() === undefined) {
    await db.doc("Orders/Order_Info").set({ OrderNo: 1 });
    await db.doc("ModifyDocOnOrderAdded/Data").set({ Order: 1 });
    //order status
    Order.Status = "issued";
    Order.Receipt_No = `order_rcptid_1`
    OrderNo = 1;
  } else {
    //order status
    Order.Status = "issued";
    Order.Receipt_No = `order_rcptid_${Order_Info.data().OrderNo}`
    OrderNo = Order_Info.data().OrderNo;
  }
  db.doc("Orders/Order_Info").update({ OrderNo: admin.firestore.FieldValue.increment(1) });



  // razorpay response
  var options = {
    amount: amount * 100,
    currency: "INR",
    receipt: `order_rcptid_${OrderNo}`
  };
  instance.orders.create(options, function (err, order) {
    console.log(order);
    Order.OrderDetails = order;
    Order.Index = new Date().getTime();
    db.collection('Orders').doc(Order.OrderDetails.id).set(Order).then(() => {
      return res.json({
        "message": "success",
        "url": `https://deliverydebug.web.app/paytestpage.html?order_id=${Order.OrderDetails.id}&name=${Order.User.Name}&email=${Order.User.Email}&contact=${Order.User.Phone}`
      })
    }).catch(e => {
      res.json({
        "message": "failed",
        "error": e
      })
    })
  });

});

payment.post('/Complete', async (req, res) => {
  // if (req.body.blahblah === "blahblah") {
  //     res.json({ "blahblah": "blahblah" });
  //     return;
  // }
  let razorpay_payment_id = req.body.razorpay_payment_id;
  let razorpay_order_id = req.body.razorpay_order_id;

  flag = 0;

  // url params
  var url_params = req.query;
  order_id = url_params.order_id;
  callback_url = url_params.callback_url;

  if (req.body.error !== undefined || req.body === {}) {
    //case 1
    await db.collection("Orders").doc(order_id).update({ "Status": "error", "OrderDetails.status": "error" });
    flag = 0;
  }
  else if (razorpay_order_id !== undefined || razorpay_payment_id !== undefined) {
    //case 2
    // payment_data = await instance.payments.fetch(razorpay_payment_id)

    order_data = await instance.orders.fetch(razorpay_order_id);
    order_data.razorpay_payment_id = razorpay_payment_id;

    sever_data = await db.doc(`Orders/${razorpay_order_id}`).get();
    Amount_Payable = sever_data.data().Amount * 100;

    if (order_data.status === "paid" && order_data.amount === order_data.amount_paid && order_data.amount_due === 0 && Amount_Payable === order_data.amount_paid) {
      flag = 1;

      db.doc(`Orders/${razorpay_order_id}`).update({ "Status": "Paid", "OrderDetails": order_data, "Date": nowDate(), "Time": nowTime(), "Year": new Date().getFullYear(), "Month": new Date().getMonth() + 1 });
    }
    else {
      await db.collection("Orders").doc(razorpay_order_id).update({ "Status": "error", "OrderDetails.status": "error" });
      flag = 0;
    }
  }
  else {
    //case 3
    await db.collection("Orders").doc(order_id).update({ "Status": "error", "OrderDetails.status": "error" });
    flag = 0;
  }

  if (callback_url === "false") {
    //case 4
    flag = 0;
  }

  if (flag === 0) {
    //case 5
    order_data = await instance.orders.fetch(order_id);
    order_data.razorpay_payment_id = "";

    sever_data = await db.doc(`Orders/${order_id}`).get();
    Amount_Payable = sever_data.data().Amount * 100;

    if (order_data.status === "paid" && order_data.amount === order_data.amount_paid && order_data.amount_due === 0 && Amount_Payable === order_data.amount_paid) {
      flag = 1;

      await db.doc(`Orders/${order_id}`).update({ "Status": "Paid", "OrderDetails": order_data, "Date": nowDate(), "Time": nowTime(), "Year": new Date().getFullYear(), "Month": new Date().getMonth() + 1 });
    }

  }

  if (flag === 1) {

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(`<!DOCTYPE html>
        <html>
        <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
        /* Center the loader */
        #loader {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 1;
          width: 150px;
          height: 150px;
          margin: -75px 0 0 -75px;
          border: 16px solid #f3f3f3;
          border-radius: 50%;
          border-top: 16px solid #3498db;
          width: 120px;
          height: 120px;
          -webkit-animation: spin 2s linear infinite;
          animation: spin 2s linear infinite;
        }
        
        @-webkit-keyframes spin {
          0% { -webkit-transform: rotate(0deg); }
          100% { -webkit-transform: rotate(360deg); }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Add animation to "page content" */
        .animate-bottom {
          position: relative;
          -webkit-animation-name: animatebottom;
          -webkit-animation-duration: 1s;
          animation-name: animatebottom;
          animation-duration: 1s
        }
        
        @-webkit-keyframes animatebottom {
          from { bottom:-100px; opacity:0 } 
          to { bottom:0px; opacity:1 }
        }
        
        @keyframes animatebottom { 
          from{ bottom:-100px; opacity:0 } 
          to{ bottom:0; opacity:1 }
        }
        
        #myDiv {
          display: none;
          text-align: center;
        }
        </style>
        </head>
        <body onload="myFunction()" style="margin:0;">
        
        <div id="loader"></div>
        
        <button  id="selfclick" onclick="test()"  style="display: none;">clickme</button>
  
        
        
          <script>
            
          document.addEventListener('DOMContentLoaded', function() {
              
            location.replace("https://deliverydebug.web.app/payment/payment-success.html");
            setTimeout(function(){ var pagebutton= document.getElementById("selfclick");
            pagebutton.click(); }, 5000);
          })
            function test(){
              invokeCSharpAction("success");
            }
        </script>
        </body>
        </html>
        `);


    res.end();

  }
  else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(`<!DOCTYPE html>
        <html>
        <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
        /* Center the loader */
        #loader {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 1;
          width: 150px;
          height: 150px;
          margin: -75px 0 0 -75px;
          border: 16px solid #f3f3f3;
          border-radius: 50%;
          border-top: 16px solid #3498db;
          width: 120px;
          height: 120px;
          -webkit-animation: spin 2s linear infinite;
          animation: spin 2s linear infinite;
        }
        
        @-webkit-keyframes spin {
          0% { -webkit-transform: rotate(0deg); }
          100% { -webkit-transform: rotate(360deg); }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Add animation to "page content" */
        .animate-bottom {
          position: relative;
          -webkit-animation-name: animatebottom;
          -webkit-animation-duration: 1s;
          animation-name: animatebottom;
          animation-duration: 1s
        }
        
        @-webkit-keyframes animatebottom {
          from { bottom:-100px; opacity:0 } 
          to { bottom:0px; opacity:1 }
        }
        
        @keyframes animatebottom { 
          from{ bottom:-100px; opacity:0 } 
          to{ bottom:0; opacity:1 }
        }
        
        #myDiv {
          display: none;
          text-align: center;
        }
        </style>
        </head>
        <body onload="myFunction()" style="margin:0;">
        
        <div id="loader"></div>
        <button  id="selfclick" onclick="test()"  style="display: none;">clickme</button>
  
        
        
          <script>
            
          document.addEventListener('DOMContentLoaded', function() {
              
            location.replace("https://deliverydebug.web.app/payment/payment-failure.html");
            setTimeout(function(){ var pagebutton= document.getElementById("selfclick");
            pagebutton.click(); }, 5000);
          })
            function test(){
              invokeCSharpAction("fail");
            }
        </script>
        </body>
        </html>
        `);


    res.end();
  }
});

// 2. Cash on delivery
payment.post('/CashOnDelivery', async (req, res) => {
  let userid = req.body.Userid;
  let selectedAddress = Number(req.body.Address);
  let products = req.body.Products;

  let Order = {};
  //payment method
  Order.Payment_Type = 'Offline';
  Order.Date = nowDate();
  Order.Year = new Date().getFullYear();
  Order.Month = new Date().getMonth() + 1;
  Order.Time = nowTime();
  let date = new Date();
  Order.Index = date.getTime();

  //user details
  Order.User = {};
  let user = await db.collection('Users').doc(userid).get();
  Order.User.UserId = userid;
  if (req.body.Name !== undefined) {
    Order.User.Name = req.body.Name;
  } else {
    Order.User.Name = '';
  }
  if (req.body.Phone !== undefined) {
    Order.User.Phone = req.body.Phone;
  } else {
    Order.User.Phone = '';
  }
  if (req.body.Email !== undefined) {
    Order.User.Email = req.body.Email;
  } else {
    Order.User.Email = '';
  }
  Order.User.Address = user.data().Address[selectedAddress];

  //product details
  Order.Products = [];
  let promises = [];
  products.forEach(product => {
    promises.push(db.collection('Products').doc(product.productid).get());
  });
  let product_data = await Promise.all(promises);
  let count = 0;
  product_data.forEach(doc => {
    Order.Products[count] = {
      ProductId: doc.id,
      IsActive: doc.data().IsActive,
      Name: doc.data().Name,
      ImgUrl: doc.data().ImgUrl,
      PriceType: doc.data().PriceType,
      Price: doc.data().Price,
      OfferPrice: doc.data().OfferPrice,
      Count: products[count].Count,
      Stock: doc.data().Stock
    }
    count += 1;
  })

  //product stock validation and active validation
  let outofstock = [];
  let stockflag = 0;
  Order.Products.forEach(product => {
    if (product.Count > product.Stock || product.IsActive === false) {
      stockflag = 1;
      outofstock.push(product);
    }
  })
  if (stockflag === 1) {
    return res.json({
      "message": "failed",
      "error": "outofstock",
      "products": outofstock
    });
  }


  //amount detais
  let amount = 0;
  Order.Products.forEach(product => {
    amount += Number(product.OfferPrice) * Number(product.Count);
  })
  Order.Amount = amount;

  //tax adding
  let tax_details = await db.collection('TermsAndTaxes').doc('data').get();
  Order.TaxedTotal = Order.Amount + ((Number(tax_details.data().Tax) * Order.Amount) / 100);
  Order.Tax = tax_details.data().Tax;
  Order.MinAmount = Number(tax_details.data().MinAmount);
  if (Number(tax_details.data().MinAmount) > Order.TaxedTotal) {
    Order.DeliveryCharge = tax_details.data().DeliveryCharge;
    Order.TaxedTotal += Number(Order.DeliveryCharge);
  } else {
    Order.DeliveryCharge = 'FREE';

  }

  // //order number
  // let Order_Info = await db.collection('Orders').doc('Order_Info').get();
  // db.doc("Orders/Order_Info").update({ OrderNo: admin.firestore.FieldValue.increment(1) });

  // //order status
  // Order.Status = "issued";
  // Order.Receipt_No = `order_rcptid_${Order_Info.data().OrderNo}`

  let OrderNo;
  //order number
  let Order_Info = await db.collection('Orders').doc('Order_Info').get();
  if (Order_Info.data() === undefined) {
    await db.doc("Orders/Order_Info").set({ OrderNo: 1 });
    await db.doc("ModifyDocOnOrderAdded/Data").set({ Order: 1 });
    //order status
    Order.Status = "issued";
    Order.Receipt_No = `order_rcptid_1`
    OrderNo = 1;
  } else {
    //order status
    Order.Status = "issued";
    Order.Receipt_No = `order_rcptid_${Order_Info.data().OrderNo}`
    OrderNo = Order_Info.data().OrderNo;
  }
  db.doc("Orders/Order_Info").update({ OrderNo: admin.firestore.FieldValue.increment(1) });


  db.collection('Orders').doc(`order_cod_#000${OrderNo}`).set(Order).then(() => {
    return res.json({
      "message": "success",
    })
  }).catch(e => {
    res.json({
      "message": "failed",
      "error": e
    })
  })


});

exports.Payment = functions.runWith({ "timeoutSeconds": 300, memory: '512MB' }).https.onRequest(payment);

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

function nowTime() {
  let date = new Date();
  let currentOffset = date.getTimezoneOffset();
  let ISTOffset = 330;
  date = new Date(date.getTime() + (ISTOffset + currentOffset) * 60000);

  let hr = Number(date.getHours());
  let min = Number(date.getMinutes());
  let am_pm = 'am';
  if (hr > 12) {
    hr = hr - 12;
    am_pm = 'pm'
  }
  if (hr < 10) {
    hr = `0${hr}`;
  }
  if (min < 10) {
    min = `0${min}`;
  }
  let time_string = String(hr) + ':' + String(min) + ' ' + am_pm;
  return time_string;
}