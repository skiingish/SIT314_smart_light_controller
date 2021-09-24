// Created by Sean Corcoran
// Light Controller Backend
// For SIT314 - Final Project - Deakin University - 7/2021

const express = require("express");
const bodyParser = require("body-parser");
const config = require('config');
const mongoose = require('mongoose');
const Devices = require('./models/devices');

// Use express.
const app = express();

// Middleware.
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(__dirname + '/public'));

// MongoDB - add the username, password, to connection string.
const connectString = `mongodb+srv://${config.get('db.user')}:${config.get('db.password')}@sit314.ljihj.mongodb.net/sit314?retryWrites=true&w=majority`;

// Default route.
app.get('/', (req, res) => {
    //res.render('register.ejs', { err: [], passwordMatchError: false, entryValues: null });
    res.send("Hello this is the smart light controller");
});

// Default post route (customer sign up form submission).
app.post('/newdevice/', async(req, res) => {

    // Log the incoming req body (the customer sign up form submission).
    console.log(req.body);

    req.body.mqtt_path = `/scorlights/${req.body.apartment_id}/${req.body.room_id}/${req.body.device_id}/`;
    
    // Create new customer object with the Mongo DB customers model from the post body.
    const newDevice = new Devices((req.body));

    // Connect to the MongoDB.
    mongoose.connect(connectString, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => console.log('Connected to db'))
        .catch(err => {
            // Show db connection error on the console. 
            console.log('Could not connect to the db. ', err);
            // Show the error page.
            let errorMessage = "Error connecting to database server - Please try again later.";
            res.render('errorpage.ejs', {errorDetails: errorMessage});
        });
    
    // Try to save the new customer form submission to the DB.
    newDevice.save().then(doc => {
        // Log the saved data.
        console.log(doc);
    }).then(() => {
        // Show the success page.
        //res.render('custlogin.ejs', {entryValues: newCustomer});
        //res.redirect('/custlogin');
        res.send('Saved New Device');
        
        // Close the db connection.
        mongoose.connection.close();
        
    }).catch(err => {
        // For each error in the errors key pairs log to console.
        //for (const [key, value] of Object.entries(err.errors)) {
        //    console.log(`${key}: ${value}`);
        //}
        res.send(err.message);
        // Close the db connection.
        mongoose.connection.close();
    });
});

// Default user login route.
app.get('/custlogin ', (req, res) => {
    res.render('custlogin.ejs', {incorrectPasswordError: false, entryValues: null });
});

// // Submitted a login request.
// app.post('/custlogin', async (req, res) => {
//     // Connect to the MongoDB.
//     mongoose.connect(connectString, { useNewUrlParser: true, useUnifiedTopology: true })
//         .then(() => console.log('Connected to db'))
//         .catch(err => {
//             // Show db connection error on the console. 
//             console.log('Could not connect to the db. ', err);
//             // Show the error page.
//             let errorMessage = "Error connecting to database server - Please try again later.";
//             res.render('errorpage.ejs', {errorDetails: errorMessage});
//         });
    
//     // Check for correct login from the DB.    
//     loginResult = await checkPassword(req.body.email, req.body.password)
//         .catch(() => {
//             // Failed to login.
//             loginResult = false;
//         });

//     // If vaild login show cust task page, else show the login error
//     if (loginResult) 
//     {
//         // Go to the custtask page.
//         res.redirect('/custtask');
//     }
//     else
//     {
//         res.render('custlogin.ejs', {incorrectPasswordError: true, entryValues: req.body.email});
//     }
// });

// Set the port.
const PORT = process.env.PORT || config.get('port');

// Console output port open.
app.listen(PORT, console.log(`Listening on port ${PORT}`));