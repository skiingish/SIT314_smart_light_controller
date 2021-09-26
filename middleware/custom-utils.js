// Used to enable Cross-Origin Resource Sharing (CORS) 
// A protocol that enables scripts running on a browser client to interact with resources from a different origin.
// Helps with client testing.
function enableCORS(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
}

module.exports = enableCORS;