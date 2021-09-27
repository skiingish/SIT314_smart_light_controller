// Include the axios package
const axios = require('axios');

function trafficLogger(res, req, next) {
    // The write thingspeak channel
    const data = 1; // 1 = One API call.
    const thingSpeakWriteAPI = `https://api.thingspeak.com/update?api_key=LY58DF5CGZP2ESAF&field2=${data}`;
    axios.get(thingSpeakWriteAPI)
    .then((result) => {
        // Nothing here.
        //console.log(result);    
    })
    .catch((err) => {
        console.log("Traffic Logger Error");
        console.log(err);
    });
    next();
}

module.exports = trafficLogger;

