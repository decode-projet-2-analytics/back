const { EventMirror } = require('../mongo-models');

/**
 * Mouse-heatmap read layer.
 *
 * Reads go through MongoDB (the `sync_events` mirror, exposed as EventMirror
 * and populated on ingest by lib/mongo-sync.js) — the same store the KPI /
 * timeseries / heatmap widgets read from. Mongo is much faster for analytics
 * aggregations than Postgres. Each mouse movement is a document with:
 *   - `type`      : the event kind, e.g. "mousemove" (set by ingest)
 *   - `payload`   : free-form object holding the coordinates + page URL
 *   - `createdAt` : the event time, used for period filtering
 *
 * The tracking SDK (SDK-frontend) does NOT pin a single payload shape, and the
 * README/backend disagree, so we stay robust to the three plausible shapes:
 *   1. one Event per point, flat        -> { url, x, y, timestamp }
 *   2. one Event per flush, points[]    -> { url, points: [{ x, y, timestamp }] }
 *   3. SDK "session payload" as-is      -> { url, mousemove: { points: [...] } }
 *
 * Aggregation is done in JS (not in the DB) on purpose: it is shape-agnostic
 * and readable. The Mongo query filters on applicationId + type + createdAt so
 * fetching the right slice stays fast; for very large datasets you would push
 * the grouping into an aggregation pipeline.
 */

// The `type` value the SDK uses for mouse movements. Adjust here if your SDK
// sends a different string (e.g. "mouse_move").
const MOUSE_EVENT_TYPE = 'mousemove';

// Supported period presets, mapped to a "since" date below.
const PERIODS = ['today', '7d', '30d'];

// Safety cap so a busy page cannot return a multi-MB payload to the dashboard.
const MAX_POINTS = 20000;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Convert a period preset into the earliest `createdAt` to include.
 * @param {'today'|'7d'|'30d'} period
 * @returns {Date}
 */
function periodToSince(period) {
    const now = new Date();
    switch (period) {
        case 'today': {
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);
            return startOfDay;
        }
        case '30d':
            return new Date(now.getTime() - 30 * DAY_MS);
        case '7d':
        default:
            return new Date(now.getTime() - 7 * DAY_MS);
    }
}

/**
 * Extract the page URL/path from an event payload, whatever the shape.
 * @param {object} payload
 * @returns {string|null}
 */
function extractPage(payload) {
    if (!payload || typeof payload !== 'object') return null;
    return (
        payload.url ??
        payload.pathname ??
        payload.page ??
        payload.mousemove?.url ??
        null
    );
}

function isPoint(candidate) {
    return (
        candidate &&
        typeof candidate.x === 'number' &&
        typeof candidate.y === 'number' &&
        Number.isFinite(candidate.x) &&
        Number.isFinite(candidate.y)
    );
}

/**
 * Extract all { x, y } points from an event payload, whatever the shape.
 * @param {object} payload
 * @returns {{ x: number, y: number }[]}
 */
function extractPoints(payload) {
    if (!payload || typeof payload !== 'object') return [];

    // Shape 2: { points: [...] }
    if (Array.isArray(payload.points)) {
        return payload.points.filter(isPoint).map((p) => ({ x: p.x, y: p.y }));
    }

    // Shape 3: { mousemove: { points: [...] } }
    if (Array.isArray(payload.mousemove?.points)) {
        return payload.mousemove.points
            .filter(isPoint)
            .map((p) => ({ x: p.x, y: p.y }));
    }

    // Shape 1: flat { x, y }
    if (isPoint(payload)) {
        return [{ x: payload.x, y: payload.y }];
    }

    return [];
}

/**
 * Load the raw mouse-move events (from the Mongo mirror) for an application
 * within a period. Only the payload is selected to keep the transfer small.
 */
async function loadMouseEvents(applicationId, period) {
    return EventMirror.find({
        applicationId,
        type: MOUSE_EVENT_TYPE,
        createdAt: { $gte: periodToSince(period) },
    })
        .select('payload')
        .lean();
}

/**
 * List the distinct pages that have mouse-tracking data, with a point count.
 * @returns {Promise<{ page: string, count: number }[]>}
 */
async function getTrackedPages(applicationId, period) {
    const events = await loadMouseEvents(applicationId, period);

    const counts = new Map();
    for (const event of events) {
        const page = extractPage(event.payload);
        if (!page) continue;
        const points = extractPoints(event.payload);
        counts.set(page, (counts.get(page) ?? 0) + points.length);
    }

    return [...counts.entries()]
        .map(([page, count]) => ({ page, count }))
        .sort((a, b) => b.count - a.count);
}

/**
 * Get every mouse point recorded for a given page within a period.
 *
 * `docSize` is the document coordinate space the points live in (captured by
 * the SDK). The dashboard uses it to scale points onto the page screenshot.
 * It is null for legacy events that predate the enriched SDK payload.
 *
 * @returns {Promise<{ page: string, period: string, count: number,
 *                     truncated: boolean,
 *                     docSize: { width: number, height: number } | null,
 *                     points: { x: number, y: number }[] }>}
 */
async function getMouseMovements(applicationId, page, period) {
    const events = await loadMouseEvents(applicationId, period);

    const points = [];
    let docSize = null;
    for (const event of events) {
        if (extractPage(event.payload) !== page) continue;

        if (!docSize && event.payload?.docSize?.width && event.payload?.docSize?.height) {
            docSize = {
                width: event.payload.docSize.width,
                height: event.payload.docSize.height,
            };
        }

        for (const point of extractPoints(event.payload)) {
            points.push(point);
            if (points.length >= MAX_POINTS) break;
        }
        if (points.length >= MAX_POINTS) break;
    }

    return {
        page,
        period,
        count: points.length,
        truncated: points.length >= MAX_POINTS,
        docSize,
        points,
    };
}

module.exports = {
    PERIODS,
    MOUSE_EVENT_TYPE,
    getTrackedPages,
    getMouseMovements,
    // exported for unit testing / reuse
    periodToSince,
    extractPage,
    extractPoints,
};
