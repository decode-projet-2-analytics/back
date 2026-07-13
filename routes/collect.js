const { Router } = require('express');

const sdkCors = require('../middlewares/sdk-cors');
const sdkAuth = require('../middlewares/sdk-auth');
const { ingestSessionPayload } = require('../lib/sdk/ingest');

const router = new Router();

// SDK ingestion endpoint. The browser SDK POSTs its enriched SessionPayload
// here (cross-origin, authenticated by appId via sdkAuth).
router.options('/', sdkCors());

router.post('/', sdkCors(), sdkAuth(), async (req, res, next) => {
    try {
        await ingestSessionPayload(req.application.id, req.body);
        // SDK is fire-and-forget; it ignores the response body.
        res.sendStatus(204);
    } catch (error) {
        if (error.status === 400) {
            res.status(400).json({ error: { message: error.message } });
            return;
        }
        next(error);
    }
});

module.exports = router;
