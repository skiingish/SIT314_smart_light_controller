// Include the MQTT package.
const mqtt = require('mqtt');

function mqttPublish(topic, message) {
    // Created a MQTT client connected to the hivemq service. 
    const client = mqtt.connect("mqtt://broker.hivemq.com:1883");

    // Connect > once connected publish the message under the set topic.
    client.on('connect', () => {
        // Display message the service is connected. 
        //console.log(`MQTT connected, publishing message: '${message}' on topic: '${topic}'`);

        // Publish data to the MQTT service on the required topic and with the message. 
        client.publish(topic, message);

        // Close the client. 
        client.end();
    });
}

module.exports = mqttPublish;

