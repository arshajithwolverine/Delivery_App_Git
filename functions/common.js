const functions = require("firebase-functions");

const admin = require("firebase-admin");

const db = admin.firestore();

var express = require('express');
var cors = require('cors');


//search
exports.Search = functions.https.onRequest(async (req, res) => {
    let index = req.body.Index;
    let keyword = req.body.Keyword.toLowerCase();
    let data = [];
    let temp = {};
    let flag = 0;
    let count = 0;
    let Todays = await db.collection('TodayDeals').doc('productID').get();
    let Todays_Ids = [];
    try {
        Todays_Ids = Todays.data().proId;
    } catch (e) {
        console.log('No Todays');
    }
    let Trending = await db.collection('TrendingDeals').doc('productID').get();
    let Trending_Ids = [];
    try {
        Trending_Ids = Trending.data().proId;
    } catch (error) {
        console.log('No Trending');
    }
    let cat_promises = [];

    if (Number(index) === 0) {
        let products = await db.collection('Products').where('Keywords', 'array-contains', keyword).orderBy('Name').limit(10).get();
        products.forEach(product => {
            cat_promises.push(db.collection('Category').doc(product.data().CategoryId).get());
            let discount = (100 * (product.data().Price - product.data().OfferPrice)) / product.data().Price;
            discount = Math.round(discount * 100) / 100;
            discount = String(discount) + `%`;
            temp = {
                docid: product.id,
                productid: product.id,
                Name: product.data().Name,
                Price: product.data().OfferPrice,
                Unit: product.data().PriceType,
                Mrp: product.data().Price,
                Quantity: product.data().Quantity,
                Stock: product.data().Stock,
                ImgUrls: product.data().ImgUrl,
                Discount: discount,
                Description: product.data().Description
            }
            if (Todays_Ids.includes(product.id)) {
                temp.TodaysInorNot = true;
            } else {
                temp.TodaysInorNot = false;
            }
            if (Trending_Ids.includes(product.id)) {
                temp.TrendingInorNot = true;
            } else {
                temp.TrendingInorNot = false;
            }
            data.push(temp);
        })
        let Cats = await Promise.all(cat_promises);
        let count2 = 0;
        Cats.forEach(cat => {
            data[count2].category = {
                "Name": cat.data().Name,
                "catid": cat.id
            }
            count2 += 1;
        })
    } else {
        let products = await db.collection('Products').where('Keywords', 'array-contains', keyword).orderBy('Name').get();
        products.forEach(product => {
            if (flag === 1 && count <= 10) {
                cat_promises.push(db.collection('Category').doc(product.data().CategoryId).get());
                let discount = (100 * (product.data().Price - product.data().OfferPrice)) / product.data().Price;
                discount = Math.round(discount * 100) / 100;
                discount = String(discount) + `%`;
                temp = {
                    docid: product.id,
                    productid: product.id,
                    Name: product.data().Name,
                    Price: product.data().OfferPrice,
                    Unit: product.data().PriceType,
                    Mrp: product.data().Price,
                    Quantity: product.data().Quantity,
                    Stock: product.data().Stock,
                    ImgUrls: product.data().ImgUrl,
                    Discount: discount,
                    Description: product.data().Description
                }
                if (Todays_Ids.includes(product.id)) {
                    temp.TodaysInorNot = true;
                } else {
                    temp.TodaysInorNot = false;
                }
                if (Trending_Ids.includes(product.id)) {
                    temp.TrendingInorNot = true;
                } else {
                    temp.TrendingInorNot = false;
                }
                data.push(temp);
                count += 1;
            }
            if (product.id === String(index)) {
                flag = 1;
            }
        })
        let Cats = await Promise.all(cat_promises);
        let count2 = 0;
        Cats.forEach(cat => {
            data[count2].category = {
                "Name": cat.data().Name,
                "catid": cat.id
            }
            count2 += 1;
        });
    }
    res.json(data);
})

// link : https://console.firebase.google.com/v1/r/project/deliverydebug/firestore/indexes?create_composite=Ck5wcm9qZWN0cy9kZWxpdmVyeWRlYnVnL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9Qcm9kdWN0cy9pbmRleGVzL18QARoMCghLZXl3b3JkcxgBGggKBE5hbWUQARoMCghfX25hbWVfXxAB

