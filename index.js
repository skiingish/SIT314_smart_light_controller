// Created by Sean Corcoran
// Light Controller Backend APIs
// For SIT314 - Final Project - Deakin University - 2021

// Include the packages.
const express = require("express");
const bodyParser = require("body-parser");
const config = require('config');
const mongoose = require('mongoose');
// Import the DB model.
const Devices = require('./models/devices');
// Include the custom functions.
const mqttPublish = require('./mqttPublish');
const customUtil = require('./middleware/custom-utils');
const trafficLogger = require('./middleware/trafficLogger');

// Use express.
const app = express();

// Middleware.
app.use(customUtil);
//app.use(trafficLogger);
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

// MongoDB connection string - add the username, password, to connection string.
const connectString = `mongodb+srv://smartlightControllerBackendProd:Ptt9jcTpKT6dJncp@sit314.ljihj.mongodb.net/sit314?retryWrites=true&w=majority`;

// Connect to the devices MongoDB.
mongoose.connect(connectString, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log('Connected to db'))
.catch(err => {
    // Show db connection error on the console. 
    console.log('Could not connect to the db. ', err);
});

// -- GET REQUESTS --

// Default GET route.
app.get('/', (req, res) => {
    res.send("Hello this is the smart light controller, I am online :)");
});

// Get info for a single device.
app.get('/device/:id', async(req, res) => {
    result = await lookupDevice(req.params.id);
    if (result.length > 0 )
    {
        res.send(result);
    }
    else
    {
        res.send("Failed to lookup device");
    }
})

// LIST ROUTES

// Get the list of all apartments.
app.get('/list/apartments/', async(req, res) => {
        // Get the list of all unique apartments.
        const apartments = await Devices
        .find().distinct('apartment_id')
        .catch((err) => {
            console.log(err);
            res.send(err);
        });
    
        res.send(apartments);
})

// Get the list of all rooms in an apartment.
app.get('/list/rooms/apartment/:id', async(req, res) => {
        // Get the list of all unique rooms in a apartment.
        const rooms = await Devices
        .find({apartment_id: req.params.id}).distinct('room_id')
        .catch((err) => {
            console.log(err);
            res.send(err);
        });
    
        res.send(rooms);
})

// Get the list of all devices in a apartment.
app.get('/list/devices/apartment/:id', async(req, res) => {
        // Get the list of all unique devices in a apartment.
        const devices = await Devices
        .find({apartment_id: req.params.id}).distinct('device_id')
        .catch((err) => {
            console.log(err);
            res.send(err);
        });
    
        res.send(devices);
})

// Get the list of all lights in a apartment.
app.get('/list/lights/apartment/:id', async(req, res) => {
    // Get the list of all lights in a apartment.
    const lights = await Devices
        .find({apartment_id: req.params.id, device_type: "light"}).distinct('device_id')
        .catch((err) => {
            console.log(err);
            res.send(err);
        });
    
        res.send(lights);
})

// Get the list of all devices in a room.
app.get('/list/devices/room/:id', async(req, res) => {
    // Get the list of all unique devices in a room.    
    const devices = await Devices
        .find({room_id: req.params.id}).distinct('device_id')
        .catch((err) => {
            console.log(err);
            res.send(err);
        });
    
        res.send(devices);
})

// Get the list of all lights in a room.
app.get('/list/lights/room/:id', async(req, res) => {
    // Get the list of all lights in a room.
    const lights = await Devices
        .find({room_id: req.params.id, device_type: "light"}).distinct('device_id')
        .catch((err) => {
            console.log(err);
            res.send(err);
        });
    
        res.send(lights);
})

// Get the list of all devices.
app.get('/list/devices/', async(req, res) => {
    // Look up all devices, send all info.    
    const devices = await Devices
        .find()
        .catch((err) => {
            console.log(err);
            res.send(err);
        });
    
        res.send(devices);
})

// Get the list of all lights.
app.get('/list/lights/', async(req, res) => {
    // Look up all lights, send all info.
    const lights = await Devices
    .find({device_type: "light"})
    .catch((err) => {
        console.log(err);
        res.send(err);
    });

    res.send(lights);
})

// Get the list of all switch type devices.
app.get('/list/switches/', async(req, res) => {
    // Look up all switches, send all info.
    const switches = await Devices
    .find({device_type: "switch"})
    .catch((err) => {
        console.log(err);
        res.send(err);
    });

    res.send(switches);
})

// -- POST REQUESTS --

// ADD ITEMS

// Add New Device Route 
app.post('/newdevice/', async(req, res) => {
    // Log the incoming req body (the customer sign up form submission).
    //console.log(req.body);

    // Create the require MQTT Topic
    req.body.mqtt_topic = `/scorlights/${req.body.apartment_id}/${req.body.room_id}/${req.body.device_id}/`

    // Create new customer object with the Mongo DB customers model from the post body.
    const newDevice = new Devices((req.body));

    // Try to save the new device submission to the DB.
    newDevice.save().then(doc => {
        // Log the saved data.
        console.log(doc);
    }).then(() => {
        res.send(req.body);
        
        
    }).catch(err => {
        // For each error in the errors key pairs log to console.
        //for (const [key, value] of Object.entries(err.errors)) {
        //    console.log(`${key}: ${value}`);
        //}
        res.send(err.message);
    });
});

// LIGHT CONTROLS

// Toggle Light Route
app.post('/lights/:id/toggle/', async(req, res) => {
    // Log the incoming req body.
    //console.log(req.body);

    // Look up the device ID, find it's mqtt path
    var deviceTopic = await getDeviceMQTT(req.params.id)
        .catch(() => {
            console.log('Failed to lookup MQTT topic for device');
        });

    // Pub to the devices MQTT path.
    mqttPublish(deviceTopic, "toggle");

    res.send(`Toggle light ${req.params.id}`);
});

// Change State Light Route
app.post('/lights/:id/changestate/', async(req, res) => {
    // Log the incoming req body.
    //console.log(req.body);

    // Look up the device ID, find it's mqtt path
    var deviceTopic = await getDeviceMQTT(req.params.id)
        .catch(() => {
            console.log('Failed to lookup MQTT topic for device');
        });

    // Pub to the devices MQTT path.
    mqttPublish(deviceTopic, req.body.stateChange);

    res.send(`Toggle light ${req.params.id}`);
});

// Toggle a room
app.post('/lights/room/:id/toggle/', async (req, res) => {
    // Log the incoming req body.
    //console.log(req.body);

    // Check the room does exist in the apartment ID thats passed in.
    var correctTopic = await checkRoomInApartment(req.body.apartment_id, req.params.id)
        .catch(() => {
            console.log(`Failed to check MQTT topic for room: ${req.params.id}`);
        });
    
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
    //console.log(req.body);

    // Check the room does exist in the apartment ID thats passed in.
    var devices = await allLightsInRoom(req.body.apartment_id, req.params.id)
        .catch(() => {
            console.log(`Failed to check MQTT topic for room: ${req.params.id}`);
        });
    
    // If it is a correct topic, room exists in the apartment ID.
    if (devices.length > 0)
    {
        // Send message to all devices found in room in the apartment.
        for (let i = 0; i < devices.length; i++) {
            mqttPublish(devices[i].mqtt_topic, "toggle");
        }

        res.send(`Toggled Room: ${req.params.id} in Apartment: ${req.body.apartment_id}`);
    }
    else
    {
        res.send(`Toggled Room: ${req.params.id} does not exist in apartment: ${req.body.apartment_id}`);
    }

});

// Change a state on a room version 2.
app.post('/lightsV2/room/:id/changestate/', async (req, res) => {
    // Log the incoming req body.
    //console.log(req.body);

    // Check the room does exist in the apartment ID thats passed in.
    var devices = await allLightsInRoom(req.body.apartment_id, req.params.id)
        .catch(() => {
            console.log(`Failed to check MQTT topic for room: ${req.params.id}`);
        });
    
    // If it is a correct topic, room exists in the apartment ID.
    if (devices.length > 0)
    {
        // Send message to all devices found in room in the apartment.
        for (let i = 0; i < devices.length; i++) {
            mqttPublish(devices[i].mqtt_topic, req.body.stateChange);
        }

        res.send(`Toggled Room: ${req.params.id} in Apartment: ${req.body.apartment_id}`);
    }
    else
    {
        res.send(`Toggled Room: ${req.params.id} does not exist in apartment: ${req.body.apartment_id}`);
    }

});

// Toggle all lights in an apartment. 
app.post('/lights/apartment/:id/toggle/', async(req, res) => {
    // Log the incoming req body.
    //console.log(req.body);

    // Check the room does exist in the apartment ID thats passed in.
    var correctTopic = await checkApartmentExists(req.params.id)
        .catch(() => {
            console.log(`Failed to check MQTT topic for apartment: ${req.params.id}`);
        });
    
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

// Toggle a apartment version 2.
app.post('/lightsV2/apartment/:id/toggle/', async (req, res) => {
    // Log the incoming req body.
    //console.log(req.body);

    // Get the MQTT topics for the lights in the inputted apartment.
    var devices = await allLightsInApartment(req.params.id)
        .catch(() => {
            console.log(`Failed to check MQTT topics for apartment: ${req.params.id}`);
        });
    
    // If it is a correct topic, room exists in the apartment ID.
    if (devices.length > 0)
    {
        // Send message to all lights in the apartment.
        for (let i = 0; i < devices.length; i++) {
            mqttPublish(devices[i].mqtt_topic, "toggle");
        }

        res.send(`Toggled lights in apartment: ${req.params.id}`);
    }
    else
    {
        res.send(`Failed find lights In: ${req.params.id}`);
    }

});

// Change state on a apartment version 2.
app.post('/lightsV2/apartment/:id/changestate/', async (req, res) => {
    // Log the incoming req body.
    //console.log(req.body);

    // Get the MQTT topics for the lights in the inputted apartment.
    var devices = await allLightsInApartment(req.params.id)
        .catch(() => {
            console.log(`Failed to check MQTT topics for apartment: ${req.params.id}`);
        });
    
    // If it is a correct topic, room exists in the apartment ID.
    if (devices.length > 0)
    {
        // Send message to all lights in the apartment.
        for (let i = 0; i < devices.length; i++) {
            mqttPublish(devices[i].mqtt_topic, req.body.stateChange);
        }

        res.send(`Toggled lights in apartment: ${req.params.id}`);
    }
    else
    {
        res.send(`Failed find lights In: ${req.params.id}`);
    }

});

// Toggle all lights. (Master Contorl)
app.post('/lights/toggle/all', async(req, res) => {
    //console.log(req.body);
    var topic = `/scorlights/`;
    mqttPublish(topic, req.body.message);
    res.send(`Toggled all with: ${req.body.message}`);
});

// Toggle all lights. (Master Contorl) Version 2
app.post('/lightsV2/toggle/all', async(req, res) => {
    //console.log(req.body);
    var topic = `/scorlights/`;
    mqttPublish(topic, "toggle");
    res.send(`Toggled all lights`);
});

// Change state all lights. (Master Contorl) Version 2
app.post('/lightsV2/changestate/all', async(req, res) => {
    //console.log(req.body);
    var topic = `/scorlights/`;
    mqttPublish(topic, req.body.stateChange);
    res.send(`Toggled all lights`);
});

// -- UPDATE REQUESTS --

// Update a device
app.patch('/updatedevice/:id', async(req, res) => {
    // Update the required device with the specified fields.
    const result = await Devices.updateOne(
        {device_id: req.params.id},
        {$set: req.body},
        (err) => {
            if (err) {res.send(err)}
        }
    );
    
    // Look up the device that was just updated, return the newly updated device as the result.
    Devices.findOne({device_id: req.params.id}, (err, foundDevice) => {
        if (foundDevice) {
                // Set the new topic 
                let mqtt_topic = `/scorlights/${foundDevice.apartment_id}/${foundDevice.room_id}/${foundDevice.device_id}/`
                // Update the topic on the DB.
                let updateMQTT = updateMqttTopic(req.params.id, mqtt_topic);
                // Send back the call
                if (updateMQTT) {
                    foundDevice.mqtt_topic = mqtt_topic;
                    res.send(foundDevice);
                }
                else{
                    res.send('Could not update devices MQTT topic, please try again.');
                }
                
        } 
        else {
            res.send('Could not find updated device')
        }
    });
});

// Change a light's current state as stored in the database. (Must be a 0 or a 1)
app.patch('/updatedevice/updatestate/:id', async(req, res) => {
    let newState = parseInt(req.body.current_state);
    
    // Make sure the input is vaild.
    if (newState < 0 || newState > 1)
    {
        res.send("Updated state must be inputted as a 1 or a 0");
    }

    // Update the required device's state (on or off).
    const result = await Devices.updateOne(
        {device_id: req.params.id},
        {current_state: newState},
        (err) => {
            if (err) {res.send(err)}
        }
    ).then(res.send(`Changed state of ${req.params.id} to ${req.body.current_state}`))
})

// -- DELETE REQUESTS --

// Delete a device
app.delete('/deletedevice/:id/', async(req, res) => {
    // Delete the required device.     
    Devices.deleteOne({device_id: req.params.id}, (err) => {
        console.log(`trying to delete: ${req.params.id}`);
        if (err) {res.send(err);}
        else 
        {
            console.log(`Deleted: ${req.params.id}`);
            res.send(`Deleted ${req.params.id}`);
        }

    });
});

// Delete all!
app.delete('/deletedevices/', async(req, res) => {
        // Delete all! (Mass wipe)
    Devices.deleteMany((err) => {
        if (err) {res.send(err)}
        else res.send('Deleted all devices');
    });
});

// HELPER LOOKUP FUNCTIONS

// Look up a single device in the db.
async function lookupDevice(device_id) {
    const device = await Devices
    .find({device_id: device_id})
    .catch((err) => {
        console.log(err);
        return success;
    });

    return device;
}

// find the MQTT topic for a passed device id.
async function getDeviceMQTT(device_id) {
    const device = await Devices
    .find({device_id: device_id})
    .catch((err) => {
        console.log(err);
        return success;
    });

    //console.log(`MQTT Topic for device ID: ${device_id} is: ${device[0].mqtt_topic}`);

    return device[0].mqtt_topic;
}

// Check to see if the room does belong to the correct apartment.
async function checkRoomInApartment(apartment_id, room_id) {
    
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
        //console.log(`result: ${result[0]}`);
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
       console.log(`Room ${room_id} in apartment: ${apartment_id} contains no lights `);
       return [];
    }
}

// List of all lights in an apartment
async function allLightsInApartment(apartment_id) {
    // Look up at the apartment and see if the room id exist in that apartment.
    const result = await Devices
    .find({apartment_id: apartment_id, device_type: "light"})
    .catch((err) => {
        console.log(err);
        return success;
    });

    // If lights are found in the apartment return true.
    // Else query invaild.
    if (result.length > 0)
    {
        //console.log(`result: ${result[0]}`);
        return result;
    }
    else
    {
       console.log("Apartment contains no lights");
       return [];
    }
}

// Check to see apartment id does exist.
async function checkApartmentExists(apartment_id) {
    
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
        //console.log(`result: ${result[0]}`);
        return true;
    }
    else
    {
       console.log("Apartment ID does not exist");
       return false;
    }
}

// Update the MQTT topic
async function updateMqttTopic (device_id, mqtt_topic) {
    
    // Update the required device's MQTT topic.
    const result = await Devices.updateOne(
        {device_id: device_id},
        {mqtt_topic: mqtt_topic},
        (err) => {
            if (err) {res.send(err)}
        }
    ).then( () => {return true})
    .catch( () => {return false});
}

// Set the port.
let PORT = process.env.PORT; 

if (process.env.PORT == null)
{
    PORT = 8000;
}

// Console output port open.
app.listen(PORT, console.log(`Listening on port ${PORT}`));