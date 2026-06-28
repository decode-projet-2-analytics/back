const { Router } = require('express');
const { mongoose } = require('../../lib/mongo');
const connection = require('../../lib/db');

const router = Router();

router.get('/', async (_req, res) => {
    let postgres = 'disconnected';

    try {
        await connection.authenticate();
        postgres = 'connected';
    } catch {
        postgres = 'error';
    }

    const mongo = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    res.json({
        status: 'ok',
        version: 'v1',
        postgres,
        mongo,
    });
});

module.exports = router;
