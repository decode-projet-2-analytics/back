const cors = require('cors');

module.exports = function sdkCors() {
    return cors({
        // Reflects the request Origin (never "*"), so returning
        // Access-Control-Allow-Credentials: true is valid. Tolerates browsers /
        // extensions that send the request in credentialed mode.
        origin: true,
        credentials: true,
        methods: ['POST'],
        allowedHeaders: ['Content-Type', 'X-App-Id', 'X-App-Secret'],
    });
};
