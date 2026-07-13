const http = require('http');
const express = require('express');
const cors = require('cors');
const middlewareError = require('./middlewares/error-handler');
const v1Router = require('./routes/v1');
const { connectMongo } = require('./lib/mongo');
const { registerMongoSyncHooks } = require('./lib/mongo-sync');
const { initSocket } = require('./lib/socket');
const { on, ANALYTICS_INGESTED } = require('./lib/utils/events-bus');
const { scheduleAnalyticsPush } = require('./lib/socket/analytics/push');

require('./models/associations');

const app = express();
const PORT = process.env.PORT || 3000;

const SDK_PATH_PREFIXES = ['/api/v1/events', '/api/v1/sessions', '/api/v1/collect'];
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const backofficeCors = cors({ origin: FRONTEND_URL });

app.use((req, res, next) => {
    if (SDK_PATH_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
        return next();
    }
    return backofficeCors(req, res, next);
});

// Limit raised to accommodate SDK payloads that embed a base64 page screenshot.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.get('/', (_req, res) => {
    res.json({ message: 'Decode Analytics API', api: '/api/v1' });
});

app.use('/api/v1', v1Router);

app.use(middlewareError);

async function bootstrap() {
    await connectMongo();
    registerMongoSyncHooks();

    const server = http.createServer(app);
    initSocket(server, { corsOrigin: FRONTEND_URL });
    on(ANALYTICS_INGESTED, scheduleAnalyticsPush);

    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log('API REST: /api/v1/');
        console.log('WebSocket: /notifications, /chat, /analytics');
    });
}

bootstrap().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
