const functions = require('firebase-functions');
const admin = require('firebase-admin');
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

let express = require('express');
let cors = require('cors');

let analysis = express();
analysis.use(cors({ origin: true }));
analysis.use(adminVerification);

analysis.post('/Details', async (req, res) => {
    let Date = nowDate();

    let Total_Orders = await db.collection('Orders').doc('Order_Info').get();
    let Todays_Orders = await db.collection('Orders').where('Date', '==', Date).get();
    let Data = {};
    Data.Total_Orders = Total_Orders.data().SuccessfulOrders;
    Data.Total_Revenue = Total_Orders.data().TotalRevenue;
    Data.Total_Revenue = Math.round(Data.Total_Revenue * 100) / 100;
    Data.Todays_Orders = 0;
    Data.Todays_Revenue = 0;
    Todays_Orders.forEach(order => {
        if ((order.data().Payment_Type === 'Online' && order.data().Status !== 'error' && order.data().Status !== 'cancelled' && order.data().Status !== 'issued') || (order.data().Payment_Type === 'Offline' && order.data().Status === 'delivered')) {
            Data.Todays_Orders += 1;
            Data.Todays_Revenue += order.data().TaxedTotal;
        }
    })
    Data.Todays_Revenue = Math.round(Data.Todays_Revenue * 100) / 100;
    res.json(Data);
})

analysis.post('/Daily', async (req, res) => {
    let Index = req.body.Index;

    let date;
    let dates = [];
    let i = 0;

    if (Number(Index) === 0) {
        date = nowDate();
    } else {
        date = DecrementDate(Index);
    }

    let promises = [];
    for (i = 0; i < 10; i++) {
        promises.push(db.collection('Orders').where('Date', '==', date).orderBy('Index', 'desc').get());
        dates.push(date);
        date = DecrementDate(date);
    }
    let Classiffied_Orders = await Promise.all(promises);
    let Days = [];
    let count = 0;
    Classiffied_Orders.forEach(orders => {
        let Day = {};
        Day.Orders = 0;
        Day.Revenue = 0;
        Day.Date = lZeroDate(dates[count]);
        count += 1;
        orders.forEach(order => {
            if ((order.data().Payment_Type === 'Online' && order.data().Status !== 'error' && order.data().Status !== 'cancelled' && order.Status !== 'issued') || (order.data().Payment_Type === 'Offline' && order.data().Status === 'delivered')) {
                console.log(order.id)
                Day.Orders += 1;
                Day.Revenue += order.data().TaxedTotal;
            }
        });
        Day.Revenue = Math.round(Day.Revenue * 100) / 100;
        Days.push(Day);
    });
    res.json(Days);
})

analysis.post('/Weekly', async (req, res) => {
    let Index = req.body.Index;
    let date = nowDate();
    let Data = {};
    Data.Weeks = [];
    // let initial_size = new Date().getDay() + 1;
    // if (Index !== 0) {
    //     initial_size = 7;
    // }

    // let promises = [];
    // for (i = 0; i < 10; i++) {
    //     if (i === 0) {
    //         promises.push(Weekly_function(Index))
    //         for (i = 0; i < initial_size; i++) {
    //             date = DecrementDate(date)
    //         }
    //     } else {
    //         for (i = 0; i < 7; i++) {
    //             date = DecrementDate(date)
    //         }
    //         promises.push(Weekly_function(date))
    //     }
    // }
    // let Weekly = await Promise.all(promises);
    // console.log(Weekly.length);
    // Weekly.forEach(Week_Data => {
    //     Data.Weeks.push(Week_Data);
    //     Data.Index = Week_Data.StartDate;
    //     Index = Week_Data.StartDate;
    // })
    for (i = 0; i < 10; i++) {
        let Week_Data = await Weekly_function(Index);
        Data.Weeks.push(Week_Data);
        Data.Index = Week_Data.StartDate;
        Index = Week_Data.StartDate;
    }
    res.json(Data.Weeks);

});
// let unicall = 0;
async function Weekly_function(Index) {
    let date;
    let dates = [];
    let i = 0;
    let loop_size;
    let date_ist = new Date();
    let currentOffset = date_ist.getTimezoneOffset();
    let ISTOffset = 330;
    date_ist = new Date(date_ist.getTime() + (ISTOffset + currentOffset) * 60000);

    if (Number(Index) === 0) {
        date = nowDate();
        loop_size = date_ist.getDay() + 1;
    } else {
        date = DecrementDate(Index);
        loop_size = 7;
    }
    // console.log(`Loop size : ${loop_size}`);
    // console.log(unicall);
    // unicall += 1;

    let promises = [];
    for (i = 0; i < loop_size; i++) {
        promises.push(db.collection('Orders').where('Date', '==', date).orderBy('Index', 'desc').get());
        dates.push(date);
        date = DecrementDate(date);
    }
    let Classiffied_Orders = await Promise.all(promises);
    let Days = [];
    let count = 0;
    Classiffied_Orders.forEach(orders => {
        let Day = {};
        Day.Orders = 0;
        Day.Revenue = 0;
        Day.Date = dates[count];
        count += 1;
        orders.forEach(order => {
            if ((order.data().Payment_Type === 'Online' && order.data().Status !== 'error' && order.data().Status !== 'cancelled' && order.Status !== 'issued') || (order.data().Payment_Type === 'Offline' && order.data().Status === 'delivered')) {
                Day.Orders += 1;
                Day.Revenue += order.data().TaxedTotal;
            }
        });
        // console.log(`Day : ${Day.Revenue}`);
        Days.push(Day);
    });
    // console.log(`Days : ${Days[1].Revenue}`)
    let flag = 1;
    let Week = {};
    Week.Orders = 0;
    Week.Revenue = 0;
    Days.forEach(Day => {
        if (flag === 1) {
            Week.EndDate = Day.Date;
            flag = 0;
        }
        Week.Orders += Day.Orders;
        Week.Revenue += Day.Revenue;
        Week.StartDate = Day.Date;
    });
    Week.Date = `${lZeroDate(Week.StartDate)} to ${lZeroDate(Week.EndDate)}`;
    Week.Revenue = Math.round(Week.Revenue * 100) / 100;
    return Week;
}

analysis.post('/Monthly', async (req, res) => {
    let Index = req.body.Index;

    let months = []
    let Year;
    let Month;
    let i;
    let date_ist = new Date();
    let currentOffset = date_ist.getTimezoneOffset();
    let ISTOffset = 330;
    date_ist = new Date(date_ist.getTime() + (ISTOffset + currentOffset) * 60000);

    if (Number(Index) === 0) {
        Year = date_ist.getFullYear();
        Month = date_ist.getMonth() + 1;
    } else {
        Year = Number(Index);
        Month = 12;
    }

    let promises = [];

    for (i = Month; i > 0; i--) {
        promises.push(db.collection('Orders').where('Year', '==', Year).where('Month', '==', i).get())
        months.push(i);
    }
    let Classiffied_Orders = await Promise.all(promises);
    let Data = {};
    Data.Index = Year - 1;
    Data.Details = [];
    let count = 0;
    Classiffied_Orders.forEach(orders => {
        let Month = {};
        Month.Orders = 0;
        Month.Revenue = 0;
        Month.Month = Get_Month(months[count]);
        Month.Year = Year;
        count += 1;
        orders.forEach(order => {
            if ((order.data().Payment_Type === 'Online' && order.data().Status !== 'error' && order.data().Status !== 'cancelled' && order.Status !== 'issued') || (order.data().Payment_Type === 'Offline' && order.data().Status === 'delivered')) {
                Month.Orders += 1;
                Month.Revenue += order.data().TaxedTotal;
            }
        });
        Month.Date = `${Month.Month} ${Month.Year}`;
        Month.Revenue = Math.round(Month.Revenue * 100) / 100;
        Data.Details.push(Month);
    });
    res.json(Data.Details);


})

exports.Analysis = functions.https.onRequest(analysis);

//link: https://console.firebase.google.com/v1/r/project/deliverydebug/firestore/indexes?create_composite=Ckxwcm9qZWN0cy9kZWxpdmVyeWRlYnVnL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9PcmRlcnMvaW5kZXhlcy9fEAEaCAoERGF0ZRABGgkKBUluZGV4EAIaDAoIX19uYW1lX18QAg



//other supposting functions 

//current date
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

//decrement date
function DecrementDate(date) {
    let d_m_y = date.split('/');
    let day = Number(d_m_y[0]);
    let month = Number(d_m_y[1]);
    let year = Number(d_m_y[2]);
    if (day === 1) {
        if (month === 1) {
            month = 12;
            year -= 1;
        } else {
            month -= 1;
        }
        if (month === 1 || month === 3 || month === 5 || month === 7 || month === 8 || month === 10 || month === 12) {
            day = 31
        } else if (month === 2) {
            if (checkLeapYear(year)) {
                day = 29;
            } else {
                day = 28;
            }
        } else {
            day = 30;
        }
    } else {
        day -= 1;
    }
    if (Number(day) < 10) {
        day = '0' + String(day);
    }
    if (Number(month) < 10) {
        month = '0' + String(month);
    }
    let date_string = String(day) + '/' + String(month) + '/' + String(year);
    return date_string;
}

//leap year check
function checkLeapYear(year) {
    //three conditions to find out the leap year
    if ((0 == year % 4) && (0 != year % 100) || (0 == year % 400)) {
        return true;
    } else {
        return false;
    }
}

//Month return function 
function Get_Month(num) {
    if (num === 1) {
        return 'January'
    } else if (num === 2) {
        return 'February'
    } else if (num === 3) {
        return 'March'
    } else if (num === 4) {
        return 'April'
    } else if (num === 5) {
        return 'May'
    } else if (num === 6) {
        return 'June'
    } else if (num === 7) {
        return 'July'
    } else if (num === 8) {
        return 'August'
    } else if (num === 9) {
        return 'September'
    } else if (num === 10) {
        return 'October'
    } else if (num === 11) {
        return 'November'
    } else if (num === 12) {
        return 'December'
    }
}

//date left side zero
function lZeroDate(date) {
    // let date_split = date.split('/');
    // if (date_split[0] < 10) {
    //     return `0${date}`;
    // } else {
    //     return date;
    // }
    return date;
}

//week return function
// function week(date) {
//     let d_m_y = date.split('/');
//     let day = Number(d_m_y[0]);
//     if (day > 0 && day < 8) {
//         return 1;
//     } else if (day > 7 && day < 15) {
//         return 2;
//     } else if (day > 14 && day < 22) {
//         return 2;
//     } else if (day > 21 && day < 29) {
//         return 4;
//     }
// }