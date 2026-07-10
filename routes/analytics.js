const { Router } = require('express');

const checkAuth = require('../middlewares/check-auth');
const { assertApplicationOwnership } = require('../lib/ownership-scope');
const {
    PERIODS,
    getTrackedPages,
    getMouseMovements,
} = require('../lib/mouse-heatmap');
const PageSnapshot = require('../models/mongo-snapshot');

const router = new Router();

/**
 * Read `applicationId` from the query string as a positive integer.
 * Sends a 400 and returns null when missing/invalid.
 */
function parseApplicationId(req, res) {
    const applicationId = Number(req.query.applicationId);
    if (!Number.isInteger(applicationId) || applicationId <= 0) {
        res.status(400).json({ message: 'applicationId query param is required' });
        return null;
    }
    return applicationId;
}

/** Read `period` from the query string, defaulting to "7d". */
function parsePeriod(req) {
    const period = req.query.period;
    return PERIODS.includes(period) ? period : '7d';
}

// GET /analytics/mouse/pages?applicationId=1&period=7d
// -> [{ page, count }] : pages that have mouse-tracking data.
router.get('/mouse/pages', checkAuth(), async (req, res, next) => {
    try {
        const applicationId = parseApplicationId(req, res);
        if (applicationId === null) return;

        // Throws 'Application not found' (handled -> 500) if the user doesn't own it.
        await assertApplicationOwnership(req, applicationId);

        const pages = await getTrackedPages(applicationId, parsePeriod(req));
        res.json(pages);
    } catch (error) {
        next(error);
    }
});

// GET /analytics/mouse/movements?applicationId=1&page=/pricing&period=7d
// -> { page, period, count, truncated, points: [{ x, y }] }
router.get('/mouse/movements', checkAuth(), async (req, res, next) => {
    try {
        const applicationId = parseApplicationId(req, res);
        if (applicationId === null) return;

        const page = req.query.page;
        if (!page) {
            res.status(400).json({ message: 'page query param is required' });
            return;
        }

        await assertApplicationOwnership(req, applicationId);

        const data = await getMouseMovements(applicationId, page, parsePeriod(req));
        res.json(data);
    } catch (error) {
        next(error);
    }
});

// GET /analytics/mouse/snapshot?applicationId=1&page=https://…
// -> { image, width, height, capturedAt } (the page screenshot) or 204 if none.
router.get('/mouse/snapshot', checkAuth(), async (req, res, next) => {
    try {
        const applicationId = parseApplicationId(req, res);
        if (applicationId === null) return;

        const page = req.query.page;
        if (!page) {
            res.status(400).json({ message: 'page query param is required' });
            return;
        }

        await assertApplicationOwnership(req, applicationId);

        const snapshot = await PageSnapshot.findOne({ applicationId, url: page }).lean();
        if (!snapshot) {
            res.status(204).end();
            return;
        }

        res.json({
            image: snapshot.image,
            width: snapshot.width,
            height: snapshot.height,
            capturedAt: snapshot.capturedAt,
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
