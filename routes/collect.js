const { Router } = require('express');

const sdkCors = require('../middlewares/sdk-cors');
const sdkAuth = require('../middlewares/sdk-auth');
const { ingestSessionPayload } = require('../lib/sdk/ingest');

const router = new Router();
const parseTextPlainJson = require('express').text({ type: 'text/plain', limit: '10mb' });

/** sendBeacon fallback sends a plain string body (text/plain). */
function parseBeaconBody(req, res, next) {
    const contentType = req.headers['content-type'] ?? '';
    if (!contentType.includes('text/plain') || (req.body && typeof req.body === 'object')) {
        return next();
    }

    return parseTextPlainJson(req, res, (error) => {
        if (error) return next(error);
        try {
            req.body = JSON.parse(req.body);
        } catch {
            return res.status(400).json({ error: { message: 'Invalid JSON body' } });
        }
        return next();
    });
}

// SDK ingestion endpoint. The browser SDK POSTs its enriched SessionPayload
// here (cross-origin, authenticated by appId via sdkAuth).
router.options('/', sdkCors());

router.post('/', sdkCors(), parseBeaconBody, sdkAuth(), async (req, res, next) => {
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
