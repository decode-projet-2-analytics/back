const express = require('express');
const middlewareError = require('./middlewares/error-handler');
const v1Router = require('./routes/v1');
const { connectMongo } = require('./lib/mongo');
const { registerMongoSyncHooks } = require('./lib/mongo-sync');

require('./models/associations');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded());

app.get('/', (_req, res) => {
    res.json({ message: 'Decode Analytics API', api: '/api/v1' });
});

app.use('/api/v1', v1Router);

app.use(middlewareError);

async function bootstrap() {
    await connectMongo();
    registerMongoSyncHooks();

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log('API REST: /api/v1/');
    });
}

bootstrap().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
