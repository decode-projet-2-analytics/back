const cors = require('cors');

module.exports = function sdkCors() {
    return cors({
        origin: true,
        credentials: false,
        methods: ['POST'],
        allowedHeaders: ['Content-Type', 'X-App-Id', 'X-App-Secret'],
    });
};
