const { EventMirror } = require('../mongo-models');
const { buildEventMatch } = require('./event-match');

// A visitor is "returning" when they were active on at least this many distinct
// days within the period.
const RETURNING_MIN_DAYS = 2;

/**
 * Recurring-visitor rate over the period: share of visitors active on at least
 * two distinct days. Groups by the stable `metadata.visitorId` stamped on every
 * event at ingest. Days are bucketed in UTC.
 */
async function aggregateRetention(widget) {
    const match = buildEventMatch(widget);
    // Only events tied to a stable visitor can count toward retention.
    match['metadata.visitorId'] = { $ne: null };

    const [result] = await EventMirror.aggregate([
        { $match: match },
        {
            $group: {
                _id: '$metadata.visitorId',
                days: {
                    $addToSet: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                    },
                },
            },
        },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                returning: {
                    $sum: {
                        $cond: [
                            { $gte: [{ $size: '$days' }, RETURNING_MIN_DAYS] },
                            1,
                            0,
                        ],
                    },
                },
            },
        },
    ]);

    const total = result?.total ?? 0;
    const returning = result?.returning ?? 0;
    const rate = total > 0 ? (returning / total) * 100 : 0;

    return { rate, returning, total };
}

module.exports = { aggregateRetention };
