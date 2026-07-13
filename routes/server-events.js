const { Router } = require('express');

const sdkCors = require('../middlewares/sdk-cors');
const sdkAuth = require('../middlewares/sdk-auth');
const { ingestServerEvent } = require('../lib/sdk/server-event');

const router = new Router();

router.options('/', sdkCors());

router.post('/', sdkCors(), sdkAuth({ requireSecret: true }), async (req, res, next) => {
    try {
        const event = await ingestServerEvent(req.application.id, req.body);
        res.status(201).json(event);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
