// Created by Sean Corcoran
// Light Controller Backend
// For SIT314 - Final Project - Deakin University - 7/2021

const express = require("express");
const bodyParser = require("body-parser");
const config = require('config');
const mongoose = require('mongoose');
const Devices = require('./models/devices');
const mqttPublish = require('./mqttPublish');

// Use express.
const app = express();

// Middleware.
app.use(bodyParser.urlencoded({extended:true}));
//app.use(express.static(__dirname + '/public'));

// MongoDB - add the username, password, to connection string.
const connectString = `mongodb+srv://${config.get('db.user')}:${config.get('db.password')}@sit314.ljihj.mongodb.net/sit314?retryWrites=true&w=majority`;

// Default GET route.
app.get('/', (req, res) => {
    //res.render('register.ejs', { err: [], passwordMatchError: false, entryValues: null });
    res.send("Hello this is the smart light controller");
});

// Add New Device Route 
app.post('/newdevice/', async(req, res) => {

    // Log the incoming req body (the customer sign up form submission).
    console.log(req.body);

    req.body.mqtt_topic = `/scorlights/${req.body.apartment_id}/${req.body.room_id}/${req.body.device_id}/`

    
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
        res.send('Saved New Device: ', req.body);
        
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

// Toggle Light Route
app.post('/lights/:id/toggle/', async(req, res) => {
    // Log the incoming req body.
    console.log(req.body);

    // Connect to the MongoDB.
    mongoose.connect(connectString, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => console.log('Connected to db'))
        .catch(err => {
            // Show db connection error on the console. 
            console.log('Could not connect to the db. ', err);
        });

    // Look up the device ID, find it's mqtt path
    var deviceTopic = await getDeviceMQTT(req.params.id)
        .catch(() => {
            console.log('Failed to lookup MQTT topic for device');
        });
    
    // Close the db connection.
    mongoose.connection.close();

    // Pub to the devices MQTT path.
    mqttPublish(deviceTopic, req.body.message);

    res.send(`Toggle light ${req.params.id}`);
});

// Toggle a room
app.post('/lights/room/:id/toggle/', async (req, res) => {
    // Log the incoming req body.
    console.log(req.body);

    // Connect to the MongoDB.
    mongoose.connect(connectString, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => console.log('Connected to db'))
        .catch(err => {
            // Show db connection error on the console. 
            console.log('Could not connect to the db. ', err);
        });

    // Check the room does exist in the apartment ID thats passed in.
    var correctTopic = await checkRoomMQTT(req.body.apartment_id, req.params.id)
        .catch(() => {
            console.log(`Failed to check MQTT topic for room: ${req.params.id}`);
        });

    // Close the db connection.
    mongoose.connection.close();
    
    // If it is a correct topic, room exists in the apartment ID.
    if (correctTopic)
    {
        // Set the topic. 
        var topic = `/scorlights/${req.body.apartment_id}/${req.params.id}/`
        // Pub to the room MQTT path.
        mqttPublish(topic, req.body.message);
        res.send(`Toggled Room: ${req.params.id} in Apartment: ${req.body.apartment_id} with message ${req.body.message}`);
    }
    else
    {
        res.send(`Toggled Room: ${req.params.id} does not exist in apartment: ${req.body.apartment_id}`);
    }

});

// Toggle a room version 2.
app.post('/lightsV2/room/:id/toggle/', async (req, res) => {
    // Log the incoming req body.
    console.log(req.body);

    // Connect to the MongoDB.
    mongoose.connect(connectString, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => console.log('Connected to db'))
        .catch(err => {
            // Show db connection error on the console. 
            console.log('Could not connect to the db. ', err);
        });

    // Check the room does exist in the apartment ID thats passed in.
    var devices = await allLightsInRoom(req.body.apartment_id, req.params.id)
        .catch(() => {
            console.log(`Failed to check MQTT topic for room: ${req.params.id}`);
        });

    // Close the db connection.
    mongoose.connection.close();
    
    // If it is a correct topic, room exists in the apartment ID.
    if (devices.length > 0)
    {
        console.log(devices);

        // TODO create a for loop to send a MMQT message to each device in the returned.
        
        // Pub to the room MQTT path.
        //mqttPublish(topic, req.body.message);
        res.send(`Toggled Room: ${req.params.id} in Apartment: ${req.body.apartment_id} with message ${req.body.message}`);
    }
    else
    {
        res.send(`Toggled Room: ${req.params.id} does not exist in apartment: ${req.body.apartment_id}`);
    }

});

// Toggle all lights in an apartment. 
app.post('/lights/apartment/:id/toggle/', async(req, res) => {
    // Log the incoming req body.
    console.log(req.body);

    // Connect to the MongoDB.
    mongoose.connect(connectString, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => console.log('Connected to db'))
        .catch(err => {
            // Show db connection error on the console. 
            console.log('Could not connect to the db. ', err);
        });

    // Check the room does exist in the apartment ID thats passed in.
    var correctTopic = await checkApartmentMQTT(req.params.id)
        .catch(() => {
            console.log(`Failed to check MQTT topic for apartment: ${req.params.id}`);
        });

    // Close the db connection.
    mongoose.connection.close();
    
    // If it is a correct topic, apartment ID exists.
    if (correctTopic)
    {
        // Set the topic. 
        var topic = `/scorlights/${req.params.id}/`
        // Pub to the room MQTT path.
        mqttPublish(topic, req.body.message);
        res.send(`Toggled Apartment: ${req.params.id} with message ${req.body.message}`);
    }
    else
    {
        res.send(`Toggled Apartment: ${req.params.id} does not exist`);
    }
});

// Toggle all lights. (Master Contorl)
app.post('/lights/toggle/all', async(req, res) => {
    console.log(req.body);
    var topic = `/scorlights/`;
    mqttPublish(topic, req.body.message);
    res.send(`Toggled all with: ${req.body.message}`);
});

// find the full path for a passed device id.
async function getDeviceMQTT(device_id) {
    const device = await Devices
    .find({device_id: device_id})
    .catch((err) => {
        console.log(err);
        return success;
    });

    console.log(`MQTT Topic for device ID: ${device_id} is: ${device[0].mqtt_topic}`);

    return device[0].mqtt_topic;
}

// Check to see if the room does belong to the correct apartment.
async function checkRoomMQTT(apartment_id, room_id) {
    
    // Look up at the apartment and see if the room id exist in that apartment.
    const result = await Devices
    .find({apartment_id: apartment_id, room_id: room_id})
    .catch((err) => {
        console.log(err);
        return success;
    });

    // If room is found to be located in the required apartment return true.
    // Else query invaild.
    if (result.length > 0)
    {
        console.log(`result: ${result[0]}`);
        return true;
    }
    else
    {
       console.log("room not located in passed apartment_id");
       return false;
    }
}

// List of all lights in a room.
async function allLightsInRoom(apartment_id, room_id) {
    
    // Look up at the apartment and see if the room id exist in that apartment.
    const result = await Devices
    .find({apartment_id: apartment_id, room_id: room_id, device_type: "light"})
    .catch((err) => {
        console.log(err);
        return success;
    });

    // If room is found to be located in the required apartment return true.
    // Else query invaild.
    if (result.length > 0)
    {
        //console.log(`result: ${result[0]}`);
        return result;
    }
    else
    {
       console.log("Room Contains No Lights");
       return [];
    }
}

// Check to see apartment id does exist.
async function checkApartmentMQTT(apartment_id) {
    
    // Look up at the apartment and see if the room id exist in that apartment.
    const result = await Devices
    .find({apartment_id: apartment_id})
    .catch((err) => {
        console.log(err);
        return success;
    });

    // If apartment ID found return true.
    // Else query invaild.
    if (result.length > 0)
    {
        console.log(`result: ${result[0]}`);
        return true;
    }
    else
    {
       console.log("Apartment ID does not exist");
       return false;
    }
}
// Set the port.
const PORT = process.env.PORT || config.get('port');

// Console output port open.
app.listen(PORT, console.log(`Listening on port ${PORT}`));