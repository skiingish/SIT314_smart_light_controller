const mongoose = require('mongoose');

module.exports = mongoose.model('Devices', new mongoose.Schema({
    device_id: {
        type: String,
        trim: true,
        required: [true, "device_ID can't be blank"],
        unique: [true, "can't have the same device entered more then once"] 
    },
    device_name: {
        type: String,
        trim: true,
        required: [true, "device name can't be blank"]
    },
    device_type: {
        type: String,
        trim: true,
        required: [true, "device_type can't be blank"] 
    },
    room_id: {
        type: String,
        trim: true,
        required: [true, "room id can't be blank"] 
    },
    room_name: {
        type: String,
        trim: true
    },
    apartment_id: {
        type: String,
        trim: true,
        required: [true, "apartment id can't be blank"]
    },
    apartment_name: {
        type: String,
        trim: true
    },
    mqtt_topic: {
        type: String,
        trim: true,
        required: [true, "path can't be blank"]
    },
    current_state: {
        type: String,
        trim: true
    },
    target: {
        type: String,
        trim: true
    }
}));